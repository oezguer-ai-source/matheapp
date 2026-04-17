# Phase 20: Exercise Engine - Research

**Researched:** 2026-04-17
**Domain:** Server-side math exercise generation, answer validation, difficulty progression
**Confidence:** HIGH

## Summary

Phase 20 implements a pure-function exercise generation engine and Server Action API layer for grade-appropriate math exercises (Klasse 1-4). The core architecture separates concerns cleanly: pure generator functions in `lib/exercises/` (no Supabase dependency, trivially unit-testable) and two Server Actions in `app/(child)/kind/ueben/actions.ts` that handle auth, Supabase writes, and difficulty state.

The exercise domain is straightforward arithmetic with well-defined constraints (no negative results, no remainders in division, grade-specific number ranges). The main engineering challenge is not the math itself but the correct handling of difficulty progression state (session-based, computed from streak data sent by the client) and ensuring answer validation is tamper-proof (the correct answer must never be sent to the client before submission).

**Primary recommendation:** Build the exercise generators as pure functions with comprehensive unit tests covering every grade/difficulty/operator combination, then wrap them in two Server Actions (`generateExercise`, `submitAnswer`) that handle auth verification, Supabase progress writes, and difficulty transition logic.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use Next.js Server Actions for exercise generation and answer validation -- consistent with Phase 10 auth pattern, no separate API routes needed
- **D-02:** Exercise generation is a set of pure functions in `lib/exercises/` -- easy to unit test, no Supabase dependency in generation logic
- **D-03:** Each exercise is generated on-demand (one at a time per request) -- no batch pre-generation, keeps state minimal
- **D-04:** Exercise shape: `{ id: string, operand1: number, operand2: number, operator: '+' | '-' | '*' | '/', correctAnswer: number }` -- ID is a UUID for tracking
- **D-05:** Klasse 1: Addition und Subtraktion im Zahlenraum bis 20
- **D-06:** Klasse 2: Addition und Subtraktion im Zahlenraum bis 100
- **D-07:** Klasse 3: Multiplikation und Division (kleines Einmaleins, Zahlen 1-10)
- **D-08:** Klasse 4: Gemischte Operationen (+, -, *, /), Zahlenraum bis 1000
- **D-09:** Division results are always whole numbers (no remainders) -- age-appropriate
- **D-10:** Subtraction results are always >= 0 (no negative numbers)
- **D-11:** 3 Schwierigkeitsstufen: leicht, mittel, schwer
- **D-12:** Leicht: kleinerer Zahlenraum innerhalb der Klassenstufe (z.B. Kl.1: bis 10, Kl.2: bis 50)
- **D-13:** Mittel: voller Zahlenraum der Klassenstufe
- **D-14:** Schwer: oberer Bereich des Zahlenraums + gemischte Operationen wo moeglich
- **D-15:** Aufstieg: 3 richtige Antworten in Folge -> naechste Stufe
- **D-16:** Abstieg: 2 falsche Antworten in Folge -> vorherige Stufe (nicht unter leicht)
- **D-17:** Schwierigkeitsstufe ist session-basiert (wird nicht in DB gespeichert, resettet bei neuem Start)
- **D-18:** Basispunkte pro richtige Antwort: 10
- **D-19:** Schwierigkeitsmultiplikator: leicht = 1x (10 Pkt), mittel = 2x (20 Pkt), schwer = 3x (30 Pkt)
- **D-20:** Falsche Antworten: 0 Punkte (kein Punkteabzug)
- **D-21:** Punkte werden in `progress_entries.points_earned` gespeichert
- **D-22:** Server Action `generateExercise(grade: number, difficulty: 'easy' | 'medium' | 'hard')` -> returns Exercise object
- **D-23:** Server Action `submitAnswer(exerciseId: string, answer: number)` -> returns `{ correct: boolean, correctAnswer: number, pointsEarned: number, newDifficulty: string }`
- **D-24:** submitAnswer schreibt immer einen `progress_entry` Record (richtig oder falsch)
- **D-25:** submitAnswer berechnet die neue Schwierigkeitsstufe basierend auf der Streak (Client sendet currentDifficulty + streak mit)

