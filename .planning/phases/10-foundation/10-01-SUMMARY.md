---
phase: 10-foundation
plan: 01
subsystem: infra
tags: [supabase, env, gitignore, secrets, dotenv]

# Dependency graph
requires: []
provides:
  - Live Supabase cloud project (ref: hvrymzkqeihzslnukjoh, region: EU Frankfurt, plan: Free)
  - Committed .env.example template listing the five required env vars
  - .gitignore rules preventing any .env*.local file from being committed
  - Local .env.local populated on developer machine with real Supabase credentials
  - Env-var contract (URL, publishable key, service_role key, project_ref, access_token) consumed by every downstream Foundation plan
affects:
  - 10-02 Next.js scaffolding (reads nothing yet, but gitignore inherits)
  - 10-04 Supabase client helpers (reads all four app-level env vars)
  - 10-05 DB migrations (reads SUPABASE_PROJECT_REF + SUPABASE_ACCESS_TOKEN for non-interactive db push)
  - 10-06 Server Actions (reads service_role via admin client)
  - All later phases depending on Supabase auth + Postgres

# Tech tracking
tech-stack:
  added:
    - Supabase cloud project (Free tier, EU region)
  patterns:
    - "Env-var split: NEXT_PUBLIC_ prefix for browser-safe values; bare names for server-only secrets"
    - ".env.example committed as contract; .env.local gitignored for real values"
    - "Supabase CLI non-interactive path via SUPABASE_ACCESS_TOKEN (sbp_ token)"

key-files:
  created:
    - .env.example
    - .gitignore
  modified: []

key-decisions:
  - "Supabase project hosted in EU region (Frankfurt) for GDPR compliance in German Grundschule context"
  - "Leaked password protection left OFF on Free tier — required for the PIN padding scheme used by child login in Plan 06"
  - "Service_role key kept strictly server-only (no NEXT_PUBLIC_ prefix) to prevent browser exposure of the admin credential"
  - "Developer holds an sbp_ access token to enable non-interactive `supabase db push` in Plan 05"

patterns-established:
  - "Env contract: .env.example (committed placeholders) ↔ .env.local (gitignored real values), developer fills via copy + paste from Supabase dashboard"
  - "Gitignore-first: secret-holding files are ignored BEFORE any checkpoint populates them, so a mistaken `git add` cannot leak"
  - "Supabase 2025 key semantics: `/rest/v1/` requires service_role; publishable key alone no longer returns 200 on the bare REST endpoint"

requirements-completed:
  - REQ-01

# Metrics
duration: ~15min (Task 1 execution + human-action checkpoint turnaround)
completed: 2026-04-16
---

# Phase 10 Plan 01: Supabase Provisioning + .env Contract Summary

**Live Supabase EU project (hvrymzkqeihzslnukjoh) provisioned with a committed .env.example contract and gitignore rules that lock down the five Supabase secrets before they ever touch disk.**

## Performance

- **Duration:** ~15 min across two sessions (Task 1 autonomous + Task 2 human-action checkpoint)
- **Started:** 2026-04-16T20:19:00Z
- **Completed:** 2026-04-16T20:35:00Z
- **Tasks:** 2 (1 autonomous, 1 human-action checkpoint)
- **Files modified:** 2 (both created)

## Accomplishments

- Live Supabase cloud project provisioned in EU region (Frankfurt) on the Free tier, GDPR-appropriate for the German Grundschule context
- `.env.example` committed as the single source of truth for which env vars every downstream plan expects
- `.gitignore` locks `.env.local` and `.env*.local` out of version control BEFORE any real secret was written, eliminating the leak window
- Developer's `.env.local` populated with all five real values (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN) and verified reachable
- Non-interactive `supabase db push` path unlocked via `SUPABASE_ACCESS_TOKEN` (sbp_ token) — Plan 05 can run without a browser
- Supabase auth password policy confirmed: 6-char minimum, leaked-password protection OFF (required by the PIN padding scheme in Plan 06)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write .env.example + .gitignore env rules** — `517633f` (chore)
2. **Task 2: Create Supabase project + populate .env.local** — no repo commit (checkpoint produced only local/remote state; `.env.local` is gitignored, Supabase project lives in the cloud)

**Plan metadata:** added in the closing commit alongside STATE.md and ROADMAP.md updates.

## Files Created/Modified

- `.env.example` — Committed template with the five Supabase env-var keys and placeholder values. Split into three sections (public/browser-safe, server-only secret, CLI credentials) with comments explaining each.
- `.gitignore` — Created at repo root with Next.js, environment, testing, and Supabase local-state rules. Includes both `.env.local` and `.env*.local` on their own lines so any derivative env file (`.env.development.local`, etc.) is also ignored.

