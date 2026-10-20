/* global fetch, document, innerWidth */
import { chromium, expect } from "@playwright/test";
import Axe from "@axe-core/playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { createClient } from "@supabase/supabase-js";
const base = process.env.PREVIEW_URL,
  share = fs.readFileSync(process.env.PREVIEW_ACCESS_FILE, "utf8").trim();
if (!/^https:\/\/parcelsjm-[a-z0-9-]+\.vercel\.app$/.test(base || ""))
  throw Error("Explicit Parcels preview required");
const fixtures = JSON.parse(fs.readFileSync(process.env.QA_FIXTURES_PATH));
const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (
  fixtures.length !== 3 ||
  fixtures.some((f) => !/^parcels-qa-.*@example.com$/.test(f.email))
)
  throw Error("Only three authorized synthetic fixtures may be used");
async function api(p, action, body) {
  return p.evaluate(
    async ({ action, body }) => {
      const r = await fetch("/api/workspace/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: r.status, body: await r.json() };
    },
    { action, body },
  );
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  try {
    async function session(f) {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        p = await context.newPage();
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(share);
      await p.goto(base + "/login");
      await p.getByLabel("Email", { exact: true }).fill(f.email);
      await p.getByLabel("Password", { exact: true }).fill(f.password);
      await p.getByRole("button", { name: "Sign in", exact: true }).click();
      await p.waitForURL(base + "/app");
      return p;
    }
    const [a, b, staff] = await Promise.all(fixtures.map(session));
    const client = createClient(url, pub, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert(
      !(
        await client.auth.signInWithPassword({
          email: fixtures[0].email,
          password: fixtures[0].password,
        })
      ).error,
    );
    const packages = await client
      .from("packages")
      .select("id,carrier_tracking", { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id")
      .range(0, 149);
    assert.equal(packages.count, 130);
    const pkg = packages.data[129];
    await a.goto(base + "/app/packages?page=6");
    await expect(
      a.getByText("130 matching records · Page 6 of 6"),
    ).toBeVisible();
    await expect(a.locator(".w-package-row")).toHaveCount(5);
    await a.goto(base + "/app/packages/" + pkg.id);
    await expect(
      a.getByRole("heading", { name: "Synthetic store", exact: true }),
    ).toBeVisible();
    await b.goto(base + "/app/packages/" + pkg.id);
    await expect(
      b.getByRole("heading", { name: "Package unavailable", exact: true }),
    ).toBeVisible();
    console.log(
      "PASS real customer pagination beyond 100 records, direct detail lookup, A/B isolation",
    );
    await staff.goto(base + "/admin/queues?q=" + pkg.carrier_tracking);
    await expect(staff.locator(".w-task")).toHaveCount(1);
    await staff.getByText("Assign or prioritize", { exact: true }).click();
    await staff
      .getByRole("combobox", {
        name: "Assignee (leave blank to unassign)",
        exact: true,
      })
      .selectOption(fixtures[2].id);
    await staff
      .locator(".w-task")
      .getByRole("combobox", { name: "Priority", exact: true })
      .selectOption("3");
    await staff
      .getByLabel("Staff due date (Jamaica time; leave blank to clear)")
      .fill("2026-10-01T12:00");
    await staff
      .getByLabel("Internal audit reason")
      .fill("Synthetic queue assignment for verification");
    await staff
      .getByRole("button", { name: "Save verified change", exact: true })
      .click();
    await expect(staff.getByRole("status")).toContainText("Saved");
    await staff.reload();
    await expect(
      staff
        .locator(".w-task dd")
        .getByText("Synthetic Operations 2", { exact: true }),
    ).toBeVisible();
    await expect(staff.getByText(/Past due/)).toBeVisible();
    let task = await staff.locator("input[name=id]").inputValue(),
      version = Number(await staff.locator("input[name=version]").inputValue());
    const update = {
      id: task,
      version,
      assignee: fixtures[2].id,
      priority: 2,
      due: "",
      reason: "Synthetic queue repeat update",
    };
    assert.equal((await api(staff, "queue", update)).status, 200);
    assert.equal((await api(staff, "queue", update)).status, 409);
    assert.equal(
      (await api(a, "queue", { ...update, version: version + 1 })).status,
      409,
    );
    assert.equal(
      (
        await api(staff, "queue", {
          ...update,
          version: version + 1,
          assignee: fixtures[0].id,
        })
      ).status,
      409,
    );
    console.log(
      "PASS assignment, explicit due date, stale conflict, customer denial and invalid assignee",
    );
    await staff.goto(base + "/admin/packages/" + pkg.id);
    const event = {
      packageId: pkg.id,
      expected: "pre_alerted",
      status: "received_us",
      source: "Synthetic receipt evidence",
      reason: "Synthetic receipt verification",
      occurred: new Date().toISOString(),
    };
    assert.equal((await api(staff, "event", event)).status, 200);
    await staff.reload();
    await staff
      .getByText("Correct the latest checkpoint", { exact: true })
      .click();
    const eventId = await staff.locator("input[name=eventId]").inputValue();
    await staff
      .getByRole("combobox", { name: "Corrected checkpoint", exact: true })
      .selectOption("pre_alerted");
    await staff
      .getByLabel("Verified evidence / source reference", { exact: true })
      .fill("Synthetic corrected evidence");
    await staff
      .getByLabel("Corrected effective time (your local time)", { exact: true })
      .fill(
        await staff.evaluate(() =>
          new Date().toLocaleString("sv-SE").replace(" ", "T").slice(0, 16),
        ),
      );
    await staff
      .getByLabel("Customer-visible explanation", { exact: true })
      .fill("Synthetic receipt was linked to this package in error.");
    await staff
      .getByLabel("Internal audit reason", { exact: true })
      .fill("Synthetic correction audit check");
    await staff
      .getByRole("button", { name: "Save verified change", exact: true })
      .first()
      .click();
    await expect(staff.getByRole("status")).toContainText("Saved");
    const correction = {
      packageId: pkg.id,
      eventId,
      status: "pre_alerted",
      source: "Synthetic source",
      reason: "Synthetic stale correction",
      explanation: "Synthetic stale explanation",
      occurred: new Date().toISOString(),
    };
    assert.equal((await api(staff, "correction", correction)).status, 409);
    assert.equal((await api(a, "correction", correction)).status, 403);
    await a.goto(base + "/app/packages/" + pkg.id);
    await expect(
      a.getByText("Superseded by a correction below; retained for history."),
    ).toBeVisible();
    await expect(
      a.getByText("Synthetic receipt was linked to this package in error."),
    ).toBeVisible();
    console.log(
      "PASS real correction form, immutable original, customer explanation and stale/role denial",
    );
    for (const width of [360, 390, 768, 1024, 1440]) {
      await staff.setViewportSize({ width, height: 1000 });
      await staff.goto(base + "/admin/queues?q=" + pkg.carrier_tracking);
      assert(
        await staff.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.deepEqual(
        (
          await new Axe({ page: staff })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
        [],
      );
      if (process.env.QA_SCREENSHOT_DIR && [390, 1440].includes(width))
        await staff.screenshot({
          path: process.env.QA_SCREENSHOT_DIR + "/queues-" + width + ".png",
          fullPage: true,
        });
      await a.setViewportSize({ width, height: 1000 });
      await a.goto(base + "/app/packages/" + pkg.id);
      assert(
        await a.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.deepEqual(
        (
          await new Axe({ page: a })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
        [],
      );
      console.log(
        "PASS authenticated queue/correction history accessibility and overflow",
        width,
      );
    }
    await staff.goto(base + "/admin/queues?kind=support");
    await expect(
      staff.getByRole("heading", { name: "No matching work" }),
    ).toBeVisible();
    await a.goto(base + "/admin/queues");
    await a.waitForURL(base + "/app");
    const gated = await a.evaluate(async () => {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register" }),
      });
      return r.status;
    });
    assert.equal(gated, 503);
    await a.goto(base + "/rates");
    assert(!(await a.locator("body").innerText()).includes("695"));
    assert.deepEqual(errors, []);
    console.log(
      "PASS scoped queue visibility, protected admin redirect, disabled signup/pricing and no browser errors",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
