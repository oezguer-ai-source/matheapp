---
phase: 10-foundation
verified: 2026-04-17T23:35:00Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Visual check of child login UI"
    expected: "Saturated yellow buttons, 56px tall inputs, numeric keypad on mobile, auto-advance PIN grid, paste support"
    why_human: "Visual appropriateness, color saturation, touch target sizing, and mobile keyboard behavior cannot be verified programmatically"
  - test: "End-to-end child login flow in browser"
    expected: "Enter username + 4-digit PIN, submit, land on /kind/dashboard with 'Hallo, {name}!' greeting"
    why_human: "Playwright E2E tests exist but require live Supabase project and dev server; verifier cannot start servers. The E2E test code is verified as substantive (real assertions, no test.skip)"
  - test: "End-to-end teacher login and signup flow in browser"
    expected: "Register with Name + E-Mail + Passwort + Schulname + Klassenname, then log in, land on /lehrer/dashboard"
    why_human: "Requires live Supabase project interaction and browser rendering"
  - test: "Role toggle switches between Kind and Lehrkraft forms"
    expected: "Clicking Kind/Lehrkraft tabs swaps the form below, preserving state"
    why_human: "Interactive UI behavior requiring browser rendering"
---

# Phase 10: Foundation Verification Report

**Phase Goal:** A running Next.js application where children and teachers can log in with role-appropriate credentials, sessions persist, and the database schema enforces data isolation through RLS
**Verified:** 2026-04-17T23:35:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A child can log in using a simple PIN or username+PIN and reach the child dashboard route | VERIFIED | `app/login/actions.ts` contains `childLogin` Server Action using admin client for username lookup, `buildSyntheticEmail` + `padPin` for credential synthesis, redirects to `/kind/dashboard`; `components/login/child-login-form.tsx` wires `useActionState(childLogin, ...)` with PinInput component; `app/(child)/kind/dashboard/page.tsx` renders greeting from profiles; E2E test `tests/e2e/child-login.spec.ts` contains real assertions (no `test.skip`) |
| 2 | A teacher can log in with email+password and reach the teacher dashboard route | VERIFIED | `app/login/actions.ts` contains `teacherLogin` Server Action with standard `signInWithPassword`, redirects to `/lehrer/dashboard`; `components/login/teacher-login-form.tsx` wires `useActionState(teacherLogin, ...)`; `app/(teacher)/lehrer/dashboard/page.tsx` renders greeting; E2E test `tests/e2e/teacher-login.spec.ts` contains real assertions |
| 3 | A logged-out user visiting any protected route is redirected to the login page | VERIFIED | `middleware.ts` at repo root imports `updateSession` from `lib/supabase/middleware.ts`; `updateSession()` calls `getClaims()`, redirects to `/login` if no claims and path is not public; dashboard pages also have belt-and-braces redirect; E2E test `tests/e2e/auth-redirect.spec.ts` contains real assertions |
| 4 | A child cannot access teacher routes, and a teacher cannot access child routes (middleware + RLS enforced) | VERIFIED | `lib/supabase/middleware.ts` reads `app_metadata.role` from JWT claims and redirects child from `/lehrer/*` to `/kind/dashboard` and teacher from `/kind/*` to `/lehrer/dashboard`; RLS policies in `supabase/migrations/20260415000002_rls_policies.sql` use SECURITY DEFINER helpers; integration tests for middleware routing and RLS isolation pass (29/29 Vitest tests green) |
| 5 | The database schema (profiles, classes, schools, progress_entries) exists with RLS policies active | VERIFIED | Three migration files exist; `20260415000001_init_schema.sql` creates 4 tables; `20260415000002_rls_policies.sql` has `enable row level security` on all 4 tables with 3 SECURITY DEFINER helpers; `20260415000003_teacher_signup_trigger.sql` has `after insert on auth.users` trigger; `types/database.types.ts` contains all 4 table types regenerated from live schema (7981 bytes, contains `schools`, `classes`, `profiles`, `progress_entries`, `pin_hint`); integration test `tests/integration/schema.test.ts` passes |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.env.example` | Committed template with 5 env vars | VERIFIED | 426 bytes, contains all 5 keys |
| `.gitignore` | Prevents .env.local commit | VERIFIED | Contains `.env.local` and `.env*.local` |
| `package.json` | Next 15.2, React 19, Supabase, Zod, Vitest | VERIFIED | next@15.2.9, react@^19, @supabase/supabase-js@^2, @supabase/ssr@^0, zod@^4.3.6, vitest@^2.1.9, @playwright/test@^1.59.1 |
| `app/layout.tsx` | Root layout with lang="de" | VERIFIED | Contains `lang="de"` |
| `app/page.tsx` | Redirect to /login | VERIFIED | Contains `redirect("/login")` |
| `middleware.ts` | Root middleware with updateSession | VERIFIED | Imports `updateSession` from `@/lib/supabase/middleware` |
| `lib/supabase/client.ts` | Browser client factory | VERIFIED | Uses `createBrowserClient`, only `NEXT_PUBLIC_*` vars |
| `lib/supabase/server.ts` | Server client with cookies | VERIFIED | Uses `createServerClient`, try/catch on setAll |
| `lib/supabase/middleware.ts` | updateSession with getClaims | VERIFIED | Calls `getClaims()`, NOT `getSession()` |
| `lib/supabase/admin.ts` | Service-role admin client | VERIFIED | Uses `SUPABASE_SERVICE_ROLE_KEY`, has `SERVER-ONLY` comment |
| `lib/supabase/pin-email.ts` | PIN-to-email mapping functions | VERIFIED | Exports `buildSyntheticEmail`, `padPin`, domain `matheapp.internal` |
| `lib/utils/env.ts` | Runtime env-var check | VERIFIED | Exports `hasEnvVars`, `requireEnv` |
| `types/database.types.ts` | Generated DB types | VERIFIED | 7981 bytes, contains all 4 tables, `pin_hint` present, no `pin_code` |
| `lib/schemas/auth.ts` | 3 Zod schemas | VERIFIED | Exports `childLoginSchema`, `teacherLoginSchema`, `teacherSignupSchema` with `schoolName` + `className` |
| `app/login/actions.ts` | childLogin + teacherLogin + logoutAction | VERIFIED | `"use server"`, uses `createAdminClient` for child lookup, `buildSyntheticEmail`/`padPin`, generic German error strings |
| `app/registrieren/actions.ts` | teacherSignup Server Action | VERIFIED | `"use server"`, uses `admin.auth.admin.createUser` with `app_metadata.role='teacher'`, atomic school+class insert |
| `app/login/page.tsx` | /login route | VERIFIED | Server component shell |
| `app/login/LoginClient.tsx` | Client component with role toggle | VERIFIED | Contains `Willkommen bei Matheapp`, renders `RoleToggle` + forms |
| `app/registrieren/page.tsx` | /registrieren route | VERIFIED | Contains `Lehrkraft-Konto erstellen` |
| `components/login/role-toggle.tsx` | Kind/Lehrkraft tablist | VERIFIED | `role="tablist"`, `Rolle`, `bg-yellow-400`, `bg-slate-900` |
| `components/login/pin-input.tsx` | 4-digit PIN grid | VERIFIED | Exactly 1 `name="pin"` on hidden input, `inputMode="numeric"` |
| `components/login/auth-error-alert.tsx` | Two-variant error alert | VERIFIED | Exports `AuthErrorAlertChild` (raw Tailwind) + `AuthErrorAlertTeacher` (shadcn Alert) |
| `components/login/child-login-form.tsx` | Child login form (D-17 Tailwind only) | VERIFIED | `useActionState(childLogin, ...)`, 0 imports from `@/components/ui` |
| `components/login/teacher-login-form.tsx` | Teacher login form (shadcn) | VERIFIED | `useActionState(teacherLogin, ...)`, imports shadcn Button/Input/Label |
| `components/login/teacher-signup-form.tsx` | Signup form with D-13a fields | VERIFIED | `useActionState(teacherSignup, ...)`, has `name="schoolName"` + `name="className"`, labels `Name der Schule` + `Name Ihrer Klasse` |
| `components/child/logout-button.tsx` | Child logout button (D-17) | VERIFIED | 0 imports from `@/components/ui`, uses `bg-yellow-400` |
| `app/(child)/kind/dashboard/page.tsx` | Child dashboard stub | VERIFIED | Renders `Hallo, {display_name}!`, fetches from profiles, has LogoutButtonChild |
| `app/(teacher)/lehrer/dashboard/page.tsx` | Teacher dashboard stub | VERIFIED | Renders `Willkommen, {display_name}`, uses shadcn Button + Card, has logoutAction |
| `supabase/migrations/20260415000001_init_schema.sql` | 4 tables, no pin_code, has pin_hint | VERIFIED | `create table public.profiles` present, 0 occurrences of `pin_code`, 2 occurrences of `pin_hint` |
| `supabase/migrations/20260415000002_rls_policies.sql` | RLS + SECURITY DEFINER helpers | VERIFIED | 4x `enable row level security`, 3x `security definer` |
| `supabase/migrations/20260415000003_teacher_signup_trigger.sql` | Teacher signup trigger | VERIFIED | `after insert on auth.users` trigger |
| `supabase/config.toml` | Supabase CLI config | VERIFIED | 14904 bytes |
| `scripts/gen-types.sh` | Type regeneration script | VERIFIED | Executable, 220 bytes |
| `vitest.config.ts` | Vitest with jsdom | VERIFIED | Contains `jsdom`, `setupFiles` |
| `playwright.config.ts` | Playwright config | VERIFIED | Contains `baseURL`, `http://localhost:3000` |
| `tests/setup.ts` | Shared test setup | VERIFIED | 239 bytes |
| `tests/fixtures/supabase.ts` | Real seed/cleanup (not stub) | VERIFIED | `seedTestData` present, `cleanupTestData` present, 0 occurrences of `implemented in Plan 10` (stub removed) |
| `components.json` | shadcn/ui config | VERIFIED | Contains `new-york`, `slate` |
| `lib/utils.ts` | cn() helper | VERIFIED | Exports `cn` |
| 6 shadcn components | button, input, label, card, alert, tabs | VERIFIED | All 6 files exist under `components/ui/` |
| 8 test files | E2E + integration + unit | VERIFIED | All present, 0 `test.skip` in E2E, 0 `it.todo` in integration/unit |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `middleware.ts` | `lib/supabase/middleware.ts` | `import { updateSession }` | WIRED | grep confirmed `updateSession` + `@/lib/supabase/middleware` |
| `lib/supabase/middleware.ts` | `supabase.auth.getClaims` | Direct call | WIRED | `getClaims` found, `getSession` NOT found (0 occurrences) |
| `lib/supabase/admin.ts` | `SUPABASE_SERVICE_ROLE_KEY` | `requireEnv()` | WIRED | 2 occurrences of `SUPABASE_SERVICE_ROLE_KEY` |
| `app/login/actions.ts` | `lib/supabase/admin.ts` | `createAdminClient` | WIRED | 2 occurrences of `createAdminClient` |
| `app/login/actions.ts` | `lib/supabase/pin-email.ts` | `buildSyntheticEmail` + `padPin` | WIRED | Both found (2 occurrences each) |
| `app/registrieren/actions.ts` | `admin.auth.admin.createUser` | Direct call | WIRED | 1 occurrence, with `app_metadata` (4 occurrences) |
| `app/registrieren/actions.ts` | `public.schools + public.classes` | `.from("schools")` / `.from("classes")` | WIRED | 2 occurrences each of schools/classes insert |
| `components/login/child-login-form.tsx` | `app/login/actions.ts` | `useActionState(childLogin, ...)` | WIRED | 1 match |
| `components/login/teacher-login-form.tsx` | `app/login/actions.ts` | `useActionState(teacherLogin, ...)` | WIRED | 1 match |
| `components/login/teacher-signup-form.tsx` | `app/registrieren/actions.ts` | `useActionState(teacherSignup, ...)` | WIRED | 1 match |
| `app/(child)/kind/dashboard/page.tsx` | `lib/supabase/server.ts` | `createClient() + .from("profiles")` | WIRED | Profile lookup present |
| `app/(teacher)/lehrer/dashboard/page.tsx` | `app/login/actions.ts` | `logoutAction` | WIRED | Import + form action present |
| `tests/e2e/*.spec.ts` | `tests/fixtures/supabase.ts` | `import { seedTestData, ... }` | WIRED | All E2E specs import from fixtures |
| `tests/integration/*.test.ts` | `tests/fixtures/supabase.ts` | `adminClient()` | WIRED | Integration tests import `adminClient` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `app/(child)/kind/dashboard/page.tsx` | `profile.display_name` | `supabase.from("profiles").select(...)` | Yes -- queries live profiles table under user RLS context | FLOWING |
| `app/(teacher)/lehrer/dashboard/page.tsx` | `profile.display_name` | `supabase.from("profiles").select(...)` | Yes -- queries live profiles table under user RLS context | FLOWING |
| `app/login/actions.ts` (childLogin) | `profile.class_id` | `admin.from("profiles").select(...)` | Yes -- queries via admin client (service-role) | FLOWING |
| `app/registrieren/actions.ts` | school + class IDs | `admin.from("schools").insert(...)` + `admin.from("classes").insert(...)` | Yes -- writes to live tables | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles | `npx tsc --noEmit` | Zero errors, clean exit | PASS |
| Vitest unit + integration tests | `npx vitest run` | 29/29 tests passed in 3.20s | PASS |
| Package dependencies resolve | `npm ls --depth=0` (implied by tsc + vitest success) | No missing deps | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| REQ-01 | All 9 plans (10-01 through 10-09) | Foundation auth + schema | SATISFIED | All 5 success criteria verified; auth flow, middleware, RLS, schema, and test suite all in place |

