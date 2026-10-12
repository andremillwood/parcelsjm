import test from "node:test";
import assert from "node:assert/strict";
import { handleLead, type LeadDependencies } from "../../lib/leads/handler";
const input = {
  requestId: "00000000-0000-4000-8000-000000000001",
  kind: "contact",
  name: "Test Person",
  email: "person@example.test",
  phone: "",
  message: "A fictional inquiry for tests.",
  consent: true,
  website: "",
};
const request = (body: unknown = input, headers: Record<string, string> = {}) =>
  new Request("https://preview.example/api/contact", {
    method: "POST",
    headers: {
      origin: "https://preview.example",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
function dependencies(
  overrides: Partial<LeadDependencies> = {},
): LeadDependencies {
  return {
    enabled: true,
    origin: "https://preview.example",
    hashSecret: "test-key-never-used-outside-tests",
    clientIp: "127.0.0.1",
    save: async () => "accepted",
    notify: async () => {},
    ...overrides,
  };
}
test("disabled gate saves nothing", async () => {
  assert.equal(
    (
      await handleLead(
        request(),
        dependencies({
          enabled: false,
          save: async () => {
            throw new Error("Must not save");
          },
        }),
      )
    ).status,
    503,
  );
});
test("rejects cross-origin, malformed, oversize and unsupported content", async () => {
  assert.equal(
    (
      await handleLead(
        request(input, { origin: "https://elsewhere.example" }),
        dependencies(),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handleLead(
        request(input, { "content-type": "text/plain" }),
        dependencies(),
      )
    ).status,
    415,
  );
  assert.equal(
    (await handleLead(request("x".repeat(17000)), dependencies())).status,
    413,
  );
  const malformed = new Request("https://preview.example/api/contact", {
    method: "POST",
    headers: {
      origin: "https://preview.example",
      "content-type": "application/json",
    },
    body: "{",
  });
  assert.equal((await handleLead(malformed, dependencies())).status, 400);
});
test("requires consent, bounded valid input, empty honeypot and business fields", async () => {
  for (const patch of [
    { consent: false },
    { email: "bad" },
    { website: "bot" },
    { message: "short" },
    { requestId: "wrong" },
    { kind: "business" },
    { extra: "unexpected" },
    { monthlyVolume: 0 },
  ])
    assert.equal(
      (await handleLead(request({ ...input, ...patch }), dependencies()))
        .status,
      400,
    );
  assert.equal(
    (
      await handleLead(
        request({
          ...input,
          kind: "business",
          monthlyVolume: 20,
          category: "Clothing",
        }),
        dependencies(),
      )
    ).status,
    202,
  );
});
test("save precedes notification, identifiers are HMACs, mail failure preserves receipt", async () => {
  const events: string[] = [];
  const response = await handleLead(
    request(),
    dependencies({
      save: async (data, hashes) => {
        events.push("saved");
        assert.equal(data.email, input.email);
        assert.match(hashes.email, /^[a-f0-9]{64}$/);
        assert.notEqual(hashes.email, hashes.ip);
        return "accepted";
      },
      notify: async () => {
        events.push("notification");
        throw new Error("Provider down");
      },
    }),
  );
  assert.equal(response.status, 202);
  assert.deepEqual(events, ["saved", "notification"]);
});
test("database failures are not acknowledged, limits/conflicts do not send", async () => {
  for (const [result, status] of [
    ["limited", 429],
    ["conflict", 409],
  ] as const) {
    let sent = false;
    assert.equal(
      (
        await handleLead(
          request(),
          dependencies({
            save: async () => result,
            notify: async () => {
              sent = true;
            },
          }),
        )
      ).status,
      status,
    );
    assert.equal(sent, false);
  }
  const response = await handleLead(
    request(),
    dependencies({
      save: async () => {
        throw new Error("secret diagnostic");
      },
    }),
  );
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret diagnostic/);
});
