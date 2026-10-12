import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const path of ["/", "/rates", "/register", "/dashboard"]) {
  test(`${path}: accessible demo, no page overflow or runtime errors`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByText("Development preview", { exact: false }),
    ).toBeVisible();
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

test("registration validates without creating an account or transmitting input", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH"].includes(request.method()))
      writes.push(request.url());
  });
  await page.goto("/register");
  await page.getByRole("button", { name: "Preview registration" }).click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.getByLabel("Full name").fill("Demo Customer");
  await page.getByLabel("Email", { exact: true }).fill("demo@example.test");
  await page.getByLabel("Phone").fill("8765550100");
  await page
    .getByRole("radio", { name: "Business / reseller", exact: false })
    .check();
  await page.getByRole("button", { name: "Preview registration" }).click();
  await expect(page.getByRole("status")).toContainText(
    "No account was created",
  );
  expect(writes).toEqual([]);
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
