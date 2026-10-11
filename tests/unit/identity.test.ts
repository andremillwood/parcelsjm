import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { safeNext } from "../../lib/auth/config";
import { authSchema } from "../../lib/auth/schema";
test("authentication input and redirects reject unsafe values", () => {
  for (const value of [
    "https://evil.test",
    "//evil.test",
    "/admin",
    "/app/../admin",
    "/app\\evil",
    "/app/%2e%2e/admin",
  ])
    assert.equal(safeNext(value), "/app");
  assert.equal(safeNext("/app/security"), "/app/security");
  assert.equal(
    authSchema.safeParse({
      action: "register",
      email: "a@example.test",
      password: "short",
      fullName: "A Person",
      phone: "8765550100",
      accountType: "personal",
      consent: true,
    }).success,
    false,
  );
});
test("identity RLS isolates customers, denies privilege escalation and audits verified assignments", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create schema auth;grant usage on schema public,auth to anon,authenticated;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`,
    );
    await db.exec(
      await readFile(
        new URL(
          "../../supabase/migrations/20261011215251_identity_and_shipping_accounts.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002",
      staff = "00000000-0000-4000-8000-000000000003";
    for (const id of [a, b, staff])
      await db.query("insert into auth.users values($1,now(),$2)", [
        id,
        JSON.stringify({
          full_name: "Test Person",
          phone: "8765550100",
          policy_version: "test",
          role: "owner",
        }),
      ]);
    await db.query(
      "insert into public.admin_role_assignments(profile_id,role)values($1,'owner')",
      [staff],
    );
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    assert.equal(
      (await db.query("select * from public.profiles")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.admin_role_assignments")).rows
        .length,
      0,
    );
    await assert.rejects(
      db.query("update public.profiles set account_status='active'"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "insert into public.admin_role_assignments(profile_id,role)values($1,'owner')",
        [a],
      ),
      /permission denied/,
    );
    await db.query("select public.complete_onboarding()");
    assert.equal(
      (
        await db.query<{ account_status: string }>(
          "select account_status from public.profiles",
        )
      ).rows[0].account_status,
      "active",
    );
    await assert.rejects(
      db.query(
        "select public.assign_shipping($1,gen_random_uuid(),'CODE','PREFIX','UNIT','Test assignment')",
        [a],
      ),
      /Access denied/,
    );
    await db.exec("reset role");
    const warehouse = (
      await db.query<{ id: string }>(
        "insert into public.warehouses(name,provider,address_lines,city,region,postal_code,country,active,verified_at,verified_by,verification_reference)values('Fictional','Test',array['Test only'],'Test','Test','TEST','US',true,now(),$1,'Fixture evidence')returning id",
        [staff],
      )
    ).rows[0].id;
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    assert.equal(
      (await db.query("select * from public.warehouses")).rows.length,
      0,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      staff,
    ]);
    await db.query(
      "select public.assign_shipping($1,$2,'TEST-1','TEST','TEST UNIT','Fictional verification')",
      [a, warehouse],
    );
    assert.equal(
      (await db.query("select * from public.audit_logs")).rows.length,
      1,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    assert.equal(
      (await db.query("select * from public.warehouses")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.shipping_accounts")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.audit_logs")).rows.length,
      0,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [b]);
    assert.equal(
      (await db.query("select * from public.shipping_accounts")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.warehouses")).rows.length,
      0,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.query("select * from public.profiles"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
