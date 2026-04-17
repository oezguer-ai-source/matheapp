import { test, expect } from "@playwright/test";

test.describe("SC-3 — Unauthenticated redirect", () => {
  test.skip("redirects unauthenticated users", async ({ page }) => {
    // Implemented in Plan 10.
    // Flow:
    //   1. Ensure no session (clear cookies)
    //   2. Visit /kind/dashboard
    //   3. Expect final URL to be /login
    //   4. Visit /lehrer/dashboard
    //   5. Expect final URL to be /login
    expect(true).toBe(true);
  });
});
