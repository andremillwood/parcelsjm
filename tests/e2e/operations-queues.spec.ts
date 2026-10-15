import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("work queue filters, pagination and assignment preview remain truthful", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (r) => {
    if (["POST", "PUT", "PATCH"].includes(r.method())) writes.push(r.url());
  });
  await page.goto("/preview/admin/queues");
  await expect(
    page.getByRole("heading", { name: "Work queues", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("31 matching records · Page 1 of 2"),
  ).toBeVisible();
  await expect(page.locator(".w-task")).toHaveCount(25);
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(
    page.getByText("31 matching records · Page 2 of 2"),
  ).toBeVisible();
  await expect(page.locator(".w-task")).toHaveCount(6);
  await page.getByRole("link", { name: "Previous", exact: true }).click();
  await page
    .getByLabel("Search reference", { exact: true })
    .fill("Fictional work 01");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".w-task")).toHaveCount(1);
  await page.getByText("Assign or prioritize", { exact: true }).click();
  await page
    .locator(".w-task")
    .getByRole("combobox", { name: "Priority", exact: true })
    .selectOption("2");
  await page
    .getByLabel("Internal audit reason", { exact: true })
    .fill("Fictional prioritization for preview review");
  await page
    .getByRole("button", { name: "Check preview", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Preview checked. No operational record changed.",
  );
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
  await page.getByRole("link", { name: "Reset filters" }).click();
  await page
    .getByRole("combobox", { name: "Assignment", exact: true })
    .selectOption("mine");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("heading", { name: "No matching work" }),
  ).toBeVisible();
  expect(writes).toEqual([]);
});
test("latest checkpoint correction keeps original history in the preview", async ({
  page,
}) => {
  await page.goto("/preview/admin/packages/demo-001");
  await page
    .getByText("Correct the latest checkpoint", { exact: true })
    .click();
  await expect(page.getByLabel("Customer-visible explanation")).toBeVisible();
  await page.getByLabel("Corrected checkpoint").selectOption("pre_alerted");
  await page
    .getByLabel("Verified evidence / source reference")
    .fill("Fictional reference evidence");
  await page
    .getByLabel("Corrected effective time (your local time)")
    .fill("2026-10-10T14:00");
  await page
    .getByLabel("Customer-visible explanation")
    .fill("The fictional receipt was attached to this record in error.");
  await page
    .getByLabel("Internal audit reason")
    .fill("Preview correction check only");
  await page
    .getByRole("button", { name: "Check preview", exact: true })
    .first()
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Preview checked. No operational record changed.",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
