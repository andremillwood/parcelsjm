import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  APPROVED_RATE_CENTS,
  shippingQuote,
  planningContribution,
  moneyCents,
} from "../../lib/billing/pricing";
test("approved brackets, exact cents, ceil boundaries and planning-only contribution", () => {
  for (let i = 1; i <= 10; i++)
    assert.deepEqual(shippingQuote(String(i)), {
      quoteRequired: false,
      billableWeight: i,
      amountCents: APPROVED_RATE_CENTS[i - 1],
    });
  assert.equal(shippingQuote("1.001").billableWeight, 2);
  assert(shippingQuote("10.001").quoteRequired);
  for (const w of ["0", "-1", "NaN", "Infinity", "1.0001"])
    assert.throws(() => shippingQuote(w));
  assert.equal(moneyCents("1095.01"), 109501);
  assert.throws(() => moneyCents("1.001"));
  assert.equal(planningContribution("1")?.planningContributionCents, 14134);
});
test("finance and fulfillment migration applies with ownership and role protections", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;grant usage on schema public,auth,storage to anon,authenticated,service_role;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create table auth.identities(id uuid primary key,user_id uuid,identity_data jsonb);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant all on storage.objects to authenticated,service_role;`,
    );
    for (const f of [
      "20261011215251_identity_and_shipping_accounts.sql",
      "20261011221056_package_operations.sql",
      "20261011225740_document_intake_review.sql",
      "20261014202257_signup_identity_details.sql",
      "20261015141612_reject_signup_identity_metadata_edits.sql",
      "20261015144005_operations_queues_and_corrections.sql",
      "20261020151025_fix_signup_identity_provisioning.sql",
      "20261020152737_billing_collections_and_fulfillment.sql",
      "20261020154651_manual_consolidations_and_finance_audit.sql",
      "20261020155500_exact_financial_audit_snapshots.sql",
      "20261020155756_casefold_payment_references.sql",
    ])
      await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
    const a = "00000000-0000-4000-8000-000000000011",
      b = "00000000-0000-4000-8000-000000000012",
      owner = "00000000-0000-4000-8000-000000000013",
      finance = "00000000-0000-4000-8000-000000000014",
      ops = "00000000-0000-4000-8000-000000000015";
    for (const id of [a, b, owner, finance, ops])
      await db.query(
        'insert into auth.users values($1,now(),\'{"full_name":"Synthetic Person","phone":"8765550100","policy_version":"test"}\')',
        [id],
      );
    await db.exec("update public.profiles set account_status='active'");
    await db.query(
      "insert into public.admin_role_assignments(profile_id,role)values($1,'owner'),($2,'finance'),($3,'operations')",
      [owner, finance, ops],
    );
    const as = async (id: string) => {
      await db.exec("reset role;set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
    };
    const scalar = async (sql: string, args: unknown[] = []) =>
      (await db.query<{ id: string }>(sql, args)).rows[0].id;
    await as(a);
    const pkg = await scalar(
      "select public.create_pre_alert(gen_random_uuid(),'FIN-TEST','Sample store','','Sample goods',1,12,'USD','')id",
    );
    await assert.rejects(
      db.query(
        'select public.create_billing_invoice($1,1,\'{"duties_tax":0,"handling":0,"local_delivery":0,"storage":0}\',\'Verified assessment\',null)',
        [pkg],
      ),
      /Finance/,
    );
    await as(finance);
    const invoice = await scalar(
      'select public.create_billing_invoice($1,1.001,\'{"duties_tax":5000,"handling":0,"local_delivery":0,"storage":0}\',\'Verified assessment\',null)id',
      [pkg],
    );
    const get = async () =>
      (
        await db.query<{
          version: number;
          balance_cents: number;
          total_cents: number;
          payment_status: string;
          status: string;
        }>("select * from public.billing_invoices where id=$1", [invoice])
      ).rows[0];
    assert.equal(Number((await get()).total_cents), 114500);
    await assert.rejects(
      db.query("update public.billing_invoices set total_cents=1"),
      /permission denied/,
    );
    await as(b);
    assert.equal(
      (await db.query("select * from public.billing_invoices")).rows.length,
      0,
    );
    await as(a);
    assert.equal(
      (await db.query("select * from public.billing_invoices")).rows.length,
      0,
    );
    await as(finance);
    await db.query(
      "select public.change_billing_invoice($1,1,'issue','Invoice charges verified','Finance approval')",
      [invoice],
    );
    let i = await get();
    assert.equal(i.status, "issued");
    await as(a);
    assert.equal(
      (await db.query("select * from public.billing_invoices")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.billing_cost_records")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select evidence from public.billing_payments"),
      /does not exist/,
    );
    await assert.rejects(
      db.query("select * from private.billing_payment_evidence"),
      /permission denied/,
    );
    await as(ops);
    await assert.rejects(
      db.query(
        "select public.record_billing_payment($1,2,100,'bank','DENIED','Verified evidence','Denied operations')",
        [invoice],
      ),
      /Finance role/,
    );
    await as(finance);
    await assert.rejects(
      db.query(
        "select public.change_billing_invoice($1,1,'dispute','Disputed charge','Stale update test')",
        [invoice],
      ),
      /changed/,
    );
    const payment = await scalar(
      "select public.record_billing_payment($1,$2,50000,'Bank reference','TX-001','Verified bank evidence','Collection verified')id",
      [invoice, i.version],
    );
    i = await get();
    assert.equal(i.payment_status, "partially_paid");
    assert.equal(Number(i.balance_cents), 64500);
    await assert.rejects(
      db.query(
        "select public.record_billing_payment($1,$2,64501,'Bank reference','TX-002','Verified bank evidence','Collection verified')",
        [invoice, i.version],
      ),
      /within outstanding/,
    );
    await assert.rejects(
      db.query(
        "select public.record_billing_payment($1,$2,100,'Bank reference','TX-001','Verified bank evidence','Collection verified')",
        [invoice, i.version],
      ),
      /already recorded/,
    );
    await assert.rejects(
      db.query(
        "select public.record_billing_payment($1,$2,100,' BANK REFERENCE ','tx-001','Verified duplicate evidence','Casefold duplicate prevention')",
        [invoice, i.version],
      ),
      /already recorded/,
    );
    await db.query(
      "select public.record_billing_payment($1,$2,64500,'Bank reference','TX-002','Verified bank evidence','Collection verified')",
      [invoice, i.version],
    );
    i = await get();
    assert.equal(i.payment_status, "paid");
    await assert.rejects(
      db.query(
        "select public.adjust_billing_invoice($1,$2,'shipping',-100,'Credit for correction','Finance credit')",
        [invoice, i.version],
      ),
      /owner approval/,
    );
    await db.query(
      "select public.reverse_billing_payment($1,$2,$3,'REV-001','Evidence for reversal','Collection reversal')",
      [invoice, i.version, payment],
    );
    i = await get();
    assert.equal(Number(i.balance_cents), 50000);
    await as(owner);
    await db.query(
      "select public.adjust_billing_invoice($1,$2,'shipping',-50000,'Approved service credit','Owner approved correction')",
      [invoice, i.version],
    );
    i = await get();
    assert.equal(i.payment_status, "paid");
    await assert.rejects(
      db.query(
        "select public.adjust_billing_invoice($1,$2,'shipping',-1,'Excess service credit','Owner correction')",
        [invoice, i.version],
      ),
      /Credit exceeds/,
    );
    assert.equal(
      (await db.query("select * from public.billing_adjustments")).rows.length,
      1,
    );
    await db.query(
      'select public.record_billing_costs($1,$2,\'{"freight":null,"receiving":0,"consolidation":null,"payment":0,"last_mile":0,"other":0}\',\'Incomplete actual cost evidence\')',
      [invoice, i.version],
    );
    await as(owner);
    i = await get();
    await assert.rejects(
      db.query(
        "select public.adjust_billing_invoice($1,$2,'storage',-1,'Invalid storage credit','Category floor test')",
        [invoice, i.version],
      ),
      /category/,
    );
    await as(ops);
    assert.equal(
      (await db.query("select * from public.billing_payments")).rows.length,
      0,
    );
    let state = "pre_alerted";
    for (const next of [
      "received_us",
      "processing_us",
      "in_transit",
      "arrived_jm",
      "customs_processing",
      "customs_hold",
      "cleared",
    ]) {
      await db.query(
        "select public.record_package_event($1,$2,$3,'Verified operational evidence','Synthetic operations check',now())",
        [pkg, state, next],
      );
      state = next;
      if (next === "processing_us") {
        const batch = await scalar(
          "select public.create_consolidation('SYNTHETIC-CONSOLIDATION','Verified synthetic batch')id",
        );
        await db.query(
          "select public.manage_consolidation($1,1,'add',$2,'','Synthetic manifest member')",
          [batch, pkg],
        );
        await assert.rejects(
          db.query(
            "select public.manage_consolidation($1,1,'add',$2,'','Stale manifest member')",
            [batch, pkg],
          ),
          /changed/,
        );
        await assert.rejects(
          db.query(
            "select public.manage_consolidation($1,2,'dispatch',null,'','Missing partner reference')",
            [batch],
          ),
          /partner/,
        );
        await db.query(
          "select public.manage_consolidation($1,2,'reference',null,'SYNTHETIC-AWB','Manual AWB verified')",
          [batch],
        );
        await db.query(
          "select public.manage_consolidation($1,3,'dispatch',null,'','Manual dispatch evidence')",
          [batch],
        );
        await assert.rejects(
          db.query(
            "select public.manage_consolidation($1,4,'remove',$2,'','Cannot change sealed manifest')",
            [batch, pkg],
          ),
          /draft/,
        );
        await as(a);
        assert.equal(
          (await db.query("select * from public.shipment_consolidations")).rows
            .length,
          0,
        );
        await as(ops);
      }
    }
    await assert.rejects(
      db.query(
        "select public.record_package_event($1,'cleared','ready_for_pickup','Verified readiness','Synthetic release check',now())",
        [pkg],
      ),
      /verified shipping assignment/,
    );
    await db.exec("reset role");
    const warehouse = await scalar(
      "insert into public.warehouses(name,provider,address_lines,city,region,postal_code,country,active,verified_at,verified_by,verification_reference)values('Synthetic only','Synthetic provider',array['Synthetic street'],'Sample town','Sample region','00000','US',true,now(),$1,'Synthetic assignment evidence')returning id",
      [owner],
    );
    await db.query(
      "insert into public.shipping_accounts(profile_id,customer_code,warehouse_id,assigned_prefix,unit_identifier,status,activated_at,assigned_by)values($1,'SYNTHETIC-CODE',$2,'SAMPLE','UNIT','active',now(),$3)",
      [a, warehouse, owner],
    );
    await as(owner);
    const requirement = await scalar(
      "select public.request_document($1,$2,'invoice','Synthetic purchase invoice requirement')id",
      [a, pkg],
    );
    await as(ops);
    await assert.rejects(
      db.query(
        "select public.record_package_event($1,'cleared','ready_for_pickup','Verified readiness','Document release check',now())",
        [pkg],
      ),
      /document/i,
    );
    await as(owner);
    await db.query(
      "select public.review_document($1,0,'requested','waived','Synthetic alternative evidence verified')",
      [requirement],
    );
    i = await get();
    await db.query(
      "select public.change_billing_invoice($1,$2,'dispute','Synthetic billing dispute','Review pending charge')",
      [invoice, i.version],
    );
    await as(ops);
    await assert.rejects(
      db.query(
        "select public.record_package_event($1,'cleared','ready_for_pickup','Verified readiness','Dispute release check',now())",
        [pkg],
      ),
      /settled|undisputed|invoice/i,
    );
    await as(owner);
    i = await get();
    await db.query(
      "select public.change_billing_invoice($1,$2,'resolve_dispute','Synthetic dispute resolved','Owner verified resolution')",
      [invoice, i.version],
    );
    await as(ops);
    await db.query(
      "select public.record_package_event($1,'cleared','ready_for_pickup','Verified readiness','Synthetic release check',now())",
      [pkg],
    );
    await db.query(
      "select public.record_package_event($1,'ready_for_pickup','delivered','Verified pickup handover','Synthetic release check',now())",
      [pkg],
    );
    await assert.rejects(
      db.query(
        "select public.record_package_event($1,'delivered','in_transit','Invalid reversal','Synthetic check',now())",
        [pkg],
      ),
      /Invalid shipment/,
    );
    assert.equal(
      (await db.query("select * from public.shipment_release_checks")).rows
        .length,
      2,
    );
    await as(finance);
    i = await get();
    await db.query(
      "select public.adjust_billing_invoice($1,$2,'shipping',1000,'Post-handover adjustment','Verified charge correction')",
      [invoice, i.version],
    );
    assert.equal(
      (
        await db.query<{ state: string }>(
          "select state from public.operational_tasks where kind='invoice' and source_id=$1",
          [invoice],
        )
      ).rows[0].state,
      "open",
    );
    await as(a);
    const heavy = await scalar(
      "select public.create_pre_alert(gen_random_uuid(),'FIN-HEAVY','Sample store','','Sample goods',1,12,'USD','')id",
    );
    await as(finance);
    const extras =
      '{"duties_tax":0,"handling":0,"local_delivery":0,"storage":0}';
    await assert.rejects(
      db.query(
        "select public.create_billing_invoice($1,10.001,$2::jsonb,'Manual assessment',null)",
        [heavy, extras],
      ),
      /manual quote/,
    );
    await assert.rejects(
      db.query(
        "select public.approve_billing_quote($1,10.001,500000,'Synthetic quote evidence')",
        [heavy],
      ),
      /Owner/,
    );
    await as(owner);
    await db.query(
      "select public.approve_billing_quote($1,10.001,500000,'Synthetic quote evidence')",
      [heavy],
    );
    const hi = await scalar(
      "select public.create_billing_invoice($1,10.001,$2::jsonb,'Manual assessment',null)id",
      [heavy, extras],
    );
    assert.equal(
      Number(
        (
          await db.query<{ total_cents: number }>(
            "select total_cents from public.billing_invoices where id=$1",
            [hi],
          )
        ).rows[0].total_cents,
      ),
      500000,
    );
    await as(b);
    assert.equal(
      (await db.query("select * from public.billing_invoices")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select * from public.billing_payment_proofs($1)", [invoice]),
      /Finance/,
    );
    await db.exec("reset role");
    const audit = (
      await db.query<{
        before_data: { version: number };
        after_data: { snapshot: { version: number } };
      }>(
        "select before_data,after_data from public.audit_logs where entity_id=$1 and action='invoice_adjusted' order by created_at desc limit 1",
        [invoice],
      )
    ).rows[0];
    assert.equal(
      Number(audit.after_data.snapshot.version),
      Number(audit.before_data.version) + 1,
    );

    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from public.packages where id=$1",
          [pkg],
        )
      ).rows[0].status,
      "delivered",
    );
    assert.equal(
      (
        await db.query<{ state: string }>(
          "select state from public.operational_tasks where kind='shipment' and source_id=$1",
          [pkg],
        )
      ).rows[0].state,
      "closed",
    );
    assert.equal(
      (
        await db.query(
          "select * from public.billing_outbox where state<>'deferred'",
        )
      ).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
