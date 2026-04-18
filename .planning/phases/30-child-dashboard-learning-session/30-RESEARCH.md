# Phase 30: Child Dashboard & Learning Session - Research

**Researched:** 2026-04-17
**Domain:** Next.js App Router Client/Server Components, child-friendly UI patterns, Supabase aggregate queries, exercise session state management
**Confidence:** HIGH

## Summary

Phase 30 transforms the stub child dashboard into a fully functional learning experience. It has two distinct surfaces: (1) a **Server Component dashboard** at `/kind/dashboard` that loads points, progress, and grade info from Supabase, and (2) a **Client Component exercise session** at `/kind/ueben` where children interact with a number pad to answer math questions with immediate visual feedback.

The entire backend is already built. Phase 20 delivered `generateExerciseAction` and `submitAnswerAction` as Server Actions in `app/(child)/kind/ueben/actions.ts`. The `progress_entries` table stores every answer with `points_earned`. The dashboard needs a single aggregate query (`points_earned.sum()`) to show the child's total points. The exercise session page is a pure client-side state machine that calls these existing Server Actions.

**Primary recommendation:** Build the dashboard as a Server Component with Supabase aggregate queries, and the exercise session as a single Client Component with a state machine (idle/loading/answering/feedback/done) driving the number pad, feedback overlay, and session statistics.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard Layout**
- D-01: Dashboard route: `/kind/dashboard` (already exists as stub from Phase 10)
- D-02: Dashboard shows: total points, progress toward mini-game unlock, grade level, number of solved exercises
- D-03: Mini-game unlock progress as visual bar (e.g. "150/500 Punkte bis zum Spiel")
- D-04: "Aufgaben starten" button prominent on dashboard -- primary call-to-action
- D-05: Dashboard loads points from database (sum of progress_entries.points_earned)

**Exercise Session UI**
- D-06: Session route: `/kind/ueben` -- own page, not a modal
- D-07: Exercise displayed large: "7 + 3 = ?" with large numbers (text-4xl or larger)
- D-08: Answer input via large on-screen number buttons (0-9) -- no keyboard needed
- D-09: Number pad layout: 3x3 grid (1-9) + 0 + delete + confirm
- D-10: Answer display shows typed digits in real-time
- D-11: "Beenden" button always visible to end session and return to dashboard

**Visual Feedback**
- D-12: Correct: green background flash + "Richtig! +X Punkte" with points animation
- D-13: Wrong: red background flash + "Leider falsch. Die Antwort ist: X"
- D-14: Feedback shown for 1.5-2 seconds, then auto-advance to next exercise
- D-15: Current session stats visible: correct/wrong counter, current difficulty level

