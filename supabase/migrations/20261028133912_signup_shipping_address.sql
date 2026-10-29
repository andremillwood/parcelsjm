begin;
alter table public.warehouses add column signup_default boolean not null default false;
create unique index one_signup_warehouse on public.warehouses(signup_default)where signup_default;
-- The owner supplied and authorized this warehouse address on 28 October 2026.
-- Keep existing customer assignments; only unassigned accounts use this default.
insert into public.warehouses(name,provider,address_lines,city,region,postal_code,country,active,verified_at,verified_by,verification_reference,signup_default)
select 'Parcels JA US receiving','Parcels JA',array['7544 W Mcnab Road'],'North Lauderdale','Florida','33068','United States',true,now(),p.id,'Owner supplied US receiving address, 2026-10-28',true
from public.profiles p join public.admin_role_assignments r on r.profile_id=p.id join auth.users u on u.id=p.id
where u.email_confirmed_at is not null and r.role='owner' and p.account_status<>'suspended' order by r.created_at,p.id limit 1;
do $$begin if not exists(select 1 from public.warehouses where signup_default)then raise exception 'An existing owner account is required to record the approved warehouse';end if;end$$;
create sequence private.signup_shipping_number start 1000;
revoke all on sequence private.signup_shipping_number from public,anon,authenticated;
create table private.signup_shipping_allocations(
 profile_id uuid primary key references auth.users(id)on delete cascade deferrable initially deferred,
 customer_code text not null unique
);
alter table private.signup_shipping_allocations enable row level security;
revoke all on private.signup_shipping_allocations from public,anon,authenticated;
create table public.signup_address_email_jobs(
 id uuid primary key references public.shipping_accounts(id)on delete cascade,
 profile_id uuid not null references public.profiles(id), payload jsonb,
 state text not null default 'pending'check(state in('pending','accepted','review')),
 created_at timestamptz not null default now()
);
alter table public.signup_address_email_jobs enable row level security;
revoke all on public.signup_address_email_jobs from public,anon,authenticated;
grant select,update on public.signup_address_email_jobs to service_role;
grant select on public.shipping_accounts,public.warehouses,public.profiles to service_role;
create function private.next_shipping_code()returns text language plpgsql security definer set search_path='' as $$
declare code text;
begin
 loop
  code:=nextval('private.signup_shipping_number')::text;
  exit when not exists(select 1 from public.shipping_accounts where customer_code in(code,'PARJA '||code)) and not exists(select 1 from private.signup_shipping_allocations where customer_code=code);
 end loop;
 return code;