### Claude's Discretion
- Exact number ranges per difficulty tier within each grade
- Exercise ID generation strategy (UUID v4 or similar)
- Whether to use a separate exercises module or inline in actions
- Error handling for invalid grades or missing auth
- Test strategy (unit tests for generators, integration for Server Actions)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-02 | Mathe-Aufgaben nach Klassenstufe (1-4) mit Grundrechenarten | Generator functions per grade with difficulty tiers; curriculum rules D-05 through D-10 define exact operator/range constraints; Server Actions provide the API surface |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Exercise generation (math logic) | API / Backend (pure functions) | -- | Math generation must be server-side to prevent cheating; pure functions have no DB dependency |
| Answer validation | API / Backend (Server Action) | -- | D-23: server determines correctness, client never sees correct answer until submission |
| Difficulty progression | API / Backend (Server Action) | Frontend Client (state tracking) | Server computes new difficulty from streak; client tracks and sends current streak (D-17, D-25) |
| Progress recording | API / Backend + Database | -- | Every answer writes a progress_entries row via Supabase RLS (D-24) |
| Point calculation | API / Backend (Server Action) | -- | Points computed server-side based on difficulty multiplier (D-18, D-19) |
| Exercise ID generation | API / Backend | -- | UUID generated server-side for tracking (D-04) |

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.2.9 (installed) | Server Actions for API layer | Locked decision D-01; established project pattern [VERIFIED: package.json] |
| @supabase/ssr | 0.10.2 (installed) | Server-side Supabase client | Cookie-based auth sessions; used in Phase 10 [VERIFIED: package.json] |
| @supabase/supabase-js | 2.103.3 (installed) | Database operations | Progress entry writes via typed client [VERIFIED: package.json] |
| zod | 4.3.6 (installed) | Input validation for Server Actions | Established project pattern from Phase 10 auth schemas [VERIFIED: package.json] |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 2.1.9 (installed) | Unit testing for generator functions | All pure function tests [VERIFIED: package.json] |
| @playwright/test | 1.59.1 (installed) | E2E testing | Exercise flow E2E (Phase 30 scope) [VERIFIED: package.json] |

### No New Dependencies Required

This phase requires **zero** new npm packages. All functionality is achievable with:
- Built-in `crypto.randomUUID()` for exercise IDs [VERIFIED: Node.js runtime test]
- Built-in `Math.random()` and `Math.floor()` for number generation
- Existing Zod v4 for input validation schemas
- Existing Supabase client for database writes
- Existing Vitest for unit/integration tests

## Architecture Patterns

### System Architecture Diagram

```
Client (Phase 30 -- future)
  |
  |  Server Action call: generateExercise(grade, difficulty)
  v
Server Action (app/(child)/kind/ueben/actions.ts)
  |
  |  1. Validate input (Zod)
  |  2. Verify auth (supabase.auth.getUser)
  |  3. Get child's grade from profile
  |
  v
Pure Generator (lib/exercises/generators.ts)
  |
  |  Select operator for grade
  |  Generate operands in difficulty range
  |  Compute correct answer
  |  Ensure constraints (no negatives, no remainders)
  |  Assign UUID
  |
  v
Return Exercise to Client (WITHOUT correctAnswer exposed)
  |
  ============================================
  |
Client submits answer
  |
  |  Server Action call: submitAnswer(exerciseId, answer, currentDifficulty, streak)
  v
Server Action (actions.ts)
  |
  |  1. Validate input (Zod)
  |  2. Verify auth (supabase.auth.getUser)
  |  3. Re-generate exercise from exerciseId seed OR lookup stored answer
  |  4. Compare answer
  |  5. Calculate points (difficulty multiplier)
  |  6. Compute new difficulty from streak
  |  7. Write progress_entry to Supabase
  |
  v
Return { correct, correctAnswer, pointsEarned, newDifficulty }
```

### Recommended Project Structure
```
lib/
  exercises/
    generators.ts       # Pure functions: generateForGrade1..4
    types.ts            # Exercise, Difficulty, OperationType types
    config.ts           # Number ranges per grade/difficulty
    difficulty.ts       # Difficulty transition logic
    points.ts           # Point calculation
  schemas/
    auth.ts             # (existing)
    exercise.ts         # Zod schemas for exercise actions

app/
  (child)/
    kind/
      ueben/
        actions.ts      # Server Actions: generateExercise, submitAnswer

tests/
  unit/
    exercise-generators.test.ts    # Pure function tests
    exercise-difficulty.test.ts    # Difficulty transition tests
    exercise-points.test.ts        # Point calculation tests
    exercise-schemas.test.ts       # Zod schema tests
  integration/
    exercise-actions.test.ts       # Server Action integration tests
```

