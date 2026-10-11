import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  documentSchemas,
  sniffDocument,
  MAX_DOCUMENT_BYTES,
} from "../../lib/documents/validation";
test("document validation rejects spoofed MIME, oversize, traversal and invalid invoice metadata", () => {
  assert.equal(
    sniffDocument(new TextEncoder().encode("<html>not a PDF</html>")),
    null,
  );
  assert.equal(
    sniffDocument(new TextEncoder().encode("%PDF-1.7\n%%EOF")),
    "application/pdf",
  );
  assert.equal(sniffDocument(new Uint8Array(MAX_DOCUMENT_BYTES + 1)), null);
  const base = {
    requestId: "00000000-0000-4000-8000-000000000001",
    filename: "invoice.pdf",
    mime: "application/pdf",
    size: 100,
    amount: null,
    currency: null,
    merchant: "",
    orderReference: "",
  };
  assert(documentSchemas.intent.safeParse(base).success);
  for (const patch of [
    { filename: "../secret.pdf" },
    { filename: "x\\y.pdf" },
    { filename: "x\u0000.pdf" },
    { size: MAX_DOCUMENT_BYTES + 1 },
    { mime: "image/svg+xml" },
    { amount: -1, currency: "USD" },
    { amount: 1, currency: null },
  ])
    assert(!documentSchemas.intent.safeParse({ ...base, ...patch }).success);
});
test("document RLS, storage quarantine, trusted scan, review history and stale-version protection", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;grant usage on schema public,auth,storage to anon,authenticated,service_role;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb);
 create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant all on storage.objects to authenticated,service_role;`);
    for (const file of [
      "20261011215251_identity_and_shipping_accounts.sql",
      "20261011221056_package_operations.sql",
      "20261011225740_document_intake_review.sql",
    ])
      await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
    const a = "00000000-0000-4000-8000-000000000011",
      b = "00000000-0000-4000-8000-000000000012",
      owner = "00000000-0000-4000-8000-000000000013",
      ops = "00000000-0000-4000-8000-000000000014";
    for (const id of [a, b, owner, ops])
      await db.query("insert into auth.users values($1,now(),'{}')", [id]);
    await db.query(
      "insert into public.admin_role_assignments(profile_id,role)values($1,'owner'),($2,'operations')",
      [owner, ops],
    );
    await db.exec(
      "update public.profiles set account_status='active';set role authenticated",
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
      "select public.create_pre_alert(gen_random_uuid(),'DOC-TEST','Store','','Test goods',1,12,'USD','') id",
    );
    await assert.rejects(
      db.query(
        "select public.request_document($1,$2,'invoice','Please upload purchase invoice')",
        [a, pkg],
      ),
      /Access denied/,
    );
    await as(owner);
    await assert.rejects(
      db.query(
        "select public.request_document($1,$2,'invoice','Please upload purchase invoice')",
        [b, pkg],
      ),
      /ownership mismatch/,
    );
    const request = await scalar(
      "select public.request_document($1,$2,'invoice','Please upload purchase invoice') id",
      [a, pkg],
    );
    const reserve =
      "select public.reserve_document_upload($1,'invoice.pdf','application/pdf',20,12,'USD','Store','Order1') id";
    await as(b);
    assert.equal(
      (await db.query("select * from public.document_requests")).rows.length,
      0,
    );
    await assert.rejects(db.query(reserve, [request]), /unavailable/);
    await as(a);
    const upload = await scalar(reserve, [request]);
    await assert.rejects(db.query(reserve, [request]), /already reserved/);
    const path = await scalar(
      "select object_path id from public.document_uploads where id=$1",
      [upload],
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name)values('customer-documents','wrong/path.pdf')",
      ),
      /row-level security/,
    );
    await db.query(
      "insert into storage.objects(bucket_id,name)values('customer-documents',$1)",
      [path],
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("update public.document_requests set status='approved'"),
      /permission denied/,
    );
    const hash = "a".repeat(64);
    await assert.rejects(
      db.query(
        "select public.complete_document_upload($1,'application/pdf',20,$2,true)",
        [upload, hash],
      ),
      /permission denied/,
    );
    await db.exec(
      "reset role;set role service_role;select set_config('request.jwt.claim.sub','',false)",
    );
    await db.query(
      "select public.complete_document_upload($1,'application/pdf',20,$2,true)",
      [upload, hash],
    );
    await as(owner);
    await assert.rejects(
      db.query(
        "select public.review_document($1,1,'uploaded','approved','Looks appropriate for purchase')",
        [request],
      ),
      /clean scan/,
    );
    await assert.rejects(
      db.query("select public.authorize_document_download($1)", [upload]),
      /unavailable/,
    );
    await assert.rejects(
      db.query(
        "select public.record_document_scan($1,$2,'clean','Forged evidence')",
        [upload, hash],
      ),
      /permission denied/,
    );
    await db.exec(
      "reset role;set role service_role;select set_config('request.jwt.claim.sub','',false)",
    );
    await assert.rejects(
      db.query(
        "select public.record_document_scan($1,$2,'clean','Local test scanner fixture')",
        [upload, "b".repeat(64)],
      ),
      /Invalid scan/,
    );
    await db.query(
      "select public.record_document_scan($1,$2,'clean','Local unit-test scanner fixture; not an external scan')",
      [upload, hash],
    );
    await as(ops);
    await assert.rejects(
      db.query("select public.authorize_document_download($1)", [upload]),
      /unavailable/,
    );
    await assert.rejects(
      db.query(
        "select public.review_document($1,1,'under_review','approved','Invoice has required information')",
        [request],
      ),
      /Access denied/,
    );
    await as(owner);
    assert.equal(
      await scalar("select public.authorize_document_download($1) id", [
        upload,
      ]),
      path,
    );
    await db.query(
      "select public.review_document($1,1,'under_review','rejected','Please upload the full invoice showing all purchased items')",
      [request],
    );
    await assert.rejects(
      db.query(
        "select public.review_document($1,1,'under_review','approved','Invoice has required information')",
        [request],
      ),
      /changed/,
    );
    await as(a);
    const replacement = await scalar(reserve, [request]);
    assert.notEqual(upload, replacement);
    assert.equal(
      (
        await db.query(
          "select * from public.document_history where request_id=$1",
          [request],
        )
      ).rows.length,
      4,
    );
    await as(b);
    assert.equal(
      (await db.query("select * from public.document_uploads")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.document_history")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.authorize_document_download($1)", [upload]),
      /unavailable/,
    );
    await as(owner);
    await db.query(
      "select public.review_document($1,2,'rejected','waived','Alternative verified evidence satisfies this requirement')",
      [request],
    );
    assert.equal(
      await scalar(
        "select document_state id from public.packages where id=$1",
        [pkg],
      ),
      "approved",
    );
    assert.equal(
      await scalar("select status id from public.packages where id=$1", [pkg]),
      "pre_alerted",
    );
    await db.exec("reset role");
    assert.equal(
      (await db.query("select * from public.document_outbox")).rows.length,
      5,
    );
    assert.equal(
      (await db.query("select * from public.document_history")).rows.length,
      5,
    );
    await as(owner);
    const profileRequest = await scalar(
      "select public.request_document($1,null,'invoice','Upload invoice for the profile test') id",
      [a],
    );
    await as(a);
    const cleanUpload = await scalar(reserve, [profileRequest]);
    const cleanPath = await scalar(
      "select object_path id from public.document_uploads where id=$1",
      [cleanUpload],
    );
    await db.query(
      "insert into storage.objects(bucket_id,name)values('customer-documents',$1)",
      [cleanPath],
    );
    await db.exec(
      "reset role;set role service_role;select set_config('request.jwt.claim.sub','',false)",
    );
    await db.query(
      "select public.complete_document_upload($1,'application/pdf',20,$2,true)",
      [cleanUpload, hash],
    );
    await db.query(
      "select public.record_document_scan($1,$2,'error','Unit-test scanner unavailable fixture')",
      [cleanUpload, hash],
    );
    await as(owner);
    await assert.rejects(
      db.query("select public.authorize_document_download($1)", [cleanUpload]),
      /unavailable/,
    );
    await db.exec(
      "reset role;set role service_role;select set_config('request.jwt.claim.sub','',false)",
    );
    await db.query(
      "select public.record_document_scan($1,$2,'clean','Local unit-test fixture; not a real scan')",
      [cleanUpload, hash],
    );
    await as(owner);
    await db.query(
      "select public.review_document($1,1,'under_review','approved','Verified invoice fields in local test fixture')",
      [profileRequest],
    );
    assert.equal(
      await scalar(
        "select status id from public.document_requests where id=$1",
        [profileRequest],
      ),
      "approved",
    );
    await assert.rejects(
      db.query(
        "select public.review_document($1,1,'approved','rejected','Cannot overwrite a terminal approval')",
        [profileRequest],
      ),
      /changed/,
    );
    await as(a);
    assert.equal(
      await scalar("select public.authorize_document_download($1) id", [
        cleanUpload,
      ]),
      cleanPath,
    );
    // A clean scan alone cannot approve a superseded upload or change shipment status.
    await as(a);
    await assert.rejects(
      db.query("delete from public.document_history"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query(
      "update public.profiles set account_status='suspended' where id=$1",
      [a],
    );
    await as(a);
    assert.equal(
      (await db.query("select * from public.document_uploads")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
