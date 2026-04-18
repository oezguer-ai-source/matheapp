---
phase: 20-exercise-engine
reviewed: 2026-04-17T14:30:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - lib/exercises/types.ts
  - lib/exercises/config.ts
  - lib/exercises/generators.ts
  - lib/exercises/difficulty.ts
  - lib/exercises/points.ts
  - lib/schemas/exercise.ts
  - app/(child)/kind/ueben/actions.ts
  - tests/unit/exercise-generators.test.ts
  - tests/unit/exercise-difficulty.test.ts
  - tests/unit/exercise-points.test.ts
  - tests/unit/exercise-schemas.test.ts
  - tests/integration/exercise-actions.test.ts
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-04-17T14:30:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

The exercise engine implements a stateless math exercise generator with difficulty progression, point calculation, and server actions for a children's math app. The core generator logic (`generators.ts`, `difficulty.ts`, `points.ts`) is well-structured, handles edge cases correctly (no negative subtraction results, whole-number division via answer-first approach, no division by zero), and has thorough test coverage.

However, the server action `submitAnswerAction` has a critical trust-boundary vulnerability: it accepts exercise operands from the client and recomputes the correct answer from them, but never validates those operands against the originally generated exercise. A malicious client can fabricate trivial exercises and always score points. Two additional warnings address schema validation gaps and floating-point comparison risks.

## Critical Issues

### CR-01: Client-supplied operands allow answer forgery in submitAnswerAction

**File:** `app/(child)/kind/ueben/actions.ts:87-99`
**Issue:** The `submitAnswerAction` receives `operand1`, `operand2`, and `operator` from the client, then recomputes `correctAnswer = compute(operand1, operand2, operator)` on the server (line 98). Since exercise generation is stateless (no server-side storage of the generated exercise), there is no verification that the submitted operands match the exercise that was actually generated. A cheating client can send `{ operand1: 1, operand2: 1, operator: '+', userAnswer: 2 }` for every submission and always receive `correct: true` with full points.

This undermines the entire anti-cheat design documented as "Pattern 3" and "Pitfall 3" in the codebase comments. The server recomputes the answer, but from untrusted inputs.

**Fix:** Store generated exercises server-side (e.g., in a Supabase `exercises` table or short-lived Redis/KV cache) keyed by `exerciseId`. On submission, look up the original exercise by ID and use the stored operands/operator instead of client-supplied values:

```typescript
// In generateExerciseAction: store exercise in DB
const { error: storeErr } = await supabase.from('pending_exercises').insert({
  id: exercise.id,
  child_id: user.id,
  operand1: exercise.operand1,
  operand2: exercise.operand2,
  operator: exercise.operator,
  correct_answer: exercise.correctAnswer,
  created_at: new Date().toISOString(),
});

// In submitAnswerAction: retrieve and validate
const { data: storedExercise } = await supabase
  .from('pending_exercises')
  .select('*')
  .eq('id', parsed.data.exerciseId)
  .eq('child_id', user.id)
  .single();

if (!storedExercise) {
  return { error: 'Aufgabe nicht gefunden.' };
}

const correctAnswer = storedExercise.correct_answer;
const correct = parsed.data.userAnswer === correctAnswer;
```

Alternatively, if adding a table is too heavy for this phase, sign the exercise payload with an HMAC (using a server-side secret) and send the signature to the client alongside the `ClientExercise`. On submission, verify the HMAC before trusting the operands.

## Warnings

### WR-01: Floating-point comparison for division answers

**File:** `app/(child)/kind/ueben/actions.ts:99`
**Issue:** The comparison `userAnswer === correctAnswer` uses strict equality. While the generator guarantees whole-number division results via the answer-first approach, the server's `compute()` function performs raw `a / b` (line 24 of `generators.ts`). If a client sends operands that do not divide evenly (whether through tampering or a future code change), `correctAnswer` will be a float, and the strict equality comparison will behave unexpectedly. For example, `compute(7, 3, '/')` returns `2.3333...`, which would never equal any integer `userAnswer`.

Currently this is mitigated by the answer-first generation and Zod integer validation on `userAnswer`, but it is fragile -- it relies on an invariant maintained in a different module.

**Fix:** Add an explicit integer check or use `Math.round` with a tolerance for division:

```typescript
const correctAnswer = compute(operand1, operand2, operator as Operator);
// Guard: if division produced a non-integer, the exercise is invalid
if (operator === '/' && !Number.isInteger(correctAnswer)) {
  return { error: 'Ungueltige Aufgabe.' };
}
const correct = userAnswer === correctAnswer;
```

### WR-02: submitAnswerSchema allows negative operand1 values

**File:** `lib/schemas/exercise.ts:10`
**Issue:** The schema validates `operand1: z.number().int()` without a `.min()` constraint, while `operand2` has `.min(1)`. This means operand1 can be any integer including negative numbers or zero. The exercise generator never produces negative operands (config.min is always >= 1), but the schema does not enforce this boundary. A malicious client could submit `operand1: -100` which the generator would never produce. Combined with CR-01, this widens the attack surface.

**Fix:** Add a minimum constraint to `operand1`:

```typescript
export const submitAnswerSchema = z.object({
  exerciseId: z.string().uuid(),
  operand1: z.number().int().min(0), // subtraction can produce 0-value results shown as operand1 in edge cases; use min(1) if operand1 should always be positive
  operand2: z.number().int().min(1),
  // ...rest
});
```

## Info

### IN-01: generateExercise parameter type is wider than necessary

**File:** `lib/exercises/generators.ts:93`
**Issue:** The function signature uses `grade: number` but the valid domain is `Grade` (1|2|3|4). The runtime check on lines 95-97 validates this, but using the `Grade` type directly would provide compile-time safety and eliminate the need for the runtime guard at call sites that already have a typed grade.

**Fix:**
```typescript
export function generateExercise(grade: Grade, difficulty: Difficulty): Exercise {
  const config = RANGES[grade][difficulty];
  // ... no cast needed
```

### IN-02: Redundant type assertions in submitAnswerAction

**File:** `app/(child)/kind/ueben/actions.ts:98,101,108-110,118`
**Issue:** Multiple `as Operator` and `as Difficulty` casts are used on values that Zod has already validated and typed. After `parsed.data` destructuring, the types from the Zod schema should align with the domain types. These casts are noise and could mask future type mismatches.

**Fix:** Align the Zod schema's inferred types with the domain types by importing and reusing them, or use `z.enum()` outputs that match directly:

```typescript
// The Zod enum already narrows the type; no cast needed:
const correctAnswer = compute(operand1, operand2, operator);
const pointsEarned = calculatePoints(correct, currentDifficulty);
const newDifficulty = computeNewDifficulty(currentDifficulty, newCorrectStreak, newIncorrectStreak);
```

---

_Reviewed: 2026-04-17T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