### Pattern 1: Pure Exercise Generator Functions
**What:** Stateless functions that take (grade, difficulty) and return an Exercise object
**When to use:** All exercise generation; keeps math logic isolated from framework concerns
**Example:**
```typescript
// Source: project convention from CONTEXT.md D-02
// lib/exercises/generators.ts
import { type Exercise, type Difficulty, type OperationType } from './types';
import { RANGES } from './config';

export function generateExercise(
  grade: number,
  difficulty: Difficulty
): Exercise {
  const config = RANGES[grade][difficulty];
  const operator = pickOperator(grade, difficulty);
  const { operand1, operand2 } = generateOperands(operator, config);
  const correctAnswer = compute(operand1, operand2, operator);

  return {
    id: crypto.randomUUID(),
    operand1,
    operand2,
    operator,
    correctAnswer,
  };
}
```

### Pattern 2: Server Action with Auth Guard
**What:** Server Action that verifies auth before processing, following Phase 10 pattern
**When to use:** Both generateExercise and submitAnswer actions
**Example:**
```typescript
// Source: established Phase 10 pattern (app/login/actions.ts) + Next.js docs
// app/(child)/kind/ueben/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { generateExercise as generate } from "@/lib/exercises/generators";
import { generateExerciseSchema } from "@/lib/schemas/exercise";

export async function generateExercise(
  grade: number,
  difficulty: 'easy' | 'medium' | 'hard'
) {
  const parsed = generateExerciseSchema.safeParse({ grade, difficulty });
  if (!parsed.success) {
    return { error: "Ungueltige Eingabe." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Nicht angemeldet." };
  }

  const exercise = generate(parsed.data.grade, parsed.data.difficulty);

  // Return exercise WITHOUT correctAnswer to prevent cheating
  return {
    data: {
      id: exercise.id,
      operand1: exercise.operand1,
      operand2: exercise.operand2,
      operator: exercise.operator,
    }
  };
}
```

### Pattern 3: Secure Answer Validation (correctAnswer Never Sent to Client)
**What:** The Server Action generates the exercise and stores/re-derives the answer server-side
**When to use:** submitAnswer -- the critical security pattern for this phase

**Architecture decision -- Exercise answer storage strategy:**

Since exercises are generated on-demand (D-03) and the client receives them without the `correctAnswer` field, the server needs a way to know the correct answer when the client submits. There are three approaches:

1. **Deterministic re-generation from exercise ID as seed** -- Use the exercise UUID to seed a PRNG, re-generate the same exercise on submit. Complex, fragile.
2. **Server-side in-memory cache** -- Store generated exercises temporarily in memory. Lost on server restart, doesn't scale across serverless instances.
3. **Client sends exercise data back, server re-computes** -- Client sends (operand1, operand2, operator) along with their answer. Server re-computes the correct answer from these operands. Simple, stateless, tamper-proof because the server recomputes.

**Recommendation: Approach 3.** The client already has operand1, operand2, and operator (displayed in the UI). On submit, the client sends these values back alongside the user's answer. The server re-computes `correctAnswer = compute(operand1, operand2, operator)` and compares. Even if a client tampers with operands, they only hurt their own score -- the server always computes the truth from what was submitted.

This means the `submitAnswer` signature adjusts slightly from D-23:
```typescript
// Adjusted submitAnswer -- client sends exercise details for stateless validation
export async function submitAnswer(
  exerciseId: string,
  operand1: number,
  operand2: number,
  operator: '+' | '-' | '*' | '/',
  userAnswer: number,
  currentDifficulty: 'easy' | 'medium' | 'hard',
  correctStreak: number,
  incorrectStreak: number
): Promise<SubmitAnswerResult>
```

**Why this is safe:** The worst a tampered client can do is submit `2 + 2 = 4` instead of the harder exercise they were actually shown. They'd get the easy-difficulty points (10 pts) for a trivially correct answer. Since points are just a game mechanic for children (not currency), this is an acceptable trade-off vs. the complexity of server-side exercise storage.

