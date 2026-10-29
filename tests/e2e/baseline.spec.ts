import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const path of ["/", "/rates", "/register", "/login"]) {
  test(`${path}: accessible public page, no page overflow or runtime errors`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toBeUndefined();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByText("Development preview", { exact: false }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole("img", { name: "Parcels JA — Freight, Shipping, Delivery" })
        .first(),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    const a11y = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(a11y.violations).toEqual([]);
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
    expect(errors).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`${path.replaceAll("/", "") || "home"}.png`),
      fullPage: true,
    });
  });
}

test("registration collects identity and fulfillment details and fails closed without configuration", async ({
  page,
  request,
}) => {
  await page.goto("/register");
  await expect(
    page.getByLabel("TRN (Taxpayer Registration Number)", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Home address", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("How would you like to receive your packages?"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toBeDisabled();
  expect(
    (
      await request.post("/api/auth", { data: { action: "register" } })
    ).status(),
  ).toBe(503);
});

test("rates remain unavailable and unknown routes are honest 404s", async ({
  page,
}) => {
  await page.goto("/rates");
  await expect(
    page.getByText("Estimate unavailable", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("spinbutton")).toHaveCount(0);
  const response = await page.goto("/not-a-real-page");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
});
