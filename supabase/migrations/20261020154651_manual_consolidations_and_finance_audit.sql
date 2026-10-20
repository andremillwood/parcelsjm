begin;
-- Extend the financial audit with comparable snapshots, without putting payment
-- evidence, addresses or TRNs into customer history.
create or replace function private.billing_history_add(p_invoice uuid,p_action text,p_message text,p_reason text)returns void language plpgsql security definer set search_path='' as $$declare h uuid;b jsonb;a jsonb;begin
 select after_data->'snapshot' into b from public.audit_logs where entity_type='invoice'and entity_id=p_invoice and after_data?'snapshot'order by created_at desc,id desc limit 1;
 select jsonb_build_object('status',status,'version',version,'total_cents',total_cents,'adjustment_cents',adjustment_cents,'received_cents',received_cents,'balance_cents',balance_cents,'payment_status',payment_status)into a from public.billing_invoices where id=p_invoice;
 insert into public.billing_history(invoice_id,action,message)values(p_invoice,p_action,p_message)returning id into h;
 insert into public.billing_outbox(history_id)values(h);
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,before_data,after_data,reason)values(auth.uid(),'invoice',p_invoice,p_action,b,jsonb_build_object('history_id',h,'snapshot',a),p_reason);
end$$;
create table public.shipment_consolidations(
 id uuid primary key default gen_random_uuid(),reference text not null unique check(length(reference)between 3 and 120),partner_reference text not null default '' check(length(partner_reference)<=200),
 status text not null default 'draft'check(status in('draft','dispatched','arrived','closed','cancelled')),
 version integer not null default 1,manifest jsonb,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.shipment_manifest_members(consolidation_id uuid not null references public.shipment_consolidations(id),package_id uuid primary key references public.packages(id),added_by uuid not null references public.profiles(id),created_at timestamptz not null default now());
create index shipment_manifest_batch on public.shipment_manifest_members(consolidation_id);
create index shipment_manifest_actor on public.shipment_manifest_members(added_by);
create index shipment_consolidation_actor on public.shipment_consolidations(created_by);
create index shipment_consolidation_created on public.shipment_consolidations(created_at desc,id);
alter table public.shipment_consolidations enable row level security;alter table public.shipment_manifest_members enable row level security;
revoke all on public.shipment_consolidations,public.shipment_manifest_members from public,anon,authenticated,service_role;
grant select on public.shipment_consolidations,public.shipment_manifest_members to authenticated;
create policy consolidations_read on public.shipment_consolidations for select to authenticated using((select private.has_role(array['owner','operations','finance'])));
create policy manifest_read on public.shipment_manifest_members for select to authenticated using((select private.has_role(array['owner','operations','finance'])));
create function private.create_consolidation(p_reference text,p_reason text)returns uuid language plpgsql security definer set search_path='' as $$declare result uuid;begin
 if not private.has_role(array['owner','operations'])then raise exception 'Operations role required';end if;
 if p_reference is null or length(trim(p_reference))not between 3 and 120 or p_reason is null or length(trim(p_reason))not between 5 and 2000 then raise exception 'Reference and evidence required';end if;
 insert into public.shipment_consolidations(reference,created_by)values(trim(p_reference),auth.uid())returning id into result;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,after_data,reason)values(auth.uid(),'consolidation',result,'consolidation_created',jsonb_build_object('reference',trim(p_reference),'status','draft','version',1),p_reason);return result;