**Styling (Child UI)**
- D-16: Raw Tailwind CSS -- no shadcn/ui (D-17 from Phase 10: child UI is custom)
- D-17: Large text (min text-2xl, exercises text-4xl+), rounded-2xl buttons
- D-18: Bold, cheerful colors: Yellow (#FFC107), Green (#4CAF50), Red (#F44336), Blue (#2196F3)
- D-19: Touch-friendly: all interactive elements min 48px (better 56px)
- D-20: Mobile-first: works on tablets and phones (children often use tablets)

**Data Flow**
- D-21: Dashboard: Server Component loads points via Supabase query (sum progress_entries)
- D-22: Exercise session: Client Component calls Server Actions (generateExerciseAction, submitAnswerAction)
- D-23: Difficulty level and streak held in client state (React useState)
- D-24: After session end: dashboard reloads (router.refresh()) to show updated points

### Claude's Discretion
- Exact layout proportions and spacing
- Animation implementation (CSS transitions vs framer-motion vs simple state toggles)
- Exact shade variations within the given color palette
- Whether to use SVG icons or emoji for visual elements
- Loading states and skeleton UI during data fetching

### Deferred Ideas (OUT OF SCOPE)
- Mini-game itself is Phase 40 -- here only the progress bar
- Extended statistics (daily/weekly trends) are Phase 50 (Teacher Dashboard)
- Sounds/audio feedback -- nice-to-have, not in MVP
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-01 | Kinder koennen sich einloggen und ihren Fortschritt sehen | Dashboard (D-01 through D-05) shows points total, progress bar, grade level, exercise count. Login already delivered in Phase 10; this phase delivers the "see progress" portion. |
| REQ-03 | Punktesystem mit Mini-Game als Belohnung (points display portion) | Points earned from exercises displayed on dashboard (D-05, D-21), progress bar toward mini-game unlock (D-03). Mini-game itself deferred to Phase 40. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Points aggregation (sum query) | Frontend Server (SSR) | Database | Server Component queries Supabase directly; RLS enforces child can only see own data |
| Exercise generation | API / Backend | -- | Already implemented as Server Action in Phase 20 |
| Answer validation + points write | API / Backend | Database | Server Action re-computes answer, writes progress_entry |
| Number pad input | Browser / Client | -- | Pure client-side state: digit buffer, real-time display |
| Visual feedback (green/red flash) | Browser / Client | -- | CSS transitions on client state changes |
| Session state machine | Browser / Client | -- | useState for difficulty, streaks, exercise count, session stats |
| Dashboard data display | Frontend Server (SSR) | -- | Server Component fetches and renders; no client-side JS needed |
| Navigation (dashboard <-> session) | Browser / Client | -- | Next.js Link + router.push/router.refresh |

## Standard Stack

### Core (already installed)

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.2.9 | App Router, Server/Client Components, Server Actions | [VERIFIED: node_modules] Project framework |
| react | 19.2.5 | UI rendering, useState/useTransition hooks | [VERIFIED: node_modules] |
| @supabase/ssr | 0.10.2 | Server-side Supabase client with cookie handling | [VERIFIED: node_modules] |
| @supabase/supabase-js | 2.103.3 | Supabase client, aggregate queries | [VERIFIED: node_modules] |
| tailwindcss | v4 | Styling with @theme custom colors | [VERIFIED: node_modules] |
| tw-animate-css | 1.4.0 | Tailwind v4 animation utilities | [VERIFIED: node_modules] Already installed for shadcn/ui |
| zod | 4.3.6 | Schema validation (already used in exercise schemas) | [VERIFIED: node_modules] |

### Supporting (no new dependencies needed)

This phase requires **zero new npm packages**. Everything needed is already installed.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 1.8.0 | Icons (optional, for visual elements) | [VERIFIED: node_modules] If SVG icons preferred over emoji for session stats |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS transitions for feedback | framer-motion | Adds 30KB+ for animations that CSS handles in 5 lines. Not worth it for flash effects. |
| Raw Tailwind number pad | Existing calculator component library | Over-engineered. 12 buttons in a grid is simpler to build than configure a library. |
| router.refresh() for dashboard update | revalidatePath in server action | CONTEXT D-24 specifies router.refresh(). Also, refresh() from next/cache is for Server Actions only, not callable from client. router.refresh() is the correct client-side pattern. |

**Installation:**
```bash
# No new packages needed. Phase 30 uses only existing dependencies.
```

## Architecture Patterns

### System Architecture Diagram

```
Dashboard (/kind/dashboard) - SERVER COMPONENT
  |
  ├── Supabase Query: profiles (display_name, grade_level)
  ├── Supabase Query: progress_entries.sum(points_earned), .count() WHERE child_id = user.id
  |
  └── Renders: Points total, Progress bar, Grade badge, Exercise count, "Aufgaben starten" Link
         |
         └── Link to /kind/ueben

Exercise Session (/kind/ueben) - CLIENT COMPONENT
  |
  ├── State Machine: idle → loading → answering → submitting → feedback → (loop or done)
  |
  ├── On mount: calls generateExerciseAction(grade, difficulty) → receives ClientExercise
  |
  ├── Number Pad: digits 0-9, delete, confirm
  │     └── Updates answer buffer (useState)
  │
  ├── On confirm: calls submitAnswerAction({...}) → receives SubmitAnswerResult
  │     ├── correct: green flash + "+X Punkte" → 1.5s timeout → next exercise
  │     └── wrong: red flash + "Antwort: X" → 2s timeout → next exercise
  │
  ├── Session Stats: correctCount, wrongCount, currentDifficulty (all useState)
  │
  └── "Beenden" button: router.push('/kind/dashboard') with router.refresh()
```

### Recommended Project Structure

```
app/(child)/kind/
├── dashboard/
│   └── page.tsx              # Server Component: points, progress, grade, CTA
├── ueben/
│   ├── actions.ts            # EXISTING: generateExerciseAction, submitAnswerAction
│   └── page.tsx              # NEW: Client Component wrapper (thin)
components/child/
├── logout-button.tsx         # EXISTING
├── dashboard-stats.tsx       # NEW: Points display, progress bar, grade badge
├── exercise-session.tsx      # NEW: Main session component (state machine)
├── number-pad.tsx            # NEW: 3x3+3 grid of digit buttons
└── feedback-overlay.tsx      # NEW: Green/red flash with message
```

### Pattern 1: Server Component Dashboard with Supabase Aggregates

**What:** The dashboard page is a Server Component that directly queries Supabase for the child's total points and exercise count using PostgREST aggregate functions.

**When to use:** Loading read-only data that doesn't need client-side interactivity.

**Example:**
```typescript
// Source: Supabase PostgREST aggregate docs (https://supabase.com/blog/postgrest-aggregate-functions)
// + project codebase pattern from app/(child)/kind/dashboard/page.tsx

export default async function KindDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, grade_level")
    .eq("user_id", user.id)
    .single();

  // Aggregate: total points and exercise count
  const { data: stats } = await supabase
    .from("progress_entries")
    .select("points_earned.sum(), id.count()")
    .eq("child_id", user.id)
    .single();

  const totalPoints = stats?.sum ?? 0;
  const exerciseCount = stats?.count ?? 0;

  // Render dashboard with these values...
}
```

**Key detail:** The `.sum()` and `.count()` aggregate syntax is supported in `@supabase/supabase-js` 2.x with PostgREST. The query returns `{ sum: number | null, count: number | null }`. [VERIFIED: official Supabase blog post on aggregate functions]

### Pattern 2: Client Component Exercise Session State Machine

**What:** A single Client Component manages the entire exercise flow through discrete states.

**When to use:** Interactive UI with multiple sequential states and async server calls.

**Example:**
```typescript
// Source: Next.js App Router patterns (https://nextjs.org/docs/app/getting-started/mutating-data)

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateExerciseAction, submitAnswerAction } from "./actions";
import type { ClientExercise, Difficulty, SubmitAnswerResult } from "@/lib/exercises/types";

type SessionState = "loading" | "answering" | "submitting" | "feedback" | "error";

export function ExerciseSession({ grade }: { grade: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Session state
  const [state, setState] = useState<SessionState>("loading");
  const [exercise, setExercise] = useState<ClientExercise | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [correctStreak, setCorrectStreak] = useState(0);
  const [incorrectStreak, setIncorrectStreak] = useState(0);
  const [feedback, setFeedback] = useState<SubmitAnswerResult | null>(null);

  // Session statistics
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  async function loadNextExercise() {
    setState("loading");
    const result = await generateExerciseAction(grade, difficulty);
    if (result.data) {
      setExercise(result.data);
      setAnswer("");
      setState("answering");
    }
  }

  async function handleSubmit() {
    if (!exercise || answer === "") return;
    setState("submitting");

    const result = await submitAnswerAction({
      exerciseId: exercise.id,
      operand1: exercise.operand1,
      operand2: exercise.operand2,
      operator: exercise.operator,
      userAnswer: parseInt(answer, 10),
      currentDifficulty: difficulty,
      correctStreak,
      incorrectStreak,
    });

    if (result.data) {
      setFeedback(result.data);
      // Update streaks and difficulty from server response
      setCorrectStreak(result.data.newCorrectStreak);
      setIncorrectStreak(result.data.newIncorrectStreak);
      setDifficulty(result.data.newDifficulty);
      // Update session stats
      if (result.data.correct) {
        setCorrectCount((c) => c + 1);
      } else {
        setWrongCount((c) => c + 1);
      }
      setState("feedback");
      // Auto-advance after delay (D-14)
      setTimeout(() => loadNextExercise(), result.data.correct ? 1500 : 2000);
    }
  }

  function handleEndSession() {
    router.push("/kind/dashboard");
    router.refresh(); // D-24: refresh to show updated points
  }

  // ... render based on state
}
```

### Pattern 3: Number Pad Component

**What:** A 12-button grid (digits 0-9, delete, confirm) for touch-friendly input.

**When to use:** Whenever the target audience cannot or should not use a keyboard.

**Example:**
```typescript
// Source: Project decision D-08, D-09

interface NumberPadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onConfirm: () => void;
  disabled?: boolean;
}

export function NumberPad({ onDigit, onDelete, onConfirm, disabled }: NumberPadProps) {
  const buttons = [
    "1", "2", "3",
    "4", "5", "6",
    "7", "8", "9",
    "0", "DEL", "OK",
  ];

  return (
    <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
      {buttons.map((btn) => (
        <button
          key={btn}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (btn === "DEL") onDelete();
            else if (btn === "OK") onConfirm();
            else onDigit(btn);
          }}
          className={`
            h-16 rounded-2xl text-3xl font-semibold
            ${btn === "OK" ? "bg-green-500 text-white" : ""}
            ${btn === "DEL" ? "bg-red-400 text-white" : ""}
            ${!["OK", "DEL"].includes(btn) ? "bg-blue-500 text-white" : ""}
            active:scale-95 transition-transform
            disabled:opacity-50
          `}
        >
          {btn === "DEL" ? "←" : btn}
        </button>
      ))}
    </div>
  );
}
```

### Pattern 4: CSS Feedback Flash (no animation library needed)

**What:** Background color transitions for correct/incorrect feedback using pure CSS.

**When to use:** Simple visual feedback that doesn't require keyframe animations.

**Example:**
```typescript
// Source: Tailwind CSS transition utilities [VERIFIED: Tailwind v4 docs]

// In the exercise session component:
<div className={`
  min-h-dvh transition-colors duration-300
  ${state === "feedback" && feedback?.correct ? "bg-green-100" : ""}
  ${state === "feedback" && !feedback?.correct ? "bg-red-100" : ""}
  ${state !== "feedback" ? "bg-white" : ""}
`}>
  {state === "feedback" && feedback && (
    <div className="text-center py-8">
      {feedback.correct ? (
        <p className="text-4xl font-semibold text-green-700">
          Richtig! +{feedback.pointsEarned} Punkte
        </p>
      ) : (
        <p className="text-4xl font-semibold text-red-700">
          Leider falsch. Die Antwort ist: {feedback.correctAnswer}
        </p>
      )}
    </div>
  )}
</div>
```

### Pattern 5: Progress Bar for Mini-Game Unlock

**What:** A visual bar showing progress toward the mini-game unlock threshold.

**When to use:** Displaying fraction-of-goal progress.

**Example:**
```typescript
// Source: Project decision D-03

const MINIGAME_THRESHOLD = 500; // Points needed to unlock mini-game

function ProgressBar({ currentPoints }: { currentPoints: number }) {
  const progress = Math.min((currentPoints / MINIGAME_THRESHOLD) * 100, 100);
  const remaining = Math.max(MINIGAME_THRESHOLD - currentPoints, 0);

  return (
    <div>
      <p className="text-xl font-semibold text-slate-700 mb-2">
        {currentPoints}/{MINIGAME_THRESHOLD} Punkte bis zum Spiel
      </p>
      <div className="w-full h-6 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      {remaining > 0 && (
        <p className="text-lg text-slate-500 mt-1">
          Noch {remaining} Punkte!
        </p>
      )}
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Putting Supabase queries in Client Components for dashboard:** The dashboard is read-only data. Use a Server Component to avoid shipping the Supabase client bundle to the browser. D-21 explicitly mandates this.

- **Storing exercise answer in client state:** The server already re-computes the answer from operands (Phase 20 Pattern 3). The client should NEVER know the correct answer before submission.

- **Using `useEffect` to load exercises on mount:** Instead, load the first exercise as part of the state machine flow. Start in "loading" state and call `loadNextExercise()` via `useEffect` only once on mount. Avoid race conditions by checking state before setting.

- **Keyboard event listeners for number input:** D-08 explicitly says "no keyboard needed." The number pad is the sole input method. Do not add `onKeyDown` handlers -- this is a touch-first interface for children.

- **Making the number pad buttons too small:** D-19 requires min 48px, preferably 56px. Use `h-14` (56px) or `h-16` (64px) for button heights. Test on mobile viewport.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Aggregate queries (sum, count) | Manual JS reduce over all rows | Supabase `.select('points_earned.sum(), id.count()')` | Database-level aggregation is faster, correct, and handles large datasets |
| Touch-friendly button sizing | Custom CSS media queries | Tailwind `h-14 min-h-[48px]` utilities | Consistent, well-tested responsive sizing |
| Color flash animation | JavaScript animation loop | CSS `transition-colors duration-300` | Browser-native, zero JS overhead, GPU-accelerated |
| Session navigation | Manual history.pushState | Next.js `useRouter` push + refresh | Integrates with App Router cache invalidation |
| Exercise generation + validation | Anything new | Existing Phase 20 Server Actions | Already built, tested, and secure |

**Key insight:** This phase is entirely a **UI delivery** phase. The backend is complete. Every temptation to modify the exercise engine, add new Server Actions, or change the database schema should be resisted. The only new code is React components + Tailwind styling.

## Common Pitfalls

### Pitfall 1: Supabase Aggregate Return Shape

**What goes wrong:** The `.sum()` aggregate on an empty result set returns `null`, not `0`. Code that does arithmetic with the result crashes with `NaN`.
**Why it happens:** A child with no progress entries yet has no rows to sum.
**How to avoid:** Always nullish-coalesce: `stats?.sum ?? 0`. Handle the zero-exercises case explicitly in the UI with a welcoming message.
**Warning signs:** Dashboard shows "NaN Punkte" or crashes on first login.

### Pitfall 2: Race Condition on Fast Number Pad Taps

**What goes wrong:** A child taps the confirm button multiple times before the Server Action responds, causing duplicate submissions.
**Why it happens:** Network latency + eager children = multiple clicks.
**How to avoid:** Disable the confirm button during `submitting` state. Use `isPending` from `useTransition` or a local `isSubmitting` state flag. Also disable the number pad during feedback display.
**Warning signs:** Duplicate progress_entries for the same exercise. Points awarded twice.

### Pitfall 3: Stale Dashboard After Session

**What goes wrong:** Child finishes a session, returns to dashboard, but sees the old point total.
**Why it happens:** Next.js App Router caches Server Component renders. Without explicit cache invalidation, the dashboard shows stale data.
**How to avoid:** D-24 specifies `router.refresh()` after navigation. The correct sequence is: `router.push('/kind/dashboard')` then `router.refresh()`. Note: `router.refresh()` re-fetches the Server Component data without a full page reload. [VERIFIED: Next.js docs on router.refresh()]
**Warning signs:** Points don't update until page hard-refresh (Ctrl+R).

### Pitfall 4: Number Pad Answer Overflow

**What goes wrong:** A child types "99999999" as an answer, which exceeds any valid exercise result.
**Why it happens:** No limit on digit entry, curious children press buttons randomly.
**How to avoid:** Limit the answer buffer to a reasonable number of digits (4-5 digits max covers all Grade 4 hard exercises where max result is ~1000*10=10000). Ignore digit presses when limit reached.
**Warning signs:** Layout breaks with very long numbers, or `parseInt` returns unexpected values.

### Pitfall 5: Touch Target Size on Small Phones

**What goes wrong:** Children can't accurately tap the right number button on a small phone screen.
**Why it happens:** 12 buttons in a grid on a 320px-wide screen makes each button ~90px including gaps, which is fine. But if padding is wrong or the grid is inside a container with side padding, buttons shrink below 48px.
**How to avoid:** Use `max-w-xs` (320px) for the number pad grid and ensure no parent container adds excessive horizontal padding. Test at 375px viewport width (iPhone SE).
**Warning signs:** Misclicks on adjacent buttons, children get frustrated.

### Pitfall 6: Feedback Timer Not Cleared on Unmount

**What goes wrong:** `setTimeout` for auto-advancing to next exercise fires after the component unmounts (child clicks "Beenden" during feedback), causing a React state update on unmounted component.
**Why it happens:** `setTimeout` is not automatically cleaned up.
**How to avoid:** Store the timeout ID in a ref and clear it in a cleanup function or when "Beenden" is clicked.
**Warning signs:** React console warning about state updates on unmounted component.

## Code Examples

### Dashboard Page (Server Component)

```typescript
// Source: Project codebase pattern + Supabase aggregate docs
// app/(child)/kind/dashboard/page.tsx

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButtonChild } from "@/components/child/logout-button";

