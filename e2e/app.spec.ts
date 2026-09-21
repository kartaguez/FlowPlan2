import { expect, test } from "@playwright/test";

test("loads the FlowPlan application shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "FlowPlan" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Planning workspace" }),
  ).toBeVisible();
});
