import test from "node:test";
import assert from "node:assert/strict";
import { dispatchEmails } from "../../lib/communications/worker";
import { saveLead } from "../../lib/leads/store";
const id = "00000000-0000-4000-8000-000000000001",
  originalFetch = globalThis.fetch;
const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://database.example.test",
  SUPABASE_SERVICE_ROLE_KEY: "test-server-key",
  RESEND_API_KEY: "test-mail-key",
  COMMUNICATIONS_ENABLED: "true",
  APP_BASE_URL: "https://parcelsjm.vercel.app",
  STAFF_NOTIFICATION_EMAIL: "staff@example.test",
  EMAIL_DELIVERY_MODE: "test",
  LEAD_PRIVACY_VERSION: "test-v1",
};
Object.assign(process.env, env);
const json = (value: unknown, status = 200) => Response.json(value, { status });
test.afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.assign(process.env, env);
});
const job = {
  id,
  recipient_email: "customer@example.test",
  kind: "document_requested",
  resource_id: id,
  event_status: "",
  template_version: 1,
  provider_payload: null,
};
test("provider uses a stable key, simulator recipient and frozen message; acceptance is distinct from delivery", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  let claimed = false;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const args = JSON.parse(String(init?.body));
    if (String(url).includes("claim_email_jobs")) {
      if (claimed) return json([]);
      claimed = true;
      return json([job]);
    }
    if (String(url).includes("prepare_email")) return json(args.p_payload);
    if (String(url).includes("resend.com"))
      return json({ id: "provider-message" });
    return json(null);
  };
  const r = await dispatchEmails();
  assert.equal(r.accepted, 1);
  assert.equal(r.reviewed, 1);
  const send = calls.find((c) => c.url.includes("resend.com"))!;
  assert.equal(
    new Headers(send.init?.headers).get("Idempotency-Key"),
    `parcels-v1/${id}`,
  );
  const body = JSON.parse(String(send.init?.body));
  assert.deepEqual(body.to, ["delivered@resend.dev"]);
  assert.equal(body.reply_to, "staff@example.test");
  assert(body.text.includes(id));
  assert(!body.text.includes("customer@example.test"));
  assert(!body.attachments);
  const finish = JSON.parse(
    String(calls.find((c) => c.url.includes("finish_email"))?.init?.body),
  );
  assert.equal(finish.p_result, "accepted");
  assert.equal(finish.p_provider, "provider-message");
});
test("ambiguous timeout retries the same provider payload, and permanent failures require review", async () => {
  for (const status of [0, 429, 500, 400, 409]) {
    let claimed = false,
      finished: Record<string, unknown> | undefined;
    const frozen = {
      from: "Parcels JA <support@parcelsjm.com>",
      to: ["delivered@resend.dev"],
      subject: "Frozen",
      text: "Frozen reference",
    };
    globalThis.fetch = async (url, init) => {
      if (String(url).includes("claim_email_jobs")) {
        if (claimed) return json([]);
        claimed = true;
        return json([{ ...job, provider_payload: frozen }]);
      }
      if (String(url).includes("resend.com")) {
        assert.deepEqual(JSON.parse(String(init?.body)), frozen);
        if (status === 0) throw new Error("timeout");
        return json({ message: "provider body must not be logged" }, status);
      }
      finished = JSON.parse(String(init?.body));
      return json(null);
    };
    await dispatchEmails();
    assert.equal(
      finished?.p_result,
      status === 400 ? "failed" : status === 409 ? "review" : "retry",
    );
    assert(!JSON.stringify(finished).includes("provider body"));
  }
});
test("disabled communication never claims or sends; unexpected lead persistence cannot acknowledge submission", async () => {
  process.env.COMMUNICATIONS_ENABLED = "false";
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json("unknown");
  };
  assert.equal((await dispatchEmails()).enabled, false);
  assert.equal(calls, 0);
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
