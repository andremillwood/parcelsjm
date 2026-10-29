import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { workspaceSchemas } from "../../lib/workspace/schema";

test("delivery validation requires a real address and ticket fields", () => {
  assert.equal(
    workspaceSchemas.fulfillment.safeParse({
      packageId: "00000000-0000-4000-8000-000000000001",
      method: "delivery",
      address: "",
    }).success,
    false,
  );
  assert.equal(
    workspaceSchemas.ticket.safeParse({
      packageId: "00000000-0000-4000-8000-000000000001",
    }).success,
    false,
  );
});
test("fulfillment enforces ownership, staff roles, confirmed pickup, ticket idempotency and location snapshots", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role;create schema auth;grant usage on schema public,auth to anon,authenticated;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;",
    );
    for (const file of [
      "20261011215251_identity_and_shipping_accounts.sql",
      "20261011221056_package_operations.sql",
      "20261014202257_signup_identity_details.sql",
      "20261028043614_public_fulfillment.sql",
    ])
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    const a = "00000000-0000-4000-8000-000000000011",
      b = "00000000-0000-4000-8000-000000000012",
      staff = "00000000-0000-4000-8000-000000000013";
    for (const id of [a, b, staff])
      await db.query("insert into auth.users values($1,now(),$2)", [
        id,
        JSON.stringify({
          full_name: "Test Person",
          phone: "8765550100",
          policy_version: "test",
          trn: "001234567",
          home_address: "10 Sample Avenue, Kingston, Jamaica",
          fulfillment_method: id === b ? "delivery" : "pickup",
          ...(id === b
            ? { delivery_address: "10 Sample Avenue, Kingston, Jamaica" }
            : {}),
        }),
      ]);
    const metadata = await db.query<{
      raw_user_meta_data: Record<string, unknown>;
    }>("select raw_user_meta_data from auth.users where id=$1", [b]);
    assert.equal(
      metadata.rows[0].raw_user_meta_data.delivery_address,
      undefined,
    );
    assert.equal(metadata.rows[0].raw_user_meta_data.trn, undefined);
    const defaultDelivery = await db.query<{ address: string }>(
      "select address from public.fulfillment_preferences where profile_id=$1",
      [b],
    );
    assert.equal(
      defaultDelivery.rows[0].address,
      "10 Sample Avenue, Kingston, Jamaica",
    );
    await db.query(
      "insert into public.admin_role_assignments(profile_id,role)values($1,'owner')",
      [staff],
    );
    await db.exec(
      "update public.profiles set account_status='active';set role authenticated",
    );
    const as = async (id: string) =>
      db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    const manage = async (action: string, data: Record<string, unknown>) =>
      (
        await db.query<{ id: string }>(
          "select public.manage_fulfillment($1,$2) as id",
          [action, JSON.stringify(data)],
        )
      ).rows[0].id;
    await as(a);
    await assert.rejects(
      manage("location", {
        name: "Test location",
        address: "10 Test Road Kingston",
        parish: "Kingston",
        hours: "Mon–Fri 9–5",
        reason: "Verified location",
      }),
      /Access denied/,
    );
    const pkg = (
      await db.query<{ id: string }>(
        "select public.create_pre_alert('00000000-0000-4000-8000-000000000099','TEST-TRACK','Test store','','Test goods',1,12.50,'USD','') as id",
      )
    ).rows[0].id;
    await as(staff);
    const loc = await manage("location", {
      name: "Test location",
      address: "10 Test Road Kingston",
      parish: "Kingston",
      hours: "Mon–Fri 9–5",
      reason: "Verified location",
    });
    await as(b);
    await assert.rejects(
      manage("fulfillment", {
        packageId: pkg,
        method: "pickup",
        locationId: loc,
      }),
      /Access denied/,
    );
    await as(a);
    await manage("fulfillment", {
      packageId: pkg,
      method: "pickup",
      locationId: loc,
    });
    await assert.rejects(
      db.query("update public.package_fulfillment set profile_id=$1", [b]),
      /permission denied/,
    );
    await as(staff);
    const ticketData = {
      packageId: pkg,
      locationId: loc,
      available: new Date().toISOString(),
      instructions: "Bring this ticket and identification",
      reason: "Manifest confirms package available",
    };
    await assert.rejects(manage("ticket", ticketData), /readiness/);
    for (const [expected, status] of [
      ["pre_alerted", "received_us"],
      ["received_us", "processing_us"],
      ["processing_us", "in_transit"],
      ["in_transit", "arrived_jm"],
    ])
      await db.query(
        "select public.record_package_event($1,$2,$3,'DMD manifest 123','Verified manifest arrival',now())",
        [pkg, expected, status],
      );
    await db.exec(
      "reset role; alter table public.packages drop constraint packages_status_check; alter table public.packages add constraint packages_status_check check(status in('pre_alerted','received_us','processing_us','in_transit','arrived_jm','ready_for_pickup'));",
    );
    await db.query(
      "update public.packages set status='ready_for_pickup'where id=$1",
      [pkg],
    );
    await db.exec("set role authenticated");
    await as(staff);
    const ticket = await manage("ticket", ticketData);
    assert.equal(await manage("ticket", ticketData), ticket);
    await manage("location-status", {
      id: loc,
      active: "false",
      reason: "Temporarily closed",
    });
    await as(a);
    assert.equal(
      (await db.query("select * from public.pickup_locations")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query<{ address: string }>(
          "select * from public.pickup_tickets",
        )
      ).rows[0].address,
      "10 Test Road Kingston",
    );
    await assert.rejects(
      manage("fulfillment", {
        packageId: pkg,
        method: "delivery",
        address: "20 Another Road Kingston",
      }),
      /issued pickup ticket/,
    );
    await as(b);
    assert.equal(
      (await db.query("select * from public.pickup_tickets")).rows.length,
      0,
    );
    await assert.rejects(
      manage("customer-status", {
        profileId: a,
        expected: "active",
        status: "suspended",
        reason: "Verified request",
      }),
      /Access denied/,
    );
    await as(staff);
    await manage("customer-status", {
      profileId: a,
      expected: "active",
      status: "suspended",
      reason: "Verified request",
    });
    await as(a);
    await assert.rejects(
      manage("fulfillment", { packageId: pkg, method: "pickup" }),
      /Access denied/,
    );
  } finally {
    await db.close();
  }
});
