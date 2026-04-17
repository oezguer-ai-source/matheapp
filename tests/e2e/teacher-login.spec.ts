import { test, expect } from "@playwright/test";
import {
  seedTestData,
  cleanupTestData,
  TEST_TEACHER,
} from "../fixtures/supabase";

test.beforeAll(async () => {
  await seedTestData();
});

test.afterAll(async () => {
  await cleanupTestData();
});

test.describe("SC-2 — Teacher login flow", () => {
  test("teacher logs in", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("tab", { name: "Lehrkraft" }).click();

    await page.getByLabel("E-Mail").fill(TEST_TEACHER.email);
    await page.getByLabel("Passwort", { exact: true }).fill(TEST_TEACHER.password);

    await page.getByRole("button", { name: "Einloggen" }).click();

    await page.waitForURL("**/lehrer/dashboard", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/lehrer\/dashboard$/);
    await expect(
      page.getByRole("heading", {
        name: `Willkommen, ${TEST_TEACHER.name}`,
      })
    ).toBeVisible();
  });
});
