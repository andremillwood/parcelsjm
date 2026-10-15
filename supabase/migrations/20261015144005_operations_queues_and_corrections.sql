begin;
-- Queue state follows its source; staff cannot close work by changing a queue row.
create table public.operational_tasks (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('shipment','intake','document','support')),
 source_id uuid not null, reference text not null, state text not null check(state in ('open','closed')),
 assignee_id uuid references public.profiles(id), priority integer not null default 1 check(priority between 0 and 3),
 due_at timestamptz, opened_at timestamptz not null, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), version integer not null default 1, unique(kind,source_id)
);
create index operational_tasks_work on public.operational_tasks(state,priority desc,opened_at,id);
create index operational_tasks_assignee on public.operational_tasks(assignee_id,state);
alter table public.operational_tasks enable row level security;
revoke all on public.operational_tasks from public,anon,authenticated;
grant select on public.operational_tasks to authenticated;
create function private.queue_role(p_kind text) returns boolean language sql stable security invoker set search_path='' as $$
 select case p_kind when 'support' then private.has_role(array['owner','support']) when 'document' then private.has_role(array['owner','documents','operations']) when 'shipment' then private.has_role(array['owner','operations']) when 'intake' then private.has_role(array['owner','operations']) else false end
$$;
revoke all on function private.queue_role(text) from public,anon;
grant execute on function private.queue_role(text) to authenticated;
create policy operational_tasks_read on public.operational_tasks for select to authenticated using(private.queue_role(kind));
create function private.sync_operational_task() returns trigger language plpgsql security definer set search_path='' as $$
declare k text:=tg_argv[0]; d jsonb:=to_jsonb(new); s text; ref text;
begin
 s:=case k when 'intake' then case when d->>'package_id' is null then 'open' else 'closed' end when 'support' then case when d->>'status'='open' then 'open' else 'closed' end when 'document' then case when d->>'status' in ('approved','waived') then 'closed' else 'open' end else case when d->>'status'='arrived_jm' then 'closed' else 'open' end end;
 ref:=case k when 'intake' then d->>'tracking' when 'shipment' then d->>'carrier_tracking' when 'document' then d->>'document_type' else d->>'subject' end;
 insert into public.operational_tasks(kind,source_id,reference,state,opened_at) values(k,new.id,ref,s,new.created_at)
 on conflict(kind,source_id) do update set reference=excluded.reference,state=excluded.state,opened_at=case when operational_tasks.state='closed' and excluded.state='open' then now() else operational_tasks.opened_at end,version=operational_tasks.version+1,updated_at=now();
 return new;
end $$;
revoke all on function private.sync_operational_task() from public,anon,authenticated;
create trigger shipment_queue after insert or update of status on public.packages for each row execute function private.sync_operational_task('shipment');
create trigger intake_queue after insert or update of package_id on public.intake_observations for each row execute function private.sync_operational_task('intake');
create trigger support_queue after insert or update of status on public.support_requests for each row execute function private.sync_operational_task('support');
create trigger document_queue after insert or update of status on public.document_requests for each row execute function private.sync_operational_task('document');
insert into public.operational_tasks(kind,source_id,reference,state,opened_at)
 select 'shipment',id,carrier_tracking,case when status='arrived_jm' then 'closed' else 'open' end,created_at from public.packages
 union all select 'intake',id,tracking,case when package_id is null then 'open' else 'closed' end,created_at from public.intake_observations
 union all select 'support',id,subject,case when status='open' then 'open' else 'closed' end,created_at from public.support_requests
 union all select 'document',id,document_type,case when status in ('approved','waived') then 'closed' else 'open' end,created_at from public.document_requests;
