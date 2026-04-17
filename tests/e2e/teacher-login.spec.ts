import { test, expect } from "@playwright/test";

test.describe("SC-2 — Teacher login flow", () => {
  test.skip("teacher logs in", async ({ page }) => {
    // Implemented in Plan 10.
    // Flow:
    //   1. Visit /login
    //   2. Click "Lehrkraft" role toggle
    //   3. Fill E-Mail = TEST_TEACHER.email
    //   4. Fill Passwort = TEST_TEACHER.password
    //   5. Click "Einloggen"
    //   6. Expect URL to be /lehrer/dashboard
    //   7. Expect page to contain "Willkommen, E2E Test Teacher"
    expect(true).toBe(true);
  });
});
