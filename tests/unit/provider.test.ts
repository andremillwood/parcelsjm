import test from "node:test";
import assert from "node:assert/strict";
import {
  notifyLead,
  saveLead,
  retryNotifications,
} from "../../lib/leads/store";
const id = "00000000-0000-4000-8000-000000000001";
const originalFetch = globalThis.fetch;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://database.example.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-server-key";
process.env.RESEND_API_KEY = "test-mail-key";
process.env.RESEND_FROM_EMAIL = "sender@example.test";
process.env.LEAD_NOTIFICATION_EMAIL = "staff@example.test";
process.env.LEAD_PRIVACY_VERSION = "test-v1";
const json = (value: unknown, status = 200) => Response.json(value, { status });
test.afterEach(() => {
  globalThis.fetch = originalFetch;
});
test("provider send uses stable idempotency key and private reference only, then records acceptance", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("claim_marketing")) return json(true);
    if (String(url).includes("resend.com"))
      return json({ id: "provider-message" });
    return new Response(null, { status: 204 });
  };
  await notifyLead(id);
  assert.equal(calls.length, 3);
  const email = calls[1];
  assert.equal(
    new Headers(email.init?.headers).get("Idempotency-Key"),
    `marketing-inquiry/${id}`,
  );
  const body = JSON.parse(String(email.init?.body));
  assert.deepEqual(body.to, ["staff@example.test"]);
  assert.ok(body.text.includes(id));
  assert.equal(body.html, undefined);
  assert.ok(calls[2].url.includes("lease_token=eq."));
  assert.equal(
    JSON.parse(String(calls[2].init?.body)).provider_id,
    "provider-message",
  );
});
test("unclaimed and failed sends cannot be marked sent", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json(false);
  };
  await notifyLead(id);
  assert.equal(calls, 1);
  calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return calls === 1 ? json(true) : json({ error: "down" }, 503);
  };
  await assert.rejects(notifyLead(id), /pending/);
  assert.equal(calls, 2);
});
test("retry selection excludes exhausted and expired notifications", async () => {
  let path = "";
  globalThis.fetch = async (url) => {
    path = String(url);
    return json([]);
  };
  assert.equal(await retryNotifications(), 0);
  assert.ok(path.includes("attempts=lt.5"));
  assert.ok(path.includes("created_at=gt."));
  assert.ok(path.includes("lease_until"));
});
test("unexpected database response cannot acknowledge a lead", async () => {
  globalThis.fetch = async () => json("unknown");
  await assert.rejects(
    saveLead(
      {
        requestId: id,
        kind: "contact",
        name: "Test Person",
        email: "p@example.test",
        phone: "",
        message: "Fictional question",
        consent: true,
        website: "",
      },
      { email: "hash", ip: "hash", payload: "hash" },
    ),
    /Unexpected/,
  );
});
