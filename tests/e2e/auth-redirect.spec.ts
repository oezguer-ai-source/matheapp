import { test, expect } from "@playwright/test";

test.describe("SC-3 — Unauthenticated redirect", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("redirects unauthenticated users", async ({ page }) => {
    await page.goto("/kind/dashboard");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/lehrer/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