end$$;
revoke all on function private.next_shipping_code()from public,anon,authenticated;
create function private.reserve_signup_shipping()returns trigger language plpgsql security definer set search_path='' as $$
declare code text;
begin
 if length(btrim(coalesce(new.raw_user_meta_data->>'full_name','')))<2 then return new;end if;
 if not exists(select 1 from public.warehouses where signup_default and active)then return new;end if;
 code:=private.next_shipping_code();
 insert into private.signup_shipping_allocations(profile_id,customer_code)values(new.id,code);
 -- These fields personalize the first Auth email only. Never authorize or assign from user metadata.
 new.raw_user_meta_data:=coalesce(new.raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('shipping_address_code',code);
 return new;
end$$;
revoke all on function private.reserve_signup_shipping()from public,anon,authenticated;
create trigger a_reserve_signup_shipping before insert on auth.users for each row execute function private.reserve_signup_shipping();
create function private.keep_signup_shipping_code()returns trigger language plpgsql security definer set search_path='' as $$
declare code text;
begin
 select customer_code into code from private.signup_shipping_allocations where profile_id=new.id;
 if code is not null then new.raw_user_meta_data:=coalesce(new.raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('shipping_address_code',code);end if;
 return new;
end$$;
revoke all on function private.keep_signup_shipping_code()from public,anon,authenticated;
create trigger z_keep_signup_shipping_code before update of raw_user_meta_data on auth.users for each row execute function private.keep_signup_shipping_code();
create function private.activate_signup_shipping(p_profile uuid)returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from private.signup_shipping_allocations a join auth.users u on u.id=a.profile_id where a.profile_id=p_profile and u.email_confirmed_at is not null)then return;end if;
 if not exists(select 1 from private.signup_identity_details where user_id=p_profile)then return;end if;
 update public.profiles set account_status='active',onboarding_completed_at=coalesce(onboarding_completed_at,now()),updated_at=now()
 where id=p_profile and account_status<>'suspended' and consent_at is not null and length(btrim(full_name))>=2 and length(btrim(phone))>=7;
 update public.shipping_accounts s set status='active',activated_at=coalesce(s.activated_at,now())
 where s.profile_id=p_profile and s.status='pending' and exists(select 1 from public.profiles where id=p_profile and account_status='active')
 and exists(select 1 from public.warehouses w where w.id=s.warehouse_id and w.signup_default and w.active);
end$$;
revoke all on function private.activate_signup_shipping(uuid)from public,anon,authenticated;
create function private.assign_signup_shipping(p_profile uuid)returns void language plpgsql security definer set search_path='' as $$
declare w public.warehouses;code text;result uuid;
begin
 if exists(select 1 from public.shipping_accounts where profile_id=p_profile)then return;end if;
 select * into w from public.warehouses where signup_default and active;
 if w.id is null then return;end if;
 select customer_code into code from private.signup_shipping_allocations where profile_id=p_profile;
 if code is null then
  code:=private.next_shipping_code();
  insert into private.signup_shipping_allocations values(p_profile,code);
 end if;
 insert into public.shipping_accounts(profile_id,customer_code,warehouse_id,assigned_prefix,unit_identifier,status,assigned_by)
 values(p_profile,code,w.id,'PARJA','Unit C28 PARJA '||code,'pending',w.verified_by)returning id into result;
 insert into public.signup_address_email_jobs(id,profile_id)values(result,p_profile);
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,after_data,reason)values(null,'shipping_account',result,'signup_assignment',jsonb_build_object('profile_id',p_profile,'warehouse_id',w.id,'customer_code',code),'Automatic allocation using owner approved signup warehouse');
 perform private.activate_signup_shipping(p_profile);
end$$;
revoke all on function private.assign_signup_shipping(uuid)from public,anon,authenticated;
create function private.assign_signup_shipping_trigger()returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.assign_signup_shipping(new.id);return new;end$$;
revoke all on function private.assign_signup_shipping_trigger()from public,anon,authenticated;
create trigger assign_signup_shipping after insert on public.profiles for each row execute function private.assign_signup_shipping_trigger();
create function private.confirm_signup_shipping_trigger()returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.activate_signup_shipping(new.id);return new;end$$;
revoke all on function private.confirm_signup_shipping_trigger()from public,anon,authenticated;
create trigger confirm_signup_shipping after update of email_confirmed_at on auth.users for each row when(new.email_confirmed_at is not null)execute function private.confirm_signup_shipping_trigger();
create function private.complete_signup_shipping_trigger()returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.activate_signup_shipping(new.id);return new;end$$;
revoke all on function private.complete_signup_shipping_trigger()from public,anon,authenticated;
create trigger complete_signup_shipping after update of account_status on public.profiles for each row when(new.account_status='active' and old.account_status is distinct from new.account_status)execute function private.complete_signup_shipping_trigger();
-- Existing accounts without a shipping assignment receive the same address format.
do $$declare p record;begin
 for p in select id from public.profiles where account_status<>'suspended' and length(btrim(full_name))>=2 and not exists(select 1 from public.shipping_accounts where profile_id=profiles.id)order by created_at,id loop
  perform private.assign_signup_shipping(p.id);
 end loop;
end$$;
commit;
