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

test("registration requires TRN and residential address and preserves leading zeros", () => {
  const valid = {
    action: "register",
    email: "test@example.test",
    password: "a-long-test-password",
    fullName: "Test Person",
    phone: "8765550100",
    accountType: "personal",
    consent: true,
    trn: "012-345-678",
    homeAddress: "Test district, Kingston, Jamaica",
  };
  const parsed = authSchema.parse(valid);
  assert.equal(parsed.action === "register" && parsed.trn, "012345678");
  for (const trn of [
    undefined,
    "",
    "12345678",
    "1234567890",
    "abc123456",
    123456789,
  ]) {
    assert.equal(authSchema.safeParse({ ...valid, trn }).success, false);
  }
  for (const homeAddress of [
    undefined,
    "",
    "     ",
    "short",
    "x".repeat(501),
    "Sample\0 district, Jamaica",
  ]) {
    assert.equal(
      authSchema.safeParse({ ...valid, homeAddress }).success,
      false,
    );
  }
  assert.equal(
    authSchema.safeParse({
      ...valid,
      accountType: "business",
      trn: "012 345 678",
    }).success,
    true,
  );
});

test("signup identity is stored privately, removed from metadata, and validated atomically", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role; create schema auth; grant usage on schema public,auth to anon,authenticated; create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb); create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;",
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
    const legacy = "00000000-0000-4000-8000-000000000099";
    await db.query("insert into auth.users values($1,now(),$2)", [
      legacy,
      JSON.stringify({
        full_name: "Legacy Person",
        phone: "8765550100",
        policy_version: "test-only",
      }),
    ]);
    const { readdir } = await import("node:fs/promises");
    const dir = new URL("../../supabase/migrations/", import.meta.url);
    const migration = (await readdir(dir)).find((name) =>
      name.endsWith("_signup_identity_details.sql"),
    );
    assert.ok(migration);
    await db.exec(await readFile(new URL(migration, dir), "utf8"));
    const guard = (await readdir(dir)).find((name) =>
      name.endsWith("_reject_signup_identity_metadata_edits.sql"),
    );
    assert.ok(guard);
    await db.exec(await readFile(new URL(guard, dir), "utf8"));
    const id = "00000000-0000-4000-8000-000000000001";
    await db.query("insert into auth.users values($1,now(),$2)", [
      id,
      JSON.stringify({
        full_name: "Test Person",
        phone: "8765550100",
        policy_version: "test-only",
        trn: "012345678",
        home_address: "Test district, Kingston, Jamaica",
      }),
    ]);
    assert.deepEqual(
      (
        await db.query(
          "select raw_user_meta_data from auth.users where id=$1",
          [id],
        )
      ).rows,
      [
        {
          raw_user_meta_data: {
            full_name: "Test Person",
            phone: "8765550100",
            policy_version: "test-only",
          },
        },
      ],
    );
    assert.deepEqual(
      (
        await db.query(
          "select trn,home_address from private.signup_identity_details",
        )
      ).rows,
      [{ trn: "012345678", home_address: "Test district, Kingston, Jamaica" }],
    );
    for (const metadata of [
      { trn: "123", home_address: "Test district, Kingston, Jamaica" },
      { trn: "012345678" },
      { trn: 123456789, home_address: "Fictional test address, Jamaica" },
    ]) {
      await assert.rejects(
        db.query("insert into auth.users values(gen_random_uuid(),now(),$1)", [
          JSON.stringify(metadata),
        ]),
      );
    }
    assert.equal((await db.query("select * from auth.users")).rows.length, 2);
    await assert.rejects(
      db.query(
        "update auth.users set raw_user_meta_data=raw_user_meta_data||$2 where id=$1",
        [
          id,
          JSON.stringify({
            trn: "999999999",
            home_address: "Changed metadata must not overwrite private record",
          }),
        ],
      ),
      /Identity details cannot be changed/,
    );
    assert.equal(
      (
        await db.query<{ clean: boolean }>(
          "select not(raw_user_meta_data ? 'trn' or raw_user_meta_data ? 'home_address') as clean from auth.users where id=$1",
          [id],
        )
      ).rows[0].clean,
      true,
    );
    assert.equal(
      (
        await db.query<{ trn: string }>(
          "select trn from private.signup_identity_details where user_id=$1",
          [id],
        )
      ).rows[0].trn,
      "012345678",
    );
    const incomplete = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into auth.users values($1,now(),$2)", [
      incomplete,
      JSON.stringify({
        full_name: "Incomplete Person",
        phone: "8765550100",
        policy_version: "test-only",
      }),
    ]);
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      incomplete,
    ]);
    await assert.rejects(
      db.query("select public.complete_onboarding()"),
      /required signup details/,
    );
    await assert.rejects(
      db.query(
        "update public.profiles set identity_required=false where id=$1",
        [incomplete],
      ),
      /permission denied/,
    );
    for (const user of [id, legacy]) {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user,
      ]);
      await db.query("select public.complete_onboarding()");
    }
    await db.exec("reset role");
    for (const role of ["anon", "authenticated", "service_role"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        db.query("select * from private.signup_identity_details"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select private.capture_signup_identity()"),
        /permission denied/,
      );
      await db.exec("reset role");
    }
    await db.query("delete from auth.users where id=$1", [id]);
    assert.equal(
      (await db.query("select * from private.signup_identity_details")).rows
        .length,
      0,
    );
  } finally {
    await db.close();
  }
});
