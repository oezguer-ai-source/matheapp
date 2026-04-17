---
phase: 10-foundation
reviewed: 2026-04-17T14:30:00Z
depth: standard
files_reviewed: 35
files_reviewed_list:
  - app/login/actions.ts
  - app/login/LoginClient.tsx
  - app/login/page.tsx
  - app/registrieren/actions.ts
  - app/registrieren/page.tsx
  - app/layout.tsx
  - app/page.tsx
  - components/login/auth-error-alert.tsx
  - components/login/child-login-form.tsx
  - components/login/pin-input.tsx
  - components/login/role-toggle.tsx
  - components/login/teacher-login-form.tsx
  - components/login/teacher-signup-form.tsx
  - components/child/logout-button.tsx
  - middleware.ts
  - app/(child)/kind/dashboard/page.tsx
  - app/(teacher)/lehrer/dashboard/page.tsx
  - lib/schemas/auth.ts
  - lib/supabase/admin.ts
  - lib/supabase/client.ts
  - lib/supabase/middleware.ts
  - lib/supabase/pin-email.ts
  - lib/supabase/server.ts
  - lib/utils.ts
  - lib/utils/env.ts
  - types/database.types.ts
  - supabase/migrations/20260415000001_init_schema.sql
  - supabase/migrations/20260415000002_rls_policies.sql
  - supabase/migrations/20260415000003_teacher_signup_trigger.sql
  - tests/fixtures/supabase.ts
  - tests/integration/middleware-role-routing.test.ts
  - tests/integration/rls-policies.test.ts
  - tests/integration/schema.test.ts
  - tests/unit/auth-schemas.test.ts
  - tests/unit/pin-email-mapping.test.ts
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-04-17T14:30:00Z
**Depth:** standard
**Files Reviewed:** 35
**Status:** issues_found

## Summary

Phase 10 implements the authentication foundation for Matheapp: a dual-role login system (child via username+PIN, teacher via email+password), Supabase integration with RLS policies, middleware-based role routing, and teacher signup with atomic school/class provisioning. The overall architecture is well-structured with clear separation of concerns, proper use of Zod validation, generic error messages to prevent user enumeration, and solid RLS policies.

Two critical security issues were found: (1) the admin module (`lib/supabase/admin.ts`) lacks a `server-only` import guard, meaning the service-role key could theoretically be bundled into a client-side chunk if accidentally imported from a `"use client"` file; (2) the `teacher_inserts_own_schools` RLS policy uses `WITH CHECK (true)`, allowing any authenticated user (including children) to insert arbitrary rows into the schools table. Five warnings address authorization gaps, a missing `getUser()` verification call, potential username collision, and incomplete rollback logic.

## Critical Issues

### CR-01: Admin client module missing `server-only` import guard

**File:** `lib/supabase/admin.ts:1`
**Issue:** The file contains a comment warning "NEVER import this in a `use client` component" but does not enforce this at build time. Without `import 'server-only'` at the top, Next.js will not error if a client component accidentally imports this module. If that happens, `SUPABASE_SERVICE_ROLE_KEY` -- which bypasses all RLS -- would be bundled into client-side JavaScript and shipped to the browser.
**Fix:**
```typescript
// lib/supabase/admin.ts — add as the FIRST import
import 'server-only';

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { requireEnv } from "@/lib/utils/env";
```
Note: the `server-only` package must be in `dependencies` (it is a zero-byte marker package; `npm install server-only`).

### CR-02: Overly permissive RLS policy allows any authenticated user to create schools

**File:** `supabase/migrations/20260415000002_rls_policies.sql:118-121`
**Issue:** The `teacher_inserts_own_schools` policy uses `WITH CHECK (true)`, which means any authenticated user -- including child accounts -- can insert rows into `public.schools`. While the current application code only calls school INSERT from the admin client (which bypasses RLS), this policy leaves the door open for a child user (or any authenticated API caller) to create unlimited school rows by calling the Supabase REST API directly. This is an authorization bypass.
**Fix:**
```sql
create policy "teacher_inserts_own_schools"
on public.schools for insert
to authenticated
with check (
  (select private.user_role()) = 'teacher'
);
```

## Warnings

### WR-01: Middleware does not redirect authenticated users away from login/registration pages

**File:** `lib/supabase/middleware.ts:40-43`
**Issue:** When a user is authenticated (`claims` is truthy) and visits a public path (`/login`, `/registrieren`, `/`), the middleware allows it through without redirecting to their dashboard. This means an already-logged-in child could re-submit the login form and a teacher could re-register, potentially causing confusing state. While not a security vulnerability, it violates the expected UX flow and could lead to duplicate signup attempts.
**Fix:**
```typescript
if (claims && isPublicPath) {
  const role = (claims as { app_metadata?: { role?: "child" | "teacher" } })
    .app_metadata?.role;
  const url = request.nextUrl.clone();
  url.pathname = role === "child" ? "/kind/dashboard" : "/lehrer/dashboard";
  return NextResponse.redirect(url);
}
```

### WR-02: Dashboard pages use `getClaims()` without `getUser()` verification

