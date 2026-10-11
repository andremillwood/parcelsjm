import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const kind of ["contact", "rates", "business"]) {
  test(`${kind}: consent, provider error, retry identity and queued success`, async ({
    page,
  }) => {
    const submissions: Record<string, unknown>[] = [];
    await page.route("**/api/contact", async (route) => {
      submissions.push(route.request().postDataJSON());
      await route.fulfill({
        status: submissions.length === 1 ? 503 : 202,
        contentType: "application/json",
        body: JSON.stringify(
          submissions.length === 1
            ? {
                error:
                  "We could not confirm your inquiry. Please retry without changing your details.",
              }
            : { accepted: true },
        ),
      });
    });
    await page.goto(`/${kind}`);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page
      .getByRole("textbox", { name: "Name", exact: true })
      .fill("Fictional Test");
    await page
      .getByRole("textbox", { name: "Email", exact: true })
      .fill("person@example.test");
    if (kind === "business") {
      await page.getByLabel("Estimated packages per month").fill("20");
      await page.getByLabel("Product category").fill("Clothing");
    }
    await page
      .locator('textarea[name="message"]')
      .fill("This is a fictional inquiry test.");
    await page.getByRole("button", { name: "Send inquiry" }).click();
    expect(submissions).toHaveLength(0);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Send inquiry" }).click();
    await expect(page.locator("form").getByRole("alert")).toContainText(
      "could not confirm",
    );
    await page.getByRole("button", { name: "Send inquiry" }).click();
    await expect(page.getByRole("status")).toContainText("received and queued");
    expect(submissions).toHaveLength(2);
    expect(submissions[0].requestId).toBe(submissions[1].requestId);
    expect(submissions[1].kind).toBe(kind);
    expect(submissions[1].consent).toBe(true);
    expect(submissions[1].website).toBe("");
    await expect(
      page.getByRole("textbox", { name: "Name", exact: true }),
    ).toHaveValue("");
  });
}
