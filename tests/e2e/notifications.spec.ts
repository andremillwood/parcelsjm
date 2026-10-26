import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("notification preview separates acceptance and delivery, filters and keeps retries fictional", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (r) => {
    if (["POST", "PATCH", "PUT"].includes(r.method())) writes.push(r.url());
  });
  await page.goto("/preview/admin/notifications");
  await expect(
    page.getByRole("heading", { name: "Email notifications", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Provider acceptance is not proof of inbox delivery.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.locator(".w-pill").filter({ hasText: "Delivered" }),
  ).toHaveCount(1);
  await expect(
    page.locator(".w-pill").filter({ hasText: "Accepted" }),
  ).toHaveCount(1);
  await page.getByLabel("Delivery state").selectOption("retry");
  await page.getByRole("button", { name: "Filter notifications" }).click();
  await expect(page.locator(".w-task")).toHaveCount(1);
  await page.getByText("Request a controlled retry", { exact: true }).click();
  await page
    .getByLabel("Investigation and reason for retry")
    .fill("Fictional provider issue checked");
  await page
    .getByRole("button", { name: "Check preview", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "No operational record changed",
  );
  expect(writes).toEqual([]);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("notification worker, webhook and retry endpoints reject unauthenticated calls", async ({
  request,
}) => {
  expect((await request.get("/api/communications/dispatch")).status()).toBe(
    401,
  );
  expect((await request.post("/api/communications/retry")).status()).toBe(401);
  expect([400, 503]).toContain(
    (
      await request.post("/api/communications/webhook", {
        data: { type: "email.delivered" },
      })
    ).status(),
  );
});
