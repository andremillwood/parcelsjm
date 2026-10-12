/* global fetch, document, innerWidth */
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import { Buffer } from "node:buffer";
import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { randomUUID } from "node:crypto";
const base = process.env.PREVIEW_URL;
if (!base || !/^https:\/\/parcelsjm-[a-z0-9-]+\.vercel\.app$/.test(base))
  throw new Error("Explicit immutable preview required");
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
  throw new Error("Only isolated synthetic QA accounts allowed");
const share = fs.readFileSync(process.env.PREVIEW_ACCESS_FILE, "utf8");
const api = async (p, action, data) =>
  p.evaluate(
    async ({ action, data }) => {
      const r = await fetch("/api/documents/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return { status: r.status, body: await r.json() };
    },
    { action, data },
  );
const clients = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const pages = [];
  for (const f of fixtures) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    context.setDefaultTimeout(25000);
    const p = await context.newPage();
    await p.goto(share);
    await p.goto(base + "/login");
    await p.getByLabel("Email", { exact: true }).fill(f.email);
    await p.getByLabel("Password", { exact: true }).fill(f.password);
    await p.getByRole("button", { name: "Sign in", exact: true }).click();
    await p.waitForURL(base + "/app");
    pages.push(p);
  }
  const [a, b, staff] = pages;
  console.log("PASS three authenticated QA sessions");
  const pre = await a.evaluate(async (requestId) => {
    const r = await fetch("/api/workspace/pre-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        tracking: "QA-DOC-" + requestId,
        merchant: "QA fictional invoice store",
        carrier: "",
        description: "Synthetic document test goods",
        quantity: 1,
        value: 12,
        currency: "USD",
        notes: "",
        acknowledged: "on",
      }),
    });
    return r.status;
  }, randomUUID());
  assert.equal(pre, 200);
  await a.goto(base + "/app/packages");
  const href = await a
    .locator('a[href^="/app/packages/"]')
    .first()
    .getAttribute("href");
  const packageId = href.split("/").at(-1);
  await staff.goto(base + "/admin/documents");
  await staff
    .getByRole("combobox", { name: "Package (optional)", exact: true })
    .selectOption(packageId);
  await staff
    .getByLabel("Why needed and what to upload")
    .fill(
      "QA only: upload the fictional purchase invoice showing merchant, goods and total.",
    );
  await staff
    .getByRole("button", { name: "Request document", exact: true })
    .click();
  await staff
    .getByRole("status")
    .filter({ hasText: "Document requested." })
    .waitFor();
  await a.goto(base + "/app/documents");
  await a
    .locator(".w-document-instructions")
    .filter({
      hasText:
        "QA only: upload the fictional purchase invoice showing merchant, goods and total.",
    })
    .waitFor();
  assert.equal(
    (
      await api(b, "request", {
        profileId: fixtures[1].id,
        packageId: null,
        type: "invoice",
        instructions: "Forged staff request test",
      })
    ).status,
    403,
  );
  console.log(
    "PASS customer-specific document request and staff authorization",
  );
  // Generate a real, fictional PDF in memory; never use customer documents in QA.
  const pdfPage = await browser.newPage();
  await pdfPage.setContent(
    "<h1>Fictional QA invoice</h1><p>Test goods USD 12.00. Not a real transaction.</p>",
  );
  const pdf = await pdfPage.pdf();
  const png = await pdfPage.screenshot({ type: "png" });
  const jpeg = await pdfPage.screenshot({ type: "jpeg" });
  await pdfPage.close();
  const intentResponse = a.waitForResponse(
    (r) =>
      r.url().endsWith("/api/documents/intent") &&
      r.request().method() === "POST",
  );
  await a.getByLabel("Document file", { exact: true }).setInputFiles({
    name: "qa-invoice.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await a.getByLabel("Invoice amount (optional)").fill("12");
  await a.getByLabel("Invoice merchant (optional)").fill("QA fictional store");
  await a.getByRole("button", { name: "Upload document", exact: true }).click();
  const intent = await (await intentResponse).json();
  assert(intent.uploadId, JSON.stringify(intent));
  await a
    .getByText("Quarantined — scanning pending", { exact: false })
    .waitFor();
  console.log(
    "PASS staff request → real customer PDF upload → persisted quarantine",
  );
  assert.equal(
    (await api(b, "complete", { uploadId: intent.uploadId })).status,
    404,
  );
  assert.equal(
    (await api(b, "download", { uploadId: intent.uploadId })).status,
    403,
  );
  assert.equal(
    (await api(a, "download", { uploadId: intent.uploadId })).status,
    403,
  );
  await b.goto(base + "/app/documents");
  assert.equal(
    await b
      .getByText(
        "QA only: upload the fictional purchase invoice showing merchant, goods and total.",
        { exact: true },
      )
      .count(),
    0,
  );
  await staff.goto(base + "/admin/documents");
  await staff
    .getByText("Quarantined — scanning pending", { exact: false })
    .waitFor();
  assert.equal(
    await staff
      .getByRole("option", { name: "Approve document", exact: true })
      .count(),
    0,
  );
  // Use ordinary authenticated clients to verify the underlying API/RLS boundaries.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error("Explicit Supabase public QA configuration required");
  for (const f of fixtures) {
    const c = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const sign = await c.auth.signInWithPassword({
      email: f.email,
      password: f.password,
    });
    assert(!sign.error);
    clients.push(c);
  }
  const upload = (
    await clients[0]
      .from("document_uploads")
      .select("*")
      .eq("id", intent.uploadId)
      .single()
  ).data;
  assert(upload);
  const requestId = upload.request_id;
  assert.equal(
    (
      await clients[1]
        .from("document_uploads")
        .select("id")
        .eq("id", intent.uploadId)
    ).data.length,
    0,
  );
  assert(
    (
      await clients[0].rpc("record_document_scan", {
        p_upload: intent.uploadId,
        p_sha256: upload.sha256,
        p_result: "clean",
        p_evidence: "forged customer attestation",
      })
    ).error,
  );
  assert(
    (
      await clients[2].rpc("record_document_scan", {
        p_upload: intent.uploadId,
        p_sha256: upload.sha256,
        p_result: "clean",
        p_evidence: "forged owner attestation",
      })
    ).error,
  );
  for (const c of clients) {
    assert(
      (await c.storage.from("customer-documents").download(upload.object_path))
        .error,
    );
    assert(
      (
        await c.storage
          .from("customer-documents")
          .createSignedUrl(upload.object_path, 99999)
      ).error,
    );
  }
  const publicFile = await fetch(
    url + "/storage/v1/object/public/customer-documents/" + upload.object_path,
  );
  assert(!publicFile.ok);
  const overwrite = await fetch(intent.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf", "x-upsert": "true" },
    body: pdf,
  });
  assert(!overwrite.ok);
  assert.equal(
    (
      await api(staff, "review", {
        requestId,
        version: 1,
        expected: "uploaded",
        decision: "approved",
        reason: "Attempt approval before clean scanning",
      })
    ).status,
    409,
  );
  console.log(
    "PASS cross-customer isolation, private bucket, no overwrite, forged scan and unscanned approval denial",
  );
  for (const width of [360, 390, 768, 1024, 1440]) {
    for (const [p, path] of [
      [a, "/app/documents"],
      [staff, "/admin/documents"],
    ]) {
      await p.setViewportSize({ width, height: 1000 });
      await p.goto(base + path);
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const axe = await new AxeBuilder({ page: p })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      assert.equal(
        axe.violations.length,
        0,
        JSON.stringify(axe.violations.map((v) => v.id)),
      );
      if (process.env.QA_SCREENSHOT_DIR && [390, 1440].includes(width)) {
        fs.mkdirSync(process.env.QA_SCREENSHOT_DIR, { recursive: true });
        await p.screenshot({
          path:
            process.env.QA_SCREENSHOT_DIR +
            "/" +
            (p === a ? "customer" : "admin") +
            "-documents-" +
            width +
            ".png",
          fullPage: true,
        });
      }
    }
  }
  console.log(
    "PASS populated document screens: accessibility and no overflow at all five widths",
  );
  await staff
    .getByRole("combobox", { name: "Decision", exact: true })
    .selectOption("rejected");
  await staff
    .getByLabel("Reason and customer instructions")
    .fill(
      "Please replace this test invoice with a full-page copy showing every item.",
    );
  await staff
    .getByRole("button", { name: "Save document review", exact: true })
    .click();
  await staff.getByRole("status").filter({ hasText: "Review saved" }).waitFor();
  await a.goto(base + "/app/documents");
  await a
    .getByText(
      "Please replace this test invoice with a full-page copy showing every item.",
      { exact: true },
    )
    .waitFor();
  // Boundary 10 MiB goes directly to storage, then the Vercel server validates it.
  const big = Buffer.alloc(10 * 1024 * 1024, 32);
  pdf.copy(big);
  Buffer.from("\n%%EOF").copy(big, big.length - 6);
  await a.getByLabel("Document file", { exact: true }).setInputFiles({
    name: "qa-10mb.pdf",
    mimeType: "application/pdf",
    buffer: big,
  });
  const confirmation = a.waitForResponse(
    (r) =>
      r.url().endsWith("/api/documents/complete") &&
      r.request().method() === "POST",
    { timeout: 60000 },
  );
  await a.getByRole("button", { name: "Upload document", exact: true }).click();
  const confirmed = await confirmation;
  assert.equal(confirmed.status(), 200, await confirmed.text());
  const latest = (
    await clients[0]
      .from("document_uploads")
      .select("*")
      .eq("request_id", requestId)
      .eq("version", 2)
      .single()
  ).data;
  assert.equal(latest.actual_size, 10 * 1024 * 1024);
  assert.equal(latest.scan_state, "pending");
  assert.equal(
    (
      await api(staff, "review", {
        requestId,
        version: 1,
        expected: "uploaded",
        decision: "rejected",
        reason: "Stale decision must not change replacement",
      })
    ).status,
    409,
  );
  console.log(
    "PASS rejection reasons, replacement history, full 10 MiB upload and stale review conflict",
  );
  assert.equal(
    (
      await api(a, "intent", {
        requestId,
        filename: "../evil.pdf",
        mime: "application/pdf",
        size: 1,
        amount: null,
        currency: null,
        merchant: "",
        orderReference: "",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await api(a, "intent", {
        requestId,
        filename: "oversize.pdf",
        mime: "application/pdf",
        size: 10 * 1024 * 1024 + 1,
        amount: null,
        currency: null,
        merchant: "",
        orderReference: "",
      })
    ).status,
    400,
  );
  const profileRequest = await api(staff, "request", {
    profileId: fixtures[0].id,
    packageId: null,
    type: "other",
    instructions: "QA profile-only document request for validation testing",
  });
  assert.equal(profileRequest.status, 200);
  const fake = Buffer.from("<html>not a PDF</html>");
  const badIntent = await api(a, "intent", {
    requestId: profileRequest.body.id,
    filename: "spoof.pdf",
    mime: "application/pdf",
    size: fake.length,
    amount: null,
    currency: null,
    merchant: "",
    orderReference: "",
  });
  assert.equal(badIntent.status, 200);
  assert(
    (
      await fetch(badIntent.body.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: fake,
      })
    ).ok,
  );
  assert.equal(
    (await api(a, "complete", { uploadId: badIntent.body.uploadId })).status,
    422,
  );
  for (const [mime, extension, bytes] of [
    ["image/png", "png", png],
    ["image/jpeg", "jpg", jpeg],
  ]) {
    const imageRequest = await api(staff, "request", {
      profileId: fixtures[0].id,
      packageId: null,
      type: "other",
      instructions: "QA image document validation only: " + extension,
    });
    assert.equal(imageRequest.status, 200);
    const imageIntent = await api(a, "intent", {
      requestId: imageRequest.body.id,
      filename: "qa-image." + extension,
      mime,
      size: bytes.length,
      amount: null,
      currency: null,
      merchant: "",
      orderReference: "",
    });
    assert.equal(imageIntent.status, 200);
    assert(
      (
        await fetch(imageIntent.body.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": mime },
          body: bytes,
        })
      ).ok,
    );
    assert.equal(
      (await api(a, "complete", { uploadId: imageIntent.body.uploadId }))
        .status,
      200,
    );
  }
  console.log("PASS real PNG and JPEG uploads validated into quarantine");
  assert.equal(
    (
      await api(staff, "review", {
        requestId,
        version: 2,
        expected: "uploaded",
        decision: "waived",
        reason:
          "QA only: alternative evidence satisfied the document requirement",
      })
    ).status,
    200,
  );
  assert.equal((await api(a, "download", { uploadId: latest.id })).status, 403);
  const pkg = (
    await clients[0]
      .from("packages")
      .select("status,document_state")
      .eq("id", packageId)
      .single()
  ).data;
  assert.equal(pkg.status, "pre_alerted");
  assert.equal(pkg.document_state, "approved");
  console.log(
    "PASS spoofed file rejection, profile request, size/path validation and waiver without releasing quarantine or changing shipment",
  );
  for (const p of pages) {
    await p.goto(base + "/app");
    await p.getByRole("button", { name: "Sign out", exact: true }).click();
    await p.waitForURL(/\/login/);
  }
  console.log(
    "PASS all browser sessions signed out; QA records ready for scoped cleanup",
  );
} finally {
  for (const c of clients) await c.auth.signOut({ scope: "global" });
  await browser.close();
}
