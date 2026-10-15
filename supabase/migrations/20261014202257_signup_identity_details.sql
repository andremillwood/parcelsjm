begin;
-- Identity is not part of public profiles, Auth metadata, notifications or audit payloads.
create table private.signup_identity_details (
  user_id uuid primary key references auth.users(id) on delete cascade deferrable initially deferred,
  trn text not null check (trn ~ '^[0-9]{9}$'),
  home_address text not null check (char_length(btrim(home_address)) between 10 and 500),
  created_at timestamptz not null default now()
);
alter table private.signup_identity_details enable row level security;
revoke all on private.signup_identity_details from public, anon, authenticated, service_role;

-- Existing profiles are preserved. New customers must have an identity record before activation.
-- Profile column grants do not permit customers to change this flag.
alter table public.profiles add column identity_required boolean not null default false;
alter table public.profiles alter column identity_required set default true;

create function private.capture_signup_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if tg_op = 'INSERT' and (metadata ? 'trn' or metadata ? 'home_address') then
    if jsonb_typeof(metadata->'trn') is distinct from 'string'
       or jsonb_typeof(metadata->'home_address') is distinct from 'string'
       or char_length(btrim(metadata->>'home_address')) not between 10 and 500
       or not (btrim(metadata->>'trn') ~ '^[0-9]{3}[ -]?[0-9]{3}[ -]?[0-9]{3}$') then
      raise exception using errcode='23514', message='Valid signup identity details required';
    end if;
    insert into private.signup_identity_details(user_id,trn,home_address)
    values(new.id,regexp_replace(btrim(metadata->>'trn'),'[ -]','','g'),btrim(metadata->>'home_address'));
  end if;
  -- Metadata edits cannot change private identity details or put them into new session tokens.
  new.raw_user_meta_data := metadata - 'trn' - 'home_address';
  return new;
end $$;
revoke all on function private.capture_signup_identity() from public, anon, authenticated, service_role;
create trigger capture_signup_identity before insert or update of raw_user_meta_data on auth.users
for each row execute function private.capture_signup_identity();

create or replace function private.complete_onboarding() returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then
    raise exception 'Email verification required';
  end if;
  update public.profiles p set onboarding_completed_at=now(),updated_at=now(),account_status='active'
  where p.id=auth.uid() and p.account_status<>'suspended'
    and char_length(trim(p.full_name))>=2 and char_length(trim(p.phone))>=7 and p.consent_at is not null
    and (not p.identity_required
      or exists(select 1 from private.signup_identity_details d where d.user_id=p.id)
      or private.has_role(array['owner','operations','documents','finance','support']));
  if not found then raise exception 'Complete profile, required signup details and policy consent';end if;
end $$;
commit;
