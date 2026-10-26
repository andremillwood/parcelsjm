begin;
-- New events only. Existing deferred outboxes are intentionally not replayed.
create table private.communication_settings(scope text primary key check(scope in('live','test')),enabled boolean not null default false);
insert into private.communication_settings values('live',false),('test',true);
create table private.communication_test_profiles(profile_id uuid primary key references public.profiles(id) on delete cascade);
create table private.email_suppressions(email text primary key,reason text not null check(reason in('bounced','complained')),created_at timestamptz not null default now());
create table public.notification_jobs(
 id uuid primary key default gen_random_uuid(),event_key text not null unique,
 profile_id uuid references public.profiles(id) on delete cascade,audience text not null check(audience in('customer','staff','inquiry','test')),
 recipient_email text,scope text not null check(scope in('live','test')),kind text not null,
 resource_id uuid not null,event_status text not null default '',template_version integer not null default 1 check(template_version=1),
 state text not null check(state in('held','pending','sending','retry','accepted','delivered','bounced','complained','failed','review','suppressed')),
 attempts integer not null default 0 check(attempts between 0 and 5),next_attempt_at timestamptz not null default now(),first_attempt_at timestamptz,
 lease_token uuid,lease_until timestamptz,provider_id text unique,provider_payload jsonb,error_code text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(audience<>'customer' or profile_id is not null)
);
create index notification_jobs_ready on public.notification_jobs(scope,next_attempt_at,created_at)where state in('pending','retry','sending');
create index notification_jobs_profile on public.notification_jobs(profile_id,created_at);
create table private.email_webhook_receipts(event_id text primary key,job_id uuid not null references public.notification_jobs(id) on delete cascade,event_type text not null,created_at timestamptz not null default now());
alter table public.notification_jobs enable row level security;
alter table private.communication_settings enable row level security;
alter table private.communication_test_profiles enable row level security;
alter table private.email_suppressions enable row level security;
alter table private.email_webhook_receipts enable row level security;
revoke all on public.notification_jobs,private.communication_settings,private.communication_test_profiles,private.email_suppressions,private.email_webhook_receipts from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update,delete on public.notification_jobs,private.communication_settings,private.communication_test_profiles,private.email_suppressions,private.email_webhook_receipts to service_role;
create function private.enqueue_email(p_key text,p_profile uuid,p_audience text,p_kind text,p_resource uuid,p_status text default '',p_email text default null)returns void language plpgsql security definer set search_path='' as $$
declare target text;delivery_scope text;initial text;
begin
 delivery_scope:=case when exists(select 1 from private.communication_test_profiles where profile_id=p_profile)then 'test' else 'live' end;
 if p_audience='customer' then select lower(email)into target from auth.users where id=p_profile and email_confirmed_at is not null;else target:=lower(p_email);end if;
 initial:=case when (select enabled from private.communication_settings where scope=delivery_scope)then 'pending' else 'held' end;
 if p_audience in('customer','inquiry')and target is null then initial:='suppressed';end if;
 insert into public.notification_jobs(event_key,profile_id,audience,recipient_email,scope,kind,resource_id,event_status,state,error_code)
 values(p_key,p_profile,p_audience,target,delivery_scope,p_kind,p_resource,coalesce(p_status,''),initial,case when initial='held'then 'disabled_at_event' when initial='suppressed'then 'unverified_recipient' end)on conflict(event_key)do nothing;
