begin;
-- Auth's confirmed-create path rewrites the original in-memory metadata during
-- Confirm(), inside the insertion transaction. Permit only that exact replay.
-- Existing identities never acquire a provisioning marker through this migration.
alter table private.signup_identity_details add column provisioning_transaction xid8;
create or replace function private.capture_signup_identity() returns trigger
language plpgsql security definer set search_path='' as $$
declare metadata jsonb:=coalesce(new.raw_user_meta_data,'{}'::jsonb);
begin
  if metadata ? 'trn' or metadata ? 'home_address' then
    if tg_op='UPDATE' then
      if not exists (
        select 1 from private.signup_identity_details d
        where d.user_id=new.id
          and d.provisioning_transaction=pg_current_xact_id()
          and d.created_at=transaction_timestamp()
          and jsonb_typeof(metadata->'trn')='string'
          and jsonb_typeof(metadata->'home_address')='string'
          and d.trn=regexp_replace(btrim(metadata->>'trn'),'[ -]','','g')
          and d.home_address=btrim(metadata->>'home_address')
      ) then
        raise exception using errcode='22023',message='Identity details cannot be changed through Auth metadata';
      end if;
    else
      if jsonb_typeof(metadata->'trn') is distinct from 'string'
         or jsonb_typeof(metadata->'home_address') is distinct from 'string'
         or char_length(btrim(metadata->>'home_address')) not between 10 and 500
         or not (btrim(metadata->>'trn') ~ '^[0-9]{3}[ -]?[0-9]{3}[ -]?[0-9]{3}$') then
        raise exception using errcode='23514',message='Valid signup identity details required';
      end if;
      insert into private.signup_identity_details(user_id,trn,home_address,provisioning_transaction)
      values(new.id,regexp_replace(btrim(metadata->>'trn'),'[ -]','','g'),btrim(metadata->>'home_address'),pg_current_xact_id());
    end if;
  end if;
  -- Never persist identity values in Auth user metadata, including allowed replay.
  new.raw_user_meta_data:=metadata-'trn'-'home_address';
  return new;
end $$;
revoke all on function private.capture_signup_identity() from public,anon,authenticated,service_role;

-- Email signup can also copy its input into auth.identities.identity_data.
-- This is provider-managed data, not an additional identity storage location.
create function private.redact_auth_identity_details() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.identity_data:=coalesce(new.identity_data,'{}'::jsonb)-'trn'-'home_address';
  return new;
end $$;
revoke all on function private.redact_auth_identity_details() from public,anon,authenticated,service_role;
create trigger redact_auth_identity_details before insert or update of identity_data on auth.identities
for each row execute function private.redact_auth_identity_details();
-- Remove only these sensitive fields if an earlier provider copied them.
update auth.identities set identity_data=identity_data-'trn'-'home_address'
where identity_data ? 'trn' or identity_data ? 'home_address';
commit;
