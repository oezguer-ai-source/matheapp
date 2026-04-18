import { test, expect } from "@playwright/test";
import {
  seedTestData,
  cleanupTestData,
  TEST_CHILD,
  adminClient,
} from "../fixtures/supabase";
import type { SeedResult } from "../fixtures/supabase";

let seed: SeedResult;

// Seeded progress entries: 5 entries, 3 correct (easy=10pts each), 2 incorrect (0pts)
// Total points: 30, exercise count: 5
const SEEDED_CORRECT = 3;
const SEEDED_INCORRECT = 2;
const SEEDED_TOTAL_POINTS = SEEDED_CORRECT * 10; // 30
const SEEDED_EXERCISE_COUNT = SEEDED_CORRECT + SEEDED_INCORRECT; // 5

test.beforeAll(async () => {
  seed = await seedTestData();

  // Seed progress entries for dashboard data display
  const admin = adminClient();
  const entries = [
    { child_id: seed.childId, operation_type: "addition", grade: TEST_CHILD.grade, correct: true, points_earned: 10 },
    { child_id: seed.childId, operation_type: "subtraktion", grade: TEST_CHILD.grade, correct: true, points_earned: 10 },
    { child_id: seed.childId, operation_type: "addition", grade: TEST_CHILD.grade, correct: false, points_earned: 0 },
    { child_id: seed.childId, operation_type: "subtraktion", grade: TEST_CHILD.grade, correct: true, points_earned: 10 },
    { child_id: seed.childId, operation_type: "addition", grade: TEST_CHILD.grade, correct: false, points_earned: 0 },
  ];

  const { error } = await admin.from("progress_entries").insert(entries);
  if (error) throw error;
});

test.afterAll(async () => {
  // Delete seeded progress entries before cleanup (cleanup deletes the child user which cascades)
  await cleanupTestData();
});

async function loginAsChild(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Kind" }).click();
  await page.getByLabel("Benutzername").fill(TEST_CHILD.username);

  const digits = TEST_CHILD.pin.split("");
  for (let i = 0; i < 4; i++) {
    await page.getByLabel(`PIN-Ziffer ${i + 1} von 4`).fill(digits[i]);
  }

  await page.getByRole("button", { name: "Einloggen" }).click();
  await page.waitForURL("**/kind/dashboard", { timeout: 15_000 });
}

test.describe("SC-01 -- Child dashboard data display", () => {
  test("dashboard shows greeting with display name", async ({ page }) => {
    await loginAsChild(page);
    await expect(
      page.getByRole("heading", { name: `Hallo, ${TEST_CHILD.username}!` })
    ).toBeVisible();
  });

  test("dashboard shows grade level", async ({ page }) => {
    await loginAsChild(page);
    await expect(page.getByText(`Klasse ${TEST_CHILD.grade}`)).toBeVisible();
  });

  test("dashboard shows total points", async ({ page }) => {
    await loginAsChild(page);
    await expect(page.getByText(`${SEEDED_TOTAL_POINTS} Punkte`)).toBeVisible();
  });

  test("dashboard shows exercise count", async ({ page }) => {
    await loginAsChild(page);
    await expect(
      page.getByText(`${SEEDED_EXERCISE_COUNT} Aufgaben geloest`)
    ).toBeVisible();
  });

  test("dashboard shows progress bar", async ({ page }) => {
    await loginAsChild(page);
    await expect(page.getByText(/Punkte bis zum Spiel/)).toBeVisible();
  });

  test("Aufgaben starten button links to ueben", async ({ page }) => {
    await loginAsChild(page);
    const link = page.getByRole("link", { name: /Aufgaben starten/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /\/kind\/ueben/);
  });
});