end $$;
revoke all on function private.enqueue_email(text,uuid,text,text,uuid,text,text)from public,anon,authenticated,service_role;
create function private.enqueue_operational_email()returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid;kind text;resource uuid;status text:='';key text;
begin
 if tg_table_name='profiles' then
  if new.account_status<>'active' then return new;end if;
  if tg_op='UPDATE' then if old.account_status='active' then return new;end if;end if;
  perform private.enqueue_email('account-ready/'||new.id,new.id,'customer','account_ready',new.id);return new;
 elsif tg_table_name='shipping_accounts' then
  if new.status<>'active' then return new;end if;
  if tg_op='UPDATE' then if old.status='active' then return new;end if;end if;
  perform private.enqueue_email('address-ready/'||new.id,new.profile_id,'customer','address_ready',new.id);return new;
 elsif tg_table_name='packages' then owner_id:=new.profile_id;kind:='pre_alert_received';resource:=new.id;key:='pre-alert/'||new.id;
 elsif tg_table_name='package_events' then
  select profile_id into owner_id from public.packages where id=new.package_id;
  kind:=case when new.corrects_event_id is null then 'shipment_update' else 'shipment_correction' end;resource:=new.package_id;status:=new.status;key:='package-event/'||new.id;
 elsif tg_table_name='document_history' then
  if new.action not in('requested','uploaded','rejected','approved','waived','scan_clean','scan_infected','scan_error')then return new;end if;
  select profile_id into owner_id from public.document_requests where id=new.request_id;
  kind:='document_'||new.action;resource:=new.request_id;key:='document-history/'||new.id;
  if new.action='uploaded' then perform private.enqueue_email(key||'/staff',owner_id,'staff','staff_document',resource);end if;
 elsif tg_table_name='billing_history' then
  if new.action not in('invoice_issue','invoice_dispute','invoice_resolve_dispute','invoice_void','invoice_adjusted','payment_verified','payment_reversed')then return new;end if;
  select profile_id into owner_id from public.billing_invoices where id=new.invoice_id and issued_at is not null;
  if owner_id is null then return new;end if;
  kind:=new.action;resource:=new.invoice_id;key:='billing-history/'||new.id;
 elsif tg_table_name='support_requests' then
  owner_id:=new.profile_id;resource:=new.id;
  if tg_op='INSERT' then
   perform private.enqueue_email('support/'||new.id||'/staff',owner_id,'staff','staff_support',resource);
   kind:='support_received';key:='support/'||new.id||'/received';
  else
   if new.status<>'resolved' or old.status='resolved' then return new;end if;
   kind:='support_reply';key:='support/'||new.id||'/reply';
  end if;
 elsif tg_table_name='marketing_inquiries' then
  perform private.enqueue_email('inquiry/'||new.id||'/staff',null,'staff','staff_inquiry',new.id);
  perform private.enqueue_email('inquiry/'||new.id||'/receipt',null,'inquiry','inquiry_received',new.id,'',new.email);return new;
 else return new;
 end if;
 perform private.enqueue_email(key,owner_id,'customer',kind,resource,status);return new;
end $$;
revoke all on function private.enqueue_operational_email()from public,anon,authenticated,service_role;
create trigger notify_account after insert or update of account_status on public.profiles for each row execute function private.enqueue_operational_email();
create trigger notify_address after insert or update of status on public.shipping_accounts for each row execute function private.enqueue_operational_email();
create trigger notify_pre_alert after insert on public.packages for each row execute function private.enqueue_operational_email();
create trigger notify_shipment after insert on public.package_events for each row execute function private.enqueue_operational_email();
create trigger notify_document after insert on public.document_history for each row execute function private.enqueue_operational_email();
create trigger notify_billing after insert on public.billing_history for each row execute function private.enqueue_operational_email();
create trigger notify_support after insert or update of status on public.support_requests for each row execute function private.enqueue_operational_email();
create trigger notify_inquiry after insert on public.marketing_inquiries for each row execute function private.enqueue_operational_email();

create function private.claim_email_jobs(p_scope text,p_token uuid,p_staff text)returns setof public.notification_jobs language plpgsql security definer set search_path='' as $$
declare j public.notification_jobs;current_email text;
begin
 if p_scope not in('live','test')or p_token is null or p_staff is null or p_staff!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'then raise exception 'Invalid worker configuration';end if;
 if not(select enabled from private.communication_settings where scope=p_scope)then return;end if;
 update public.notification_jobs set state='review',error_code='retry_exhausted',lease_token=null,lease_until=null,updated_at=now()where scope=p_scope and state='sending'and attempts>=5 and lease_until<now();
 update public.notification_jobs set state='review',error_code='idempotency_window_expired',lease_token=null,lease_until=null,updated_at=now()where scope=p_scope and state in('pending','retry','sending')and first_attempt_at<now()-interval '23 hours';
 update public.notification_jobs set state='suppressed',error_code='stale_before_first_attempt',updated_at=now()where scope=p_scope and state in('pending','retry')and first_attempt_at is null and created_at<now()-interval '48 hours';
 for j in select * from public.notification_jobs where scope=p_scope and attempts<5 and ((state in('pending','retry')and next_attempt_at<=now())or(state='sending'and lease_until<now()))order by created_at,id for update skip locked limit 1 loop
  if j.audience='customer' then
   select lower(u.email)into current_email from auth.users u join public.profiles p on p.id=u.id where u.id=j.profile_id and u.email_confirmed_at is not null and p.account_status='active';
   if not(case
    when j.kind='account_ready'then j.resource_id=j.profile_id
    when j.kind='address_ready'then exists(select 1 from public.shipping_accounts where id=j.resource_id and profile_id=j.profile_id and status='active')
    when j.kind like 'document_%'then exists(select 1 from public.document_requests where id=j.resource_id and profile_id=j.profile_id)
    when j.kind like 'invoice_%'or j.kind like 'payment_%'then exists(select 1 from public.billing_invoices where id=j.resource_id and profile_id=j.profile_id and issued_at is not null)
    when j.kind in('support_received','support_reply')then exists(select 1 from public.support_requests where id=j.resource_id and profile_id=j.profile_id)
    else exists(select 1 from public.packages where id=j.resource_id and profile_id=j.profile_id)end)then
    update public.notification_jobs set state='suppressed',error_code='source_changed_or_unavailable',updated_at=now()where id=j.id;continue;
   end if;
   if current_email is null or current_email is distinct from j.recipient_email then
    update public.notification_jobs set state='suppressed',error_code='recipient_changed_or_inactive',updated_at=now()where id=j.id;continue;
   end if;
  elsif j.audience='staff' and j.recipient_email is null then j.recipient_email:=lower(p_staff);
  end if;
  if exists(select 1 from private.email_suppressions where email=j.recipient_email)then update public.notification_jobs set state='suppressed',error_code='recipient_suppressed',updated_at=now()where id=j.id;continue;end if;
  update public.notification_jobs set recipient_email=j.recipient_email,state='sending',attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()),lease_token=p_token,lease_until=now()+interval '2 minutes',updated_at=now()where id=j.id returning * into j;
  return next j;
 end loop;
