---
phase: 30-child-dashboard-learning-session
plan: 01
subsystem: child-dashboard
tags: [dashboard, progress-bar, server-component, supabase-aggregate]
dependency_graph:
  requires: [supabase-auth, progress-entries-table, profiles-table]
  provides: [child-dashboard-page, progress-bar-component, dashboard-stats-component, minigame-threshold-config]
  affects: [child-layout, kind-ueben-route]
tech_stack:
  added: []
  patterns: [supabase-aggregate-query, server-component-data-fetch, tailwind-v4-custom-colors]
key_files:
  created:
    - lib/config/rewards.ts
    - components/child/dashboard-stats.tsx
    - tests/unit/progress-bar.test.tsx
  modified:
    - app/globals.css
    - app/(child)/kind/dashboard/page.tsx
    - vitest.config.ts
decisions:
  - "MINIGAME_THRESHOLD set to 500 points (Phase 40 may adjust)"
  - "DashboardStats and ProgressBar in single file (dashboard-stats.tsx) for co-location"
  - "vitest config extended to include .tsx test files"
metrics:
  duration: 2min
  completed: 2026-04-18T00:34:00Z
  tasks: 2
  files: 6
---

# Phase 30 Plan 01: Child Dashboard Summary

Child-Dashboard mit Server-Component-Datenabruf: Punkte-Summe und Aufgaben-Count aus progress_entries via Supabase Aggregate Query, ProgressBar mit 500-Punkte-Schwelle, DashboardStats mit Begruessung/Klasse/Punkte/Aufgabencount, und prominenter "Aufgaben starten"-Link.

## Tasks Completed

### Task 1: Theme colors + rewards config + ProgressBar component + unit tests
**Commit:** d1873d6

- Added 4 child color tokens (child-yellow, child-green, child-red, child-blue) to Tailwind @theme block in globals.css
- Created `lib/config/rewards.ts` with `MINIGAME_THRESHOLD = 500`
- Created `components/child/dashboard-stats.tsx` with two exported components:
  - `ProgressBar`: Renders progress fill bar with percentage, label, remaining points, unlock state
  - `DashboardStats`: Renders greeting, grade badge, stats card with points and exercise count
- Created 9 unit tests in `tests/unit/progress-bar.test.tsx` (all passing)
- Fixed vitest config to include `.test.tsx` files in test include pattern

### Task 2: Replace dashboard stub with full Server Component
**Commit:** 7c0fd10

- Replaced placeholder stub with full Server Component at `app/(child)/kind/dashboard/page.tsx`
- Added Supabase aggregate query: `points_earned.sum()` and `id.count()` from `progress_entries`
- Null-safe defaults (`?? 0`) for empty result sets
- Renders DashboardStats + ProgressBar + "Aufgaben starten" Link + LogoutButtonChild
- Pure Server Component (zero client-side JavaScript)
- All text sizes >= text-2xl, touch target h-16 (64px) on CTA button
- RLS on progress_entries ensures child_id = auth.uid() (threat T-30-01 mitigated)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed vitest config missing .tsx test file support**
- **Found during:** Task 1
- **Issue:** vitest.config.ts `include` pattern only matched `.test.ts`, not `.test.tsx`
- **Fix:** Changed include to `tests/unit/**/*.test.{ts,tsx}`
- **Files modified:** vitest.config.ts
- **Commit:** d1873d6

## Verification Results

- 9/9 unit tests passing (ProgressBar: 5, DashboardStats: 4)
- TypeScript compiles without errors (`npx tsc --noEmit`)
- All acceptance criteria grep checks pass
- Child color tokens present in globals.css @theme block

## Known Stubs

None -- all data is wired to live Supabase queries.

## Self-Check: PASSED

All 6 files exist on disk. Both commit hashes (d1873d6, 7c0fd10) found in git log.
