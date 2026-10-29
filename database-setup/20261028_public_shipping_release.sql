-- Parcels JA release migration, 28 October 2026.
-- Run ONCE in the Supabase SQL Editor for project pftjfzmbqqzzfxgypwkl.
-- Do not rerun historical identity/billing/email migrations.
-- This script does not enable signup, send emails, or install Auth email templates.
begin;
do $preflight$
begin
 if to_regclass('public.billing_invoices') is null or to_regclass('private.signup_identity_details') is null then
  raise exception 'Apply the existing main-branch identity and billing migrations before this release';
 end if;
 if to_regclass('public.pickup_locations') is not null or exists(select 1 from information_schema.columns where table_schema='public' and table_name='warehouses' and column_name='signup_default')then
  raise exception 'This release is already wholly or partly installed. Do not rerun the bundle; check the two individual migrations.';
 end if;
end $preflight$;
-- 20261028043614_public_fulfillment.sql
create table public.pickup_locations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(btrim(name)) between 2 and 120),
 address text not null check(length(btrim(address)) between 10 and 500), parish text not null check(length(btrim(parish)) between 2 and 80),
 hours text not null check(length(btrim(hours)) between 3 and 300), active boolean not null default true
);
create table public.fulfillment_preferences (
 profile_id uuid primary key references public.profiles(id), method text not null check(method in('delivery','pickup')),
 address text not null default '' check(length(address)<=500), location_id uuid references public.pickup_locations(id),
 check(method<>'delivery' or length(btrim(address))>=10)
);
create table public.package_fulfillment (
 package_id uuid primary key references public.packages(id), profile_id uuid not null references public.profiles(id),
 method text not null check(method in('delivery','pickup')), address text not null default '' check(length(address)<=500),
 location_id uuid references public.pickup_locations(id), check(method<>'delivery' or length(btrim(address))>=10)
);
create table public.pickup_tickets (
 id uuid primary key default gen_random_uuid(), package_id uuid not null unique references public.packages(id),
 profile_id uuid not null references public.profiles(id), location_id uuid not null references public.pickup_locations(id),
 location_name text not null, address text not null, hours text not null, available_at timestamptz not null,
 instructions text not null check(length(instructions) between 5 and 1000),
 email_state text not null default 'pending' check(email_state in('pending','accepted','review')),
 created_at timestamptz not null default now()
);
alter table public.pickup_locations enable row level security;
alter table public.fulfillment_preferences enable row level security;
alter table public.package_fulfillment enable row level security;
alter table public.pickup_tickets enable row level security;
revoke all on public.pickup_locations, public.fulfillment_preferences, public.package_fulfillment, public.pickup_tickets from public,anon,authenticated;
grant select on public.pickup_locations, public.fulfillment_preferences, public.package_fulfillment, public.pickup_tickets to authenticated;
grant select,update on public.pickup_tickets to service_role;
create policy locations_read on public.pickup_locations for select to authenticated using(active or private.has_role(array['owner','operations']));
create policy preferences_read on public.fulfillment_preferences for select to authenticated using(profile_id=auth.uid() or private.has_role(array['owner','operations']));
create policy fulfillment_read on public.package_fulfillment for select to authenticated using(profile_id=auth.uid() or private.has_role(array['owner','operations']));
create policy tickets_read on public.pickup_tickets for select to authenticated using(profile_id=auth.uid() or private.has_role(array['owner','operations']));
create index package_fulfillment_profile on public.package_fulfillment(profile_id);
create index pickup_tickets_profile on public.pickup_tickets(profile_id);
create function private.capture_fulfillment_preference() returns trigger language plpgsql security definer set search_path='' as $$
declare d jsonb;
begin
 select raw_user_meta_data into d from auth.users where id=new.id;
 if d->>'fulfillment_method' in('delivery','pickup') then
  insert into public.fulfillment_preferences(profile_id,method,address)values(new.id,d->>'fulfillment_method',case when d->>'fulfillment_method'='delivery' then d->>'delivery_address' else '' end);
  update auth.users set raw_user_meta_data=raw_user_meta_data-'delivery_address'-'fulfillment_method' where id=new.id;
 end if;
 return new;
