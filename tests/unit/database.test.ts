import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const file = new URL(
  "../../supabase/migrations/20261011212647_marketing_inquiries.sql",
  import.meta.url,
);
test("migration enforces private storage, atomic dedupe/rate limits and notification leases", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon, authenticated, service_role;",
    );
    await db.exec(await readFile(file, "utf8"));
    const tables = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relname in ('marketing_inquiries','marketing_notifications')",
    );
    assert.equal(tables.rows.length, 2);
    assert.ok(tables.rows.every((row) => row.relrowsecurity));
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(
        db.query("select * from public.marketing_inquiries"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select * from public.marketing_notifications"),
        /permission denied/,
      );
      await assert.rejects(
        db.query(
          "select public.claim_marketing_notification(gen_random_uuid(),gen_random_uuid())",
        ),
        /permission denied/,
      );
      await assert.rejects(
        db.query(
          "select public.submit_marketing_inquiry(gen_random_uuid(),'{}','e','i','p','v1')",
        ),
        /permission denied/,
      );
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    const data = {
      kind: "contact",
      name: "Test Person",
      email: "person@example.test",
      phone: "",
      message: "A fictional test inquiry.",
    };
    const submit = async (
      id: number,
      payload = "payload",
      email = "email",
      ip = "ip",
    ) =>
      (
        await db.query<{ result: string }>(
          "select public.submit_marketing_inquiry($1,$2,$3,$4,$5,'test-v1') as result",
          [
            `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
            JSON.stringify(data),
            email,
            ip,
            payload,
          ],
        )
      ).rows[0].result;
    assert.equal(await submit(1), "accepted");
    assert.equal(await submit(1), "accepted");
    assert.equal(await submit(1, "changed"), "conflict");
    assert.equal(
      (await db.query("select * from public.marketing_notifications")).rows
        .length,
      1,
    );
    assert.equal(await submit(2), "accepted");
    assert.equal(await submit(3), "accepted");
    assert.equal(await submit(4), "limited");
    for (let n = 4; n <= 10; n++)
      assert.equal(await submit(n, "payload", `email-${n}`), "accepted");
    assert.equal(await submit(11, "payload", "other"), "limited");
    for (let n = 11; n <= 100; n++)
      assert.equal(
        await submit(n, "payload", `email-${n}`, `ip-${n}`),
        "accepted",
      );
    assert.equal(await submit(101, "payload", "new", "new"), "limited");
    const claim = async () =>
      (
        await db.query<{ claimed: boolean }>(
          "select public.claim_marketing_notification('00000000-0000-4000-8000-000000000001',gen_random_uuid()) as claimed",
        )
      ).rows[0].claimed;
    assert.equal(await claim(), true);
    assert.equal(await claim(), false);
    await db.exec(
      "update public.marketing_notifications set lease_until=now()-interval '1 minute' where inquiry_id='00000000-0000-4000-8000-000000000001'",
    );
    assert.equal(await claim(), true);
    await db.exec(
      "update public.marketing_notifications set status='sent',lease_until=null",
    );
    assert.equal(await claim(), false);
    await db.exec(
      "update public.marketing_notifications set status='pending',created_at=now()-interval '24 hours'",
    );
    assert.equal(await claim(), false);
  } finally {
    await db.close();
  }
});
