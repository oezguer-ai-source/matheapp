---
phase: 20-exercise-engine
verified: 2026-04-17T02:15:00Z
status: passed
score: 18/18
overrides_applied: 0
---

# Phase 20: Exercise Engine Verification Report

**Phase Goal:** The server can generate grade-appropriate math exercises with tiered difficulty and validate answers server-side, awarding points only for correct answers
**Verified:** 2026-04-17T02:15:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

**Roadmap Success Criteria (SC):**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | API generates exercises matching the curriculum for each grade: addition/subtraction within 20 (Kl.1), within 100 (Kl.2), multiplication/division kleines Einmaleins (Kl.3), mixed operations in larger number range (Kl.4) | VERIFIED | `lib/exercises/config.ts` RANGES maps exact ranges: Kl.1 +/- max 20, Kl.2 +/- max 100, Kl.3 */ max 10, Kl.4 +-*/ max 1000. 12 grade/difficulty tests pass across all combinations (exercise-generators.test.ts). Behavioral spot-check confirmed Grade 1 easy operands in [1,10] and Grade 3 medium generates multiplication. |
| SC-2 | Each exercise set starts at easy difficulty and progresses to harder problems based on consecutive correct answers | VERIFIED | `lib/exercises/difficulty.ts` computeNewDifficulty promotes after 3 consecutive correct (PROMOTE_THRESHOLD=3) and demotes after 2 consecutive incorrect (DEMOTE_THRESHOLD=2). 10 tests pass in exercise-difficulty.test.ts. Spot-check: computeNewDifficulty('easy', 3, 0) returns 'medium'. |
| SC-3 | Answer validation happens server-side only -- the client sends the raw answer, the server determines correctness and awards points | VERIFIED | `app/(child)/kind/ueben/actions.ts` line 168: `compute(operand1, operand2, operator)` re-computes correctAnswer server-side. Line 175: `userAnswer === correctAnswer` determines correctness. Line 177: `calculatePoints()` awards points server-side. generateExerciseAction returns ClientExercise without correctAnswer (lines 101-106). |
| SC-4 | A progress_entry record is written to the database for every answered exercise (correct or incorrect, with operation type, grade, and timestamp) | VERIFIED | `app/(child)/kind/ueben/actions.ts` lines 190-198: `supabase.from("progress_entries").insert(...)` with child_id, operation_type (via OPERATOR_TO_TYPE), grade, correct, points_earned. Insert happens unconditionally (not gated on correct). Integration tests verify writes for both correct and incorrect answers. |

**Plan 01 Must-Have Truths:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | generateExercise(1, 'easy') returns addition or subtraction with operands 1-10 and correct answer | VERIFIED | config.ts grade 1 easy: min 1, max 10, operators ['+','-']. Spot-check output: `{"operand1":7,"operand2":10,"operator":"+","correctAnswer":17}`. 50-iteration test passes. |
| 2 | generateExercise(1, 'medium') returns addition or subtraction with operands 1-20 | VERIFIED | config.ts grade 1 medium: min 1, max 20. Test passes 50 iterations. |
| 3 | generateExercise(2, 'easy') returns +/- with operands 1-50 | VERIFIED | config.ts grade 2 easy: min 1, max 50. Test passes. |
| 4 | generateExercise(2, 'medium') returns +/- with operands 1-100 | VERIFIED | config.ts grade 2 medium: min 1, max 100. Test passes. |
| 5 | generateExercise(3, 'medium') returns * or / with factors 1-10 (Einmaleins) | VERIFIED | config.ts grade 3 medium: min 1, max 10, operators ['*','/']. Spot-check output: `{"operand1":6,"operand2":1,"operator":"*","correctAnswer":6}`. Test passes. |
| 6 | generateExercise(4, 'hard') returns +,-,*,/ with operands up to 1000 | VERIFIED | config.ts grade 4 hard: min 50, max 1000, all 4 operators. Test passes. |
| 7 | Subtraction never produces negative results | VERIFIED | generators.ts lines 57-59: swaps operands when a < b. Constraint test runs 200 random iterations, all pass. |
| 8 | Division never produces remainders | VERIFIED | generators.ts lines 69-83: answer-first approach (dividend = quotient * divisor). Constraint test runs 200 random iterations, all pass. |
| 9 | computeNewDifficulty promotes after 3 consecutive correct answers | VERIFIED | difficulty.ts line 29: `correctStreak >= PROMOTE_THRESHOLD`. PROMOTE_THRESHOLD = 3. Spot-check: computeNewDifficulty('easy', 3, 0) = 'medium'. |
| 10 | computeNewDifficulty demotes after 2 consecutive wrong answers | VERIFIED | difficulty.ts line 34: `incorrectStreak >= DEMOTE_THRESHOLD`. DEMOTE_THRESHOLD = 2. Spot-check: computeNewDifficulty('medium', 0, 2) = 'easy'. |
| 11 | calculatePoints returns easy=10, medium=20, hard=30 for correct; 0 for incorrect | VERIFIED | points.ts: BASE_POINTS=10, MULTIPLIER={easy:1,medium:2,hard:3}. Spot-check: easy=10, medium=20, hard=30, incorrect=0. 6 tests pass. |