export const metadata: Metadata = {
  title: "Matheapp — Startseite",
};

const MINIGAME_THRESHOLD = 500;

export default async function KindDashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, grade_level, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "child") redirect("/login");

  // Aggregate query for dashboard stats
  const { data: stats } = await supabase
    .from("progress_entries")
    .select("points_earned.sum(), id.count()")
    .eq("child_id", user.id)
    .single();

  const totalPoints = stats?.sum ?? 0;
  const exerciseCount = stats?.count ?? 0;
  const progress = Math.min((totalPoints / MINIGAME_THRESHOLD) * 100, 100);

  return (
    <main className="min-h-dvh bg-white p-6 flex flex-col gap-6">
      {/* Header */}
      <h1 className="text-4xl font-semibold text-slate-900">
        Hallo, {profile.display_name}!
      </h1>

      {/* Grade badge */}
      <p className="text-2xl text-blue-600 font-semibold">
        Klasse {profile.grade_level}
      </p>

      {/* Points + exercise count */}
      <div className="bg-yellow-50 rounded-2xl p-6">
        <p className="text-3xl font-semibold text-slate-900">
          {totalPoints} Punkte
        </p>
        <p className="text-xl text-slate-600 mt-1">
          {exerciseCount} Aufgaben geloest
        </p>
      </div>

      {/* Progress bar toward mini-game */}
      <div className="bg-slate-50 rounded-2xl p-6">
        <p className="text-xl font-semibold text-slate-700 mb-2">
          {totalPoints}/{MINIGAME_THRESHOLD} Punkte bis zum Spiel
        </p>
        <div className="w-full h-6 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Primary CTA */}
      <Link
        href="/kind/ueben"
        className="h-16 flex items-center justify-center rounded-2xl bg-green-500 text-white text-3xl font-semibold hover:bg-green-600 focus:ring-4 focus:ring-green-300 focus:ring-offset-2 focus:outline-none"
      >
        Aufgaben starten
      </Link>

      <div className="mt-auto">
        <LogoutButtonChild />
      </div>
    </main>
  );
}
```

### Exercise Session Page (Client Component Wrapper)

```typescript
// app/(child)/kind/ueben/page.tsx
// Thin wrapper: Server Component loads grade, Client Component handles session

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExerciseSession } from "@/components/child/exercise-session";

