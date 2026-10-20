begin;
create function private.billing_history_add(p_invoice uuid,p_action text,p_message text,p_reason text,p_before jsonb)returns void language plpgsql security definer set search_path='' as $$declare h uuid;a jsonb;b jsonb;begin
 select jsonb_build_object('status',status,'version',version,'total_cents',total_cents,'adjustment_cents',adjustment_cents,'received_cents',received_cents,'balance_cents',balance_cents,'payment_status',payment_status)into a from public.billing_invoices where id=p_invoice;
 if p_before is not null then b:=jsonb_build_object('status',p_before->'status','version',p_before->'version','total_cents',p_before->'total_cents','adjustment_cents',p_before->'adjustment_cents','received_cents',p_before->'received_cents','balance_cents',p_before->'balance_cents','payment_status',p_before->'payment_status');end if;
 insert into public.billing_history(invoice_id,action,message)values(p_invoice,p_action,p_message)returning id into h;
 insert into public.billing_outbox(history_id)values(h);
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,before_data,after_data,reason)values(auth.uid(),'invoice',p_invoice,p_action,b,jsonb_build_object('history_id',h,'snapshot',a),p_reason);
end$$;
revoke all on function private.billing_history_add(uuid,text,text,text,jsonb)from public,anon,authenticated,service_role;
create or replace function private.billing_history_add(p_invoice uuid,p_action text,p_message text,p_reason text)returns void language sql security definer set search_path='' as $$select private.billing_history_add(p_invoice,p_action,p_message,p_reason,null)$$;
create or replace function private.change_billing_invoice(p_id uuid,p_version integer,p_action text,p_message text,p_reason text)returns void language plpgsql security definer set search_path='' as $$
declare i public.billing_invoices;new_status text;begin
i:=private.billing_lock(p_id,p_version);
if p_reason is null or length(trim(p_reason))not between 5 and 2000 or p_message is null or length(trim(p_message))not between 5 and 1000 then raise exception 'Customer explanation and internal reason required';end if;
new_status:=case when p_action='issue'and i.status='draft'then 'issued' when p_action='dispute'and i.status='issued'then 'disputed'when p_action='resolve_dispute'and i.status='disputed'then 'issued'when p_action='void'and i.status in('draft','issued','disputed')and i.received_cents=0 and i.adjustment_cents=0 then 'void'else null end;
if new_status is null then raise exception 'Invalid invoice action or financial records prevent voiding';end if;
if exists(select 1 from public.packages where id=i.package_id and status in('ready_for_pickup','out_for_delivery','delivered'))and new_status='void'then raise exception 'Cannot void a released invoice';end if;
update public.billing_invoices set status=new_status,issued_at=case when p_action='issue'then now()else issued_at end where id=p_id;
perform private.refresh_invoice(p_id);perform private.billing_history_add(p_id,'invoice_'||p_action,p_message,p_reason,to_jsonb(i));end
$$;
create or replace function private.record_billing_payment(p_id uuid,p_version integer,p_amount bigint,p_channel text,p_reference text,p_evidence text,p_reason text)returns uuid language plpgsql security definer set search_path='' as $$
declare i public.billing_invoices;existing public.billing_payments;result uuid;begin
i:=private.billing_lock(p_id,p_version);
if i.status not in('issued','disputed')or p_amount is null or p_amount<=0 or p_amount>i.balance_cents or p_channel is null or length(trim(p_channel))not between 2 and 80 or p_reference is null or length(trim(p_reference))not between 3 and 160 or p_evidence is null or length(trim(p_evidence))not between 5 and 1000 or p_reason is null or length(trim(p_reason))not between 5 and 2000 then raise exception 'Valid verified payment within outstanding balance required';end if;
-- Unique normalized channel/reference prevents double allocation across invoices.
select * into existing from public.billing_payments where channel=lower(trim(p_channel))and reference=trim(p_reference);
if existing.id is not null then raise exception 'Payment reference already recorded';end if;
insert into public.billing_payments(invoice_id,kind,amount_cents,channel,reference,actor_id)values(p_id,'receipt',p_amount,lower(trim(p_channel)),trim(p_reference),auth.uid())returning id into result;
insert into private.billing_payment_evidence values(result,p_evidence);
perform private.refresh_invoice(p_id);perform private.billing_history_add(p_id,'payment_verified','Payment of JMD '||(p_amount::numeric/100)::text||' verified.',p_reason,to_jsonb(i));return result;end
$$;
create or replace function private.reverse_billing_payment(p_id uuid,p_version integer,p_payment uuid,p_reference text,p_evidence text,p_reason text)returns uuid language plpgsql security definer set search_path='' as $$
declare i public.billing_invoices;r public.billing_payments;result uuid;begin
i:=private.billing_lock(p_id,p_version);
select * into r from public.billing_payments where id=p_payment and invoice_id=p_id and kind='receipt';
if r.id is null or i.status not in('issued','disputed')or exists(select 1 from public.billing_payments where reverses_id=r.id)or p_reference is null or length(trim(p_reference))not between 3 and 160 or p_evidence is null or length(trim(p_evidence))not between 5 and 1000 or p_reason is null or length(trim(p_reason))not between 5 and 2000 then raise exception 'Unreversed payment and reversal evidence required';end if;
insert into public.billing_payments(invoice_id,kind,amount_cents,channel,reference,reverses_id,actor_id)values(p_id,'reversal',r.amount_cents,r.channel,trim(p_reference),r.id,auth.uid())returning id into result;
insert into private.billing_payment_evidence values(result,p_evidence);
perform private.refresh_invoice(p_id);perform private.billing_history_add(p_id,'payment_reversed','A previously verified payment was reversed. Review your balance.',p_reason,to_jsonb(i));return result;end
$$;
create or replace function private.adjust_billing_invoice(p_id uuid,p_version integer,p_kind text,p_amount bigint,p_description text,p_reason text)returns uuid language plpgsql security definer set search_path='' as $$
declare i public.billing_invoices;result uuid;begin
i:=private.billing_lock(p_id,p_version);
if p_amount<0 and not private.has_role(array['owner'])then raise exception 'Credits require owner approval';end if;
if i.status not in('issued','disputed')or p_kind is null or p_kind not in('shipping','duties_tax','handling','local_delivery','storage')or p_amount is null or p_amount=0 or abs(p_amount)>99999999999 or p_description is null or length(trim(p_description))not between 5 and 500 or p_reason is null or length(trim(p_reason))not between 5 and 2000 then raise exception 'Valid adjustment required';end if;
if coalesce((select sum((v->>'amount_cents')::bigint)from jsonb_array_elements(i.lines)v where v->>'kind'=p_kind),0)+coalesce((select sum(amount_cents)from public.billing_adjustments where invoice_id=p_id and kind=p_kind),0)+p_amount<0 then raise exception 'Credit exceeds assessed category charge';end if;
insert into public.billing_adjustments(invoice_id,kind,amount_cents,description,actor_id)values(p_id,p_kind,p_amount,p_description,auth.uid())returning id into result;
perform private.refresh_invoice(p_id);perform private.billing_history_add(p_id,'invoice_adjusted',p_description,p_reason,to_jsonb(i));return result;end
$$;
commit;
