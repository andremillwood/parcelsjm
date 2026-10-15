import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { listOptions } from "../../lib/workspace/pagination";
import { workspaceSchemas } from "../../lib/workspace/schema";
test("pagination bounds and allowlisted operational validation", () => {
  assert.equal(listOptions({ page: "-1" }).page, 1);
  assert.equal(listOptions({ page: "999999" }).page, 10000);
  assert.equal(listOptions({ page: "2" }).from, 25);
  assert.equal(listOptions({ q: "x%,id.eq.secret" }).search, "xideqsecret");
  assert(
    !workspaceSchemas.queue.safeParse({ id: "bad", priority: 99, version: 0 })
      .success,
  );
  assert(
    !workspaceSchemas.correction.safeParse({ status: "delivered" }).success,
  );
});
test("source queues, scoped assignment, stale writes, pagination and append-only corrections", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;grant usage on schema public,auth,storage to anon,authenticated,service_role;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb);
 create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant all on storage.objects to authenticated,service_role;`);
    for (const f of [
      "20261011215251_identity_and_shipping_accounts.sql",
      "20261011221056_package_operations.sql",
      "20261011225740_document_intake_review.sql",
      "20261015144005_operations_queues_and_corrections.sql",
    ])
      await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
    const a = "00000000-0000-4000-8000-000000000011",
      b = "00000000-0000-4000-8000-000000000012",
      owner = "00000000-0000-4000-8000-000000000013",
      ops = "00000000-0000-4000-8000-000000000014",
      support = "00000000-0000-4000-8000-000000000015";
    for (const id of [a, b, owner, ops, support])
      await db.query("insert into auth.users values($1,now(),'{}')", [id]);
    await db.query(
      "insert into public.admin_role_assignments(profile_id,role)values($1,'owner'),($2,'operations'),($3,'support')",
      [owner, ops, support],
    );
    await db.exec("update public.profiles set account_status='active'");
    const as = async (id: string) => {
      await db.exec("reset role;set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
    };
    const idOf = async (sql: string, args: unknown[] = []) =>
      (await db.query<{ id: string }>(sql, args)).rows[0].id;
    await as(a);
    const pkg = await idOf(
      "select public.create_pre_alert(gen_random_uuid(),'QUEUE-TRACK','Store','','Sample goods',1,12,'USD','') id",
    );
    const ticket = await idOf(
      "select public.create_support(gen_random_uuid(),'Sample question','Sample question with context','') id",
    );
    assert.equal(
      (await db.query("select * from public.operational_tasks")).rows.length,
      0,
    );
    await as(support);
    assert.equal(
      (await db.query("select * from public.operational_tasks")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.queue_assignees('shipment')")).rows
        .length,
      0,
    );
    await as(owner);
    const task = (
      await db.query<{ id: string; version: number }>(
        "select id,version from public.operational_tasks where kind='shipment' and source_id=$1",
        [pkg],
      )
    ).rows[0];
    await assert.rejects(
      db.query("update public.operational_tasks set state='closed'"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "select public.manage_operational_task($1,$2,$3,3,null,'Sample assignment')",
        [task.id, task.version, a],
      ),
      /Assignee/,
    );
    await db.query(
      "select public.manage_operational_task($1,$2,$3,3,now()-interval '1 hour','Sample assignment')",
      [task.id, task.version, ops],
    );
    await assert.rejects(
      db.query(
        "select public.manage_operational_task($1,$2,null,1,null,'Stale assignment')",
        [task.id, task.version],
      ),
      /changed/,
    );
    await as(support);
    await assert.rejects(
      db.query(
        "select public.manage_operational_task($1,2,null,1,null,'Wrong role assignment')",
        [task.id],
      ),
      /Access denied/,
    );
    await db.query(
      "select public.resolve_support($1,'Sample response for customer','Sample resolution')",
      [ticket],
    );
    assert.equal(
      (
        await db.query<{ state: string }>(
          "select state from public.operational_tasks where source_id=$1",
          [ticket],
        )
      ).rows[0].state,
      "closed",
    );
    await as(ops);
    const first = await idOf(
      "select public.record_package_event($1,'pre_alerted','received_us','Sample evidence','Sample receipt',now()) id",
      [pkg],
    );
    await assert.rejects(
      db.query(
        "select public.correct_package_event($1,$2,'delivered','Sample source','Sample reason','Sample explanation',now())",
        [pkg, first],
      ),
      /only repair or retract/,
    );
    const corrected = await idOf(
      "select public.correct_package_event($1,$2,'pre_alerted','Corrected evidence','Internal error correction','Receipt was assigned to this record in error.',now()) id",
      [pkg, first],
    );
    await assert.rejects(
      db.query(
        "select public.correct_package_event($1,$2,'pre_alerted','Sample source','Sample reason','Stale explanation',now())",
        [pkg, first],
      ),
      /Latest event changed/,
    );
    await assert.rejects(
      db.query("update public.package_events set status='delivered'"),
      /permission denied/,
    );
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from public.packages where id=$1",
          [pkg],
        )
      ).rows[0].status,
      "pre_alerted",
    );
    await db.query(
      "select public.correct_package_event($1,$2,'received_us','Restored receipt','Corrected match verified','Receipt evidence has now been confirmed.',now())",
      [pkg, corrected],
    );
    await db.query(
      "select public.record_package_event($1,'received_us','processing_us','Sample source','Sample processing',now())",
      [pkg],
    );
    await as(a);
    const events = (
      await db.query(
        "select * from public.package_events where package_id=$1 order by sequence",
        [pkg],
      )
    ).rows;
    assert.equal(events.length, 4);
    assert.equal(
      (await db.query("select * from public.operational_tasks")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "select public.correct_package_event($1,$2,'pre_alerted','Sample source','Sample reason','Unauthorized correction',now())",
        [pkg, corrected],
      ),
      /Access denied/,
    );
    await as(b);
    assert.equal(
      (await db.query("select * from public.package_events")).rows.length,
      0,
    );
    await db.exec("reset role");
    assert.equal(
      (
        await db.query(
          "select * from public.event_outbox where state='deferred'",
        )
      ).rows.length,
      4,
    );
    assert.equal(
      (
        await db.query(
          "select * from public.audit_logs where action='shipment_corrected'",
        )
      ).rows.length,
      2,
    );
    // More than a former first-100 cap; stable page boundaries and source-detail independence.
    await db.query(
      "insert into public.packages(profile_id,request_id,carrier_tracking,merchant,description,quantity,declared_value,declared_currency) select $1,gen_random_uuid(),'PAGE-'||n,'Store','Sample goods',1,12,'USD' from generate_series(1,130)n",
      [a],
    );
    await as(ops);
    assert.equal(
      (
        await db.query(
          "select * from public.operational_tasks where kind='shipment'",
        )
      ).rows.length,
      131,
    );
    const p1 = (
      await db.query<{ id: string }>(
        "select id from public.operational_tasks order by priority desc,opened_at,id limit 25 offset 0",
      )
    ).rows;
    const p2 = (
      await db.query<{ id: string }>(
        "select id from public.operational_tasks order by priority desc,opened_at,id limit 25 offset 25",
      )
    ).rows;
    assert.equal(p1.filter((p) => p2.some((q) => q.id === p.id)).length, 0);
    await db.exec("reset role");
    await db.query(
      "update public.profiles set account_status='suspended' where id=$1",
      [ops],
    );
    await as(owner);
    await assert.rejects(
      db.query(
        "select public.manage_operational_task($1,(select version from public.operational_tasks where id=$1),$2,1,null,'Suspended assignee')",
        [task.id, ops],
      ),
      /Assignee/,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.query("select * from public.operational_tasks"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