end$$;
create function public.create_consolidation(p_reference text,p_reason text)returns uuid language sql security invoker set search_path='' as $$select private.create_consolidation(p_reference,p_reason)$$;
revoke all on function private.create_consolidation(text,text),public.create_consolidation(text,text)from public,anon,service_role;
grant execute on function private.create_consolidation(text,text),public.create_consolidation(text,text)to authenticated;
create function private.manage_consolidation(p_id uuid,p_version integer,p_action text,p_package uuid,p_partner_reference text,p_reason text)returns void language plpgsql security definer set search_path='' as $$
declare s public.shipment_consolidations;p public.packages;before_json jsonb;new_status text;result_manifest jsonb;begin
 if not private.has_role(array['owner','operations'])then raise exception 'Operations role required';end if;
 if p_reason is null or length(trim(p_reason))not between 5 and 2000 then raise exception 'Evidence and reason required';end if;
 select * into s from public.shipment_consolidations where id=p_id for update;
 if s.id is null or s.version is distinct from p_version then raise exception 'Consolidation changed or unavailable; refresh';end if;
 before_json:=jsonb_build_object('status',s.status,'version',s.version,'partner_reference',s.partner_reference,'package_id',p_package);
 if p_action in('add','remove')then
  if s.status<>'draft'or p_package is null then raise exception 'Membership changes require a draft and package';end if;
  perform 1 from public.profiles where id=(select profile_id from public.packages where id=p_package)for update;
  select * into p from public.packages where id=p_package for update;
  if p.id is null then raise exception 'Package unavailable';end if;
  if p_action='add'then
   if p.status not in('received_us','processing_us')then raise exception 'Only verified received/processing packages can be consolidated';end if;
   insert into public.shipment_manifest_members(consolidation_id,package_id,added_by)values(p_id,p_package,auth.uid());
  else delete from public.shipment_manifest_members where consolidation_id=p_id and package_id=p_package;if not found then raise exception 'Membership unavailable';end if;end if;
 elsif p_action='reference'then
  if s.status in('closed','cancelled')or p_partner_reference is null or length(trim(p_partner_reference))not between 3 and 200 then raise exception 'Active consolidation and verified partner reference required';end if;
  update public.shipment_consolidations set partner_reference=trim(p_partner_reference)where id=p_id;
 else
  new_status:=case when p_action='dispatch'and s.status='draft'then 'dispatched'when p_action='arrive'and s.status='dispatched'then 'arrived'when p_action='close'and s.status='arrived'then 'closed'when p_action='cancel'and s.status='draft'then 'cancelled'else null end;
  if new_status is null then raise exception 'Invalid consolidation transition';end if;
  -- Shared profile/package lock ordering serializes membership evidence with individual checkpoints.
  perform 1 from public.profiles where id in(select pkg.profile_id from public.packages pkg join public.shipment_manifest_members m on m.package_id=pkg.id where m.consolidation_id=p_id)order by id for update;
  perform 1 from public.packages where id in(select package_id from public.shipment_manifest_members where consolidation_id=p_id)order by id for update;
  if p_action='dispatch'then
   if s.partner_reference=''or not exists(select 1 from public.shipment_manifest_members where consolidation_id=p_id)then raise exception 'Nonempty manifest and verified partner/AWB reference required';end if;
   if exists(select 1 from public.shipment_manifest_members m join public.packages pkg on pkg.id=m.package_id where m.consolidation_id=p_id and pkg.status not in('processing_us','in_transit'))then raise exception 'Manifest has packages not ready for dispatch';end if;
   select jsonb_agg(jsonb_build_object('package_id',pkg.id,'tracking',pkg.carrier_tracking,'status',pkg.status)order by pkg.id)into result_manifest from public.shipment_manifest_members m join public.packages pkg on pkg.id=m.package_id where m.consolidation_id=p_id;
  end if;
  if p_action='close'and exists(select 1 from public.shipment_manifest_members m join public.packages pkg on pkg.id=m.package_id where m.consolidation_id=p_id and pkg.status not in('delivered','returned','cancelled'))then raise exception 'Resolve each package before closing';end if;
  if p_action='cancel'and exists(select 1 from public.shipment_manifest_members where consolidation_id=p_id)then raise exception 'Remove draft memberships before cancellation';end if;
  update public.shipment_consolidations set status=new_status,manifest=case when p_action='dispatch'then result_manifest else manifest end where id=p_id;
 end if;
 update public.shipment_consolidations set version=version+1,updated_at=now()where id=p_id;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,before_data,after_data,reason)select auth.uid(),'consolidation',p_id,'consolidation_'||p_action,before_json,jsonb_build_object('status',status,'version',version,'partner_reference',partner_reference,'package_id',p_package,'manifest',manifest),p_reason from public.shipment_consolidations where id=p_id;
end$$;
create function public.manage_consolidation(p_id uuid,p_version integer,p_action text,p_package uuid,p_partner_reference text,p_reason text)returns void language sql security invoker set search_path='' as $$select private.manage_consolidation(p_id,p_version,p_action,p_package,p_partner_reference,p_reason)$$;
revoke all on function private.manage_consolidation(uuid,integer,text,uuid,text,text),public.manage_consolidation(uuid,integer,text,uuid,text,text)from public,anon,service_role;
grant execute on function private.manage_consolidation(uuid,integer,text,uuid,text,text),public.manage_consolidation(uuid,integer,text,uuid,text,text)to authenticated;
create or replace function private.record_billing_costs(p_id uuid,p_version integer,p_costs jsonb,p_evidence text)returns void language plpgsql security definer set search_path='' as $$
declare i public.billing_invoices;k text;v jsonb;n integer;begin
i:=private.billing_lock(p_id,p_version);
if jsonb_typeof(p_costs)is distinct from 'object'or (select count(*)from jsonb_object_keys(p_costs))<>6 or p_evidence is null or length(trim(p_evidence))not between 5 and 2000 then raise exception 'Explicit actual cost inputs and source required';end if;
foreach k in array array['freight','receiving','consolidation','payment','last_mile','other']loop v:=p_costs->k;if v is null or (v<>'null'::jsonb and (jsonb_typeof(v)<>'number'or(v::text)::numeric<0 or(v::text)::numeric<>trunc((v::text)::numeric)or(v::text)::numeric>99999999999))then raise exception 'Costs must be known non-negative JMD cents or explicit unknown null';end if;end loop;
select coalesce(max(revision),0)+1 into n from public.billing_cost_records where invoice_id=p_id;
insert into public.billing_cost_records(invoice_id,revision,amounts_jmd_cents,evidence,actor_id)values(p_id,n,p_costs,p_evidence,auth.uid());
update public.billing_invoices set version=version+1,updated_at=now()where id=p_id;
insert into public.audit_logs(actor_id,entity_type,entity_id,action,before_data,after_data,reason)values(auth.uid(),'invoice',p_id,'actual_costs_recorded',(select jsonb_build_object('revision',revision,'amounts_jmd_cents',amounts_jmd_cents)from public.billing_cost_records where invoice_id=p_id and revision=n-1),jsonb_build_object('revision',n,'amounts_jmd_cents',p_costs),p_evidence);end
$$;

commit;
