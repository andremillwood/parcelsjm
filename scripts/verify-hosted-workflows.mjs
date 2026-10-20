/* global fetch */
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { URL } from "node:url";
const base = process.env.PREVIEW_URL;
if (!base || !/^https:\/\/parcelsjm-[a-z0-9-]+\.vercel\.app$/.test(base))
  throw new Error(
    "Set PREVIEW_URL to the authorized immutable parcelsjm preview.",
  );
if (!process.env.QA_FIXTURES_PATH || !process.env.PREVIEW_ACCESS_FILE)
  throw new Error(
    "Explicit QA credential/access files required. Never commit them.",
  );
const fixtures = JSON.parse(
  fs.readFileSync(process.env.QA_FIXTURES_PATH, "utf8"),
);
if (
  fixtures.length !== 3 ||
  fixtures.some(
    (f) =>
      !f.email.startsWith("parcels-qa-") || !f.email.endsWith("@example.com"),
  )
)
  throw new Error("Only isolated synthetic QA fixtures may be used.");
const share = fs.readFileSync(process.env.PREVIEW_ACCESS_FILE, "utf8");
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const contexts = [];
  try {
    async function session(f) {
      const c = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      c.setDefaultTimeout(20000);
      contexts.push(c);
      const p = await c.newPage();
      await p.goto(share);
      await p.goto(base + "/login");
      await p.getByLabel("Email", { exact: true }).fill(f.email);
      await p.getByLabel("Password", { exact: true }).fill(f.password);
      await p.getByRole("button", { name: "Sign in", exact: true }).click();
      await p.waitForURL(base + "/app", { timeout: 20000 });
      return p;
    }
    const a = await session(fixtures[0]);
    console.log("PASS hosted sign-in and SSR session");
    await a.goto(base + "/app/pre-alert/new");
    await a.getByLabel("Carrier tracking / reference").fill("QA-HOSTED-TRACK");
    await a.getByLabel("Store / merchant").fill("QA fictional store");
    await a
      .getByLabel("Item description")
      .fill("QA fictional item - integration test only");
    await a.getByLabel("Declared value", { exact: true }).fill("12.50");
    await a.getByRole("checkbox").check();
    await a.getByRole("button", { name: "Create pre-alert" }).click();
    await a.getByRole("status").filter({ hasText: "Saved." }).waitFor();
    await a.goto(base + "/app/packages");
    await a.getByText("QA fictional store", { exact: true }).waitFor();
    const href = await a
      .locator('a[href^="/app/packages/"]')
      .first()
      .getAttribute("href");
    assert(href);
    console.log("PASS hosted pre-alert persistence");
    await a.goto(base + href);
    assert.equal(
      (
        await new AxeBuilder({ page: a })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations.length,
      0,
    );
    await a.goto(base + "/app/support");
    await a.getByLabel("Subject", { exact: true }).fill("QA support request");
    await a
      .getByLabel("What do you need help with?")
      .fill("QA integration test, no real shipment.");
    await a.getByRole("button", { name: "Submit request" }).click();
    await a.getByRole("status").filter({ hasText: "Saved." }).waitFor();
    console.log("PASS hosted support persistence");
    const b = await session(fixtures[1]);
    await b.goto(base + href);
    await b
      .getByRole("heading", { name: "This package is not available" })
      .waitFor();
    await b.goto(base + "/admin");
    assert.equal(new URL(b.url()).pathname, "/app");
    const forbidden = await b.evaluate(async () => {
      const r = await fetch("/api/workspace/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracking: "QA-HOSTED-TRACK",
          source: "QA test evidence",
          reason: "QA unauthorized request",
        }),
      });
      return r.status;
    });
    assert.equal(forbidden, 403);
    console.log("PASS hosted customer isolation and staff mutation denial");
    const staff = await session(fixtures[2]);
    await staff.goto(base + "/admin/intake");
    await staff
      .getByLabel("Full carrier tracking reference")
      .fill("QA-HOSTED-TRACK");
    await staff
      .getByLabel("Evidence / source reference", { exact: true })
      .fill("QA fixture evidence only");
    await staff
      .getByLabel("Audit reason", { exact: true })
      .fill("QA fixture intake test");
    await staff
      .getByRole("button", { name: "Save verified change", exact: true })
      .first()
      .click();
    await staff.getByRole("status").filter({ hasText: "Saved." }).waitFor();
    await staff.reload();
    await staff
      .getByLabel("Exact package record UUID")
      .fill(href.split("/").pop());
    await staff
      .getByLabel("Evidence confirming ownership")
      .fill("QA exact test customer and reference");
    await staff
      .getByRole("button", { name: "Save verified change", exact: true })
      .last()
      .click();
    await staff.getByText("Matched", { exact: true }).waitFor();
    console.log("PASS hosted intake reconciliation");
    await a.goto(base + href);
    await a.getByText("Received in US", { exact: true }).waitFor();
    assert(await a.getByText("received us", { exact: true }).count());
    console.log("PASS customer sees verified event");
    await staff.goto(base + "/admin" + href.slice(4));
    const eventStatus = await staff.evaluate(async (id) => {
      const r = await fetch("/api/workspace/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: id,
          expected: "received_us",
          status: "processing_us",
          source: "QA verified processing evidence",
          reason: "QA state transition",
          occurred: new Date(Date.now() - 1000).toISOString(),
        }),
      });
      return r.status;
    }, href.split("/").pop());
    assert.equal(eventStatus, 200);
    const staleStatus = await staff.evaluate(async (id) => {
      const r = await fetch("/api/workspace/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: id,
          expected: "received_us",
          status: "processing_us",
          source: "QA replay evidence",
          reason: "QA stale transition",
          occurred: new Date(Date.now() - 1000).toISOString(),
        }),
      });
      return r.status;
    }, href.split("/").pop());
    assert.equal(staleStatus, 409);
    console.log("PASS staff event and stale-write rejection");
    await staff.goto(base + "/admin/support");
    await staff
      .getByLabel("Customer-visible response")
      .fill("QA resolved in workspace; no email sent.");
    await staff
      .getByLabel("Internal audit reason")
      .fill("QA support resolution test");
    await staff.getByRole("button", { name: "Save verified change" }).click();
    await staff.getByText("Resolved", { exact: true }).waitFor();
    await a.goto(base + "/app/support");
    await a
      .getByText("QA resolved in workspace; no email sent.", { exact: false })
      .waitFor();
    console.log("PASS staff reply visible to owning customer");
    await staff.goto(base + "/admin/audit");
    await staff
      .getByRole("heading", { name: "shipment event" })
      .first()
      .waitFor();
    console.log("PASS append-only audit visible to owner");
    for (const p of [a, b, staff]) {
      await p.goto(base + "/app");
      await p.getByRole("button", { name: "Sign out", exact: true }).click();
      await p.waitForURL(base + "/login");
      await p.goto(base + "/app");
      assert.equal(new URL(p.url()).pathname, "/login");
    }
    console.log("PASS all QA sessions signed out");
    console.log("PASS hosted customer/admin integration");
  } finally {
    for (const c of contexts) await c.close();
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
