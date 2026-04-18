# Architecture Patterns

**Domain:** Children's math learning web app (Grundschule, grades 1-4)
**Researched:** 2026-04-15
**Confidence:** HIGH — Next.js + Supabase patterns are mature and well-documented

---

## Recommended Architecture

**Pattern: Layered Monolith with Role-Based Routing**

A single Next.js application with distinct routing zones per role (child, teacher, admin). Supabase handles auth, database, and row-level security (RLS). No microservices — the scope and timeline make a monolith the only viable choice for a solo developer on a 2-4 week timeline.

```
Browser
  └── Next.js App (App Router)
        ├── /auth            → Login / register flows
        ├── /child           → Child-facing learning experience
        │     ├── /dashboard → Points, progress, streak
        │     ├── /exercises → Exercise session (main learning loop)
        │     └── /rewards   → Mini-game access
        ├── /teacher         → Teacher dashboard (class overview)
        └── /admin           → Subscription / class management (simulated)

Next.js API Routes (/app/api/)
  ├── /api/exercises         → Generate / validate exercises
  ├── /api/progress          → Record answer, update points
  └── /api/subscriptions     → Simulated tier check

Supabase (BaaS)
  ├── Auth                   → Session management, RLS enforcement
  ├── PostgreSQL             → All persistent data
  └── RLS Policies           → Enforce child/teacher data isolation
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Auth Layer** | Login / logout, session, role detection | Supabase Auth → all protected routes |
| **Exercise Engine** | Generate age-appropriate problems, validate answers, score | Progress Store, Exercise DB |
| **Progress Store** | Track points, session history, per-topic stats | Exercise Engine → Child Dashboard, Teacher Dashboard |
| **Points / Reward System** | Accumulate points, unlock mini-game threshold | Progress Store → Reward Gate |
| **Mini-Game** | Browser-based reward game, rendered client-side only | Reward Gate (entry check only) |
| **Child Dashboard** | Show current points, progress, available exercises | Progress Store |
| **Teacher Dashboard** | Class-level aggregate view, per-student drill-down | Progress Store (read-only, scoped to teacher's class) |
| **Subscription Gate** | Check tier, restrict grade-4 content | Supabase `subscriptions` table |
| **Exercise DB** | Static or seeded exercise templates per grade/topic | Exercise Engine reads, never writes |

**Boundary rules:**
- The Mini-Game component must NOT write to progress — it is a reward, not a learning surface. Points are earned only through exercises.
- The Teacher Dashboard must NEVER call exercise generation — it is read-only on progress data.
- Subscription checks happen at route middleware level (Next.js middleware.ts), not inside components — prevents bypass via direct URL.

---

## Data Flow

### Core Learning Loop (most critical flow)

```
Child logs in
  → Supabase Auth verifies session → middleware attaches role
  → Child selects grade/topic
  → /api/exercises generates N problems from Exercise DB
      (deterministic generation from seed, no AI calls needed)
  → Child answers in browser
  → Each answer POST → /api/progress
      → validates answer server-side
      → awards points
      → writes to progress_entries table
      → returns updated point total
  → After session: dashboard shows new total
  → If points >= threshold: Reward Gate unlocks Mini-Game
```

### Teacher View Flow

```
Teacher logs in
  → Supabase RLS limits all queries to teacher.class_id
  → Teacher Dashboard fetches aggregated progress for all children in class
  → No writes — purely observational
```

### Subscription Check Flow

```
Child navigates to grade-4 content
  → Next.js middleware.ts intercepts
  → Reads subscriptions table for child's school_id
  → FREE tier: redirect to /upgrade (simulated)
  → PAID tier: allow through
```

### Auth + Role Routing

```
Any protected route
  → middleware.ts reads Supabase session
  → Reads user.role from profiles table (child | teacher | admin)
  → Redirects to correct zone (/child, /teacher, /admin)
  → No role → redirect to /auth/login
