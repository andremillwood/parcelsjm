import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const id = "00000000-0000-4000-8000-000000000021";
const base = {
  full_name: "Synthetic Person",
  phone: "8765550100",
  policy_version: "synthetic-test",
};
const identity = {
  ...base,
  trn: "012-345-678",
  home_address: "Synthetic district, Kingston, Jamaica",
};
async function setup() {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create schema auth;grant usage on schema public,auth to anon,authenticated;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create table auth.identities(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete cascade,identity_data jsonb);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`,
  );
  for (const file of [
    "20261011215251_identity_and_shipping_accounts.sql",
    "20261014202257_signup_identity_details.sql",
    "20261015141612_reject_signup_identity_metadata_edits.sql",
  ])
    await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
  return db;
}
const migration = () =>
  readFile(
    "supabase/migrations/20261020151025_fix_signup_identity_provisioning.sql",
    "utf8",
  );
test("reproduces confirmed-create rollback and permits only an exact transaction-local replay", async () => {
  const db = await setup();
  try {
    await db.exec("begin");
    await db.query("insert into auth.users values($1,null,$2)", [
      id,
      JSON.stringify(identity),
    ]);
    await assert.rejects(
      db.query(
        "update auth.users set raw_user_meta_data=$2,email_confirmed_at=now() where id=$1",
        [id, JSON.stringify({ ...identity, email_verified: true })],
      ),
      /cannot be changed/,
    );
    await db.exec("rollback");
    assert.equal((await db.query("select * from auth.users")).rows.length, 0);
    assert.equal(
      (await db.query("select * from private.signup_identity_details")).rows
        .length,
      0,
    );
    await db.exec(await migration());
    await db.exec("begin");
    await db.query("insert into auth.users values($1,null,$2)", [
      id,
      JSON.stringify(identity),
    ]);
    await db.query(
      "update auth.users set raw_user_meta_data=$2,email_confirmed_at=now() where id=$1",
      [id, JSON.stringify({ ...identity, email_verified: true })],
    );
    await db.query("update auth.users set raw_user_meta_data=$2 where id=$1", [
      id,
      JSON.stringify({ ...identity, trn: "012 345 678", email_verified: true }),
    ]);
    await db.exec("commit");
    assert.deepEqual(
      (
        await db.query(
          "select raw_user_meta_data from auth.users where id=$1",
          [id],
        )
      ).rows,
      [{ raw_user_meta_data: { ...base, email_verified: true } }],
    );
    assert.deepEqual(
      (
        await db.query(
          "select trn,home_address from private.signup_identity_details where user_id=$1",
          [id],
        )
      ).rows,
      [{ trn: "012345678", home_address: identity.home_address }],
    );
    // Identical as well as changed values must fail in every later transaction.
    for (const data of [
      identity,
      { ...identity, trn: "999999999" },
      { trn: identity.trn },
      { home_address: identity.home_address },
    ])
      await assert.rejects(
        db.query("update auth.users set raw_user_meta_data=$2 where id=$1", [
          id,
          JSON.stringify(data),
        ]),
        /cannot be changed/,
      );
    await db.query(
      'update auth.users set raw_user_meta_data=raw_user_meta_data||\'{"display_name":"Safe edit"}\' where id=$1',
      [id],
    );
    for (const role of ["anon", "authenticated", "service_role"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        db.query(
          "select provisioning_transaction from private.signup_identity_details",
        ),
        /permission denied/,
      );
      await db.exec("reset role");
    }
  } finally {
    await db.close();
  }
});
test("rejects changed or partial identity even in the insertion transaction; atomic rollback", async () => {
  const db = await setup();
  try {
    await db.exec(await migration());
    for (const data of [
      { ...identity, trn: "999999999" },
      { ...identity, home_address: "Changed district, Sample town, Jamaica" },
      { trn: identity.trn },
      { ...identity, trn: 123456789 },
      { ...identity, home_address: null },
    ]) {
      await db.exec("begin");
      await db.query("insert into auth.users values($1,null,$2)", [
        id,
        JSON.stringify(identity),
      ]);
      await assert.rejects(
        db.query("update auth.users set raw_user_meta_data=$2 where id=$1", [
          id,
          JSON.stringify(data),
        ]),
        /cannot be changed/,
      );
      await db.exec("rollback");
      assert.equal(
        (await db.query("select * from private.signup_identity_details")).rows
          .length,
        0,
      );
    }
  } finally {
    await db.close();
  }
});
test("redacts provider identity copies and preserves legacy identity update denial", async () => {
  const db = await setup();
  try {
    await db.query("insert into auth.users values($1,now(),$2)", [
      id,
      JSON.stringify(identity),
    ]);
    await db.query(
      "insert into auth.identities(user_id,identity_data)values($1,$2)",
      [id, JSON.stringify({ ...identity, sub: id, email_verified: true })],
    );
    await db.exec(await migration());
    assert.deepEqual(
      (await db.query("select identity_data from auth.identities")).rows,
      [{ identity_data: { ...base, sub: id, email_verified: true } }],
    );
    await db.query(
      "insert into auth.identities(user_id,identity_data)values($1,$2)",
      [id, JSON.stringify({ ...identity, sub: id })],
    );
    await db.query(
      "update auth.identities set identity_data=identity_data||$1",
      [
        JSON.stringify({
          trn: "999999999",
          home_address: identity.home_address,
          provider: "email",
        }),
      ],
    );
    const rows = await db.query<{ identity_data: Record<string, unknown> }>(
      "select identity_data from auth.identities",
    );
    assert(
      rows.rows.every(
        (r) =>
          !("trn" in r.identity_data) &&
          !("home_address" in r.identity_data) &&
          r.identity_data.provider === "email",
      ),
    );
    assert.equal(
      (
        await db.query<{ x: null }>(
          "select provisioning_transaction x from private.signup_identity_details where user_id=$1",
          [id],
        )
      ).rows[0].x,
      null,
    );
    await assert.rejects(
      db.query("update auth.users set raw_user_meta_data=$2 where id=$1", [
        id,
        JSON.stringify(identity),
      ]),
      /cannot be changed/,
    );
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.query("select public.complete_onboarding()");
    await db.exec("reset role");
    await db.query("delete from public.profiles where id=$1", [id]);
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
