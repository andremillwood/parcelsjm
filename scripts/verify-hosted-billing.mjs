/* global fetch, document, innerWidth */
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import process from "node:process";
import console from "node:console";
const base = process.env.PREVIEW_URL;
if (!/^https:\/\/parcelsjm-[a-z0-9-]+\.vercel\.app$/.test(base || ""))
  throw Error("Immutable parcelsjm preview required");
const fixtures = JSON.parse(
  fs.readFileSync(process.env.QA_FIXTURES_PATH, "utf8"),
);
if (
  fixtures.length !== 3 ||
  fixtures.some((f) => !/^parcels-qa-billing-.+@example\.com$/.test(f.email))
)
  throw Error("Synthetic scope required");
const share = fs.readFileSync(process.env.PREVIEW_ACCESS_FILE, "utf8");
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  headless: true,
});
const contexts = [],
  errors = [];
try {
  async function session(f) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    contexts.push(context);
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(share);
    await p.goto(base + "/login");
    await p.getByLabel("Email", { exact: true }).fill(f.email);
    await p.getByLabel("Password", { exact: true }).fill(f.password);
    await p.getByRole("button", { name: "Sign in", exact: true }).click();
    await p.waitForURL(base + "/app");
    return p;
  }
  const a = await session(fixtures[0]),
    b = await session(fixtures[1]),
    staff = await session(fixtures[2]);
  async function post(p, path, body, status = 200) {
    const r = await p.evaluate(
      async ({ path, body }) => {
        const r = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return { status: r.status, body: await r.json() };
      },
      { path, body },
    );
    assert.equal(r.status, status, `${path}: ${r.body.message}`);
    return r.body;
  }
  const track = "QA-BILLING-" + Date.now();
  await post(a, "/api/workspace/pre-alert", {
    requestId: crypto.randomUUID(),
    tracking: track,
    merchant: "Synthetic billing store",
    description: "Synthetic billing test item",
    quantity: 1,
    value: 12.5,
    currency: "USD",
    acknowledged: "on",
  });
  await a.goto(base + "/app/packages?q=" + track);
  const pkgHref = await a
    .locator('a[href^="/app/packages/"]')
    .first()
    .getAttribute("href");
  assert(pkgHref);
  const pkg = pkgHref.split("/").at(-1);
  await b.goto(base + pkgHref);
  await expect(
    b.getByRole("heading", { name: "Package unavailable" }),
  ).toBeVisible();
  await staff.goto(base + "/admin/billing");
  await staff.getByText("Prepare an invoice", { exact: true }).click();
  const draft = staff.locator("form").filter({
    has: staff.getByRole("heading", {
      name: "Prepare itemized invoice",
      exact: true,
    }),
  });
  for (const [name, value] of Object.entries({
    packageId: pkg,
    weight: "1.001",
    dutiesTax: "50",
    handling: "0",
    localDelivery: "0",
    storage: "0",
    evidence: "Synthetic final weight and charge assessment",
  }))
    await draft.locator(`[name="${name}"]`).fill(value);
  let response = staff.waitForResponse(
    (r) => r.url() === base + "/api/billing/draft",
  );
  await draft.getByRole("button", { name: "Save verified change" }).click();
  assert.equal((await response).status(), 200);
  await staff.goto(base + "/admin/billing?q=" + track);
  const invHref = await staff
    .locator('a[href^="/admin/billing/"]')
    .first()
    .getAttribute("href");
  assert(invHref);
  const id = invHref.split("/").at(-1);
  await staff.goto(base + invHref);
  const version = async () => {
    await staff.reload();
    return Number(
      await staff.locator('input[name="version"]').first().inputValue(),
    );
  };
  await a.goto(base + "/app" + invHref.slice("/admin".length));
  await expect(
    a.getByRole("heading", { name: "Invoice unavailable" }),
  ).toBeVisible();
  let v = await version();
  await post(staff, "/api/billing/status", {
    id,
    version: v,
    decision: "issue",
    message: "Synthetic verified invoice",
    reason: "Synthetic finance issuance",
  });
  await a.reload();
  await expect(a.getByRole("heading", { name: /Invoice \d+/ })).toBeVisible();
  assert(
    !(await a.locator("body").innerText()).includes("Synthetic final weight"),
  );
  await b.goto(base + "/app" + invHref.slice("/admin".length));
  await expect(
    b.getByRole("heading", { name: "Invoice unavailable" }),
  ).toBeVisible();
  await post(
    a,
    "/api/billing/payment",
    {
      id,
      version: 2,
      amount: "1",
      channel: "QA",
      reference: track + "-DENIED",
      evidence: "Synthetic evidence",
      reason: "Customer access denied",
    },
    403,
  );
  await staff.reload();
  await staff
    .getByText("Record a verified collection", { exact: true })
    .click();
  const pay = staff.locator("form").filter({
    has: staff.getByRole("heading", {
      name: "Verify funds received",
      exact: true,
    }),
  });
  for (const [name, value] of Object.entries({
    amount: "500",
    channel: "Synthetic bank",
    reference: track + "-PAY1",
    evidence: "Synthetic private verification evidence",
    reason: "Synthetic partial collection",
  }))
    await pay.locator(`[name="${name}"]`).fill(value);
  response = staff.waitForResponse(
    (r) => r.url() === base + "/api/billing/payment",
  );
  await pay.getByRole("button", { name: "Save verified change" }).click();
  assert.equal((await response).status(), 200);
  v = await version();
  await post(
    staff,
    "/api/billing/payment",
    {
      id,
      version: v,
      amount: "1",
      channel: "Synthetic bank",
      reference: track + "-PAY1",
      evidence: "Synthetic duplicate",
      reason: "Synthetic duplicate prevention",
    },
    409,
  );
  await post(
    staff,
    "/api/billing/payment",
    {
      id,
      version: v - 1,
      amount: "1",
      channel: "Synthetic bank",
      reference: track + "-STALE",
      evidence: "Synthetic stale",
      reason: "Synthetic stale prevention",
    },
    409,
  );
  console.log(
    "PASS UI draft/partial collection, immutable rate snapshot, customer A/B isolation, role/duplicate/stale protection",
  );
  let state = "pre_alerted";
  async function event(next, status = 200) {
    await post(
      staff,
      "/api/workspace/event",
      {
        packageId: pkg,
        expected: state,
        status: next,
        source: "Synthetic verified operational evidence",
        reason: "Synthetic shipment verification",
        occurred: new Date(Date.now() - 1000).toISOString(),
      },
      status,
    );
    if (status === 200) state = next;
  }
  await event("received_us");
  await event("processing_us");
  await staff.goto(base + "/admin/shipments");
  const batchForm = staff.locator("form").filter({
    has: staff.getByRole("heading", { name: "Create draft consolidation" }),
  });
  await batchForm.locator('[name="reference"]').fill(track + "-BATCH");
  await batchForm
    .locator('[name="reason"]')
    .fill("Synthetic consolidation evidence");
  response = staff.waitForResponse(
    (r) => r.url() === base + "/api/shipments/create",
  );
  await batchForm.getByRole("button", { name: "Save verified change" }).click();
  assert.equal((await response).status(), 200);
  await staff.goto(base + "/admin/shipments?q=" + track);
  const batchHref = await staff
    .locator('a[href^="/admin/shipments/"]')
    .first()
    .getAttribute("href");
  assert(batchHref);
  const batch = batchHref.split("/").at(-1);
  const manageBatch = (version, decision, extra = {}) =>
    post(staff, "/api/shipments/manage", {
      id: batch,
      version,
      decision,
      packageId: "",
      partnerReference: "",
      reason: "Synthetic verified manifest evidence",
      ...extra,
    });
  await manageBatch(1, "add", { packageId: pkg });
  await manageBatch(2, "reference", {
    partnerReference: "SYNTHETIC-AWB-" + track,
  });
  await manageBatch(3, "dispatch");
  await post(
    staff,
    "/api/shipments/manage",
    {
      id: batch,
      version: 4,
      decision: "remove",
      packageId: pkg,
      reason: "Synthetic sealed manifest protection",
    },
    409,
  );
  await staff.goto(base + batchHref);
  await expect(
    staff.getByRole("heading", { name: "Sealed dispatch snapshot" }),
  ).toBeVisible();
  console.log(
    "PASS manual consolidation, AWB reference, immutable dispatch snapshot and independent package checkpoints",
  );
  for (const next of [
    "in_transit",
    "arrived_jm",
    "customs_processing",
    "customs_hold",
    "cleared",
  ])
    await event(next);
  await event("ready_for_pickup", 409);
  await staff.goto(base + invHref);
  v = await version();
  await post(staff, "/api/billing/payment", {
    id,
    version: v,
    amount: "645",
    channel: "Synthetic bank",
    reference: track + "-PAY2",
    evidence: "Synthetic settled evidence",
    reason: "Synthetic final collection",
  });
  v = await version();
  await post(staff, "/api/billing/status", {
    id,
    version: v,
    decision: "dispute",
    message: "Synthetic disputed charge",
    reason: "Synthetic dispute review",
  });
  await event("ready_for_pickup", 409);
  v = await version();
  await post(staff, "/api/billing/status", {
    id,
    version: v,
    decision: "resolve_dispute",
    message: "Synthetic dispute resolved",
    reason: "Synthetic verified resolution",
  });
  const requirement = await post(staff, "/api/documents/request", {
    profileId: fixtures[0].id,
    packageId: pkg,
    type: "invoice",
    instructions: "Synthetic invoice requirement for release test",
  });
  await event("ready_for_pickup", 409);
  await post(
    staff,
    "/api/documents/review",
    {
      requestId: requirement.id,
      version: 0,
      expected: "requested",
      decision: "approved",
      reason: "Synthetic unscanned approval must fail",
    },
    409,
  );
  await post(staff, "/api/documents/review", {
    requestId: requirement.id,
    version: 0,
    expected: "requested",
    decision: "waived",
    reason: "Synthetic alternative evidence verified for test only",
  });
  await event("ready_for_pickup");
  await event("delivered");
  await event("in_transit", 409);
  console.log(
    "PASS unpaid/disputed/document release blocks, unscanned approval denial, verified release and terminal shipment protection",
  );
  await staff.goto(base + invHref);
  v = await version();
  await post(staff, "/api/billing/costs", {
    id,
    version: v,
    freight: "",
    receiving: "0",
    consolidation: "",
    payment: "0",
    last_mile: "0",
    other: "0",
    evidence: "Synthetic incomplete cost assessment",
  });
  await staff.reload();
  await expect(
    staff.getByText(
      "Contribution unavailable: one or more actual costs are unknown.",
    ),
  ).toBeVisible();
  v = await version();
  await post(staff, "/api/billing/costs", {
    id,
    version: v,
    freight: "300",
    receiving: "216",
    consolidation: "62.80",
    payment: "34.35",
    last_mile: "0",
    other: "0",
    evidence: "Synthetic settled complete cost assessment; no real cost claim",
  });
  await staff.reload();
  await expect(staff.getByText(/Billed contribution:/)).toBeVisible();
  await staff
    .getByText("Reverse an incorrect collection", { exact: true })
    .click();
  const reversal = staff.locator("form").filter({
    has: staff.getByRole("heading", {
      name: "Append payment reversal",
      exact: true,
    }),
  });
  const paymentId = await reversal
    .locator('select[name="paymentId"] option')
    .nth(1)
    .getAttribute("value");
  v = await version();
  await post(staff, "/api/billing/reversal", {
    id,
    version: v,
    paymentId,
    reference: track + "-REV",
    evidence: "Synthetic reversal verification",
    reason: "Synthetic payment reversal after handover",
  });
  v = await version();
  await post(staff, "/api/billing/adjustment", {
    id,
    version: v,
    direction: "credit",
    kind: "shipping",
    amount: "500",
    description: "Synthetic owner service credit",
    reason: "Synthetic owner credit approval",
  });
  await a.goto(base + "/app" + invHref.slice("/admin".length));
  assert(
    !(await a.locator("body").innerText()).includes(
      "Synthetic private verification",
    ),
  );
  await staff.goto(base + "/admin/packages/" + pkg);
  await expect(
    staff.locator("main").getByText("Delivered", { exact: true }).first(),
  ).toBeVisible();
  await manageBatch(4, "arrive");
  await manageBatch(5, "close");
  console.log(
    "PASS actual-cost unknown/complete states, post-handover reversal, owner credit and consolidation closure",
  );
  for (const p of [a, staff]) {
    for (const width of [390, 1440]) {
      await p.setViewportSize({ width, height: 1000 });
      await p.goto(
        base + (p === a ? "/app" + invHref.slice("/admin".length) : invHref),
      );
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.deepEqual(
        (
          await new AxeBuilder({ page: p })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
        [],
      );
    }
  }
  await post(
    a,
    "/api/auth",
    {
      action: "register",
      fullName: "Synthetic gate",
      email: "gate@example.test",
      phone: "8765550100",
      trn: "012345678",
      homeAddress: "Synthetic district, Sample town, Jamaica",
      accountType: "personal",
      password: "SamplePassword123!",
      confirmPassword: "SamplePassword123!",
      consent: true,
    },
    503,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS hosted customer/admin accessibility, mobile layout, disabled signup and no browser errors",
  );
} finally {
  for (const c of contexts) {
    try {
      const p = await c.newPage();
      await p.goto(base + "/app");
      const signout = p.getByRole("button", { name: "Sign out", exact: true });
      if (await signout.count()) await signout.click();
    } catch {
      // Closing the context also clears a failed/expired test session.
    }
    await c.close();
  }
  await browser.close();
}
