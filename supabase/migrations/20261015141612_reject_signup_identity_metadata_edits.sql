begin;
-- Reject edits before the Auth provider can echo sensitive input into SDK session storage.
create or replace function private.capture_signup_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if tg_op = 'UPDATE' and (metadata ? 'trn' or metadata ? 'home_address') then
    raise exception using errcode='22023', message='Identity details cannot be changed through Auth metadata';
  end if;
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
commit;