create function private.manage_operational_task(p_id uuid,p_version integer,p_assignee uuid,p_priority integer,p_due timestamptz,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare t public.operational_tasks;
begin
 select * into t from public.operational_tasks where id=p_id for update;
 if t.id is null or not private.queue_role(t.kind) then raise exception 'Access denied';end if;
 if t.version is distinct from p_version or t.state<>'open' then raise exception 'Record changed or closed';end if;
 if p_priority is null or p_priority not between 0 and 3 or p_reason is null or length(trim(p_reason)) not between 5 and 2000 or (p_due is not null and not isfinite(p_due)) then raise exception 'Invalid queue update';end if;
 if p_assignee is not null and not exists(select 1 from public.profiles p join public.admin_role_assignments r on r.profile_id=p.id where p.id=p_assignee and p.account_status='active' and (r.role='owner' or (t.kind='support' and r.role='support') or (t.kind='document' and r.role in ('documents','operations')) or (t.kind in ('shipment','intake') and r.role='operations')))then raise exception 'Assignee requires an active authorized role';end if;
 update public.operational_tasks set assignee_id=p_assignee,priority=p_priority,due_at=p_due,version=version+1,updated_at=now() where id=p_id;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,before_data,after_data,reason) values(auth.uid(),'queue',p_id,'queue_assigned',jsonb_build_object('assignee_id',t.assignee_id,'priority',t.priority,'due_at',t.due_at),jsonb_build_object('assignee_id',p_assignee,'priority',p_priority,'due_at',p_due),p_reason);
end $$;
create function public.manage_operational_task(p_id uuid,p_version integer,p_assignee uuid,p_priority integer,p_due timestamptz,p_reason text) returns void language sql security invoker set search_path='' as $$select private.manage_operational_task(p_id,p_version,p_assignee,p_priority,p_due,p_reason)$$;
create function private.queue_assignees(p_kind text) returns table(id uuid,name text) language sql stable security definer set search_path='' as $$
 select distinct p.id,p.full_name from public.profiles p join public.admin_role_assignments r on r.profile_id=p.id where private.queue_role(p_kind) and p.account_status='active' and (r.role='owner' or (p_kind='support' and r.role='support') or (p_kind='document' and r.role in ('documents','operations')) or (p_kind in ('shipment','intake') and r.role='operations')) order by p.full_name,p.id
$$;
create function public.queue_assignees(p_kind text) returns table(id uuid,name text) language sql stable security invoker set search_path='' as $$select * from private.queue_assignees(p_kind)$$;
-- Correction records are immutable replacements of the latest published checkpoint only.
alter table public.package_events add column sequence bigint generated by default as identity;
with ranked as (select id,row_number() over(order by occurred_at,created_at,id) n from public.package_events) update public.package_events e set sequence=r.n from ranked r where e.id=r.id;
select setval(pg_get_serial_sequence('public.package_events','sequence'),greatest(coalesce((select max(sequence) from public.package_events),0),1),exists(select 1 from public.package_events));
create unique index package_events_sequence on public.package_events(sequence);
alter table public.package_events add column corrects_event_id uuid unique references public.package_events(id);
alter table public.package_events add column correction_reason text check(length(correction_reason) between 5 and 1000);
create function private.correct_package_event(p_package uuid,p_event uuid,p_status text,p_source text,p_reason text,p_explanation text,p_occurred timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare target public.package_events; original public.package_events; prior public.package_events; result uuid;
begin
 if not private.has_role(array['owner','operations']) then raise exception 'Access denied';end if;
 perform 1 from public.packages where id=p_package for update;if not found then raise exception 'Package unavailable';end if;
 select * into target from public.package_events where package_id=p_package order by sequence desc limit 1;
 if target.id is null or target.id is distinct from p_event then raise exception 'Latest event changed; refresh';end if;
 original:=target;
 while original.corrects_event_id is not null loop select * into original from public.package_events where id=original.corrects_event_id;end loop;
 select * into prior from public.package_events where package_id=p_package and sequence<original.sequence order by sequence desc limit 1;
 if p_status is null or p_status not in (original.status,coalesce(prior.status,'pre_alerted')) then raise exception 'Correction may only repair or retract the latest checkpoint';end if;
 if p_occurred is null or not isfinite(p_occurred) or p_occurred>now() or p_occurred<now()-interval '1 year' or (prior.occurred_at is not null and p_occurred<prior.occurred_at) or p_source is null or length(trim(p_source)) not between 5 and 500 or p_reason is null or length(trim(p_reason)) not between 5 and 2000 or p_explanation is null or length(trim(p_explanation)) not between 5 and 1000 then raise exception 'Valid evidence, explanation and effective time required';end if;
 insert into public.package_events(package_id,status,source_reference,actor_id,occurred_at,corrects_event_id,correction_reason)values(p_package,p_status,p_source,auth.uid(),p_occurred,p_event,p_explanation)returning id into result;
 update public.packages set status=p_status,updated_at=now()where id=p_package;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,before_data,after_data,reason)values(auth.uid(),'package',p_package,'shipment_corrected',jsonb_build_object('event_id',target.id,'status',target.status,'occurred_at',target.occurred_at,'source_reference',target.source_reference),jsonb_build_object('event_id',result,'status',p_status,'occurred_at',p_occurred,'source_reference',p_source),p_reason);
 insert into public.event_outbox(event_id)values(result);return result;