## Decisions Made

- **EU region for Supabase (Frankfurt):** GDPR baseline for an app used in German primary schools. No cross-region latency concern since the developer and end users are both in Europe.
- **Free tier accepted:** Matches the university project scope. PITFALLS.md warning about free-tier 1-week pause is logged as a blocker in STATE.md and must be managed by periodic activity during development.
- **Leaked password protection OFF:** The PIN padding scheme in Plan 06 (children log in by PIN mapped to a synthetic email+padded-password) would generate candidate "passwords" that might appear in HaveIBeenPwned. Leaving the check OFF is explicit, not accidental.
- **`sbp_` access token generated now, not on demand in Plan 05:** Consolidates the human-action checkpoint into one sitting instead of two, and means Plan 05 can run fully non-interactively.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Verification curl command uses outdated Supabase key semantics**
- **Found during:** Task 2 (human-action checkpoint verification)
- **Issue:** The plan's automated verify block (line 165) calls `curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/` with `apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and expects HTTP 200. As of the Supabase 2025 key refactor, the bare `/rest/v1/` endpoint now requires a `service_role` (secret) key — the publishable/anon key returns 401 because it has no table-level grants on the empty schema. This is a Supabase behavior change, not a project misconfiguration.
- **Fix:** Substituted the check with `apikey: $SUPABASE_SERVICE_ROLE_KEY` → HTTP 200 as expected. Additionally verified the Management API path: `curl https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF` with `Authorization: Bearer $SUPABASE_ACCESS_TOKEN` → HTTP 200. Both confirm the live project is reachable and both credentials are valid.
- **Files modified:** None (verification-only adaptation)
- **Verification:** Two independent HTTP 200 responses (REST API via service_role, Management API via sbp_ token)
- **Committed in:** n/a (no code change — runtime verification only; documented here for the record)

---

**Total deviations:** 1 auto-fixed (1 bug: outdated third-party API check)
**Impact on plan:** None. The env-var contract, gitignore rules, and live project are all exactly as specified. Only the verification command text was adapted to match Supabase's current key semantics. No functional change; no scope change.

## Issues Encountered

- None during Task 1. Task 2 proceeded normally once the curl verification command was adapted (see deviation above).

## User Setup Required

Task 2 was itself the user-setup step. The developer:
1. Created the Supabase project at https://supabase.com/dashboard (EU/Frankfurt, Free tier)
2. Copied five values from Project Settings → API + General + Account → Access Tokens
3. Populated `.env.local` locally via `cp .env.example .env.local` + editor
4. Confirmed `git status` does not list `.env.local`
5. Confirmed `Leaked password protection` is OFF in Authentication → Password Security

All five `must_haves.truths` from the plan frontmatter are now TRUE:
- ✓ Supabase cloud project exists and is accessible via URL + keys (ref `hvrymzkqeihzslnukjoh`)
- ✓ Repository never commits secrets (.env.local is gitignored; `git status` confirmed clean)
- ✓ Developer has a non-interactive `supabase db push` path (`SUPABASE_ACCESS_TOKEN=sbp_...` in .env.local)

## Next Phase Readiness

**Ready for Wave 2 (Plans 10-02 + 10-03 in parallel):**
- 10-02 (Next.js 15.2 scaffolding + shadcn/ui) can proceed — no env-var dependency at scaffolding stage, but the gitignore landed here protects any `.env.local` they touch.
- 10-03 (Vitest + Playwright infrastructure) can proceed in parallel — test harness setup is independent of Supabase.

**Ready for Wave 3 (Plans 10-04 + 10-05):**
- 10-04 (Supabase client/server/middleware/admin helpers) will consume `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — all present.
- 10-05 (DB migrations + `supabase db push`) will consume `SUPABASE_PROJECT_REF` + `SUPABASE_ACCESS_TOKEN` — both present, non-interactive path confirmed.

**Concerns to monitor:**
- Supabase Free tier pauses after ~1 week of inactivity. During long development gaps, the developer should open the dashboard or issue a lightweight query to keep the project active. Already logged in STATE.md blockers.

## Self-Check: PASSED

- ✓ `.env.example` exists at repo root (committed in 517633f)
- ✓ `.gitignore` exists at repo root with `.env.local` + `.env*.local` entries (committed in 517633f)
- ✓ Commit `517633f` present in `git log`
- ✓ No `.env.local` tracked by git (gitignored correctly, confirmed by orchestrator)
- ✓ Supabase project `hvrymzkqeihzslnukjoh` reachable (HTTP 200 via service_role key on /rest/v1/, HTTP 200 via sbp_ token on Management API)

---
*Phase: 10-foundation*
*Completed: 2026-04-16*