end $$;
create function public.claim_email_jobs(p_scope text,p_token uuid,p_staff text)returns setof public.notification_jobs language sql security invoker set search_path=''as $$select * from private.claim_email_jobs(p_scope,p_token,p_staff)$$;
revoke all on function private.claim_email_jobs(text,uuid,text),public.claim_email_jobs(text,uuid,text)from public,anon,authenticated;
grant execute on function private.claim_email_jobs(text,uuid,text),public.claim_email_jobs(text,uuid,text)to service_role;

create function private.prepare_email(p_id uuid,p_token uuid,p_payload jsonb)returns jsonb language plpgsql security definer set search_path=''as $$
declare j public.notification_jobs;begin
 select * into j from public.notification_jobs where id=p_id and state='sending'and lease_token=p_token and lease_until>now()for update;
 if j.id is null then raise exception 'Lease unavailable';end if;
 if j.provider_payload is not null then return j.provider_payload;end if;
 if jsonb_typeof(p_payload)<>'object'or jsonb_typeof(p_payload->'to')<>'array'or jsonb_array_length(p_payload->'to')<>1 or length(p_payload::text)>50000 then raise exception 'Invalid message';end if;
 if j.scope='live'and p_payload->'to'->>0 is distinct from j.recipient_email then raise exception 'Recipient mismatch';end if;
 if j.scope='test'and p_payload->'to'->>0 not in('delivered@resend.dev','bounced@resend.dev','complained@resend.dev')then raise exception 'Test delivery must use provider simulator';end if;
 update public.notification_jobs set provider_payload=p_payload where id=j.id;return p_payload;
end $$;
create function public.prepare_email(p_id uuid,p_token uuid,p_payload jsonb)returns jsonb language sql security invoker set search_path=''as $$select private.prepare_email(p_id,p_token,p_payload)$$;
revoke all on function private.prepare_email(uuid,uuid,jsonb),public.prepare_email(uuid,uuid,jsonb)from public,anon,authenticated;
grant execute on function private.prepare_email(uuid,uuid,jsonb),public.prepare_email(uuid,uuid,jsonb)to service_role;

create function private.finish_email(p_id uuid,p_token uuid,p_provider text,p_result text,p_error text default null)returns void language plpgsql security definer set search_path=''as $$
declare j public.notification_jobs;begin
 select * into j from public.notification_jobs where id=p_id and lease_token=p_token for update;if j.id is null then raise exception 'Lease changed';end if;
 if p_result='accepted'and p_provider is not null then
  if j.provider_id is not null and j.provider_id<>p_provider then raise exception 'Provider mismatch';end if;
  update public.notification_jobs set provider_id=p_provider,state=case when state in('delivered','bounced','complained','failed')then state else 'accepted'end,error_code=null,lease_token=null,lease_until=null,updated_at=now()where id=j.id;
 elsif p_result in('retry','failed','review')and j.state='sending'then
  update public.notification_jobs set state=case when p_result='retry'and attempts>=5 then 'review'else p_result end,error_code=p_error,lease_token=null,lease_until=null,next_attempt_at=now()+make_interval(secs=>least(3600,(60*power(2,attempts-1))::integer)),updated_at=now()where id=j.id;
 else raise exception 'Invalid outcome';end if;
end $$;
create function public.finish_email(p_id uuid,p_token uuid,p_provider text,p_result text,p_error text default null)returns void language sql security invoker set search_path=''as $$select private.finish_email(p_id,p_token,p_provider,p_result,p_error)$$;
revoke all on function private.finish_email(uuid,uuid,text,text,text),public.finish_email(uuid,uuid,text,text,text)from public,anon,authenticated;
grant execute on function private.finish_email(uuid,uuid,text,text,text),public.finish_email(uuid,uuid,text,text,text)to service_role;