export default async function UebenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("grade_level")
    .eq("user_id", user.id)
    .single();

  if (!profile?.grade_level) redirect("/kind/dashboard");

  return <ExerciseSession grade={profile.grade_level} />;
}
```

### Tailwind v4 Custom Colors (in globals.css @theme)

```css
/* Source: Tailwind CSS v4 @theme docs (https://tailwindcss.com/docs/theme) */
/* Add to existing globals.css @theme block */

@theme inline {
  /* Existing vars... */
  --color-child-yellow: #FFC107;
  --color-child-green: #4CAF50;
  --color-child-red: #F44336;
  --color-child-blue: #2196F3;
}
```

This enables `bg-child-yellow`, `text-child-green`, etc. as utility classes. [VERIFIED: Tailwind CSS v4 @theme documentation]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `router.refresh()` from `next/navigation` | `refresh()` from `next/cache` (Server Actions only) | Next.js 15.1+ | Both still valid. `router.refresh()` is for Client Components, `refresh()` from `next/cache` is for Server Actions. D-24 uses the client-side version which is correct. |
| `useEffect` + fetch for data mutations | `useTransition` + Server Actions | React 19 / Next.js 15 | Wrap server action calls in `startTransition` to get `isPending` for loading states without blocking the UI |
| `getSession()` for auth in middleware | `getClaims()` | Supabase SSR 0.10+ | Already adopted in Phase 10 middleware |

**Deprecated/outdated:**
- `getSession()` for middleware auth -- use `getClaims()` per project convention (Phase 10 decision)
- JavaScript `tailwind.config.js` -- Tailwind v4 uses CSS `@theme` directive

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | MINIGAME_THRESHOLD = 500 points | Code Examples, Pattern 5 | Low risk -- CONTEXT D-03 uses "500" as example. The exact value is tunable; making it a constant allows Phase 40 to adjust. |
| A2 | Supabase aggregate `.sum()` works with the current project's PostgREST config | Pattern 1, Pitfall 1 | Medium risk -- aggregate functions may need `pgrst.db_aggregates_enabled = true` on the Supabase project. Fallback: use a simple `.select('points_earned')` and sum in JS, or use an RPC function. |
| A3 | Answer buffer limit of 4-5 digits covers all valid exercise results | Pitfall 4 | Low risk -- Grade 4 hard max is 1000, so max result from multiplication is 1000*1000=1000000 (unlikely given range config). 5 digits (99999) is more than sufficient. |
| A4 | `router.push()` followed by `router.refresh()` produces the correct behavior | Pattern 2, Pitfall 3 | Low risk -- this is documented Next.js behavior. Refresh re-fetches Server Component data. [VERIFIED: Next.js docs] |

## Open Questions

1. **Mini-game threshold constant value**
   - What we know: D-03 mentions "150/500 Punkte bis zum Spiel" as an example
   - What's unclear: Is 500 the confirmed threshold, or should it be different?
   - Recommendation: Use 500 as a named constant `MINIGAME_THRESHOLD` in a shared config file. Phase 40 can adjust it. Planner should define this constant in a shared location (e.g., `lib/exercises/config.ts` or a new `lib/config/rewards.ts`).

2. **Supabase aggregate function availability**
   - What we know: Supabase PostgREST supports `.sum()`, `.count()` in select queries
   - What's unclear: Whether the Supabase Cloud project has aggregates enabled by default
   - Recommendation: Try the aggregate query first. If it fails with a parsing error, run `ALTER ROLE authenticator SET pgrst.db_aggregates_enabled = 'true'; NOTIFY pgrst, 'reload config';` via Supabase SQL editor. Fallback: use a simple select + JS reduce.

3. **Animation for "+X Punkte" after correct answer**
   - What we know: D-12 mentions "Punkteanimation"
   - What's unclear: Exact animation style (bounce, scale up, float up, etc.)
   - Recommendation: Claude's Discretion per CONTEXT. Use CSS `@keyframes` for a simple scale-up + fade effect. No library needed.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified). This phase is purely code/config changes using existing project infrastructure.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.ts` (jsdom environment, @testing-library/jest-dom setup) |
