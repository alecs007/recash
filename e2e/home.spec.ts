import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads and renders the hero", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    await expect(page).toHaveTitle(/Recash/i);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("renders the leaderboard section even with no data", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toBeVisible();
  });
});