create function private.record_email_delivery(p_receipt text,p_provider text,p_type text,p_hint uuid default null)returns text language plpgsql security definer set search_path=''as $$
declare j public.notification_jobs;next_state text;old_rank integer;new_rank integer;begin
 if length(p_receipt)>200 or length(p_provider)>200 or p_receipt is null or p_provider is null then raise exception 'Invalid receipt';end if;
 next_state:=case p_type when 'email.sent'then 'accepted'when 'email.delivered'then 'delivered'when 'email.bounced'then 'bounced'when 'email.complained'then 'complained'when 'email.failed'then 'failed'else null end;
 if next_state is null then return 'ignored';end if;
 select * into j from public.notification_jobs where provider_id=p_provider or (id=p_hint and provider_id is null and provider_payload is not null)for update;
 if j.id is null then return 'ignored';end if;
 insert into private.email_webhook_receipts(event_id,job_id,event_type)values(p_receipt,j.id,p_type)on conflict do nothing;if not found then return 'duplicate';end if;
 old_rank:=case j.state when 'complained'then 6 when 'bounced'then 5 when 'failed'then 4 when 'delivered'then 3 when 'accepted'then 2 else 1 end;
 new_rank:=case next_state when 'complained'then 6 when 'bounced'then 5 when 'failed'then 4 when 'delivered'then 3 else 2 end;
 update public.notification_jobs set provider_id=p_provider,state=case when new_rank>old_rank then next_state else state end,updated_at=now()where id=j.id;
 if next_state in('bounced','complained')then insert into private.email_suppressions(email,reason)values(j.recipient_email,next_state)on conflict(email)do update set reason=case when private.email_suppressions.reason='complained'then 'complained'else excluded.reason end;end if;
 return 'recorded';
end $$;
create function public.record_email_delivery(p_receipt text,p_provider text,p_type text,p_hint uuid default null)returns text language sql security invoker set search_path=''as $$select private.record_email_delivery(p_receipt,p_provider,p_type,p_hint)$$;
revoke all on function private.record_email_delivery(text,text,text,uuid),public.record_email_delivery(text,text,text,uuid)from public,anon,authenticated;
grant execute on function private.record_email_delivery(text,text,text,uuid),public.record_email_delivery(text,text,text,uuid)to service_role;

create function private.notification_delivery_page(p_page integer default 1,p_state text default '')returns jsonb language plpgsql security definer set search_path=''as $$
declare rows jsonb;total bigint;begin
 if not private.has_role(array['owner'])then raise exception 'Owner role required';end if;
 select count(*)into total from public.notification_jobs where p_state=''or state=p_state;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb)into rows from(select id,kind,resource_id,event_status,scope,state,attempts,error_code,created_at,updated_at from public.notification_jobs where p_state=''or state=p_state order by created_at desc,id limit 25 offset (greatest(1,least(coalesce(p_page,1),10000))-1)*25)q;
 return jsonb_build_object('rows',rows,'total',total,'live_enabled',(select enabled from private.communication_settings where scope='live'));
end $$;
create function public.notification_delivery_page(p_page integer default 1,p_state text default '')returns jsonb language sql security invoker set search_path=''as $$select private.notification_delivery_page(p_page,p_state)$$;
revoke all on function private.notification_delivery_page(integer,text),public.notification_delivery_page(integer,text)from public,anon,service_role;
grant execute on function private.notification_delivery_page(integer,text),public.notification_delivery_page(integer,text)to authenticated;

create function private.retry_email_job(p_id uuid,p_reason text)returns void language plpgsql security definer set search_path=''as $$
declare j public.notification_jobs;begin
 if not private.has_role(array['owner'])or p_reason is null or length(trim(p_reason))not between 10 and 500 then raise exception 'Owner role and reason required';end if;
 select * into j from public.notification_jobs where id=p_id for update;
 if j.id is null or j.state not in('retry','failed')or j.attempts>=5 or j.first_attempt_at<now()-interval '23 hours'or exists(select 1 from private.email_suppressions where email=j.recipient_email)then raise exception 'Not safe to retry automatically';end if;
 update public.notification_jobs set state='pending',next_attempt_at=now(),updated_at=now()where id=j.id;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,reason,after_data)values(auth.uid(),'notification',j.id,'retry_requested',p_reason,jsonb_build_object('state','pending'));
end $$;
create function public.retry_email_job(p_id uuid,p_reason text)returns void language sql security invoker set search_path=''as $$select private.retry_email_job(p_id,p_reason)$$;
revoke all on function private.retry_email_job(uuid,text),public.retry_email_job(uuid,text)from public,anon,service_role;
grant execute on function private.retry_email_job(uuid,text),public.retry_email_job(uuid,text)to authenticated;
commit;