### Pattern 4: Division Without Remainders
**What:** Generate division exercises by starting from the answer
**When to use:** All division exercise generation (D-09)
**Example:**
```typescript
// Generate division that always produces whole numbers
function generateDivision(min: number, max: number): { operand1: number; operand2: number } {
  // Pick the divisor first (2-10 for Einmaleins)
  const divisor = randomInt(2, Math.min(max, 10));
  // Pick a quotient in range
  const maxQuotient = Math.floor(max / divisor);
  const quotient = randomInt(1, maxQuotient);
  // operand1 (dividend) = quotient * divisor -- guarantees no remainder
  return { operand1: quotient * divisor, operand2: divisor };
}
```

### Pattern 5: Subtraction Without Negatives
**What:** Ensure operand1 >= operand2 for subtraction
**When to use:** All subtraction exercise generation (D-10)
**Example:**
```typescript
// Generate subtraction that never produces negative results
function generateSubtraction(min: number, max: number): { operand1: number; operand2: number } {
  let a = randomInt(min, max);
  let b = randomInt(min, max);
  // Ensure a >= b so result >= 0
  if (a < b) [a, b] = [b, a];
  return { operand1: a, operand2: b };
}
```

### Anti-Patterns to Avoid
- **Sending correctAnswer to client:** Never include the correct answer in the generateExercise response. The client should only see operand1, operand2, and operator.
- **Trusting client-computed correctness:** The server must determine if the answer is correct, not the client. The client sends the raw answer.
- **Storing difficulty in the database:** Per D-17, difficulty is session-based. Don't persist it -- the client tracks it and sends it with each request.
- **Using Math.random() for cryptographic purposes:** `Math.random()` is fine for exercise generation (not security-sensitive), but use `crypto.randomUUID()` for exercise IDs.
- **Generating exercises with edge cases:** Avoid generating `0 / X` or `X / 0`. Always ensure divisors are >= 2 and dividends produce meaningful results.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID scheme | `crypto.randomUUID()` | Built-in, RFC 4122 compliant, zero dependencies [VERIFIED: Node.js runtime] |
| Input validation | Manual type checks | Zod v4 schemas | Already used project-wide (Phase 10), type-safe, composable [VERIFIED: lib/schemas/auth.ts] |
| Auth verification | Custom JWT parsing | `supabase.auth.getUser()` | Validates token against Supabase server, handles expiry [CITED: supabase.com/docs/reference/javascript/auth-admin-oauth-listgrants] |
| Random integer in range | Custom math | Helper function `randomInt(min, max)` | Simple but easy to get off-by-one errors; write once, test once, reuse |

**Key insight:** This phase is almost entirely custom application logic (exercise generation rules) with minimal library surface area. The "don't hand-roll" items are limited to infrastructure concerns (IDs, validation, auth).

## Common Pitfalls

### Pitfall 1: Off-By-One in Number Ranges
**What goes wrong:** `Math.random() * max` can produce 0 when you need >= 1, or miss the upper bound
**Why it happens:** `Math.floor(Math.random() * N)` produces [0, N-1], not [1, N]
**How to avoid:** Write a `randomInt(min, max)` helper that is inclusive on both ends: `Math.floor(Math.random() * (max - min + 1)) + min`. Test it with boundary values.
**Warning signs:** Exercises showing "0 + 0" or never reaching the upper bound

### Pitfall 2: Division by Zero
**What goes wrong:** Generator produces `X / 0` or `0 / 0`
**Why it happens:** If the divisor range includes 0
**How to avoid:** Always constrain divisors to >= 2 (for Einmaleins: 1-10, but 1 is trivial, so 2-10 is better). Validate in unit tests.
**Warning signs:** Runtime NaN or Infinity in exercise answers

### Pitfall 3: correctAnswer Leaking to Client
**What goes wrong:** Client receives the full Exercise object including correctAnswer, enabling cheating
**Why it happens:** Server Action returns the full internal object without stripping fields
**How to avoid:** Define a separate `ClientExercise` type that omits `correctAnswer`. The Server Action explicitly constructs this type before returning.
**Warning signs:** Network tab in browser devtools shows correctAnswer in the response

### Pitfall 4: Difficulty Streak Desync
**What goes wrong:** Client and server disagree on the current streak, causing unexpected difficulty jumps
**Why it happens:** Client tracks streak in local state, but network errors or race conditions can cause missed updates
**How to avoid:** The server should treat the client-provided streak as authoritative (D-25 says "Client sendet currentDifficulty + streak mit"). The server computes the NEW difficulty and returns it. The client replaces its local state with the server's response.
**Warning signs:** Difficulty jumping erratically or never advancing

