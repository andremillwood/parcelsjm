-- Phase 1 only. No customer authentication, operational data or commercial rules.
begin;
create table public.marketing_inquiries (
  id uuid primary key,
  kind text not null check (kind in ('contact','business','rates')),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null default '' check (char_length(phone) <= 30),
  message text not null check (char_length(message) between 10 and 2000),
  monthly_volume integer check (monthly_volume between 1 and 100000),
  category text check (char_length(category) <= 120),
  consent_at timestamptz not null default now(),
  privacy_version text not null,
  email_hash text not null,
  ip_hash text not null,
  payload_hash text not null,
  created_at timestamptz not null default now(),
  check (kind <> 'business' or (monthly_volume is not null and category is not null and char_length(category) > 0))
);
create index marketing_inquiries_created on public.marketing_inquiries (created_at);
create index marketing_inquiries_email on public.marketing_inquiries (email_hash, created_at);
create index marketing_inquiries_ip on public.marketing_inquiries (ip_hash, created_at);
create table public.marketing_notifications (
  inquiry_id uuid primary key references public.marketing_inquiries(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  provider_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.marketing_inquiries enable row level security;
alter table public.marketing_notifications enable row level security;
revoke all on public.marketing_inquiries, public.marketing_notifications from public, anon, authenticated;
grant select, insert, update, delete on public.marketing_inquiries, public.marketing_notifications to service_role;

-- Server-only atomic insertion and durable rate limits. Global lock bounds abuse
-- across serverless instances and serializes same-request retries.
create function public.submit_marketing_inquiry(p_id uuid, p_data jsonb, p_email_hash text, p_ip_hash text, p_payload_hash text, p_privacy_version text)
returns text language plpgsql security invoker set search_path = '' as $$
declare existing_hash text;
begin
  perform pg_catalog.pg_advisory_xact_lock(73121001);
  select payload_hash into existing_hash from public.marketing_inquiries where id = p_id;
  if found then
    if existing_hash <> p_payload_hash then return 'conflict'; end if;
    return 'accepted';
  end if;
  if (select count(*) from public.marketing_inquiries where created_at > now() - interval '1 hour' and email_hash = p_email_hash) >= 3
    or (select count(*) from public.marketing_inquiries where created_at > now() - interval '1 hour' and ip_hash = p_ip_hash) >= 10
    or (select count(*) from public.marketing_inquiries where created_at > now() - interval '1 hour') >= 100
  then return 'limited'; end if;
  insert into public.marketing_inquiries(id,kind,name,email,phone,message,monthly_volume,category,privacy_version,email_hash,ip_hash,payload_hash)
  values(p_id,p_data->>'kind',p_data->>'name',p_data->>'email',coalesce(p_data->>'phone',''),p_data->>'message',(p_data->>'monthlyVolume')::integer,p_data->>'category',p_privacy_version,p_email_hash,p_ip_hash,p_payload_hash);
  insert into public.marketing_notifications(inquiry_id) values(p_id);
  return 'accepted';
end $$;

-- Lease + stable provider idempotency key prevent concurrent/retried sends.
-- Past 23 hours, leave for operator review; never resend beyond provider's window.
create function public.claim_marketing_notification(p_id uuid, p_token uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.marketing_notifications set status='sending', attempts=attempts+1,
    lease_token=p_token, lease_until=now()+interval '2 minutes'
  where inquiry_id=p_id and status <> 'sent' and attempts < 5
    and created_at > now()-interval '23 hours'
    and (lease_until is null or lease_until < now());
  return found;
end $$;
revoke all on function public.submit_marketing_inquiry(uuid,jsonb,text,text,text,text) from public, anon, authenticated;
revoke all on function public.claim_marketing_notification(uuid,uuid) from public, anon, authenticated;
grant execute on function public.submit_marketing_inquiry(uuid,jsonb,text,text,text,text) to service_role;
grant execute on function public.claim_marketing_notification(uuid,uuid) to service_role;
commit;