| Quick run command | `npm run test` (vitest run) |
| Full suite command | `npm run test:all` (vitest run && playwright test) |
| E2E framework | Playwright 1.59.1 (tests/e2e/) |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-01 | Dashboard shows points total, progress bar, grade level | E2E | `npx playwright test tests/e2e/child-dashboard.spec.ts` | Wave 0 |
| SC-02 | Child starts exercise session, answers with number pad | E2E | `npx playwright test tests/e2e/exercise-session.spec.ts` | Wave 0 |
| SC-03 | Correct answer: green flash + points message | E2E | `npx playwright test tests/e2e/exercise-session.spec.ts` | Wave 0 |
| SC-04 | Dashboard reflects updated points after session | E2E | `npx playwright test tests/e2e/child-dashboard.spec.ts` | Wave 0 |
| SC-05 | UI uses large text, bold colors, touch targets 48px+ | Manual | Visual inspection | N/A (manual) |
| UNIT-01 | Number pad digit/delete/confirm handlers | Unit | `npx vitest run tests/unit/number-pad.test.tsx` | Wave 0 |
| UNIT-02 | Progress bar renders correct percentage | Unit | `npx vitest run tests/unit/progress-bar.test.tsx` | Wave 0 |
| UNIT-03 | Feedback overlay shows correct/incorrect messages | Unit | `npx vitest run tests/unit/feedback-overlay.test.tsx` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test:all`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/number-pad.test.tsx` -- NumberPad component unit tests
- [ ] `tests/unit/progress-bar.test.tsx` -- ProgressBar rendering tests
- [ ] `tests/unit/feedback-overlay.test.tsx` -- FeedbackOverlay component tests
- [ ] `tests/e2e/child-dashboard.spec.ts` -- Dashboard data display E2E
- [ ] `tests/e2e/exercise-session.spec.ts` -- Exercise session flow E2E

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (existing) | Supabase auth + middleware session check (Phase 10) |
| V3 Session Management | Yes (existing) | Cookie-based sessions via @supabase/ssr (Phase 10) |
| V4 Access Control | Yes | RLS on progress_entries ensures child can only read own data; middleware prevents cross-role access |
| V5 Input Validation | Yes | Number pad limits input to digits 0-9; parseInt validates before server action call; Zod schemas validate on server |
| V6 Cryptography | No | No crypto operations in this phase |

