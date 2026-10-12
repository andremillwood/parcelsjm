import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("customer workspace previews are responsive and accessible", async ({
  page,
}) => {
  for (const path of [
    "/preview/app",
    "/preview/app/packages",
    "/preview/app/pre-alert/new",
    "/preview/app/packages/demo-001",
    "/preview/app/support",
    "/preview/app/documents",
    "/preview/app/profile",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Interactive design preview")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});
test("operations previews retain protected workflow boundaries", async ({
  page,
  request,
}) => {
  for (const path of [
    "/preview/admin",
    "/preview/admin/packages/demo-001",
    "/preview/admin/intake",
    "/preview/admin/customers",
    "/preview/admin/support",
    "/preview/admin/documents",
    "/preview/admin/billing",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  for (const path of ["/app", "/admin"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
  const response = await request.post("/api/workspace/pre-alert", {
    data: { status: "delivered" },
  });
  expect(response.status()).toBe(401);
});
test("preview pre-alert validates required fields and does not persist a fictional shipment", async ({
  page,
}) => {
  await page.goto("/preview/app/pre-alert/new");
  await page.getByLabel("Carrier tracking / reference").fill("EXAMPLE-TEST");
  await page.getByLabel("Store / merchant").fill("Fictional store");
  await page
    .getByLabel("Item description")
    .fill("Example item for interface testing");
  await page.getByLabel("Declared value", { exact: true }).fill("10");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Check preview" }).click();
  await expect(page.getByRole("status")).toContainText("No record was saved");
});