**File:** `app/(child)/kind/dashboard/page.tsx:12` and `app/(teacher)/lehrer/dashboard/page.tsx:14`
**Issue:** Both dashboard pages call `supabase.auth.getClaims()` to determine the user identity, but `getClaims()` only reads the local JWT claims without verifying them against the Supabase auth server. If a JWT has been revoked (e.g., user deleted, password changed), the dashboard would still render with stale claims until the token expires. The Supabase docs recommend calling `getUser()` for server-side verification when making authorization decisions. The middleware already refreshes the session, which partially mitigates this, but the dashboard pages should independently verify.
**Fix:**
```typescript
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  redirect("/login");
}
const userId = user.id;
```

### WR-03: Child username uniqueness not enforced across classes during login lookup

**File:** `app/login/actions.ts:33-38`
**Issue:** The child login action queries `profiles` by `display_name` + `role = 'child'` using `.maybeSingle()`. If two children in different classes share the same `display_name` (e.g., "mia.k"), this query will return a Supabase error (PGRST116: multiple rows) rather than matching the correct child. The `maybeSingle()` call returns an error when more than one row matches, which would surface as the generic login error. The child would be unable to log in. The database has a unique constraint on `(class_id, display_name)` but not on `display_name` alone, so duplicates across classes are allowed by design -- but the login flow cannot resolve them.
**Fix:** The login form should collect an additional disambiguator (e.g., class code or class name) to scope the lookup. Alternatively, enforce globally unique usernames at child creation time. For now, document this as a known limitation and add a code comment:
```typescript
// TODO: If two children in different classes share the same display_name,
// maybeSingle() returns an error. Consider adding class_id disambiguator
// to the login flow or enforcing global username uniqueness.
```

### WR-04: Signup rollback does not delete the trigger-created profile row

**File:** `app/registrieren/actions.ts:93-101`
**Issue:** When the signup action fails after user creation (e.g., school or class insert fails), the rollback deletes class, school, and the auth user. However, the `handle_new_teacher_user` trigger (migration 003) inserts a `profiles` row on auth user creation. While deleting the auth user cascades the profile row (due to `ON DELETE CASCADE` on `profiles.user_id`), if the `admin.auth.admin.deleteUser()` call itself fails silently in the inner catch block, the orphaned profile row would remain. The inner `catch` block swallows all errors with a "best-effort" comment. Consider logging the rollback failure for operational visibility.
**Fix:**
```typescript
} catch (rollbackErr) {
  // Log rollback failure for operational visibility — orphaned rows may need manual cleanup.
  console.error("[teacherSignup] rollback failed:", rollbackErr);
}
```

### WR-05: Middleware role check does not handle missing or unknown role values

**File:** `lib/supabase/middleware.ts:46-59`
**Issue:** If `claims.app_metadata.role` is undefined, null, or an unexpected string (not "child" or "teacher"), the middleware allows the request through to any authenticated route without restriction. An authenticated user with no role (e.g., created through a direct Supabase auth call without `app_metadata`) could access both `/kind/` and `/lehrer/` routes. The dashboard pages have their own role checks and would redirect, but this creates a brief window where the page starts rendering before the redirect fires.
**Fix:**
```typescript
if (claims) {
  const role = (claims as { app_metadata?: { role?: string } })
    .app_metadata?.role;

  if (role === "child" && pathname.startsWith("/lehrer")) {
    const url = request.nextUrl.clone();
    url.pathname = "/kind/dashboard";
    return NextResponse.redirect(url);
  }
  if (role === "teacher" && pathname.startsWith("/kind")) {
    const url = request.nextUrl.clone();
    url.pathname = "/lehrer/dashboard";
    return NextResponse.redirect(url);
  }
  // Deny access for users with no recognized role
  if (role !== "child" && role !== "teacher" && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}
```

## Info

### IN-01: Non-null assertions on environment variables in client and middleware modules

**File:** `lib/supabase/client.ts:5-6` and `lib/supabase/middleware.ts:9-10` and `lib/supabase/server.ts:9-10`
**Issue:** These files use TypeScript non-null assertions (`!`) on `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` instead of the `requireEnv()` helper defined in `lib/utils/env.ts`. While the admin module correctly uses `requireEnv()`, these three files would produce an unclear runtime error if the env vars are missing. The `requireEnv()` function throws a descriptive error message.
**Fix:** Replace `process.env.NEXT_PUBLIC_SUPABASE_URL!` with `requireEnv("NEXT_PUBLIC_SUPABASE_URL")` in all three files for consistent error handling.

### IN-02: `handlePaste` pads with empty strings instead of preserving partial input

**File:** `components/login/pin-input.tsx:50`
**Issue:** When a paste contains fewer than 4 digits (e.g., "47"), the code calls `pasted.padEnd(4, "").slice(0, 4)` which pads with empty strings -- but `padEnd` with `""` as the pad string does nothing (MDN: if padString is empty, no padding is applied). So pasting "47" produces the string "47", not "47  ". This is actually correct behavior (only 2 digits entered), but the `padEnd(4, "")` call is misleading dead code that suggests the intent was to pad to 4 characters.
**Fix:**
```typescript
// Remove the misleading padEnd — just slice to max 4 digits
onChange(pasted.slice(0, 4));
```

### IN-03: Unused `hasEnvVars` function

**File:** `lib/utils/env.ts:1-6`
**Issue:** The `hasEnvVars()` function is exported but not imported anywhere in the application code. It may be intended for future use or may be leftover from a template.
**Fix:** Remove if not needed, or add a comment indicating its intended use:
```typescript
// Used by deployment health checks (future)
export function hasEnvVars(): boolean { ... }
```

---

_Reviewed: 2026-04-17T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
