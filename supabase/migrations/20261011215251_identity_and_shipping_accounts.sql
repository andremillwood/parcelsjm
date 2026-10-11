begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check (char_length(full_name)<=120),
 phone text not null default '' check(char_length(phone)<=30),
 account_type text not null default 'personal' check(account_type in ('personal','business')),
 account_status text not null default 'pending_verification' check(account_status in ('pending_verification','active','suspended')),
 policy_version text, consent_at timestamptz,
 onboarding_completed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.admin_role_assignments (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id),
 role text not null check(role in ('owner','operations','documents','finance','support')),
 granted_by uuid references public.profiles(id), created_at timestamptz not null default now(), unique(profile_id,role)
);
create table public.warehouses (
 id uuid primary key default gen_random_uuid(), name text not null, provider text not null,
 address_lines text[] not null check(cardinality(address_lines)>0),city text not null,region text not null,postal_code text not null,country text not null,
 active boolean not null default false,verified_at timestamptz,verified_by uuid references public.profiles(id),verification_reference text,
 check(not active or(verified_at is not null and verified_by is not null and length(verification_reference)>0))
);
create table public.shipping_accounts (
 id uuid primary key default gen_random_uuid(),profile_id uuid not null unique references public.profiles(id),
 customer_code text not null unique,warehouse_id uuid not null references public.warehouses(id),
 assigned_prefix text not null,unit_identifier text not null,status text not null check(status in ('pending','active','suspended')),
 activated_at timestamptz,assigned_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),
 check(status<>'active' or activated_at is not null)
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles(id),entity_type text not null,entity_id uuid not null,
 action text not null,before_data jsonb,after_data jsonb,reason text not null check(char_length(reason) between 5 and 2000),created_at timestamptz not null default now()
);
create index shipping_accounts_warehouse on public.shipping_accounts(warehouse_id);
create index audit_logs_entity on public.audit_logs(entity_type,entity_id,created_at);
create index audit_logs_actor on public.audit_logs(actor_id);

-- Narrow privileged role lookup avoids recursive RLS and never trusts JWT metadata.
create function private.has_role(allowed text[]) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.admin_role_assignments r join public.profiles p on p.id=r.profile_id join auth.users u on u.id=p.id where r.profile_id=auth.uid() and r.role=any(allowed) and p.account_status<>'suspended' and u.email_confirmed_at is not null)
$$;
revoke all on function private.has_role(text[]) from public,anon;
grant execute on function private.has_role(text[]) to authenticated;
create function private.provision_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,full_name,phone,account_type,policy_version,consent_at)
 values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),120),left(coalesce(new.raw_user_meta_data->>'phone',''),30),case when new.raw_user_meta_data->>'account_type'='business' then 'business' else 'personal' end,left(new.raw_user_meta_data->>'policy_version',120),case when new.raw_user_meta_data->>'policy_version' is not null then now() end);
 return new;
end $$;
revoke all on function private.provision_profile() from public,anon,authenticated;
create trigger provision_profile after insert on auth.users for each row execute function private.provision_profile();

alter table public.profiles enable row level security;
alter table public.admin_role_assignments enable row level security;
alter table public.warehouses enable row level security;
alter table public.shipping_accounts enable row level security;
alter table public.audit_logs enable row level security;
revoke all on public.profiles,public.admin_role_assignments,public.warehouses,public.shipping_accounts,public.audit_logs from public,anon,authenticated;
grant select on public.profiles,public.admin_role_assignments,public.warehouses,public.shipping_accounts,public.audit_logs to authenticated;
grant update(full_name,phone,account_type) on public.profiles to authenticated;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or private.has_role(array['owner','operations','support']));
create policy profile_edit on public.profiles for update to authenticated using(id=auth.uid() and account_status<>'suspended') with check(id=auth.uid() and account_status<>'suspended');
create policy own_role_read on public.admin_role_assignments for select to authenticated using(profile_id=auth.uid() or private.has_role(array['owner']));
create policy shipping_read on public.shipping_accounts for select to authenticated using(profile_id=auth.uid() or private.has_role(array['owner','operations']));
create policy warehouse_read on public.warehouses for select to authenticated using(private.has_role(array['owner','operations']) or(active and verified_at is not null and exists(select 1 from public.shipping_accounts s where s.profile_id=auth.uid() and s.warehouse_id=warehouses.id and s.status='active')));
create policy audit_read on public.audit_logs for select to authenticated using(private.has_role(array['owner']));

create function private.complete_onboarding() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Email verification required';end if;
 update public.profiles set onboarding_completed_at=now(),updated_at=now(),account_status='active' where id=auth.uid() and account_status<>'suspended' and char_length(trim(full_name))>=2 and char_length(trim(phone))>=7 and consent_at is not null;
 if not found then raise exception 'Complete profile and policy consent required';end if;
end $$;
create function public.complete_onboarding() returns void language sql security invoker set search_path='' as $$select private.complete_onboarding()$$;
revoke all on function private.complete_onboarding(),public.complete_onboarding() from public,anon;
grant execute on function private.complete_onboarding(),public.complete_onboarding() to authenticated;

create function private.assign_shipping(p_profile uuid,p_warehouse uuid,p_code text,p_prefix text,p_unit text,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.has_role(array['owner','operations']) then raise exception 'Access denied';end if;
 if char_length(trim(p_reason))<5 or char_length(trim(p_code))<1 or char_length(trim(p_unit))<1 then raise exception 'Validated assignment and reason required';end if;
 if not exists(select 1 from public.profiles where id=p_profile and account_status='active') or not exists(select 1 from public.warehouses where id=p_warehouse and active and verified_at is not null) then raise exception 'Active customer and verified warehouse required';end if;
 insert into public.shipping_accounts(profile_id,customer_code,warehouse_id,assigned_prefix,unit_identifier,status,activated_at,assigned_by)
 values(p_profile,p_code,p_warehouse,p_prefix,p_unit,'active',now(),auth.uid()) returning id into result;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,after_data,reason)values(auth.uid(),'shipping_account',result,'assigned',jsonb_build_object('profile_id',p_profile,'warehouse_id',p_warehouse,'customer_code',p_code),p_reason);
 return result;
end $$;
create function public.assign_shipping(p_profile uuid,p_warehouse uuid,p_code text,p_prefix text,p_unit text,p_reason text) returns uuid language sql security invoker set search_path='' as $$ select private.assign_shipping(p_profile,p_warehouse,p_code,p_prefix,p_unit,p_reason) $$;
revoke all on function private.assign_shipping(uuid,uuid,text,text,text,text),public.assign_shipping(uuid,uuid,text,text,text,text) from public,anon;
grant execute on function private.assign_shipping(uuid,uuid,text,text,text,text),public.assign_shipping(uuid,uuid,text,text,text,text) to authenticated;
commit;