**Plan 02 Must-Have Truths:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 12 | generateExercise Server Action returns ClientExercise (without correctAnswer) for authenticated child | VERIFIED | actions.ts lines 76-107: generateExerciseAction checks auth, returns {id, operand1, operand2, operator} explicitly without correctAnswer. |
| 13 | generateExercise Server Action rejects unauthenticated requests with error | VERIFIED | actions.ts lines 87-89: `if (!user) return { error: "Nicht angemeldet." }`. |
| 14 | submitAnswer Server Action computes correctness server-side by re-computing from operands | VERIFIED | actions.ts line 168: `compute(operand1, operand2, operator as Operator)` and line 175: `userAnswer === correctAnswer`. |
| 15 | submitAnswer writes a progress_entry row for every answer (correct or incorrect) | VERIFIED | actions.ts lines 190-198: insert not conditional on correctness. Integration tests verify both correct and incorrect writes. |
| 16 | submitAnswer returns pointsEarned based on difficulty multiplier (easy=10, medium=20, hard=30) | VERIFIED | actions.ts line 177: `calculatePoints(correct, currentDifficulty)`. Full exercise flow integration test confirms pointsEarned=20 for medium. |
| 17 | submitAnswer returns newDifficulty computed from streak data | VERIFIED | actions.ts lines 183-187: `computeNewDifficulty(currentDifficulty, newCorrectStreak, newIncorrectStreak)`. Return object includes newDifficulty at line 207. |
| 18 | Zod schemas reject invalid inputs (grade < 1, grade > 4, invalid difficulty, non-UUID exerciseId) | VERIFIED | lib/schemas/exercise.ts: grade z.number().int().min(1).max(4), difficulty z.enum, exerciseId z.string().uuid(). 13 schema unit tests all pass. |