```

---

## Patterns to Follow

### Pattern 1: Server-Side Exercise Validation

**What:** Never trust the client to validate a math answer. Always POST the answer to an API route that checks it server-side.

**When:** Every answer submission.

**Why:** Prevents point manipulation by a child (or their parent) opening DevTools. Critical for any points-based system, even a school project.

```typescript
// app/api/progress/route.ts
export async function POST(req: Request) {
  const { exerciseId, childAnswer, sessionToken } = await req.json()
  const correct = validateAnswer(exerciseId, childAnswer) // server-side check
  const points = correct ? POINTS_PER_CORRECT : 0
  await supabase.from('progress_entries').insert({ ... })
  return Response.json({ correct, points })
}
```

### Pattern 2: Role-Based Middleware Guard

**What:** Check role in Next.js middleware.ts before any page renders.

**When:** All routes under /child, /teacher, /admin.

**Why:** Component-level guards are bypassed on direct navigation. Middleware runs on the edge, before the page component is even loaded.

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const session = await getSupabaseSession(req)
  const role = session?.user?.user_metadata?.role
  if (req.nextUrl.pathname.startsWith('/teacher') && role !== 'teacher') {
    return NextResponse.redirect('/auth/login')
  }
}
```

### Pattern 3: RLS as the Real Security Layer

**What:** Supabase Row Level Security policies enforce data isolation. Middleware is UX — RLS is security.

**When:** Every table that stores child data.

**Why:** Even if a child somehow obtains a teacher's session cookie, RLS prevents reading other children's data. Defense in depth.

```sql
-- Children can only read their own progress
CREATE POLICY "child_own_progress" ON progress_entries
  FOR SELECT USING (auth.uid() = child_id);

-- Teachers can read progress for children in their class
CREATE POLICY "teacher_class_progress" ON progress_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM class_members cm
      JOIN teachers t ON t.class_id = cm.class_id
      WHERE t.user_id = auth.uid() AND cm.child_id = progress_entries.child_id
    )
  );
```

### Pattern 4: Deterministic Exercise Generation (No AI Needed)

**What:** Generate math problems algorithmically on the server, not via AI API calls.

**When:** All exercise generation.

**Why:** AI is unnecessary cost and latency for "3 + 7 = ?". A simple generator with grade-level constraints produces infinite varied problems instantly. The PROJECT.md explicitly scopes out AI for this project.

```typescript
function generateExercise(grade: 1|2|3|4): Exercise {
  const { min, max, ops } = GRADE_CONFIG[grade]
  const op = ops[Math.floor(Math.random() * ops.length)]
  const a = rand(min, max), b = rand(min, op === '/' ? a : max)
  return { a, b, op, answer: compute(a, b, op) }
}
```

### Pattern 5: Points Threshold for Reward Gate

**What:** A single `points_balance` integer on the child's profile. Mini-game unlocks when balance >= threshold. Spending points to play resets toward zero.

**When:** After each correct answer, check balance against threshold.

**Why:** Simple and auditable. Avoid complex "unlock" state flags — the balance IS the state.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Answer Validation

**What:** Computing whether an answer is correct in the browser and sending only "correct/wrong" to the server.

**Why bad:** Trivially bypassed with DevTools. Points become meaningless.

**Instead:** POST the raw answer, validate on the server (Pattern 1 above).

### Anti-Pattern 2: One Giant "Learning" Component

**What:** A single React component that handles exercise display, answer input, scoring, animation, and navigation.

**Why bad:** Impossible to test, impossible to change one concern without breaking others. Common in rushed uni projects.

**Instead:** Split into ExerciseCard (display), AnswerInput (interaction), SessionManager (orchestrates, calls API), FeedbackOverlay (animation). Each has one job.

### Anti-Pattern 3: Teacher Dashboard Directly Queries Progress Table

**What:** Teacher frontend directly calls Supabase from the client with complex joins.

**Why bad:** Exposes table structure, hard to paginate/aggregate, bypasses any caching. RLS alone is not enough — aggregate logic should live in API routes or Postgres views.