end $$;
create function public.correct_package_event(p_package uuid,p_event uuid,p_status text,p_source text,p_reason text,p_explanation text,p_occurred timestamptz)returns uuid language sql security invoker set search_path='' as $$select private.correct_package_event(p_package,p_event,p_status,p_source,p_reason,p_explanation,p_occurred)$$;
revoke all on function private.manage_operational_task(uuid,integer,uuid,integer,timestamptz,text),public.manage_operational_task(uuid,integer,uuid,integer,timestamptz,text),private.queue_assignees(text),public.queue_assignees(text),private.correct_package_event(uuid,uuid,text,text,text,text,timestamptz),public.correct_package_event(uuid,uuid,text,text,text,text,timestamptz) from public,anon;
grant execute on function private.manage_operational_task(uuid,integer,uuid,integer,timestamptz,text),public.manage_operational_task(uuid,integer,uuid,integer,timestamptz,text),private.queue_assignees(text),public.queue_assignees(text),private.correct_package_event(uuid,uuid,text,text,text,text,timestamptz),public.correct_package_event(uuid,uuid,text,text,text,text,timestamptz) to authenticated;
create or replace function private.record_package_event(p_package uuid,p_expected text,p_status text,p_source text,p_reason text,p_occurred timestamptz)returns uuid language plpgsql security definer set search_path='' as $$
declare old_status text; result uuid;
begin
 if not private.has_role(array['owner','operations']) then raise exception 'Access denied';end if;
 if p_occurred is null or p_occurred>now() or p_occurred<now()-interval '1 year' or p_reason is null or length(trim(p_reason)) not between 5 and 2000 or p_source is null or length(trim(p_source)) not between 5 and 500 then raise exception 'Evidence, effective time and reason required';end if;
 select status into old_status from public.packages where id=p_package for update;
 if old_status is null or old_status is distinct from p_expected then raise exception 'Record changed or unavailable';end if;
 if not ((old_status='pre_alerted' and p_status='received_us') or(old_status='received_us' and p_status='processing_us')or(old_status='processing_us' and p_status='in_transit')or(old_status='in_transit' and p_status='arrived_jm')) then raise exception 'Invalid shipment transition';end if;
 if p_occurred < (select occurred_at from public.package_events where package_id=p_package order by sequence desc limit 1) then raise exception 'Event time precedes latest evidence';end if;
 insert into public.package_events(package_id,status,source_reference,actor_id,occurred_at)values(p_package,p_status,p_source,auth.uid(),p_occurred)returning id into result;
 update public.packages set status=p_status,updated_at=now()where id=p_package;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,before_data,after_data,reason)values(auth.uid(),'package',p_package,'shipment_event',jsonb_build_object('status',old_status),jsonb_build_object('status',p_status,'event_id',result),p_reason);
 insert into public.event_outbox(event_id)values(result);
 return result;
end $$;
commit;
