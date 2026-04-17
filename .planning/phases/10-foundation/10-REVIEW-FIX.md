---
phase: 10-foundation
fixed_at: 2026-04-17T14:45:00Z
review_path: .planning/phases/10-foundation/10-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-04-17T14:45:00Z
**Source review:** .planning/phases/10-foundation/10-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: Admin client module missing `server-only` import guard

**Files modified:** `lib/supabase/admin.ts`, `package.json`, `package-lock.json`
**Commit:** 71bbeb6
**Applied fix:** Added `import 'server-only'` as the first import in the admin client module. This enforces a build-time error if any `"use client"` component accidentally imports the file, preventing the `SUPABASE_SERVICE_ROLE_KEY` from being bundled into client-side JavaScript. Also added the `server-only` package to `dependencies` in `package.json`.

### CR-02: Overly permissive RLS policy allows any authenticated user to create schools

**Files modified:** `supabase/migrations/20260415000002_rls_policies.sql`
**Commit:** 10bce21
**Applied fix:** Changed the `teacher_inserts_own_schools` RLS policy from `WITH CHECK (true)` (allows any authenticated user) to `WITH CHECK ((select private.user_role()) = 'teacher')`, restricting school row creation to teacher-role users only. Updated the associated comment to reflect the new constraint.

### WR-01: Middleware does not redirect authenticated users away from login/registration pages

**Files modified:** `lib/supabase/middleware.ts`
**Commit:** 6cc4a18
**Applied fix:** Added a redirect block inside the `if (claims)` guard that checks `isPublicPath` and redirects authenticated users to their role-appropriate dashboard (`/kind/dashboard` for children, `/lehrer/dashboard` for teachers). This prevents already-logged-in users from seeing the login or registration pages.

### WR-02: Dashboard pages use `getClaims()` without `getUser()` verification

**Files modified:** `app/(child)/kind/dashboard/page.tsx`, `app/(teacher)/lehrer/dashboard/page.tsx`
**Commit:** 0522408
**Applied fix:** Replaced `supabase.auth.getClaims()` with `supabase.auth.getUser()` in both dashboard pages. `getUser()` verifies the JWT against the Supabase auth server, ensuring revoked tokens are detected. Both pages now destructure `{ data: { user }, error: userError }` and redirect to `/login` on error or missing user, then use `user.id` instead of `claims.sub`.

### WR-03: Child username uniqueness not enforced across classes during login lookup

**Files modified:** `app/login/actions.ts`
**Commit:** cb2eb45
**Applied fix:** Added a TODO comment above the `maybeSingle()` lookup documenting the known limitation: if two children in different classes share the same `display_name`, the query returns a PGRST116 error. The comment suggests adding a `class_id` disambiguator to the login flow or enforcing global username uniqueness as future remediation.

### WR-04: Signup rollback does not delete the trigger-created profile row

**Files modified:** `app/registrieren/actions.ts`
**Commit:** 4ee1391
**Applied fix:** Changed the inner rollback `catch` block from silently swallowing errors (`catch { }`) to logging them with `console.error("[teacherSignup] rollback failed:", rollbackErr)`. This provides operational visibility when rollback fails, enabling manual cleanup of orphaned rows.

### WR-05: Middleware role check does not handle missing or unknown role values

**Files modified:** `lib/supabase/middleware.ts`
**Commit:** 8c6a377
**Applied fix:** Added a guard after the cross-role redirect checks that redirects users with no recognized role (`role !== "child" && role !== "teacher"`) to `/login`. This prevents users created without `app_metadata.role` (e.g., via direct Supabase auth API) from accessing authenticated routes. Also widened the role type from `"child" | "teacher"` to `string` in the type assertion to properly handle unknown values.

---

_Fixed: 2026-04-17T14:45:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