Note: REQUIREMENTS.md does not exist in the repository. REQ-01 is referenced by all 9 plans in their frontmatter and corresponds to the Phase 10 goal. No orphaned requirements found since REQUIREMENTS.md is absent.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/login/actions.ts` | 32 | `TODO: If two children in different classes share the same display_name...` | Info | Known edge case documented for future phases; `maybeSingle()` returns an error if multiple rows exist. Not a blocker -- the unique constraint `(class_id, display_name)` on profiles prevents this within a single class |
| `app/(child)/kind/dashboard/page.tsx` | 12 | Uses `getUser()` instead of `getClaims()` as plan specified | Info | `getUser()` is actually more secure (server-side validation vs local JWT parsing). Functionally equivalent or better. Not a blocker |
| `app/(teacher)/lehrer/dashboard/page.tsx` | 14 | Uses `getUser()` instead of `getClaims()` as plan specified | Info | Same as above -- acceptable deviation |
| `components/login/auth-error-alert.tsx` | 4 | File imports `@/components/ui/alert` at top but `AuthErrorAlertChild` function does not use it | Info | The child-facing function renders only raw Tailwind. The import is for `AuthErrorAlertTeacher` in the same file. Minor D-17 boundary concern at file level but not at function level |

### Human Verification Required

### 1. Visual Check of Child Login UI

**Test:** Open http://localhost:3000/login in a browser. Verify the Kind tab shows saturated yellow (not pastel), inputs are at least 56px tall, PIN digits are large (text-4xl), the Einloggen button is full-width yellow.
**Expected:** Large, child-friendly UI elements with clear visual hierarchy; on mobile, numeric keypad should appear when focusing PIN digits.
**Why human:** Visual appropriateness, color saturation, touch target sizing, and mobile keyboard behavior cannot be verified programmatically.

### 2. End-to-End Login Flow (Child + Teacher)

**Test:** With the dev server running and Supabase project live, attempt a full child login (username + PIN) and teacher login (email + password). Verify landing on the correct dashboard.
**Expected:** Child lands on /kind/dashboard with "Hallo, {username}!" greeting; teacher lands on /lehrer/dashboard with "Willkommen, {name}".
**Why human:** Requires running dev server + live Supabase project interaction. Playwright E2E tests exist and contain real assertions, but cannot be executed during static verification.

### 3. Teacher Signup Flow

**Test:** Visit /registrieren, fill in all 5 fields (Name, E-Mail, Passwort, Schulname, Klassenname), submit, verify redirect to /lehrer/dashboard.
**Expected:** New teacher account created with school + class provisioned atomically.
**Why human:** Requires live Supabase project and creates real data.

### 4. PIN Grid Interaction

**Test:** On /login Kind view, test auto-advance on digit entry, Backspace navigation, and 4-digit paste behavior.
**Expected:** Entering a digit auto-focuses the next input; Backspace on empty digit moves focus backward; pasting 4 digits fills all fields.
**Why human:** Interactive keyboard behavior requires browser rendering.

### Gaps Summary

No functional gaps were found. All 5 roadmap success criteria are met by the codebase artifacts:
- All required files exist, are substantive (not stubs), and are wired together
- TypeScript compiles cleanly (zero errors)
- All 29 Vitest tests pass (unit + integration)
- E2E test files contain real assertions (no `test.skip` or `it.todo` remaining)
- Key security patterns are correctly implemented (getClaims in middleware, admin client isolation, generic error strings, RLS with SECURITY DEFINER helpers)
- The D-17/D-18 styling boundary is structurally enforced (child components have 0 imports from `@/components/ui`)
- The D-13a atomic school+class creation is wired in both the Zod schema and the Server Action

**Status is `human_needed` because the E2E tests and visual UI checks require a running dev server and live Supabase project, which cannot be executed during static verification. All static/programmatic checks pass.**

---

_Verified: 2026-04-17T23:35:00Z_
_Verifier: Claude (gsd-verifier)_