### Pitfall 5: Missing Auth Check in Server Action
**What goes wrong:** Unauthenticated users can generate exercises or submit answers
**Why it happens:** Server Actions are callable via POST request even without a valid session [CITED: Next.js docs on Server Actions security]
**How to avoid:** Always call `supabase.auth.getUser()` at the top of every Server Action and return an error if no user is found. This is the established Phase 10 pattern.
**Warning signs:** 500 errors when unauthenticated, or worse -- silent success

### Pitfall 6: Klasse 4 Division Range Exceeds Einmaleins
**What goes wrong:** Klasse 4 uses "Zahlenraum bis 1000" but division of large numbers may not produce whole-number results easily
**Why it happens:** Random large dividends rarely divide evenly
**How to avoid:** For Klasse 4 division, use the "answer-first" approach: pick quotient and divisor, then compute dividend. Keep divisors in reasonable range (2-20 for Klasse 4).
**Warning signs:** Generator loops forever trying to find a valid division, or extremely rare division exercises in Klasse 4

### Pitfall 7: Server Action Return Type Must Be Serializable
**What goes wrong:** Returning non-serializable values from Server Actions causes runtime errors
**Why it happens:** Server Actions serialize return values for the network boundary
**How to avoid:** Only return plain objects with primitive values (string, number, boolean). The Exercise and SubmitAnswerResult types naturally fit this constraint. [CITED: Next.js docs on Server Actions]
**Warning signs:** "Error: Objects are not valid as a React child" or serialization errors

## Code Examples

### Exercise Type Definitions
```typescript
// lib/exercises/types.ts
// Source: CONTEXT.md D-04, D-11

export type OperationType = 'addition' | 'subtraktion' | 'multiplikation' | 'division';
export type Operator = '+' | '-' | '*' | '/';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Grade = 1 | 2 | 3 | 4;

export interface Exercise {
  id: string;
  operand1: number;
  operand2: number;
  operator: Operator;
  correctAnswer: number;
}

// What the client receives (correctAnswer stripped)
export interface ClientExercise {
  id: string;
  operand1: number;
  operand2: number;
  operator: Operator;
}

export interface SubmitAnswerResult {
  correct: boolean;
  correctAnswer: number;
  pointsEarned: number;
  newDifficulty: Difficulty;
}

// Maps operator symbol to DB operation_type string
export const OPERATOR_TO_TYPE: Record<Operator, OperationType> = {
  '+': 'addition',
  '-': 'subtraktion',
  '*': 'multiplikation',
  '/': 'division',
};
```

### Number Range Configuration
```typescript
// lib/exercises/config.ts
// Source: CONTEXT.md D-05 through D-14

export interface RangeConfig {
  min: number;
  max: number;
  operators: Operator[];
}

export const RANGES: Record<Grade, Record<Difficulty, RangeConfig>> = {
  1: {
    easy:   { min: 1, max: 10, operators: ['+', '-'] },
    medium: { min: 1, max: 20, operators: ['+', '-'] },
    hard:   { min: 5, max: 20, operators: ['+', '-'] },
  },
  2: {
    easy:   { min: 1, max: 50, operators: ['+', '-'] },
    medium: { min: 1, max: 100, operators: ['+', '-'] },
    hard:   { min: 20, max: 100, operators: ['+', '-'] },
  },
  3: {
    easy:   { min: 1, max: 5, operators: ['*', '/'] },
    medium: { min: 1, max: 10, operators: ['*', '/'] },
    hard:   { min: 2, max: 10, operators: ['*', '/'] },
  },
  4: {
    easy:   { min: 1, max: 100, operators: ['+', '-', '*', '/'] },
    medium: { min: 1, max: 500, operators: ['+', '-', '*', '/'] },
    hard:   { min: 50, max: 1000, operators: ['+', '-', '*', '/'] },
  },
};
```

