---
phase: 10-foundation
plan: 08
subsystem: auth-routing
tags: [middleware, dashboards, role-routing, logout, server-components]

# Dependency graph
requires:
  - phase: 10-04
    provides: lib/supabase/middleware.ts updateSession helper, lib/supabase/server.ts createClient
  - phase: 10-05
    provides: profiles table with RLS policies, role column
  - phase: 10-06
    provides: logoutAction server action in app/login/actions.ts

provides:
  - middleware: Root middleware.ts wiring session refresh and role-based routing
  - child-dashboard: /kind/dashboard stub with greeting and logout
  - teacher-dashboard: /lehrer/dashboard stub with greeting and logout
  - logout-component: LogoutButtonChild component (raw Tailwind, D-17)

affects:
  - app/(child)/kind/* routes now render actual content instead of .gitkeep placeholder
  - app/(teacher)/lehrer/* routes now render actual content instead of .gitkeep placeholder
  - All non-public routes are now protected by middleware session check

# Tech stack
added: []
patterns:
  - Server Component dashboard pages with getClaims() + profile lookup
  - Belt-and-braces role enforcement (middleware + page-level redirect)
  - Form action wired to server action for logout

# Key files
created:
  - middleware.ts
  - app/(child)/kind/dashboard/page.tsx
  - app/(teacher)/lehrer/dashboard/page.tsx
  - components/child/logout-button.tsx
modified: []
deleted:
  - app/(child)/.gitkeep
  - app/(teacher)/.gitkeep
  - components/child/.gitkeep

# Decisions
key-decisions:
  - Used getClaims() (not getSession()) for JWT validation in both dashboard pages per RESEARCH security guidance
  - Named variable claimsResult instead of claims to avoid shadowing with inner claims property
  - Kept belt-and-braces role check at page level even though middleware already handles it (defense in depth)

# Metrics
duration: 2min
completed: 2026-04-17
tasks_completed: 2
tasks_total: 2
files_created: 4
files_modified: 0
files_deleted: 3
---

# Phase 10 Plan 08: Middleware + Stub Dashboards Summary

Root middleware.ts wired to updateSession() with role-based routing; two Server Component stub dashboards showing getClaims()-based profile greetings with functional Abmelden buttons.

## What Was Done

### Task 1: Create root middleware.ts wiring updateSession
**Commit:** `a420a67`

Created `middleware.ts` at the repository root that imports and delegates to `updateSession()` from `lib/supabase/middleware.ts`. The matcher pattern excludes `_next/static`, `_next/image`, favicon, and image extensions while deliberately NOT excluding Server Actions (per RESEARCH Pitfall 1). This closes the session-refresh and role-routing loop: unauthenticated users are redirected to `/login`, children accessing `/lehrer/*` are redirected to `/kind/dashboard`, and teachers accessing `/kind/*` are redirected to `/lehrer/dashboard`.

### Task 2: Build the two stub dashboards with logout buttons
**Commit:** `6ed7292`

Created three components:

1. **`/kind/dashboard`** — Server Component that calls `supabase.auth.getClaims()`, looks up the child's `display_name` from `profiles`, renders "Hallo, {name}!" with the locked German copy, and includes the `LogoutButtonChild` component at the bottom.

2. **`/lehrer/dashboard`** — Server Component that calls `supabase.auth.getClaims()`, looks up the teacher's `display_name` from `profiles`, renders "Willkommen, {name}" with a shadcn Card showing "Ihr Klassen-Dashboard folgt in Kuerze.", and includes a shadcn Button wired to `logoutAction`.

3. **`components/child/logout-button.tsx`** — A `LogoutButtonChild` component using raw Tailwind (no `@/components/ui/*` imports, per D-17) with `bg-yellow-400`, `text-4xl`, `h-14`, `rounded-2xl` styling and a form action wired to `logoutAction`.

Removed `.gitkeep` placeholders from `app/(child)/`, `app/(teacher)/`, and `components/child/`.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `middleware.ts` exists at repo root and imports `updateSession` from `@/lib/supabase/middleware`
- `config.matcher` excludes static assets but does NOT exclude Server Actions
- Both dashboard pages call `getClaims()` (not `getSession()`)
- Child logout button uses raw Tailwind only (no `@/components/ui/*` imports)
- Teacher dashboard uses shadcn `Button` + `Card` components
- Both dashboards enforce role at page level with `redirect("/login")` fallback
- TypeScript compiles cleanly (only pre-existing vitest.config.ts vite plugin error, unrelated)
- All German copy strings match the UI-SPEC contract exactly

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | a420a67 | feat(10-08): create root middleware.ts wiring updateSession |
| 2 | 6ed7292 | feat(10-08): build stub dashboards with role-aware greetings and logout |

## Self-Check: PASSED

All 5 created files verified on disk. Both commit hashes (a420a67, 6ed7292) verified in git log.
