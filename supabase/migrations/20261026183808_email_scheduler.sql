-- Hosted-only infrastructure: pg_cron/pg_net are not supported by PGlite.
begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create or replace function private.dispatch_email_cron() returns bigint
language plpgsql security definer set search_path = '' as $$
declare bearer text; request_id bigint;
begin
  if not exists(select 1 from private.communication_settings where scope='live' and enabled) then
    return null;
  end if;
  select decrypted_secret into bearer from vault.decrypted_secrets
    where name='parcels_email_dispatch_bearer' limit 1;
  if bearer is null or length(bearer)<32 then return null; end if;
  select net.http_post(
    url := 'https://parcelsjm.vercel.app/api/communications/dispatch',
    headers := jsonb_build_object('Authorization','Bearer '||bearer,'Content-Type','application/json'),
    body := '{}'::jsonb, timeout_milliseconds := 60000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function private.dispatch_email_cron() from public,anon,authenticated,service_role;
select cron.schedule('parcels-email-dispatch','* * * * *','select private.dispatch_email_cron();');
commit;
