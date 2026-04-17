---
phase: 10
slug: foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-16
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x + React Testing Library + Playwright (E2E) |
| **Config file** | `vitest.config.ts` (Wave 0 — creates), `playwright.config.ts` (Wave 0 — creates) |
| **Quick run command** | `npx vitest run --reporter=verbose --passWithNoTests` |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | ~30-60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --changed`
- **After every plan wave:** Run `npx vitest run && npx playwright test --project=chromium`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-09-01 | 10-09 | 7 | REQ-01 / SC-1 | T-10-AUTH | Child login: username+PIN → `/kind/dashboard` | e2e | `npx playwright test tests/e2e/child-login.spec.ts` | ❌ W0 | ⬜ pending |
| 10-09-01 | 10-09 | 7 | REQ-01 / SC-2 | T-10-AUTH | Teacher login: email+password → `/lehrer/dashboard` | e2e | `npx playwright test tests/e2e/teacher-login.spec.ts` | ❌ W0 | ⬜ pending |
| 10-09-01 | 10-09 | 7 | REQ-01 / SC-3 | T-10-AUTH | Logged-out user on protected route → redirected to `/login` | e2e | `npx playwright test tests/e2e/auth-redirect.spec.ts` | ❌ W0 | ⬜ pending |
| 10-09-02 | 10-09 | 7 | REQ-01 / SC-4a | T-10-RBAC | Child cannot access `/lehrer/*` | integration | `npx vitest run tests/integration/middleware-role-routing.test.ts -t "child cannot access teacher routes"` | ❌ W0 | ⬜ pending |
| 10-09-02 | 10-09 | 7 | REQ-01 / SC-4b | T-10-RBAC | Teacher cannot access `/kind/*` | integration | `npx vitest run tests/integration/middleware-role-routing.test.ts -t "teacher cannot access child routes"` | ❌ W0 | ⬜ pending |
| 10-09-02 | 10-09 | 7 | REQ-01 / SC-4c | T-10-RLS | RLS blocks child from reading other child's data | integration | `npx vitest run tests/integration/rls-policies.test.ts -t "child cannot read other child's progress"` | ❌ W0 | ⬜ pending |
| 10-09-02 | 10-09 | 7 | REQ-01 / SC-5 | T-10-SCHEMA | Schema exists: profiles, classes, schools, progress_entries with RLS | integration | `npx vitest run tests/integration/schema.test.ts -t "all required tables exist with RLS enabled"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs filled in by planner (revision 2026-04-15): SC-1/2/3 map to Plan 10-09 Task 1 (Playwright e2e); SC-4a/4b/4c and SC-5 map to Plan 10-09 Task 2 (Vitest integration).*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest config with jsdom environment
- [ ] `playwright.config.ts` — Playwright config with `baseURL: http://localhost:3000`
- [ ] `tests/setup.ts` — Shared test setup (Supabase test client, reset between tests)
- [ ] `tests/fixtures/supabase.ts` — Test user fixtures (one test child, one test teacher)
- [ ] `tests/e2e/child-login.spec.ts` — SC-1 coverage
- [ ] `tests/e2e/teacher-login.spec.ts` — SC-2 coverage
- [ ] `tests/e2e/auth-redirect.spec.ts` — SC-3 coverage
- [ ] `tests/integration/middleware-role-routing.test.ts` — SC-4a, SC-4b
- [ ] `tests/integration/rls-policies.test.ts` — SC-4c
- [ ] `tests/integration/schema.test.ts` — SC-5
- [ ] Framework install: `npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @playwright/test`
- [ ] Playwright browsers: `npx playwright install chromium`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual appropriateness of child login UI (large buttons, child-friendly colors) | REQ-01 | Subjective design judgment | Open `/login`, switch to child tab, confirm buttons are ≥48px, colors are saturated, PIN input is numeric-only |
| Supabase project created with correct env vars | REQ-01 / SC-5 | External dependency setup | Confirm `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; verify dashboard shows project |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter after planner fills task IDs

**Approval:** pending
