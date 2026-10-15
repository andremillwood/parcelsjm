import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function fill(page: import("@playwright/test").Page) {
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Fictional Signup Person");
  await page.getByLabel("Email", { exact: true }).fill("signup@example.test");
  await page.getByLabel("Phone", { exact: true }).fill("8765550100");
  await page
    .getByLabel("TRN (Taxpayer Registration Number)", { exact: true })
    .fill("012-345-678");
  await page
    .getByLabel("Home address", { exact: true })
    .fill("Sample district, Sample town, Jamaica");
  await page
    .getByLabel("Password", { exact: true })
    .fill("FictionalPassword123!");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("FictionalPassword123!");
  await page.getByRole("checkbox").check();
}
test("live signup UI validates identity, preserves intent, retries safely and clears private fields", async ({
  page,
}) => {
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/api/auth", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({
      status: bodies.length === 1 ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify({
        message:
          bodies.length === 1
            ? "Account service is temporarily unavailable. Please try again."
            : "Check your email to verify your account.",
      }),
    });
  });
  await page.goto("/register?type=business");
  await expect(
    page.getByRole("radio", { name: "Business / reseller", exact: false }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByLabel("Full name", { exact: true })).toBeFocused();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "highlighted",
  );
  expect(bodies).toHaveLength(0);
  await fill(page);
  await page
    .getByLabel("TRN (Taxpayer Registration Number)", { exact: true })
    .fill("12345678");
  await page.getByLabel("Home address", { exact: true }).fill("short");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("DifferentPassword!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByLabel("TRN (Taxpayer Registration Number)", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByLabel("Home address", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByLabel("Confirm password", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  expect(bodies).toHaveLength(0);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await fill(page);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).toMatchObject({
    action: "register",
    accountType: "business",
    trn: "012345678",
    homeAddress: "Sample district, Sample town, Jamaica",
    consent: true,
  });
  expect(bodies[0]).not.toHaveProperty("confirmPassword");
  await expect(
    page.getByLabel("TRN (Taxpayer Registration Number)", { exact: true }),
  ).toHaveValue("012-345-678");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText("verify your account");
  await expect(page.getByRole("status")).toBeFocused();
  expect(bodies).toHaveLength(2);
  await expect(
    page.getByLabel("TRN (Taxpayer Registration Number)", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByLabel("Home address", { exact: true })).toHaveValue(
    "",
  );
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});
test("signup blocks duplicate sends and recovers from network failure", async ({
  page,
}) => {
  let count = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/auth", async (route) => {
    count++;
    await pending;
    await route.abort();
  });
  await page.goto("/register");
  await fill(page);
  const button = page.getByRole("button", { name: "Create account" });
  await button.click();
  await expect(
    page.getByRole("button", { name: "Creating account…" }),
  ).toBeDisabled();
  await page
    .locator("form")
    .evaluate((form) => (form as HTMLFormElement).requestSubmit());
  release();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Connection unavailable",
  );
  expect(count).toBe(1);
  await expect(button).toBeEnabled();
});
