---
phase: 10-foundation
plan: 06
subsystem: auth
tags: [zod, supabase-auth, server-actions, nextjs, typescript]

# Dependency graph
requires:
  - phase: 10-04
    provides: "Supabase client helpers (admin.ts, server.ts) + PIN-to-email mapping (pin-email.ts)"
  - phase: 10-05
    provides: "DB schema with profiles trigger (on_auth_user_created) that reads app_metadata.role"
provides:
  - "Zod schemas: childLoginSchema, teacherLoginSchema, teacherSignupSchema"
  - "Server Actions: childLogin, teacherLogin, logoutAction, teacherSignup"
  - "LoginActionState and SignupActionState types for useActionState"
affects: [10-07, 10-08, 10-09]

# Tech tracking
tech-stack:
  added: [zod@4.3.6]
  patterns: ["Server Action with Zod safeParse validation", "admin.createUser for role-aware user provisioning", "atomic school+class insert during teacher signup (D-13a)", "generic German error strings for anti-enumeration"]

key-files:
  created:
    - lib/schemas/auth.ts
    - app/login/actions.ts
    - app/registrieren/actions.ts
  modified:
    - tests/unit/auth-schemas.test.ts
    - package.json

key-decisions:
  - "Used zod v4 (4.3.6) with transform+pipe for username lowercasing in childLoginSchema"
  - "admin.createUser (not signUp) ensures app_metadata.role=teacher is set atomically at INSERT time"
  - "Teacher signup atomically creates school + class + updates profile (D-13a); rollback deletes all on failure"
  - "All login failures return identical generic German error string per failure type (anti-enumeration)"

patterns-established:
  - "Server Action pattern: safeParse -> early return on error -> business logic -> redirect on success"
  - "Admin client for privileged operations (username lookup, user creation, school/class provisioning)"
  - "Zod schemas as single source of truth for validation messages (German, UI-SPEC locked)"

requirements-completed: [REQ-01]

# Metrics
duration: 5min
completed: 2026-04-17
---

# Phase 10 Plan 06: Auth Schemas & Server Actions Summary

**Three Zod schemas + four Server Actions (childLogin, teacherLogin, logoutAction, teacherSignup) with admin.createUser flow, atomic school/class provisioning (D-13a), and copy-locked German validation messages**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-17T15:29:02Z
- **Completed:** 2026-04-17T15:34:05Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Three Zod schemas with German validation messages locked to UI-SPEC Copywriting Contract, including D-13a fields (schoolName, className) for teacher signup
- childLogin Server Action using admin-client for username lookup (RESEARCH A2 anti-enumeration), synthetic email + padded PIN via pin-email helpers
- teacherSignup Server Action using admin.createUser with app_metadata.role=teacher (fires Plan 05 trigger correctly), plus atomic school + class + profile provisioning with rollback on failure
- 15 unit tests covering all schema validation rules (PIN format, username lowercasing, email validation, password length, schoolName/className bounds)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Zod schemas and test them (TDD)**
   - RED: `1095c43` (test) - Failing tests for all three schemas
   - GREEN: `0b8baf1` (feat) - Schema implementation + zod install
2. **Task 2: Write three Server Actions** - `6a35cac` (feat)

## Files Created/Modified
- `lib/schemas/auth.ts` - Three Zod schemas: childLoginSchema, teacherLoginSchema, teacherSignupSchema with German validation messages
- `app/login/actions.ts` - childLogin (admin lookup + synthetic email), teacherLogin (standard email/password), logoutAction (signOut + redirect)
- `app/registrieren/actions.ts` - teacherSignup with admin.createUser + atomic school/class insert + rollback + auto-signin
- `tests/unit/auth-schemas.test.ts` - 15 tests replacing the it.todo stubs from Plan 03
- `package.json` - Added zod@^4.3.6 dependency

## Decisions Made
- Used zod v4.3.6 (latest) which supports transform+pipe chain for username lowercasing
- Adjusted comment wording in registrieren/actions.ts to avoid grep false-positive on the banned `supabase.auth.signUp` pattern
- Pre-existing vitest.config.ts TypeScript error (Vite plugin type mismatch) documented but not fixed -- out of scope per deviation rules

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing zod dependency**
- **Found during:** Task 1 (before writing schemas)
- **Issue:** zod was not listed in package.json despite being required by the schemas
- **Fix:** Ran `npm install zod` to add zod@^4.3.6
- **Files modified:** package.json, package-lock.json
- **Verification:** `import { z } from "zod"` resolves, all 15 tests pass
- **Committed in:** 0b8baf1 (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential dependency installation. No scope creep.

## Issues Encountered
- Pre-existing TypeScript error in vitest.config.ts (Vite/Vitest plugin type mismatch) -- only 1 error total, isolated to config file, does not affect schema or action files. Documented in deferred items.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plans 07 (login UI) and 08 (middleware + stub dashboards) can now import the Server Actions and Zod schemas directly
- All three schemas export TypeScript types (ChildLoginInput, TeacherLoginInput, TeacherSignupInput) for form typing
- LoginActionState and SignupActionState types ready for useActionState in form components

## Self-Check: PASSED

All created files verified present. All commit hashes (1095c43, 0b8baf1, 6a35cac) found in git log.

---
*Phase: 10-foundation*
*Completed: 2026-04-17*