**Score:** 18/18 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/exercises/types.ts` | Exercise, ClientExercise, Difficulty, Grade, Operator, OperationType, SubmitAnswerResult types | VERIFIED | 42 lines, all types exported, OPERATOR_TO_TYPE const present |
| `lib/exercises/config.ts` | RANGES config mapping grade+difficulty to min/max/operators | VERIFIED | 35 lines, RangeConfig interface + RANGES const with all 12 combinations |
| `lib/exercises/generators.ts` | generateExercise pure function + compute helper | VERIFIED | 112 lines, exports generateExercise, compute, randomInt. Answer-first division, operand swap for subtraction |
| `lib/exercises/difficulty.ts` | computeNewDifficulty function | VERIFIED | 40 lines, exports computeNewDifficulty, PROMOTE_THRESHOLD=3, DEMOTE_THRESHOLD=2 |
| `lib/exercises/points.ts` | calculatePoints function | VERIFIED | 26 lines, exports calculatePoints, BASE_POINTS=10, MULTIPLIER |
| `lib/schemas/exercise.ts` | Zod schemas for generateExercise and submitAnswer inputs | VERIFIED | 21 lines, exports generateExerciseSchema, submitAnswerSchema, GenerateExerciseInput, SubmitAnswerInput |
| `app/(child)/kind/ueben/actions.ts` | Server Actions for exercise generation and answer validation | VERIFIED | 215 lines, "use server" directive, exports generateExerciseAction and submitAnswerAction with auth guards, Zod validation, server-side computation, progress writes |
| `tests/unit/exercise-generators.test.ts` | Generator tests for all grades | VERIFIED | 263 lines, 21 tests |
| `tests/unit/exercise-difficulty.test.ts` | Difficulty transition tests | VERIFIED | 47 lines, 10 tests |
| `tests/unit/exercise-points.test.ts` | Point calculation tests | VERIFIED | 33 lines, 6 tests |
| `tests/unit/exercise-schemas.test.ts` | Zod schema validation tests | VERIFIED | 93 lines, 13 tests |
| `tests/integration/exercise-actions.test.ts` | Integration tests for Server Actions against Supabase | VERIFIED | 339 lines, 8 tests with isolated test fixtures |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `lib/exercises/generators.ts` | `lib/exercises/types.ts` | `import { Exercise, Difficulty, Grade, Operator }` | WIRED | Line 5: `import { type Exercise, type Difficulty, type Grade, type Operator } from './types'` |
| `lib/exercises/generators.ts` | `lib/exercises/config.ts` | `import { RANGES }` | WIRED | Line 6: `import { RANGES, type RangeConfig } from './config'` |
| `app/(child)/kind/ueben/actions.ts` | `lib/exercises/generators.ts` | `import { generateExercise, compute }` | WIRED | Lines 4-5: both imports present |
| `app/(child)/kind/ueben/actions.ts` | `lib/exercises/difficulty.ts` | `import { computeNewDifficulty }` | WIRED | Line 6: import present, used at line 183 |
| `app/(child)/kind/ueben/actions.ts` | `lib/exercises/points.ts` | `import { calculatePoints }` | WIRED | Line 7: import present, used at line 177 |
| `app/(child)/kind/ueben/actions.ts` | `lib/supabase/server.ts` | `import { createClient }` | WIRED | Line 3: import present, used at lines 85 and 125 |
| `app/(child)/kind/ueben/actions.ts` | `lib/schemas/exercise.ts` | `import { generateExerciseSchema, submitAnswerSchema }` | WIRED | Lines 17-20: import present, used at lines 80 and 119 |

### Data-Flow Trace (Level 4)

Not applicable -- this phase produces pure functions and server actions (backend engine). No client-side components render dynamic data. The data flow is: pure functions -> Server Actions -> Supabase progress_entries, which is fully verified through the key link wiring and integration test coverage.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Grade 1 easy produces valid exercise | `npx tsx -e "..."` generateExercise(1,'easy') | `{"operand1":7,"operand2":10,"operator":"+","correctAnswer":17}`, operands in range: true, compute check: true | PASS |
| Grade 3 medium produces Einmaleins | `npx tsx -e "..."` generateExercise(3,'medium') | `{"operand1":6,"operand2":1,"operator":"*","correctAnswer":6}` | PASS |
| Difficulty promotes after 3 correct | `npx tsx -e "..."` computeNewDifficulty('easy',3,0) | `medium` | PASS |
| Difficulty demotes after 2 wrong | `npx tsx -e "..."` computeNewDifficulty('medium',0,2) | `easy` | PASS |
| Points: easy=10, medium=20, hard=30, incorrect=0 | `npx tsx -e "..."` calculatePoints calls | 10, 20, 30, 0 | PASS |
| Unit tests (50 tests) | `npx vitest run tests/unit/exercise-*.test.ts exercise-schemas.test.ts` | 4 files, 50 tests passed, 0 failed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| REQ-02 | 20-01, 20-02 | Exercise generation and validation engine | SATISFIED | REQUIREMENTS.md not found on disk, but both plans declare REQ-02 and all roadmap success criteria are met: grade-appropriate exercises, difficulty progression, server-side validation, progress_entry writes |

Note: No REQUIREMENTS.md file exists in .planning/. REQ-02 is referenced in ROADMAP.md and both PLAN frontmatters. All 4 roadmap success criteria for this requirement are verified as met.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No TODO, FIXME, placeholder, empty implementation, or stub patterns found in any Phase 20 file |

### Human Verification Required

No items require human verification. This phase is a pure backend engine with no UI components, no visual elements, and no user-facing interactions. All behaviors are testable through unit tests and behavioral spot-checks. Server Actions require the Next.js runtime for full end-to-end testing, but the auth guard pattern is identical to the Phase 10 pattern that was already verified, and the business logic is fully covered by pure function tests and integration tests.

### Gaps Summary

No gaps found. All 18 must-have truths are verified. All 12 artifacts exist, are substantive, and are properly wired. All 7 key links are confirmed. 50 unit tests pass. Behavioral spot-checks confirm correct runtime behavior. No anti-patterns detected.

The exercise engine is complete and ready for consumption by Phase 30 (Child Dashboard & Learning Session).

---

_Verified: 2026-04-17T02:15:00Z_
_Verifier: Claude (gsd-verifier)_