### Difficulty Transition Logic
```typescript
// lib/exercises/difficulty.ts
// Source: CONTEXT.md D-15, D-16

import { type Difficulty } from './types';

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];
const PROMOTE_THRESHOLD = 3;  // consecutive correct to advance
const DEMOTE_THRESHOLD = 2;   // consecutive incorrect to regress

export function computeNewDifficulty(
  currentDifficulty: Difficulty,
  correctStreak: number,
  incorrectStreak: number
): Difficulty {
  const currentIndex = DIFFICULTY_ORDER.indexOf(currentDifficulty);

  if (correctStreak >= PROMOTE_THRESHOLD && currentIndex < DIFFICULTY_ORDER.length - 1) {
    return DIFFICULTY_ORDER[currentIndex + 1];
  }

  if (incorrectStreak >= DEMOTE_THRESHOLD && currentIndex > 0) {
    return DIFFICULTY_ORDER[currentIndex - 1];
  }

  return currentDifficulty;
}
```

### Point Calculation
```typescript
// lib/exercises/points.ts
// Source: CONTEXT.md D-18, D-19, D-20

import { type Difficulty } from './types';

const BASE_POINTS = 10;
const MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export function calculatePoints(correct: boolean, difficulty: Difficulty): number {
  if (!correct) return 0; // D-20
  return BASE_POINTS * MULTIPLIER[difficulty];
}
```

### Zod Validation Schemas
```typescript
// lib/schemas/exercise.ts
// Source: project convention from lib/schemas/auth.ts

import { z } from "zod";

export const generateExerciseSchema = z.object({
  grade: z.number().int().min(1).max(4),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export const submitAnswerSchema = z.object({
  exerciseId: z.string().uuid(),
  operand1: z.number().int(),
  operand2: z.number().int().min(1), // divisor must be >= 1
  operator: z.enum(['+', '-', '*', '/']),
  userAnswer: z.number().int(),
  currentDifficulty: z.enum(['easy', 'medium', 'hard']),
  correctStreak: z.number().int().min(0),
  incorrectStreak: z.number().int().min(0),
});

export type GenerateExerciseInput = z.infer<typeof generateExerciseSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
```

