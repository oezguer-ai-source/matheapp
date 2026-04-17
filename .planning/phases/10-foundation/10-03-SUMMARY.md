---
phase: 10-foundation
plan: 03
subsystem: testing
tags: [vitest, playwright, jsdom, testing-library, e2e, unit-test, integration-test, nyquist]

# Dependency graph
requires:
  - phase: 10-foundation (10-01)
    provides: Supabase project with env vars for test fixtures
provides:
  - Vitest 2.x configured with jsdom, path aliases, and RTL setup
  - Playwright with Chromium configured for e2e against localhost:3000
  - 8 test skeleton files covering all Phase-10 success criteria (SC-1 through SC-5)
  - Test fixtures with admin client and test user constants
  - npm scripts for test, test:watch, test:changed, test:e2e, test:all
affects: [10-04, 10-05, 10-06, 10-07, 10-08, 10-09]

# Tech tracking
tech-stack:
  added: [vitest@2.1.9, "@vitejs/plugin-react@4.7.0", "@playwright/test@1.59.1", "@testing-library/react@16.3.2", "@testing-library/jest-dom@6.9.1", "jsdom@29.0.2", "dotenv@17.4.2"]
  patterns: [nyquist-wave-0-skeleton, it-todo-placeholders, test-skip-for-e2e, postcss-disabled-in-vitest]

key-files:
  created:
    - vitest.config.ts
    - playwright.config.ts
    - tests/setup.ts
    - tests/fixtures/supabase.ts
    - tests/e2e/child-login.spec.ts
    - tests/e2e/teacher-login.spec.ts
    - tests/e2e/auth-redirect.spec.ts
    - tests/integration/middleware-role-routing.test.ts
    - tests/integration/rls-policies.test.ts
    - tests/integration/schema.test.ts
    - tests/unit/pin-email-mapping.test.ts
    - tests/unit/auth-schemas.test.ts
  modified:
    - package.json
    - package-lock.json
    - .planning/phases/10-foundation/10-VALIDATION.md

key-decisions:
  - "Downgraded @vitejs/plugin-react from v6 to v4 for CJS compatibility (project has no type:module)"
  - "Disabled CSS/PostCSS processing in vitest.config.ts to avoid Tailwind v4 plugin conflict"

patterns-established:
  - "Nyquist Wave-0: all test files created upfront with it.todo/test.skip; implementing plans replace with real assertions"
  - "E2E tests use test.skip() with Playwright; unit/integration tests use it.todo() with Vitest"
  - "Test fixtures in tests/fixtures/supabase.ts provide shared constants and admin client for seeding"

requirements-completed: [REQ-01]

# Metrics
duration: 4min
completed: 2026-04-17
---

# Phase 10 Plan 03: Test Infrastructure Summary

**Vitest 2 + Playwright + RTL configured with 15 Wave-0 test skeletons covering all SC-1 through SC-5 success criteria**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-17T15:08:21Z
- **Completed:** 2026-04-17T15:12:50Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Vitest 2.x with jsdom environment, RTL matchers, and path aliases fully configured
- Playwright with Chromium installed and configured for e2e tests against localhost:3000
- All 8 test files (3 e2e, 3 integration, 2 unit) created with exact names from 10-VALIDATION.md
- 15 test cases registered as it.todo/test.skip placeholders for downstream plans to implement
- Nyquist Wave-0 gate opened: wave_0_complete flipped to true in 10-VALIDATION.md

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Vitest + Playwright and write their configs** - `86b2b9c` (chore)
2. **Task 2: Create the eight Nyquist Wave-0 test files with it.todo skeletons** - `4541a76` (test)

## Files Created/Modified
- `vitest.config.ts` - Vitest config with jsdom, RTL setup, path aliases, PostCSS disabled
- `playwright.config.ts` - Playwright config with baseURL localhost:3000, webServer hook
- `tests/setup.ts` - Shared test setup importing jest-dom/vitest matchers with cleanup
- `tests/fixtures/supabase.ts` - Admin client factory + test user/school/class constants
- `tests/e2e/child-login.spec.ts` - SC-1: child logs in with username and pin (skipped)
- `tests/e2e/teacher-login.spec.ts` - SC-2: teacher logs in (skipped)
- `tests/e2e/auth-redirect.spec.ts` - SC-3: redirects unauthenticated users (skipped)
- `tests/integration/middleware-role-routing.test.ts` - SC-4a/4b: role-based route access (todo)
- `tests/integration/rls-policies.test.ts` - SC-4c: RLS data isolation (todo)
- `tests/integration/schema.test.ts` - SC-5: schema existence and constraints (todo)
- `tests/unit/pin-email-mapping.test.ts` - PIN-to-email padding logic (todo)
- `tests/unit/auth-schemas.test.ts` - Zod auth schema validation (todo)
- `package.json` - Added test scripts and dev dependencies
- `.planning/phases/10-foundation/10-VALIDATION.md` - Set wave_0_complete: true

## Decisions Made
- Downgraded @vitejs/plugin-react from v6 (ESM-only) to v4.7.0 (CJS-compatible) because the project does not use "type": "module" in package.json. Changing the module system could break the Next.js build chain.
- Disabled CSS/PostCSS processing in vitest.config.ts (`css: false` + empty postcss config) because Tailwind v4's PostCSS plugin is incompatible with Vitest's bundled Vite. Tests don't need CSS processing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @vitejs/plugin-react v6 ESM-only incompatibility**
- **Found during:** Task 1 (config creation and verification)
- **Issue:** @vitejs/plugin-react v6.0.1 is ESM-only; project uses CJS (no "type": "module"). Vitest config failed to load with "ESM file cannot be loaded by require" error.
- **Fix:** Downgraded to @vitejs/plugin-react@^4 (v4.7.0) which supports CJS
- **Files modified:** package.json, package-lock.json
- **Verification:** `npx vitest run --passWithNoTests` exits 0
- **Committed in:** 86b2b9c (Task 1 commit)

**2. [Rule 3 - Blocking] Tailwind v4 PostCSS plugin conflict with Vitest**
- **Found during:** Task 1 (config creation and verification)
- **Issue:** postcss.config.mjs references "@tailwindcss/postcss" as string plugin. Vitest's bundled Vite tried to resolve it and threw "Invalid PostCSS Plugin" error.
- **Fix:** Added `css: { postcss: {} }` and `test: { css: false }` to vitest.config.ts to bypass PostCSS in test environment
- **Files modified:** vitest.config.ts
- **Verification:** `npx vitest run --passWithNoTests` exits 0
- **Committed in:** 86b2b9c (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking issues)
**Impact on plan:** Both auto-fixes necessary for test infrastructure to function. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Test infrastructure is fully operational; `npx vitest run` exits 0 with 15 pending todos
- Playwright lists 3 e2e specs ready for implementation
- Plans 04-09 can now implement features against pre-existing test files
- Each downstream plan replaces it.todo/test.skip with real assertions

## Self-Check: PASSED

All 12 created files verified present on disk. Both task commits (86b2b9c, 4541a76) verified in git log.

---
*Phase: 10-foundation*
*Completed: 2026-04-17*