end $$;
revoke all on function private.capture_fulfillment_preference() from public,anon,authenticated;
create trigger capture_fulfillment_preference after insert on public.profiles for each row execute function private.capture_fulfillment_preference();
create function private.manage_fulfillment(p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; pkg public.packages; loc public.pickup_locations; old_state text; method text; addr text; location uuid; effective timestamptz;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and account_status<>'suspended')then raise exception 'Access denied';end if;
 if p_action in('location','location-status','ticket','customer-status') then
  if not private.has_role(array['owner','operations'])then raise exception 'Access denied';end if;
  if length(btrim(coalesce(p_data->>'reason','')))not between 5 and 2000 then raise exception 'Audit reason required';end if;
 end if;
 if p_action='location' then
  insert into public.pickup_locations(name,address,parish,hours)values(p_data->>'name',p_data->>'address',p_data->>'parish',p_data->>'hours')returning id into result;
 elsif p_action='location-status' then
  result:=(p_data->>'id')::uuid;
  update public.pickup_locations set active=(p_data->>'active')::boolean where id=result;
  if not found then raise exception 'Location unavailable';end if;
 elsif p_action='customer-status' then
  if not private.has_role(array['owner'])then raise exception 'Owner role required';end if;
  result:=(p_data->>'profileId')::uuid;
  if result=auth.uid() or exists(select 1 from public.admin_role_assignments where profile_id=result)then raise exception 'Staff status requires separate administration';end if;
  select account_status into old_state from public.profiles where id=result for update;
  if old_state is distinct from p_data->>'expected' or old_state not in('active','suspended') or p_data->>'status' not in('active','suspended')then raise exception 'Refresh account state';end if;
  update public.profiles set account_status=p_data->>'status' where id=result;
 elsif p_action='fulfillment' then
  result:=(p_data->>'packageId')::uuid;
  select * into pkg from public.packages where id=result for update;
  if pkg.id is null or pkg.profile_id<>auth.uid()then raise exception 'Access denied';end if;
  if exists(select 1 from public.pickup_tickets where package_id=result)then raise exception 'Contact support to change an issued pickup ticket';end if;
  method:=p_data->>'method';addr:=coalesce(p_data->>'address','');location:=nullif(p_data->>'locationId','')::uuid;
  if location is not null and not exists(select 1 from public.pickup_locations where id=location and active)then raise exception 'Location unavailable';end if;
  insert into public.package_fulfillment(package_id,profile_id,method,address,location_id)values(result,auth.uid(),method,case when method='delivery' then addr else '' end,case when method='pickup' then location end)
  on conflict(package_id)do update set method=excluded.method,address=excluded.address,location_id=excluded.location_id;
 elsif p_action='ticket' then
  select * into pkg from public.packages where id=(p_data->>'packageId')::uuid for update;
  if pkg.id is null or pkg.status<>'ready_for_pickup'then raise exception 'Confirm customs, payment and document release readiness first';end if;
  if pkg.document_state in('requested','under_review','rejected')then raise exception 'Resolve outstanding documents before pickup';end if;
  select id into result from public.pickup_tickets where package_id=pkg.id;
  if result is not null then return result;end if;
  if not exists(select 1 from public.profiles where id=pkg.profile_id and account_status='active')then raise exception 'Active customer required';end if;
  select coalesce(f.method,d.method)into method from public.profiles p left join public.fulfillment_preferences d on d.profile_id=p.id left join public.package_fulfillment f on f.package_id=pkg.id where p.id=pkg.profile_id;
  if method is distinct from 'pickup'then raise exception 'Customer must choose pickup first';end if;
  select * into loc from public.pickup_locations where id=(p_data->>'locationId')::uuid and active;
  effective:=(p_data->>'available')::timestamptz;
  if loc.id is null or effective is null then raise exception 'Confirmed location and availability required';end if;
  insert into public.pickup_tickets(package_id,profile_id,location_id,location_name,address,hours,available_at,instructions)
  values(pkg.id,pkg.profile_id,loc.id,loc.name,loc.address,loc.hours,effective,p_data->>'instructions')returning id into result;
 else raise exception 'Action unavailable';end if;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,before_data,after_data,reason)values(auth.uid(),'fulfillment',result,p_action,case when old_state is not null then jsonb_build_object('status',old_state)end,p_data-'address',coalesce(p_data->>'reason','Customer updated package delivery preference'));
 return result;
end $$;
create function public.manage_fulfillment(p_action text,p_data jsonb)returns uuid language sql security invoker set search_path='' as $$select private.manage_fulfillment(p_action,p_data)$$;
revoke all on function private.manage_fulfillment(text,jsonb),public.manage_fulfillment(text,jsonb)from public,anon;
grant execute on function private.manage_fulfillment(text,jsonb),public.manage_fulfillment(text,jsonb)to authenticated;

-- 20261028133912_signup_shipping_address.sql
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

-- Keep standard Supabase migration history aligned with a manual SQL Editor install.
do $history$
begin
 if to_regclass('supabase_migrations.schema_migrations') is not null then
  insert into supabase_migrations.schema_migrations(version,name,statements)values
  ('20261028043614','public_fulfillment',array['Installed from reviewed release SQL bundle']),
  ('20261028133912','signup_shipping_address',array['Installed from reviewed release SQL bundle'])
  on conflict(version)do nothing;
 end if;
end $history$;
commit;

-- Verification: the active default should be 7544 W Mcnab Road / Unit C28.
select name,address_lines,city,region,postal_code,country,active from public.warehouses where signup_default;
select to_regclass('public.pickup_locations') as pickup_locations,to_regclass('public.signup_address_email_jobs') as signup_email_jobs;
