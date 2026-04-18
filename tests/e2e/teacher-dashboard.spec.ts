import { test, expect } from "@playwright/test";
import {
  seedTestData,
  cleanupTestData,
  adminClient,
  TEST_TEACHER,
  TEST_CHILD,
} from "../fixtures/supabase";
import type { SeedResult } from "../fixtures/supabase";

let seed: SeedResult;

test.beforeAll(async () => {
  seed = await seedTestData();

  // 5 progress_entries + 1 minigame_redeem (gleich wie Integration-Tests)
  const admin = adminClient();
  const entries = [
    { child_id: seed.childId, operation_type: "addition", grade: TEST_CHILD.grade, correct: true, points_earned: 10 },
    { child_id: seed.childId, operation_type: "addition", grade: TEST_CHILD.grade, correct: false, points_earned: 0 },
    { child_id: seed.childId, operation_type: "subtraktion", grade: TEST_CHILD.grade, correct: true, points_earned: 10 },
    { child_id: seed.childId, operation_type: "multiplikation", grade: TEST_CHILD.grade, correct: false, points_earned: 0 },
    { child_id: seed.childId, operation_type: "division", grade: TEST_CHILD.grade, correct: true, points_earned: 10 },
  ];

  const { error } = await admin.from("progress_entries").insert(entries);
  if (error) throw error;

  // minigame_redeem (wird von der Statistik ausgeschlossen)
  await admin.from("progress_entries").insert({
    child_id: seed.childId,
    operation_type: "minigame_redeem",
    grade: TEST_CHILD.grade,
    correct: true,
    points_earned: -30,
  });
});

test.afterAll(async () => {
  await cleanupTestData();
});

async function loginAsTeacher(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Lehrkraft" }).click();
  await page.getByLabel("E-Mail").fill(TEST_TEACHER.email);
  await page.getByLabel("Passwort", { exact: true }).fill(TEST_TEACHER.password);
  await page.getByRole("button", { name: "Einloggen" }).click();
  await page.waitForURL("**/lehrer/dashboard", { timeout: 15_000 });
}

test.describe("Teacher Dashboard E2E", () => {
  test("Dashboard zeigt Klassenueberblick", async ({ page }) => {
    await loginAsTeacher(page);

    // Willkommen-Text mit Lehrer-Name
    await expect(
      page.getByRole("heading", { name: `Willkommen, ${TEST_TEACHER.name}` })
    ).toBeVisible();

    // Tabelle ist sichtbar
    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    // Test-Kind Name in der Tabelle
    await expect(page.getByText(TEST_CHILD.username)).toBeVisible();

    // Genauigkeit (60%)
    await expect(page.getByText("60%")).toBeVisible();

    // Letzte Aktivitaet (sollte "Heute" sein, da gerade Daten eingefuegt)
    await expect(page.getByText("Heute")).toBeVisible();
  });

  test("Klick auf Schueler zeigt Detail-Bereich", async ({ page }) => {
    await loginAsTeacher(page);

    // Warte bis Tabelle geladen
    await expect(page.getByRole("table")).toBeVisible();

    // Klicke auf die Zeile des Test-Kinds
    await page.getByText(TEST_CHILD.username).click();

    // Detail-Bereich sollte sichtbar werden mit Operations-Karten
    await expect(page.getByText("Addition")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Subtraktion")).toBeVisible();
    await expect(page.getByText("Multiplikation")).toBeVisible();
    await expect(page.getByText("Division")).toBeVisible();
  });

  test("Spalten-Sortierung funktioniert ohne Fehler", async ({ page }) => {
    await loginAsTeacher(page);

    // Warte bis Tabelle geladen
    await expect(page.getByRole("table")).toBeVisible();

    // Klicke auf den "Punkte" Spaltenheader
    await page.getByText("Punkte").click();

    // Tabelle muss immer noch sichtbar sein (kein Crash/Fehler)
    await expect(page.getByRole("table")).toBeVisible();

    // Test-Kind sollte immer noch sichtbar sein
    await expect(page.getByText(TEST_CHILD.username)).toBeVisible();

    // Nochmal klicken fuer umgekehrte Sortierung
    await page.getByText("Punkte").click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText(TEST_CHILD.username)).toBeVisible();
  });
});
