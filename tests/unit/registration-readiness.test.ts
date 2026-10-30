import { test } from "node:test";
import assert from "node:assert/strict";
import { registrationReady } from "../../lib/auth/provider";
import { POLICY_VERSION } from "../../lib/policies/current";

test("registration requires published approval and an available verification provider", async () => {
  const oldEnv = { ...process.env };
  const oldFetch = globalThis.fetch;
  let calls = 0;
  try {
    Object.assign(process.env, {
      AUTH_ENABLED: "true",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test",
      ACCOUNT_POLICIES_APPROVED: "true",
      ACCOUNT_POLICY_VERSION: POLICY_VERSION,
    });
    const provider = (settings: object, status = 200) => {
      globalThis.fetch = async () => {
        calls++;
        return Response.json(settings, { status });
      };
    };
    provider({
      disable_signup: false,
      external: { email: true },
      mailer_autoconfirm: false,
    });
    assert.equal(await registrationReady(), true);
    process.env.ACCOUNT_POLICY_VERSION = "old-policy";
    const before = calls;
    assert.equal(await registrationReady(), false);
    assert.equal(calls, before);
    process.env.ACCOUNT_POLICY_VERSION = POLICY_VERSION;
    provider({
      disable_signup: true,
      external: { email: true },
      mailer_autoconfirm: false,
    });
    assert.equal(await registrationReady(), false);
    provider({
      disable_signup: false,
      external: { email: true },
      mailer_autoconfirm: true,
    });
    assert.equal(await registrationReady(), false);
    provider({}, 503);
    assert.equal(await registrationReady(), false);
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    assert.equal(await registrationReady(), false);
  } finally {
    globalThis.fetch = oldFetch;
    process.env = oldEnv;
  }
});
