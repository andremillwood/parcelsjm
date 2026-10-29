import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("manual release bundle applies over current finance and identity schema without weakening release controls", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);grant usage on schema public,auth,storage to anon,authenticated,service_role;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create table auth.identities(id uuid primary key,user_id uuid,identity_data jsonb);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant all on storage.objects to authenticated,service_role;`,
    );
    for (const file of [
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
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    const owner = "00000000-0000-4000-8000-000000000001",
      user = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into auth.users values($1,now(),$2)", [
      owner,
      JSON.stringify({
        full_name: "Owner Person",
        phone: "8765550100",
        policy_version: "test",
      }),
    ]);
    await db.query(
      "insert into public.admin_role_assignments(profile_id,role)values($1,'owner')",
      [owner],
    );
    const bundle = await readFile(
      "database-setup/20261028_public_shipping_release.sql",
      "utf8",
    );
    for (const file of [
      "20261028043614_public_fulfillment.sql",
      "20261028133912_signup_shipping_address.sql",
    ]) {
      const source = (
        await readFile(`supabase/migrations/${file}`, "utf8")
      ).trim();
      assert(
        bundle.includes(source.slice(6, -7).trim()),
        "Bundle must exactly match each source migration",
      );
    }
    await db.exec(bundle);
    assert.equal(
      (await db.query("select * from supabase_migrations.schema_migrations"))
        .rows.length,
      2,
    );
    await db.query("insert into auth.users values($1,now(),$2)", [
      user,
      JSON.stringify({
        full_name: "John Doe",
        phone: "8765550100",
        policy_version: "test",
        trn: "001234567",
        home_address: "10 Test Road, Kingston, Jamaica",
        fulfillment_method: "pickup",
      }),
    ]);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from public.shipping_accounts where profile_id=$1",
          [user],
        )
      ).rows[0].status,
      "active",
    );
    assert.equal(
      (
        await db.query(
          "select * from public.signup_address_email_jobs where profile_id=$1",
          [user],
        )
      ).rows.length,
      1,
    );
    // Existing financial shipment checkpoints and release evidence remain present.
    assert.equal(
      (
        await db.query(
          "select to_regclass('public.shipment_release_checks')as t",
        )
      ).rows.length,
      1,
    );
    await assert.rejects(db.exec(bundle), /already wholly or partly installed/);
    await db.exec("rollback");
  } finally {
    await db.close();
  }
});