**Instead:** A dedicated `/api/teacher/class-progress` route that returns pre-aggregated data. Keeps queries server-side and cacheable.

### Anti-Pattern 4: Embedding Subscription Logic in Components

**What:** `if (grade === 4 && !subscription) return <UpgradeBanner />` scattered across exercise components.

**Why bad:** Easy to forget one spot. Creates inconsistent behavior. Hard to change tiers later.

**Instead:** Centralize in middleware.ts for route-level blocking and a single `useSubscription()` hook for UI hints. One source of truth.

### Anti-Pattern 5: Using localStorage for Points/Progress

**What:** Storing points in localStorage as a quick solution.

**Why bad:** Not shared across devices, not visible to teachers, can be edited by the user, lost on browser clear.

**Instead:** All progress and points live in Supabase. localStorage is only acceptable for non-critical UI state (last selected topic, sound preference).

---

## Database Schema Sketch

```
profiles          (extends Supabase auth.users)
  id              → FK to auth.users.id
  role            → 'child' | 'teacher' | 'admin'
  display_name    → child's first name (shown in UI)
  grade           → 1-4 (children only)
  class_id        → FK to classes
  points_balance  → integer (running total, updated per correct answer)
  created_at

classes
  id
  name            → "Klasse 2b"
  school_id       → FK to schools
  teacher_id      → FK to profiles (role = teacher)

schools
  id
  name
  subscription_tier → 'free' | 'paid'

progress_entries  (immutable event log — never update, only insert)
  id
  child_id        → FK to profiles
  exercise_id     → string (generated ID, not FK — ephemeral)
  grade           → 1-4
  topic           → 'addition' | 'subtraction' | 'multiplication' | 'division'
  correct         → boolean
  points_awarded  → integer
  answered_at     → timestamp

```

**Key design choice:** `progress_entries` is an append-only event log. Never update records. Aggregate queries (e.g., "accuracy this week") always scan the log. This makes progress auditable and the teacher dashboard accurate to reality.

---

## Scalability Considerations

This is a uni project — scalability beyond "class of 30 children" is not a real concern. However, the architecture above naturally handles it:

| Concern | At 1 class (30 children) | At 100 classes | Notes |
|---------|--------------------------|----------------|-------|
| Exercise generation | Instant, in-memory | Instant — stateless | No DB hit needed |
| Progress writes | Fine, low volume | Add Supabase connection pooling | PgBouncer built into Supabase |
| Teacher dashboard | Direct query fine | Add DB view or materialized view | Pre-aggregate per class |
| Auth | Supabase handles | Supabase handles | No action needed |

---

## Build Order (Dependency Graph)

Components must be built in this order — each depends on the one before.

```
1. Auth Layer + Role Routing
   └── Nothing works without knowing who is logged in and what role they have.

2. Database Schema + RLS Policies
   └── Must exist before any data reads/writes. RLS locks down data before UI exists.

3. Exercise Engine (server-side generation + validation)
   └── Core value of the product. No dependency on UI.

4. Progress Store (API route + DB writes)
   └── Depends on Exercise Engine (needs validation) + Schema (needs table).

5. Child Dashboard + Exercise Session UI
   └── Depends on Exercise Engine + Progress Store (reads points/history).

6. Points / Reward Gate + Mini-Game
   └── Depends on Progress Store (reads balance). Last because it's a reward layer.

7. Teacher Dashboard
   └── Depends on Progress Store being populated. Read-only, no blockers beyond data existing.

8. Subscription Gate
   └── Depends on Auth Layer + schools/subscriptions table. Route-level, not component-level.
```

**Critical path:** Auth → Schema → Exercise Engine → Progress Store → Child UI. Everything else (mini-game, teacher dashboard, subscription) can be built in parallel after step 4.

---

## Sources

- Pattern confidence: HIGH — based on established Next.js App Router, Supabase Auth, and RLS documentation patterns. These are stable, well-documented APIs as of 2025.
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Next.js Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- No external search available during this research session — findings based on training knowledge of these mature, stable patterns.
