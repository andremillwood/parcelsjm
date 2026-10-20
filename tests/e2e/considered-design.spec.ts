import { test, expect } from "@playwright/test";
test("activity summaries lead to coherent fictional work without sending writes", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (r) => {
    if (["POST", "PUT", "PATCH"].includes(r.method())) writes.push(r.url());
  });
  await page.goto("/preview/app");
  await expect(
    page.getByRole("heading", { name: "Your shipping overview" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Documents requested 1", exact: true })
    .click();
  await expect(page).toHaveURL(/\/preview\/app\/documents$/);
  await expect(
    page.getByText("2 document requests", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Filter document status").selectOption("requested");
  await expect(
    page.getByRole("region", { name: "invoice request" }),
  ).toHaveCount(1);
  await expect(
    page.getByText(
      "Fictional example: provide the purchase invoice for these two shirts. No file is uploaded or reviewed in this demo.",
    ),
  ).toBeVisible();
  await page.goto("/preview/app");
  await page
    .getByRole("link", { name: "Recent packages 3", exact: true })
    .click();
  await expect(page).toHaveURL(/\/preview\/app\/packages$/);
  await page
    .getByRole("link")
    .filter({ hasText: "Example clothing store" })
    .click();
  await expect(page).toHaveURL(/\/packages\/demo-001$/);
  const mobile = (page.viewportSize()?.width ?? 1440) <= 900;
  if (mobile) await page.getByText("Account menu", { exact: true }).click();
  const nav = page.getByRole("navigation", {
    name: mobile ? "Workspace mobile navigation" : "Customer navigation",
    exact: true,
  });
  await expect(
    nav.getByRole("link", { name: "My packages", exact: true }),
  ).toHaveAttribute("aria-current", "location");
  expect(writes).toEqual([]);
});
test("operations summary links preserve the operational destinations", async ({
  page,
}) => {
  await page.goto("/preview/admin");
  await expect(
    page.getByRole("heading", { name: "Shipment operations", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Document review 1", exact: true })
    .click();
  await expect(page).toHaveURL(/\/preview\/admin\/documents$/);
  await expect(
    page.getByText("Unscanned files remain quarantined", { exact: false }),
  ).toBeVisible();
});
