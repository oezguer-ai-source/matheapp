import { test, expect } from "@playwright/test";

test.describe("SC-1 — Child login flow", () => {
  test.skip("child logs in with username and pin", async ({ page }) => {
    // Implemented in Plan 10.
    // Flow:
    //   1. Visit /login
    //   2. Click "Kind" role toggle
    //   3. Fill Benutzername = TEST_CHILD.username
    //   4. Fill four PIN digits from TEST_CHILD.pin
    //   5. Click "Einloggen"
    //   6. Expect URL to be /kind/dashboard
    //   7. Expect page to contain German greeting "Hallo, mia.e2e!"
    expect(true).toBe(true);
  });
});
