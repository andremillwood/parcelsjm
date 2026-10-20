begin;
create unique index billing_payment_reference_casefold on public.billing_payments(lower(channel),lower(reference));
create or replace function private.record_billing_payment(p_id uuid,p_version integer,p_amount bigint,p_channel text,p_reference text,p_evidence text,p_reason text)returns uuid language plpgsql security definer set search_path='' as $$
declare i public.billing_invoices;existing public.billing_payments;result uuid;begin
i:=private.billing_lock(p_id,p_version);
if i.status not in('issued','disputed')or p_amount is null or p_amount<=0 or p_amount>i.balance_cents or p_channel is null or length(trim(p_channel))not between 2 and 80 or p_reference is null or length(trim(p_reference))not between 3 and 160 or p_evidence is null or length(trim(p_evidence))not between 5 and 1000 or p_reason is null or length(trim(p_reason))not between 5 and 2000 then raise exception 'Valid verified payment within outstanding balance required';end if;
-- Unique normalized channel/reference prevents double allocation across invoices.
select * into existing from public.billing_payments where channel=lower(trim(p_channel))and lower(reference)=lower(trim(p_reference));
if existing.id is not null then raise exception 'Payment reference already recorded';end if;
insert into public.billing_payments(invoice_id,kind,amount_cents,channel,reference,actor_id)values(p_id,'receipt',p_amount,lower(trim(p_channel)),trim(p_reference),auth.uid())returning id into result;
insert into private.billing_payment_evidence values(result,p_evidence);
perform private.refresh_invoice(p_id);perform private.billing_history_add(p_id,'payment_verified','Payment of JMD '||(p_amount::numeric/100)::text||' verified.',p_reason,to_jsonb(i));return result;end
$$;
commit;
