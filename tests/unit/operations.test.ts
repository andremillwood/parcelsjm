import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { workspaceSchemas } from "../../lib/workspace/schema";
import { readJson } from "../../lib/http/input";
test("workspace validation rejects forged status, invalid amounts and cross-origin/oversized requests", async () => {
  assert.equal(
    workspaceSchemas.event.safeParse({
      packageId: "forged",
      status: "delivered",
    }).success,
    false,
  );
  assert.equal(
    workspaceSchemas["pre-alert"].safeParse({ value: -10 }).success,
    false,
  );
  await assert.rejects(
    readJson(
      new Request("https://local.test/api", {
        method: "POST",
        headers: {
          origin: "https://evil.test",
          "content-type": "application/json",
        },
        body: "{}",
      }),
    ),
    /this website/,
  );
  await assert.rejects(
    readJson(
      new Request("https://local.test/api", {
        method: "POST",
        headers: {
          origin: "https://local.test",
          "content-type": "application/json",
        },
        body: "x".repeat(9000),
      }),
    ),
    /too large/,
  );
});
test("package operations enforce ownership, staff roles, transitions, concurrency, audit and deferred outbox", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create schema auth;grant usage on schema public,auth to anon,authenticated;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;",
    );
    for (const file of [
      "20261011215251_identity_and_shipping_accounts.sql",
      "20261011221056_package_operations.sql",
    ])
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    const a = "00000000-0000-4000-8000-000000000011",
      b = "00000000-0000-4000-8000-000000000012",
      staff = "00000000-0000-4000-8000-000000000013",
      support = "00000000-0000-4000-8000-000000000014";
    for (const id of [a, b, staff, support])
      await db.query(
        'insert into auth.users values($1,now(),\'{"full_name":"Test Person","phone":"8765550100","policy_version":"test"}\')',
        [id],
      );
    await db.query(
      "insert into public.admin_role_assignments(profile_id,role)values($1,'owner'),($2,'support')",
      [staff, support],
    );
    await db.exec(
      "update public.profiles set account_status='active';set role authenticated",
    );
    const as = async (id: string) =>
      db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await as(a);
    const create =
        "select public.create_pre_alert($1,'TEST-TRACK','Test store','','Test goods',1,12.50,'USD','') as id",
      request = "00000000-0000-4000-8000-000000000099";
    const pkg = (await db.query<{ id: string }>(create, [request])).rows[0].id;
    assert.equal(
      (await db.query<{ id: string }>(create, [request])).rows[0].id,
      pkg,
    );
    await assert.rejects(
      db.query("update public.packages set status='in_transit'"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "select public.record_package_event($1,'pre_alerted','received_us','Test evidence','Test reason',now())",
        [pkg],
      ),
      /Access denied/,
    );
    await as(b);
    assert.equal(
      (await db.query("select * from public.packages")).rows.length,
      0,
    );
    await as(support);
    await assert.rejects(
      db.query(
        "select public.record_intake('TEST-TRACK','Test evidence','Test reason')",
      ),
      /Access denied/,
    );
    await as(staff);
    await assert.rejects(
      db.query(
        "select public.record_package_event($1,'pre_alerted','arrived_jm','Test evidence','Test reason',now())",
        [pkg],
      ),
      /Invalid shipment transition/,
    );
    const intake = (
      await db.query<{ id: string }>(
        "select public.record_intake('TEST-TRACK','Fixture receipt','Fixture reason')as id",
      )
    ).rows[0].id;
    await db.query("select public.match_intake($1,$2,$3)", [
      intake,
      pkg,
      "Fixture ownership verification",
    ]);
    await assert.rejects(
      db.query("select public.match_intake($1,$2,$3)", [
        intake,
        pkg,
        "Fixture replay",
      ]),
      /changed or unavailable/,
    );
    await assert.rejects(
      db.query(
        "select public.record_package_event($1,'pre_alerted','received_us','Test evidence','Test reason',now())",
        [pkg],
      ),
      /changed or unavailable/,
    );
    await db.query(
      "select public.record_package_event($1,'received_us','processing_us','Fixture scan','Fixture reason',now())",
      [pkg],
    );
    await assert.rejects(
      db.query("delete from public.package_events"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("delete from public.audit_logs"),
      /permission denied/,
    );
    await as(a);
    assert.equal(
      (await db.query("select * from public.package_events")).rows.length,
      2,
    );
    assert.equal(
      (await db.query("select * from public.intake_observations")).rows.length,
      0,
    );
    const ticket = (
      await db.query<{ id: string }>(
        "select public.create_support(gen_random_uuid(),'Test question','Test question with context','')as id",
      )
    ).rows[0].id;
    await as(b);
    assert.equal(
      (await db.query("select * from public.support_requests")).rows.length,
      0,
    );
    await as(support);
    await db.query(
      "select public.resolve_support($1,'Fixture customer response','Fixture resolution')",
      [ticket],
    );
    await as(a);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from public.support_requests",
        )
      ).rows[0].status,
      "resolved",
    );
    await db.exec("reset role");
    assert.equal(
      (
        await db.query(
          "select * from public.event_outbox where state='deferred'",
        )
      ).rows.length,
      2,
    );
    await db.query(
      "update public.profiles set account_status='suspended' where id=$1",
      [a],
    );
    await db.exec("set role authenticated");
    await as(a);
    assert.equal(
      (await db.query("select * from public.packages")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(create, [request]),
      /Active verified account/,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.query("select * from public.packages"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