### Known Threat Patterns for Next.js + Supabase child dashboard

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Points manipulation via direct API calls | Tampering | Server-side answer validation (Phase 20); RLS prevents cross-child writes |
| Session hijacking to view other child's dashboard | Spoofing | Supabase auth cookies + RLS `child_id = auth.uid()` |
| Excessive rapid submissions (brute-force points farming) | Elevation of Privilege | Client-side submit button disable during pending; server-side rate limiting is a Phase 40+ concern |
| XSS via display_name injection in dashboard | Tampering | React auto-escapes JSX text content; display_name is server-rendered |

## Sources

### Primary (HIGH confidence)
- Project codebase: `app/(child)/kind/dashboard/page.tsx` -- existing stub dashboard
- Project codebase: `app/(child)/kind/ueben/actions.ts` -- existing Server Actions
- Project codebase: `lib/exercises/types.ts` -- Exercise/ClientExercise/SubmitAnswerResult types
- Project codebase: `lib/exercises/points.ts` -- Points calculation (BASE_POINTS=10, multiplier by difficulty)
- Project codebase: `lib/exercises/difficulty.ts` -- Difficulty transitions (3 correct = promote, 2 wrong = demote)
- Project codebase: `types/database.types.ts` -- Database type definitions (progress_entries schema)
- Context7: `/websites/nextjs` -- Server Actions, router.refresh(), useTransition patterns
- Next.js docs: `https://nextjs.org/docs/app/api-reference/functions/use-router` -- router.refresh() behavior

### Secondary (MEDIUM confidence)
- Supabase blog: `https://supabase.com/blog/postgrest-aggregate-functions` -- aggregate function syntax (.sum(), .count())
- Tailwind CSS docs: `https://tailwindcss.com/docs/theme` -- @theme custom color configuration in v4

### Tertiary (LOW confidence)
- None. All critical claims verified through project codebase or official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies; everything already installed and verified in node_modules
- Architecture: HIGH -- patterns directly derived from existing codebase (Phase 10/20 established Server Component + Server Action patterns)
- Pitfalls: HIGH -- informed by existing exercise-actions.test.ts patterns, known React lifecycle issues with setTimeout, and confirmed Supabase aggregate null behavior

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (stable -- no fast-moving dependencies)
