begin;
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
commit;
