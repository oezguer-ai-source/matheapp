---
phase: 10-foundation
plan: 04
subsystem: auth
tags: [supabase, supabase-ssr, supabase-js, cookie-session, middleware, pin-auth, tdd]

# Dependency graph
requires:
  - phase: 10-02
    provides: Next.js 15.2 scaffold with TypeScript, route groups, lib/ directory structure
provides:
  - Browser Supabase client factory (createBrowserClient)
  - Server Supabase client factory with cookies() integration
  - Middleware updateSession() helper using getClaims() (NOT getSession)
  - Admin Supabase client with SERVICE_ROLE_KEY guard (server-only)
  - Pure PIN-to-email mapping functions (buildSyntheticEmail, padPin)
  - Runtime env-var presence check utilities (hasEnvVars, requireEnv)
  - Empty Database type stub for Plan 05 type generation
affects: [10-05, 10-06, 10-08, 10-09]

# Tech tracking
tech-stack:
  added: ["@supabase/supabase-js@^2", "@supabase/ssr@^0"]
  patterns: [supabase-browser-client, supabase-server-client-cookies, middleware-getClaims, admin-service-role-isolation, pin-padding-formula]

key-files:
  created:
    - lib/supabase/client.ts
    - lib/supabase/server.ts
    - lib/supabase/middleware.ts
    - lib/supabase/admin.ts
    - lib/supabase/pin-email.ts
    - lib/utils/env.ts
    - types/database.types.ts
  modified:
    - package.json
    - package-lock.json
    - tests/unit/pin-email-mapping.test.ts

key-decisions:
  - "Middleware uses getClaims() not getSession() per RESEARCH.md Anti-Patterns"
  - "Admin client uses requireEnv() for runtime safety instead of non-null assertions"
  - "PIN padding formula: {pin}-{class_id_first_8_chars} deterministic and >= 6 chars"

patterns-established:
  - "Supabase client imports: browser from lib/supabase/client, server from lib/supabase/server"
  - "Admin client isolated in lib/supabase/admin.ts with SERVER-ONLY banner"
  - "No code between createServerClient and getClaims() in middleware helper"
  - "Pure functions in pin-email.ts for testability — no process.env dependency"

requirements-completed: [REQ-01]

# Metrics
duration: 3min
completed: 2026-04-17
---

# Phase 10 Plan 04: Supabase Client Helpers Summary

**Supabase SSR client layer with four helpers (browser, server, middleware, admin) plus TDD-verified PIN-to-email mapping for child auth**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-17T15:15:25Z
- **Completed:** 2026-04-17T15:18:37Z
- **Tasks:** 2 (3 commits: 1 feat + 1 test RED + 1 feat GREEN)
- **Files modified:** 10

## Accomplishments
- Installed @supabase/supabase-js and @supabase/ssr as runtime dependencies
- Created four Supabase client helpers following RESEARCH.md patterns verbatim
- Implemented pure PIN-to-email mapping with full TDD cycle (7 unit tests passing)
- Admin client isolated with SERVER-ONLY guard and requireEnv() runtime check

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Supabase packages and write the four client helpers** - `e9b2e15` (feat)
2. **Task 2: PIN-to-email mapping (TDD RED)** - `6ac6aa1` (test)
3. **Task 2: PIN-to-email mapping (TDD GREEN)** - `fe556d2` (feat)

## Files Created/Modified
- `package.json` - Added @supabase/supabase-js@^2 and @supabase/ssr@^0 dependencies
- `package-lock.json` - Locked Supabase dependency tree
- `lib/supabase/client.ts` - Browser client factory using createBrowserClient
- `lib/supabase/server.ts` - Server client factory with cookies() API and try/catch on setAll
- `lib/supabase/middleware.ts` - updateSession() helper with getClaims() and role routing
- `lib/supabase/admin.ts` - Service-role admin client (SERVER-ONLY, requireEnv guard)
- `lib/supabase/pin-email.ts` - Pure buildSyntheticEmail() and padPin() functions
- `lib/utils/env.ts` - hasEnvVars() and requireEnv() utilities
- `types/database.types.ts` - Empty Database type stub for Plan 05
- `tests/unit/pin-email-mapping.test.ts` - 7 unit tests for PIN-to-email mapping

## Decisions Made
- Middleware uses `getClaims()` exclusively (never `getSession()`) per RESEARCH.md security guidance
- Admin client uses `requireEnv()` instead of `!` non-null assertions for runtime safety — throws meaningful error if service key missing
- PIN padding formula `{pin}-{class_id_first_8}` chosen per RESEARCH Pattern 6 — always >= 6 chars, deterministic
- `buildSyntheticEmail` validates username against `/^[a-z0-9._-]+$/` after lowercasing — rejects spaces and @ symbols

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED commit: `6ac6aa1` (test) - All 7 tests fail (module does not exist)
- GREEN commit: `fe556d2` (feat) - All 7 tests pass
- REFACTOR: Not needed (implementation already clean)

## Issues Encountered

Pre-existing `vitest.config.ts` type error (Vite plugin version mismatch from Plan 03) exists but is unrelated to Plan 04 changes. Zero new TypeScript errors introduced by this plan's files.

## Known Stubs

- `types/database.types.ts` - Intentional empty stub with `Record<string, never>` for all table/view/function/enum types. Will be filled by `supabase gen types` in Plan 05 after schema migration.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Supabase client helpers ready for Plan 06 (server actions) and Plan 09 (middleware wiring)
- PIN-to-email mapping ready for Plan 06 (child account creation)
- Database type stub ready for Plan 05 to regenerate with actual schema types
- TypeScript compiles cleanly (no new errors)
- 7 unit tests passing

## Self-Check: PASSED

All 8 created files verified on disk. All 3 task commits (e9b2e15, 6ac6aa1, fe556d2) found in git log. SUMMARY.md exists.

---
*Phase: 10-foundation*
*Completed: 2026-04-17*
