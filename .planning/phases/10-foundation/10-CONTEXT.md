# Phase 10: Foundation - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

A running Next.js application where children and teachers can log in with role-appropriate credentials, sessions persist, and the database schema enforces data isolation through RLS. Children use a simple username+PIN login (no email visible). Teachers use email+password. Role-based routing separates child and teacher dashboards.

</domain>

<decisions>
## Implementation Decisions

### Child authentication method
- **D-01:** Children log in with **Benutzername (display name) + 4-digit PIN** — no email field shown
- **D-02:** Teachers create child accounts — no self-registration for children in MVP
- **D-03:** Behind the scenes, Supabase receives a generated email (`{username}.{class_id}@matheapp.internal`) + PIN as password via `signInWithPassword()`
- **D-04:** The login form for children shows only two fields: Benutzername and PIN (large, touch-friendly inputs)

### Teacher authentication
- **D-05:** Teachers log in with standard **email + password** using Supabase Auth
- **D-06:** Teacher registration is a simple sign-up form (email + password + name) — no admin approval needed for MVP

### Supabase auth strategy
- **D-07:** Use `@supabase/supabase-js` + `@supabase/ssr` for cookie-based sessions compatible with Next.js App Router
- **D-08:** No NextAuth.js, no OAuth providers — Supabase Auth handles everything directly
- **D-09:** Login page has a role-switch toggle (Kind / Lehrkraft) that shows the appropriate form fields

### Database schema
- **D-10:** Tables: `profiles` (user_id FK to auth.users, role, grade_level, display_name, class_id, pin_code), `classes` (id, teacher_id, name, school_id), `schools` (id, name, subscription_tier), `progress_entries` (child_id, operation_type, grade, correct, points_earned, created_at)
- **D-11:** RLS policies: children can only read/write their own profile and progress data; teachers can read all profiles and progress in their class; no cross-class data access
- **D-12:** `role` field in `profiles` determines routing and access — values: `child` | `teacher`
- **D-13:** `schools` table includes `subscription_tier` field (default: `free`) for Phase 60 subscription gate — schema created now, logic implemented later

### Route structure and role-based routing
- **D-14:** Next.js App Router with route groups: `(child)` for child-facing pages, `(teacher)` for teacher dashboard
- **D-15:** Middleware checks auth session + role from `profiles` table and redirects unauthorized access
- **D-16:** Unauthenticated users → `/login`; children trying teacher routes → `/kind/dashboard`; teachers trying child routes → `/lehrer/dashboard`

### UI and styling foundation
- **D-17:** Tailwind CSS v4 for all styling — no additional component library for child-facing UI
- **D-18:** shadcn/ui initialized but only used in `(teacher)` route group
- **D-19:** Child login form: large text (`text-4xl`), rounded buttons (`rounded-2xl`), saturated colors, touch-friendly targets (min 48px)
- **D-20:** Teacher login form: standard professional form using shadcn/ui components
- **D-21:** German language throughout all UI text

### Claude's Discretion
- Exact color palette choices (within the constraint of bold, child-friendly colors)
- Login page layout and visual hierarchy
- Exact RLS policy SQL syntax
- Supabase project setup details
- Error message wording and validation UX
- Loading states and transition animations on login

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Technology stack
- `.planning/research/STACK.md` — Full technology decisions: Next.js 15, Supabase Auth, Tailwind v4, shadcn/ui, Zod. Contains "Do NOT use" anti-patterns and confirmed version numbers.

### Project context
- `.planning/PROJECT.md` — Core value, constraints (2-4 week deadline, solo developer), key decisions, out-of-scope items
- `.planning/ROADMAP.md` §Phase 10 — Success criteria (5 items) that define the done condition for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None — this phase establishes the foundational patterns

### Integration Points
- Supabase project must be created and configured before development starts
- `create-next-app` scaffolds the project with TypeScript and Tailwind pre-configured

</code_context>

<specifics>
## Specific Ideas

- Child login should feel safe and simple — like entering a game, not like logging into a business app
- PIN should be numeric-only with large on-screen number buttons (preparation for Phase 30 exercise UI pattern)
- Role-switch on login page should be obvious but not confusing for children who arrive at the page

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-foundation*
*Context gathered: 2026-04-15*
