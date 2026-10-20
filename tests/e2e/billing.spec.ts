import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const route of [
  "/preview/app/billing",
  "/preview/admin/billing",
  "/preview/admin/shipments",
  "/preview/admin/shipments/demo-batch",
  "/preview/app/billing/demo-invoice-001",
  "/preview/admin/billing/demo-invoice-001",
  "/legal/privacy",
  "/legal/terms",
  "/legal/shipping-policy",
]) {
  test(`billing and policy review ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    if (route.startsWith("/legal")) {
      await expect(page.getByText("Draft — approval pending.")).toBeVisible();
      await expect(
        page.getByText(/Mckellar Group of Companies/).first(),
      ).toBeVisible();
    }
    if (route.includes("demo-invoice"))
      await expect(
        page.getByText("Fictional record · no real payment due"),
      ).toBeVisible();
    expect(errors).toEqual([]);
  });
}
