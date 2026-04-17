import { test, expect } from "@playwright/test";
import {
  seedTestData,
  cleanupTestData,
  TEST_CHILD,
} from "../fixtures/supabase";

test.beforeAll(async () => {
  await seedTestData();
});

test.afterAll(async () => {
  await cleanupTestData();
});

test.describe("SC-1 — Child login flow", () => {
  test("child logs in with username and pin", async ({ page }) => {
    await page.goto("/login");

    // Role toggle defaults to Kind; click to be explicit and verify state
    await page.getByRole("tab", { name: "Kind" }).click();

    await page.getByLabel("Benutzername").fill(TEST_CHILD.username);

    // Four PIN digit inputs — aria-label "PIN-Ziffer N von 4"
    const digits = TEST_CHILD.pin.split("");
    for (let i = 0; i < 4; i++) {
      await page
        .getByLabel(`PIN-Ziffer ${i + 1} von 4`)
        .fill(digits[i]);
    }

    await page.getByRole("button", { name: "Einloggen" }).click();

    await page.waitForURL("**/kind/dashboard", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/kind\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: `Hallo, ${TEST_CHILD.username}!` })
    ).toBeVisible();
  });
});
