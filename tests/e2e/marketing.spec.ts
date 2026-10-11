import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const route of [
  "/how-it-works",
  "/business",
  "/help",
  "/contact",
  "/services",
  "/about",
  "/tracking",
  "/login",
  "/forgot-password",
  "/legal/terms",
  "/legal/privacy",
  "/legal/shipping-policy",
]) {
  test(`${route}: marketing page is accessible and responsive`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
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
    expect(errors).toEqual([]);
  });
}
test("home acquisition CTAs and business registration preserve intent", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Get your US shipping address", exact: false })
    .first()
    .click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(
    page.getByRole("radio", { name: "Personal", exact: false }),
  ).toBeChecked();
  await page.goto("/business");
  await page
    .getByRole("link", { name: /business account/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/register\?type=business/);
  await expect(
    page.getByRole("radio", { name: /Business \/ reseller/ }),
  ).toBeChecked();
});
test("unconfigured inquiry form and API fail closed", async ({
  page,
  request,
}) => {
  await page.goto("/contact");
  await expect(
    page.getByRole("button", { name: "Sending unavailable" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toBeDisabled();
  expect(
    (
      await request.post("/api/contact", { data: { name: "Fictional" } })
    ).status(),
  ).toBe(503);
  expect((await request.post("/api/contact/retry")).status()).toBe(401);
  await expect((await request.get("/robots.txt")).text()).resolves.toContain(
    "Disallow: /",
  );
});
test("mobile menu supports keyboard dismissal and navigation", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width ?? 0) > 900, "Mobile layout only");
  await page.goto("/");
  const toggle = page.locator('button[aria-controls="mobile-navigation"]');
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await page
    .locator("#mobile-navigation")
    .getByRole("link", { name: "How it works" })
    .click();
  await expect(page).toHaveURL(/\/how-it-works$/);
});
