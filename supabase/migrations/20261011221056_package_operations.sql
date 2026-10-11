begin;
create table public.packages (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id), request_id uuid not null,
 carrier_tracking text not null check(length(carrier_tracking) between 1 and 120), merchant text not null check(length(merchant) between 1 and 160), carrier text not null default '' check(length(carrier)<=80),
 description text not null check(length(description) between 5 and 1000), quantity integer not null check(quantity between 1 and 1000), declared_value numeric(12,2) not null check(declared_value>0 and declared_value<=1000000), declared_currency text not null check(declared_currency in ('USD','JMD')), notes text not null default '' check(length(notes)<=2000),
 status text not null default 'pre_alerted' check(status in ('pre_alerted','received_us','processing_us','in_transit','arrived_jm')),
 document_state text not null default 'not_requested' check(document_state in ('not_requested','requested','under_review','approved','rejected')),
 payment_state text not null default 'not_invoiced' check(payment_state='not_invoiced'), created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(profile_id,request_id),unique(profile_id,carrier_tracking)
);
create index packages_owner_created on public.packages(profile_id,created_at desc);
create table public.package_events (
 id uuid primary key default gen_random_uuid(),package_id uuid not null references public.packages(id),status text not null,source_reference text not null check(length(source_reference) between 5 and 500),actor_id uuid not null references public.profiles(id),occurred_at timestamptz not null,created_at timestamptz not null default now()
);
create index package_events_package on public.package_events(package_id,created_at);
create index package_events_actor on public.package_events(actor_id);
create table public.support_requests (
 id uuid primary key default gen_random_uuid(),profile_id uuid not null references public.profiles(id),request_id uuid not null,subject text not null check(length(subject) between 5 and 160),body text not null check(length(body) between 10 and 2000),package_reference text not null default '' check(length(package_reference)<=120),status text not null default 'open' check(status in ('open','resolved')),reply text check(length(reply) between 5 and 2000),created_at timestamptz not null default now(),resolved_at timestamptz,unique(profile_id,request_id)
);
create index support_owner_created on public.support_requests(profile_id,created_at desc);
create table public.intake_observations (
 id uuid primary key default gen_random_uuid(),tracking text not null check(length(tracking) between 1 and 120),source_reference text not null check(length(source_reference) between 5 and 500),actor_id uuid not null references public.profiles(id),package_id uuid references public.packages(id),created_at timestamptz not null default now(),matched_at timestamptz
);
create index intake_package on public.intake_observations(package_id);
create index intake_actor on public.intake_observations(actor_id);
create table public.event_outbox (
 id uuid primary key default gen_random_uuid(),event_id uuid not null unique references public.package_events(id),state text not null default 'deferred' check(state='deferred'),created_at timestamptz not null default now()
);
-- No provider worker is installed or activated. Events remain durable and deferred.
create function private.active_customer() returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=auth.uid() and p.account_status='active' and u.email_confirmed_at is not null)
$$;
revoke all on function private.active_customer() from public,anon;
grant execute on function private.active_customer() to authenticated;
alter table public.packages enable row level security;
alter table public.package_events enable row level security;
alter table public.support_requests enable row level security;
alter table public.intake_observations enable row level security;
alter table public.event_outbox enable row level security;
revoke all on public.packages,public.package_events,public.support_requests,public.intake_observations,public.event_outbox from public,anon,authenticated;
grant select on public.packages,public.package_events,public.support_requests,public.intake_observations to authenticated;
create policy packages_read on public.packages for select to authenticated using((profile_id=(select auth.uid()) and (select private.active_customer())) or (select private.has_role(array['owner','operations','documents','support'])));
create policy events_read on public.package_events for select to authenticated using(exists(select 1 from public.packages p where p.id=package_id));
create policy support_read on public.support_requests for select to authenticated using((profile_id=(select auth.uid()) and (select private.active_customer())) or (select private.has_role(array['owner','support'])));
create policy intake_read on public.intake_observations for select to authenticated using((select private.has_role(array['owner','operations'])));
create function private.create_pre_alert(p_request uuid,p_tracking text,p_merchant text,p_carrier text,p_description text,p_quantity integer,p_value numeric,p_currency text,p_notes text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.active_customer() then raise exception 'Active verified account required';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select id into result from public.packages where profile_id=auth.uid() and request_id=p_request;
 if result is not null then return result;end if;
 if (select count(*) from public.packages where profile_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception 'Daily request limit reached';end if;
 insert into public.packages(profile_id,request_id,carrier_tracking,merchant,carrier,description,quantity,declared_value,declared_currency,notes)values(auth.uid(),p_request,trim(p_tracking),trim(p_merchant),p_carrier,p_description,p_quantity,p_value,p_currency,p_notes) returning id into result;
 return result;
end $$;
create function public.create_pre_alert(p_request uuid,p_tracking text,p_merchant text,p_carrier text,p_description text,p_quantity integer,p_value numeric,p_currency text,p_notes text)returns uuid language sql security invoker set search_path='' as $$select private.create_pre_alert(p_request,p_tracking,p_merchant,p_carrier,p_description,p_quantity,p_value,p_currency,p_notes)$$;
create function private.record_package_event(p_package uuid,p_expected text,p_status text,p_source text,p_reason text,p_occurred timestamptz)returns uuid language plpgsql security definer set search_path='' as $$
declare old_status text; result uuid;
begin
 if not private.has_role(array['owner','operations']) then raise exception 'Access denied';end if;
 if p_occurred is null or p_occurred>now() or p_occurred<now()-interval '1 year' or p_reason is null or length(trim(p_reason)) not between 5 and 2000 or p_source is null or length(trim(p_source)) not between 5 and 500 then raise exception 'Evidence, effective time and reason required';end if;
 select status into old_status from public.packages where id=p_package for update;
 if old_status is null or old_status is distinct from p_expected then raise exception 'Record changed or unavailable';end if;
 if not ((old_status='pre_alerted' and p_status='received_us') or(old_status='received_us' and p_status='processing_us')or(old_status='processing_us' and p_status='in_transit')or(old_status='in_transit' and p_status='arrived_jm')) then raise exception 'Invalid shipment transition';end if;
 if exists(select 1 from public.package_events where package_id=p_package and occurred_at>p_occurred) then raise exception 'Event time precedes latest evidence';end if;
 insert into public.package_events(package_id,status,source_reference,actor_id,occurred_at)values(p_package,p_status,p_source,auth.uid(),p_occurred)returning id into result;
 update public.packages set status=p_status,updated_at=now()where id=p_package;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,before_data,after_data,reason)values(auth.uid(),'package',p_package,'shipment_event',jsonb_build_object('status',old_status),jsonb_build_object('status',p_status,'event_id',result),p_reason);
 insert into public.event_outbox(event_id)values(result);
 return result;
end $$;
create function public.record_package_event(p_package uuid,p_expected text,p_status text,p_source text,p_reason text,p_occurred timestamptz)returns uuid language sql security invoker set search_path='' as $$select private.record_package_event(p_package,p_expected,p_status,p_source,p_reason,p_occurred)$$;
create function private.create_support(p_request uuid,p_subject text,p_body text,p_reference text)returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.active_customer() then raise exception 'Active verified account required';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select id into result from public.support_requests where profile_id=auth.uid() and request_id=p_request;if result is not null then return result;end if;
 if(select count(*)from public.support_requests where profile_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Daily request limit reached';end if;
 insert into public.support_requests(profile_id,request_id,subject,body,package_reference)values(auth.uid(),p_request,p_subject,p_body,p_reference)returning id into result;return result;
end $$;
create function public.create_support(p_request uuid,p_subject text,p_body text,p_reference text)returns uuid language sql security invoker set search_path='' as $$select private.create_support(p_request,p_subject,p_body,p_reference)$$;
create function private.resolve_support(p_id uuid,p_reply text,p_reason text)returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.has_role(array['owner','support']) then raise exception 'Access denied';end if;
 if p_reason is null or length(trim(p_reason))not between 5 and 2000 then raise exception 'Reason required';end if;
 update public.support_requests set status='resolved',reply=p_reply,resolved_at=now()where id=p_id and status='open';if not found then raise exception 'Request changed or unavailable';end if;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,before_data,after_data,reason)values(auth.uid(),'support',p_id,'resolved','{"status":"open"}','{"status":"resolved"}',p_reason);
end $$;
create function public.resolve_support(p_id uuid,p_reply text,p_reason text)returns void language sql security invoker set search_path='' as $$select private.resolve_support(p_id,p_reply,p_reason)$$;
create function private.record_intake(p_tracking text,p_source text,p_reason text)returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.has_role(array['owner','operations'])then raise exception 'Access denied';end if;
 insert into public.intake_observations(tracking,source_reference,actor_id)values(p_tracking,p_source,auth.uid())returning id into result;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,after_data,reason)values(auth.uid(),'intake',result,'observed',jsonb_build_object('tracking',p_tracking),p_reason);return result;
