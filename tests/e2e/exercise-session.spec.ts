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

/**
 * Parse an exercise string like "7 + 3 = ?" into operands and operator.
 */
function parseExercise(text: string): { operand1: number; operator: string; operand2: number } {
  const match = text.match(/(\d+)\s*([+\-*/])\s*(\d+)/);
  if (!match) throw new Error(`Could not parse exercise: "${text}"`);
  return {
    operand1: parseInt(match[1], 10),
    operator: match[2],
    operand2: parseInt(match[3], 10),
  };
}

/**
 * Compute the correct answer for an exercise.
 */
function computeAnswer(operand1: number, operator: string, operand2: number): number {
  switch (operator) {
    case "+": return operand1 + operand2;
    case "-": return operand1 - operand2;
    case "*": return operand1 * operand2;
    case "/": return Math.floor(operand1 / operand2);
    default: throw new Error(`Unknown operator: ${operator}`);
  }
}

/**
 * Type a number digit-by-digit using the number pad.
 */
async function typeNumberOnPad(page: import("@playwright/test").Page, num: number) {
  const digits = String(num).split("");
  for (const digit of digits) {
    await page.getByRole("button", { name: digit, exact: true }).click();
  }
}

test.describe("SC-02/03 -- Exercise session flow", () => {
  test("exercise session loads and shows an exercise", async ({ page }) => {
    await loginAsChild(page);
    await page.goto("/kind/ueben");

    // Wait for exercise to load (text pattern: "N op N = ?")
    const exerciseDisplay = page.locator("div.text-5xl");
    await expect(exerciseDisplay).toBeVisible({ timeout: 10_000 });
    const text = await exerciseDisplay.textContent();
    expect(text).toMatch(/\d+\s*[+\-*/]\s*\d+\s*=\s*/);
  });

  test("number pad buttons are visible and clickable", async ({ page }) => {
    await loginAsChild(page);
    await page.goto("/kind/ueben");

    // Wait for exercise to load
    await expect(page.locator("div.text-5xl")).toBeVisible({ timeout: 10_000 });

    // Verify digit buttons 0-9 are visible
    for (let d = 0; d <= 9; d++) {
      await expect(
        page.getByRole("button", { name: String(d), exact: true })
      ).toBeVisible();
    }

    // Verify delete and OK buttons
    await expect(page.getByRole("button", { name: "Loeschen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bestaetigen" })).toBeVisible();

    // Click "5" and verify it appears in the answer display
    await page.getByRole("button", { name: "5", exact: true }).click();
    const exerciseDisplay = page.locator("div.text-5xl");
    const displayText = await exerciseDisplay.textContent();
    expect(displayText).toContain("5");
  });

  test.slow();
  test("submitting correct answer shows green feedback", async ({ page }) => {
    await loginAsChild(page);
    await page.goto("/kind/ueben");

    // Wait for exercise
    const exerciseDisplay = page.locator("div.text-5xl");
    await expect(exerciseDisplay).toBeVisible({ timeout: 10_000 });

    // Parse the exercise
    const text = await exerciseDisplay.textContent();
    if (!text) throw new Error("No exercise text");
    const { operand1, operator, operand2 } = parseExercise(text);
    const correctAnswer = computeAnswer(operand1, operator, operand2);

    // Type the correct answer digit by digit
    await typeNumberOnPad(page, correctAnswer);

    // Click OK
    await page.getByRole("button", { name: "Bestaetigen" }).click();

    // Wait for feedback overlay
    const feedback = page.getByTestId("feedback-overlay");
    await expect(feedback).toBeVisible({ timeout: 10_000 });

    // Verify correct feedback text and green styling
    await expect(feedback.getByText(/Richtig! \+\d+ Punkte/)).toBeVisible();
    await expect(feedback).toHaveClass(/bg-green-100/);
  });

  test.slow();
  test("submitting wrong answer shows red feedback", async ({ page }) => {
    await loginAsChild(page);
    await page.goto("/kind/ueben");

    // Wait for exercise
    const exerciseDisplay = page.locator("div.text-5xl");
    await expect(exerciseDisplay).toBeVisible({ timeout: 10_000 });

    // Parse exercise and compute a wrong answer
    const text = await exerciseDisplay.textContent();
    if (!text) throw new Error("No exercise text");
    const { operand1, operator, operand2 } = parseExercise(text);
    const correctAnswer = computeAnswer(operand1, operator, operand2);
    const wrongAnswer = correctAnswer + 1;

    // Type the wrong answer
    await typeNumberOnPad(page, wrongAnswer);

    // Click OK
    await page.getByRole("button", { name: "Bestaetigen" }).click();

    // Wait for feedback overlay
    const feedback = page.getByTestId("feedback-overlay");
    await expect(feedback).toBeVisible({ timeout: 10_000 });

    // Verify wrong feedback text and red styling
    await expect(
      feedback.getByText(/Leider falsch\. Die Antwort ist: \d+/)
    ).toBeVisible();
    await expect(feedback).toHaveClass(/bg-red-100/);
  });

  test.slow();
  test("feedback auto-advances to next exercise", async ({ page }) => {
    await loginAsChild(page);
    await page.goto("/kind/ueben");

    // Wait for first exercise
    const exerciseDisplay = page.locator("div.text-5xl");
    await expect(exerciseDisplay).toBeVisible({ timeout: 10_000 });

    // Get the first exercise text
    const firstText = await exerciseDisplay.textContent();
    if (!firstText) throw new Error("No exercise text");

    // Parse and submit correct answer (faster auto-advance at 1.5s)
    const { operand1, operator, operand2 } = parseExercise(firstText);
    const correctAnswer = computeAnswer(operand1, operator, operand2);
    await typeNumberOnPad(page, correctAnswer);
    await page.getByRole("button", { name: "Bestaetigen" }).click();

    // Wait for feedback
    await expect(page.getByTestId("feedback-overlay")).toBeVisible({ timeout: 10_000 });

    // Wait for auto-advance (1.5s for correct answers + buffer)
    // The exercise display should re-appear with a new exercise (or the same, but state resets)
    await expect(exerciseDisplay).toBeVisible({ timeout: 5_000 });

    // After auto-advance, feedback should be gone and we should be back in answering state
    // The answer display should show "?" again (reset)
    await expect(page.getByTestId("feedback-overlay")).not.toBeVisible({ timeout: 5_000 });
  });

  test("Beenden button returns to dashboard", async ({ page }) => {
    await loginAsChild(page);
    await page.goto("/kind/ueben");

    // Wait for exercise to load
    await expect(page.locator("div.text-5xl")).toBeVisible({ timeout: 10_000 });

    // Click Beenden
    await page.getByRole("button", { name: "Beenden" }).click();

    // Should navigate back to dashboard
    await page.waitForURL("**/kind/dashboard", { timeout: 10_000 });
    await expect(page).toHaveURL(/\/kind\/dashboard/);
  });

  test.slow();
  test("session stats update after answering", async ({ page }) => {
    await loginAsChild(page);
    await page.goto("/kind/ueben");

    // Wait for exercise
    const exerciseDisplay = page.locator("div.text-5xl");
    await expect(exerciseDisplay).toBeVisible({ timeout: 10_000 });

    // Parse and submit correct answer
    const text = await exerciseDisplay.textContent();
    if (!text) throw new Error("No exercise text");
    const { operand1, operator, operand2 } = parseExercise(text);
    const correctAnswer = computeAnswer(operand1, operator, operand2);
    await typeNumberOnPad(page, correctAnswer);
    await page.getByRole("button", { name: "Bestaetigen" }).click();

    // Wait for feedback
    await expect(page.getByTestId("feedback-overlay")).toBeVisible({ timeout: 10_000 });

    // Verify stats show 1 correct
    await expect(page.getByText("1 richtig")).toBeVisible();
  });
});