### Server Action: submitAnswer
```typescript
// app/(child)/kind/ueben/actions.ts (excerpt)
// Source: Phase 10 pattern + CONTEXT.md D-23, D-24

"use server";

import { createClient } from "@/lib/supabase/server";
import { submitAnswerSchema } from "@/lib/schemas/exercise";
import { calculatePoints } from "@/lib/exercises/points";
import { computeNewDifficulty } from "@/lib/exercises/difficulty";
import { compute, OPERATOR_TO_TYPE } from "@/lib/exercises/generators";

export async function submitAnswer(input: {
  exerciseId: string;
  operand1: number;
  operand2: number;
  operator: '+' | '-' | '*' | '/';
  userAnswer: number;
  currentDifficulty: 'easy' | 'medium' | 'hard';
  correctStreak: number;
  incorrectStreak: number;
}) {
  const parsed = submitAnswerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Ungueltige Eingabe." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Nicht angemeldet." };
  }

  // Get child's grade from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("grade_level")
    .eq("user_id", user.id)
    .single();

  if (!profile?.grade_level) {
    return { error: "Kein Profil gefunden." };
  }

  const { operand1, operand2, operator, userAnswer,
          currentDifficulty, correctStreak, incorrectStreak } = parsed.data;

  // Server re-computes the correct answer (Pattern 3)
  const correctAnswer = compute(operand1, operand2, operator);
  const correct = userAnswer === correctAnswer;

  const pointsEarned = calculatePoints(correct, currentDifficulty);

  // Compute new streaks
  const newCorrectStreak = correct ? correctStreak + 1 : 0;
  const newIncorrectStreak = correct ? 0 : incorrectStreak + 1;

  const newDifficulty = computeNewDifficulty(
    currentDifficulty,
    newCorrectStreak,
    newIncorrectStreak
  );

  // Write progress_entry (D-24: always, correct or incorrect)
  await supabase.from("progress_entries").insert({
    child_id: user.id,
    operation_type: OPERATOR_TO_TYPE[operator],
    grade: profile.grade_level,
    correct,
    points_earned: pointsEarned,
  });

  return {
    data: {
      correct,
      correctAnswer,
      pointsEarned,
      newDifficulty,
      newCorrectStreak,
      newIncorrectStreak,
    },
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API Routes for mutations | Server Actions via `"use server"` | Next.js 14+ (stable) | Simpler code, automatic form integration, established in this project [VERIFIED: project codebase] |
| `getSession()` for auth checks | `getUser()` (server) or `getClaims()` (middleware) | Supabase SSR best practices | getUser() validates JWT against server; getSession() trusts local token [VERIFIED: Phase 10 RESEARCH decision] |
| Zod v3 | Zod v4 | 2025 | Project uses v4 with transform+pipe pattern [VERIFIED: package.json, lib/schemas/auth.ts] |

**Deprecated/outdated:**
- `getSession()` for server-side auth verification -- use `getUser()` [VERIFIED: Phase 10 middleware decision]
- API Route handlers for mutations -- use Server Actions [VERIFIED: project convention]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Klasse 1 easy range 1-10, medium 1-20, hard 5-20 | Code Examples / config.ts | Wrong difficulty feel for children; easily adjustable via config constant |
| A2 | Klasse 2 easy range 1-50, medium 1-100, hard 20-100 | Code Examples / config.ts | Same as A1; adjustable |
| A3 | Klasse 3 easy range 1-5, medium 1-10, hard 2-10 | Code Examples / config.ts | Same as A1; adjustable |
| A4 | Klasse 4 easy range 1-100, medium 1-500, hard 50-1000 | Code Examples / config.ts | Same as A1; Klasse 4 division with large numbers needs answer-first generation |
| A5 | Klasse 4 division divisors capped at 20 | Pitfall 6 | May need adjustment for curriculum alignment |
| A6 | Client sends exercise operands back for stateless validation (Pattern 3) | Architecture Patterns | Minor cheat vector (trivial exercises) vs. significant complexity reduction; acceptable for children's app |
| A7 | Server Action file at `app/(child)/kind/ueben/actions.ts` | Project Structure | Route path follows German convention from Phase 10; "ueben" is "ueben" (practice) |

**Note on A1-A5:** CONTEXT.md D-12/D-13/D-14 give qualitative descriptions ("kleinerer Zahlenraum", "voller Zahlenraum", "oberer Bereich") but the exact numbers are Claude's discretion. The values chosen above are reasonable for Grundschule curriculum but can be tuned.

## Open Questions

1. **Route path for exercise actions**
   - What we know: Phase 10 uses German route names (`/kind/dashboard`, `/lehrer/dashboard`, `/login`, `/registrieren`)
   - What's unclear: Should the exercise route be `/kind/ueben/` or `/kind/aufgaben/`? Both are reasonable German names for "practice" or "exercises"
   - Recommendation: Use `/kind/ueben/` ("practice") as it describes the activity. The Server Actions live in `app/(child)/kind/ueben/actions.ts`. Phase 30 will add the page.tsx.

2. **Should submitAnswer validate that the exercise matches the child's grade?**
   - What we know: The child's grade comes from `profiles.grade_level`. The exercise's grade/difficulty comes from the client request.
   - What's unclear: Should the server reject if a Klasse 1 child submits a Klasse 4 exercise?
   - Recommendation: No -- the server uses the child's profile grade_level for the progress_entry record, not the client-sent grade. This prevents grade manipulation while keeping the system simple. The `generateExercise` action reads grade from the profile, not from client input.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 [VERIFIED: package.json] |
| Config file | `vitest.config.ts` [VERIFIED: project root] |
| Quick run command | `npm test -- --run tests/unit/exercise` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-02a | Kl.1 generates +/- within 20 | unit | `npx vitest run tests/unit/exercise-generators.test.ts -t "grade 1"` | Wave 0 |
| REQ-02b | Kl.2 generates +/- within 100 | unit | `npx vitest run tests/unit/exercise-generators.test.ts -t "grade 2"` | Wave 0 |
| REQ-02c | Kl.3 generates */: Einmaleins | unit | `npx vitest run tests/unit/exercise-generators.test.ts -t "grade 3"` | Wave 0 |
| REQ-02d | Kl.4 generates mixed ops to 1000 | unit | `npx vitest run tests/unit/exercise-generators.test.ts -t "grade 4"` | Wave 0 |
| REQ-02e | No negative subtraction results | unit | `npx vitest run tests/unit/exercise-generators.test.ts -t "no negatives"` | Wave 0 |
| REQ-02f | No division remainders | unit | `npx vitest run tests/unit/exercise-generators.test.ts -t "no remainders"` | Wave 0 |
| REQ-02g | Difficulty progression 3 correct up | unit | `npx vitest run tests/unit/exercise-difficulty.test.ts -t "promote"` | Wave 0 |
| REQ-02h | Difficulty regression 2 wrong down | unit | `npx vitest run tests/unit/exercise-difficulty.test.ts -t "demote"` | Wave 0 |
| REQ-02i | Points: easy=10, medium=20, hard=30 | unit | `npx vitest run tests/unit/exercise-points.test.ts` | Wave 0 |
| REQ-02j | Wrong answer = 0 points | unit | `npx vitest run tests/unit/exercise-points.test.ts -t "incorrect"` | Wave 0 |
| REQ-02k | progress_entry written for every answer | integration | `npx vitest run tests/integration/exercise-actions.test.ts -t "progress"` | Wave 0 |
| REQ-02l | Unauthenticated request rejected | integration | `npx vitest run tests/integration/exercise-actions.test.ts -t "auth"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run tests/unit/exercise`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/exercise-generators.test.ts` -- covers REQ-02a through REQ-02f
- [ ] `tests/unit/exercise-difficulty.test.ts` -- covers REQ-02g, REQ-02h
- [ ] `tests/unit/exercise-points.test.ts` -- covers REQ-02i, REQ-02j
- [ ] `tests/integration/exercise-actions.test.ts` -- covers REQ-02k, REQ-02l (requires Supabase connection)
- [ ] `tests/unit/exercise-schemas.test.ts` -- covers Zod validation for exercise inputs

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | `supabase.auth.getUser()` in every Server Action [VERIFIED: Phase 10 pattern] |
| V3 Session Management | Yes | Supabase SSR cookie-based sessions via middleware [VERIFIED: middleware.ts] |
| V4 Access Control | Yes | RLS policies on progress_entries (child_inserts_own_progress) [VERIFIED: migration 20260415000002] |
| V5 Input Validation | Yes | Zod schemas for all Server Action inputs [VERIFIED: Phase 10 pattern] |
| V6 Cryptography | No | No crypto operations in exercise engine |

