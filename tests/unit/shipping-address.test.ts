import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { formatShippingAddress } from "../../lib/shipping/address";

test("shipping address preserves the full name, both PARJA identifiers and line breaks", () => {
  assert.equal(
    formatShippingAddress({
      fullName: "John Doe",
      prefix: "PARJA",
      customerCode: "1234",
      unit: "Unit C28 PARJA 1234",
      addressLines: ["7544 W Mcnab Road"],
      city: "North Lauderdale",
      region: "Florida",
      postalCode: "33068",
      country: "United States",
    }),
    "John Doe PARJA 1234\n7544 W Mcnab Road\nUnit C28 PARJA 1234\nNorth Lauderdale\nFlorida\n33068\nUnited States",
  );
});
test("signup allocates distinct canonical addresses, supplies email metadata and activates only verified eligible accounts", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role;create schema auth;grant usage on schema public,auth to anon,authenticated;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;",
    );
    for (const file of [
      "20261011215251_identity_and_shipping_accounts.sql",
      "20261014202257_signup_identity_details.sql",
    ])
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    const owner = "00000000-0000-4000-8000-000000000001",
      a = "00000000-0000-4000-8000-000000000002",
      b = "00000000-0000-4000-8000-000000000003",
      c = "00000000-0000-4000-8000-000000000004";
    const meta = (name: string) =>
      JSON.stringify({
        full_name: name,
        phone: "8765550100",
        policy_version: "test",
        trn: "001234567",
        home_address: "10 Test Road, Kingston, Jamaica",
        shipping_address_code: "FORGED",
      });
    await db.query("insert into auth.users values($1,now(),$2)", [
      owner,
      meta("Owner Person"),
    ]);
    await db.query(
      "insert into public.admin_role_assignments(profile_id,role)values($1,'owner')",
      [owner],
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261028133912_signup_shipping_address.sql",
        "utf8",
      ),
    );
    const inserted = await db.query<{
      raw_user_meta_data: Record<string, string>;
    }>(
      "insert into auth.users values($1,null,$2)returning raw_user_meta_data",
      [a, meta("John Doe")],
    );
    const code = inserted.rows[0].raw_user_meta_data.shipping_address_code;
    assert.match(code, /^\d{4,}$/);
    assert.notEqual(code, "FORGED");
    assert.equal(inserted.rows[0].raw_user_meta_data.trn, undefined);
    await db.query("insert into auth.users values($1,null,$2)", [
      b,
      meta("Jane Customer"),
    ]);
    let shipping = (
      await db.query<{
        customer_code: string;
        unit_identifier: string;
        status: string;
        warehouse_id: string;
      }>("select * from public.shipping_accounts where profile_id=$1", [a])
    ).rows[0];
    assert.equal(shipping.customer_code, code);
    assert.equal(shipping.unit_identifier, `Unit C28 PARJA ${code}`);
    assert.equal(shipping.status, "pending");
    const other = (
      await db.query<{ customer_code: string }>(
        "select * from public.shipping_accounts where profile_id=$1",
        [b],
      )
    ).rows[0];
    assert.notEqual(other.customer_code, code);
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    assert.equal(
      (await db.query("select * from public.shipping_accounts")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.warehouses")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select private.assign_signup_shipping($1)", [b]),
      /permission denied/,
    );
    await assert.rejects(
      db.query("update public.shipping_accounts set status='active'"),
      /permission denied/,
    );
    await db.exec("reset role");
    await db.query(
      "update auth.users set email_confirmed_at=now()where id=$1",
      [a],
    );
    shipping = (
      await db.query<typeof shipping>(
        "select * from public.shipping_accounts where profile_id=$1",
        [a],
      )
    ).rows[0];
    assert.equal(shipping.status, "active");
    assert.equal(
      (
        await db.query<{ account_status: string }>(
          "select * from public.profiles where id=$1",
          [a],
        )
      ).rows[0].account_status,
      "active",
    );
    await db.query(
      "update auth.users set email_confirmed_at=now()where id=$1",
      [a],
    );
    assert.equal(
      (
        await db.query(
          "select * from public.shipping_accounts where profile_id=$1",
          [a],
        )
      ).rows.length,
      1,
    );
    await db.query(
      "update public.profiles set account_status='suspended'where id=$1",
      [b],
    );
    await db.query(
      "update auth.users set email_confirmed_at=now()where id=$1",
      [b],
    );
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from public.shipping_accounts where profile_id=$1",
          [b],
        )
      ).rows[0].status,
      "pending",
    );
    await db.query("insert into auth.users values($1,now(),$2)", [
      c,
      meta("Already Confirmed"),
    ]);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from public.shipping_accounts where profile_id=$1",
          [c],
        )
      ).rows[0].status,
      "active",
    );
    await db.exec("set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    assert.equal(
      (await db.query("select * from public.warehouses")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.shipping_accounts")).rows.length,
      1,
    );
    await db.exec("reset role");
    const incomplete = "00000000-0000-4000-8000-000000000005";
    await db.query("insert into auth.users values($1,now(),$2)", [
      incomplete,
      JSON.stringify({
        full_name: "Missing Identity",
        phone: "8765550100",
        policy_version: "test",
      }),
    ]);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from public.shipping_accounts where profile_id=$1",
          [incomplete],
        )
      ).rows[0].status,
      "pending",
    );
    const template = await readFile(
      "email-setup/auth-templates/confirmation.html",
      "utf8",
    );
    assert.match(template, /\.Data.shipping_address_code/);
    assert.match(template, /7544 W Mcnab Road/);
    assert.match(template, /Unit C28 PARJA/);
  } finally {
    await db.close();
  }
});
