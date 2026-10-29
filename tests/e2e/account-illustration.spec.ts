import { test, expect } from "@playwright/test";

test("public account illustration has no development screenshot and fits the viewport", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("img", { name: /Example Parcels JA account/ }),
  ).toBeVisible();
  await expect(page.locator('img[src*="customer-app-demo"]')).toHaveCount(0);
  await expect(
    page.getByText(/development preview|customer app demo|no account needed/i),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".m-account-figure")
      .getByRole("link", { name: "Open your account" }),
  ).toHaveAttribute("href", "/app");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator(".m-account-figure").screenshot({
    path: `test-results/account-${test.info().project.name}.png`,
  });
});
