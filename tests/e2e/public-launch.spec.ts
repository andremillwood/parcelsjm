import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const route of [
  "/",
  "/rates",
  "/register",
  "/legal/terms",
  "/legal/privacy",
  "/legal/shipping-policy",
  "/tracking",
  "/contact",
]) {
  test(`${route}: public launch content is accessible and has clear actions`, async ({
    page,
  }) => {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator("main")).not.toContainText(
      /approval pending|not yet open|\[TO BE|\[PENDING|draft policy/i,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    if (route === "/") {
      await expect(page.locator(".m-campaign-actions a")).toHaveCount(1);
      await expect(
        page.locator(".m-header-actions a[href='/register']"),
      ).toHaveCount(0);
    }
    if (route === "/register") {
      await expect(
        page.getByRole("button", { name: "Create account", exact: true }),
      ).toBeEnabled();
      await expect(
        page.locator(".m-header-actions a[href='/register']"),
      ).toHaveCount(0);
      await page
        .getByLabel("How would you like to receive your packages?")
        .selectOption("delivery");
      await expect(
        page.getByLabel("Delivery address", { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".m-checkbox a")).toHaveCount(3);
    }
    if (route === "/tracking")
      await expect(page.locator(".m-link-row a")).toHaveCount(1);
    if (route === "/rates") await expect(page.getByRole("row")).toHaveCount(11);
    if (route === "/contact") {
      await expect(
        page.getByRole("link", { name: "Email Parcels JA" }),
      ).toHaveAttribute("href", "mailto:support@parcelsjm.com");
      await expect(
        page.getByRole("button", { name: "Sending unavailable" }),
      ).toHaveCount(0);
    }
  });
}