end $$;
create function public.record_intake(p_tracking text,p_source text,p_reason text)returns uuid language sql security invoker set search_path='' as $$select private.record_intake(p_tracking,p_source,p_reason)$$;
create function private.match_intake(p_id uuid,p_package uuid,p_reason text)returns void language plpgsql security definer set search_path='' as $$
declare obs public.intake_observations;
begin
 if not private.has_role(array['owner','operations'])then raise exception 'Access denied';end if;
 select * into obs from public.intake_observations where id=p_id and package_id is null for update;if not found then raise exception 'Observation changed or unavailable';end if;
 if not exists(select 1 from public.packages where id=p_package and carrier_tracking=obs.tracking)then raise exception 'Exact tracking match required';end if;
 perform private.record_package_event(p_package,'pre_alerted','received_us',obs.source_reference,p_reason,obs.created_at);
 update public.intake_observations set package_id=p_package,matched_at=now()where id=p_id;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,after_data,reason)values(auth.uid(),'intake',p_id,'matched',jsonb_build_object('package_id',p_package),p_reason);
end $$;
create function public.match_intake(p_id uuid,p_package uuid,p_reason text)returns void language sql security invoker set search_path='' as $$select private.match_intake(p_id,p_package,p_reason)$$;
-- Explicit function allowlist: private definers are never public PostgREST endpoints.
revoke all on function private.create_pre_alert(uuid,text,text,text,text,integer,numeric,text,text),public.create_pre_alert(uuid,text,text,text,text,integer,numeric,text,text),private.record_package_event(uuid,text,text,text,text,timestamptz),public.record_package_event(uuid,text,text,text,text,timestamptz),private.create_support(uuid,text,text,text),public.create_support(uuid,text,text,text),private.resolve_support(uuid,text,text),public.resolve_support(uuid,text,text),private.record_intake(text,text,text),public.record_intake(text,text,text),private.match_intake(uuid,uuid,text),public.match_intake(uuid,uuid,text) from public,anon;
grant execute on function private.create_pre_alert(uuid,text,text,text,text,integer,numeric,text,text),public.create_pre_alert(uuid,text,text,text,text,integer,numeric,text,text),private.record_package_event(uuid,text,text,text,text,timestamptz),public.record_package_event(uuid,text,text,text,text,timestamptz),private.create_support(uuid,text,text,text),public.create_support(uuid,text,text,text),private.resolve_support(uuid,text,text),public.resolve_support(uuid,text,text),private.record_intake(text,text,text),public.record_intake(text,text,text),private.match_intake(uuid,uuid,text),public.match_intake(uuid,uuid,text) to authenticated;
commit;
