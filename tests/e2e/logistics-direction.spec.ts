import { test, expect } from "@playwright/test";

test("shipping shortcuts preserve tracking privacy and help journeys", async ({
  page,
}) => {
  await page.goto("/");
  const shortcuts = page.getByRole("navigation", {
    name: "Shipping shortcuts",
  });
  await shortcuts.getByRole("link", { name: "Track your package" }).click();
  await expect(page).toHaveURL(/\/tracking$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/");
  await shortcuts
    .getByRole("link", { name: "Plan your next purchase" })
    .click();
  await expect(page).toHaveURL(/\/how-it-works$/);
  await page.goto("/");
  await shortcuts.getByRole("link", { name: "Get shipping help" }).click();
  await expect(page).toHaveURL(/\/help$/);
});