### Known Threat Patterns for this Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated exercise submission | Spoofing | `getUser()` auth check at top of every Server Action |
| Client sends fake points_earned | Tampering | Server calculates points; client value is never trusted |
| Client sends wrong exercise for easy points | Tampering | Acceptable risk -- worst case is trivial exercises for 10 pts; children's game, not financial system |
| Grade manipulation (Kl.1 student submits as Kl.4) | Elevation of Privilege | Server reads grade from profile, ignores client-provided grade for DB writes |
| Mass exercise generation (DoS) | Denial of Service | Supabase rate limiting + RLS; no special mitigation needed for MVP |

## Sources

### Primary (HIGH confidence)
- Project codebase: `app/login/actions.ts`, `app/registrieren/actions.ts` -- established Server Action patterns
- Project codebase: `lib/schemas/auth.ts` -- Zod v4 validation pattern
- Project codebase: `supabase/migrations/20260415000001_init_schema.sql` -- progress_entries table schema
- Project codebase: `supabase/migrations/20260415000002_rls_policies.sql` -- RLS policies for progress_entries
- Project codebase: `tests/fixtures/supabase.ts` -- integration test fixture pattern
- Project codebase: `types/database.types.ts` -- TypeScript types for Supabase tables
- npm registry: zod@4.3.6, next@15.2.9, vitest@2.1.9 [VERIFIED: npm view]
- Node.js runtime: `crypto.randomUUID()` available [VERIFIED: runtime test]

### Secondary (MEDIUM confidence)
- Context7 /websites/nextjs: Server Actions security, authentication in actions [CITED: nextjs.org/docs/app/guides/data-security]
- Context7 /websites/supabase: getUser() for server-side auth [CITED: supabase.com/docs/reference/javascript]
- Context7 /websites/zod_dev: z.enum(), z.number().int(), z.coerce [CITED: zod.dev/api]

### Tertiary (LOW confidence)
- None -- all claims verified against project codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all libraries already installed and proven in Phase 10
- Architecture: HIGH -- follows established project patterns (Server Actions + Zod + Supabase), exercise domain is well-understood arithmetic
- Pitfalls: HIGH -- pitfalls are specific to the math domain (division by zero, negatives, off-by-one) and well-documented
- Number ranges: MEDIUM -- exact values per difficulty tier are assumed (A1-A5), but easily adjustable and explicitly documented as Claude's discretion

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (stable -- no moving targets, pure application logic)
