---
phase: 20-exercise-engine
plan: 01
subsystem: api
tags: [math, exercise-engine, pure-functions, tdd, vitest, arithmetic, difficulty, points]

# Dependency graph
requires:
  - phase: 10-foundation
    provides: Vitest test infrastructure, TypeScript config, path aliases
provides:
  - Pure-function exercise generator for grades 1-4 with 3 difficulty tiers
  - Difficulty transition logic (promote/demote based on streaks)
  - Point calculation (base * difficulty multiplier)
  - Type definitions for Exercise, ClientExercise, Difficulty, Grade, Operator
  - RANGES config mapping grade+difficulty to number ranges and operators
affects: [20-exercise-engine, 30-exercise-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [answer-first division generation, operand swap for non-negative subtraction, pure function exercise engine]

key-files:
  created:
    - lib/exercises/types.ts
    - lib/exercises/config.ts
    - lib/exercises/generators.ts
    - lib/exercises/difficulty.ts
    - lib/exercises/points.ts
    - tests/unit/exercise-generators.test.ts
    - tests/unit/exercise-difficulty.test.ts
    - tests/unit/exercise-points.test.ts
  modified: []

key-decisions:
  - "Division uses answer-first generation: pick divisor and quotient, compute dividend to guarantee whole numbers"
  - "Subtraction swaps operands when operand1 < operand2 to ensure non-negative results"
  - "Divisor minimum is 2 to avoid trivial divisions and division by zero"

patterns-established:
  - "Pattern: Answer-first division generation for remainder-free results"
  - "Pattern: Pure function exercise engine with no Supabase dependency"
  - "Pattern: RANGES config as single source of truth for grade/difficulty number ranges"

requirements-completed: [REQ-02]

# Metrics
duration: 3min
completed: 2026-04-17
---

# Phase 20 Plan 01: Exercise Engine Summary

**TDD pure-function math engine with generators for grades 1-4, difficulty transitions (3-up/2-down), and point calculation (10/20/30) -- 37 unit tests all green**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-17T23:49:35Z
- **Completed:** 2026-04-17T23:53:23Z
- **Tasks:** 2
- **Files created:** 8

## Accomplishments
- Built complete exercise generator covering all 4 grades with 3 difficulty tiers each (12 grade/difficulty combinations)
- Implemented difficulty transition logic: promote after 3 consecutive correct, demote after 2 consecutive incorrect
- Implemented point calculation: easy=10, medium=20, hard=30 for correct; 0 for incorrect
- Enforced curriculum constraints: no negative subtraction results, no division remainders, divisors always >= 2
- Full TDD cycle: RED (failing tests) then GREEN (implementation) for both tasks

## Task Commits

Each task was committed atomically following TDD RED/GREEN:

1. **Task 1 RED: Types, config, difficulty + points tests** - `fd56ac4` (test)
2. **Task 1 GREEN: Difficulty + points implementation** - `95cf23e` (feat)
3. **Task 2 RED: Generator tests for all grades** - `a3568d3` (test)
4. **Task 2 GREEN: Generator implementation** - `90f9b8c` (feat)

## Files Created/Modified
- `lib/exercises/types.ts` - Exercise, ClientExercise, Difficulty, Grade, Operator, SubmitAnswerResult types + OPERATOR_TO_TYPE mapping
- `lib/exercises/config.ts` - RANGES config: grade/difficulty -> min/max/operators
- `lib/exercises/generators.ts` - generateExercise, compute, randomInt pure functions
- `lib/exercises/difficulty.ts` - computeNewDifficulty with PROMOTE_THRESHOLD=3, DEMOTE_THRESHOLD=2
- `lib/exercises/points.ts` - calculatePoints with BASE_POINTS=10, MULTIPLIER (1x/2x/3x)
- `tests/unit/exercise-generators.test.ts` - 21 tests: 12 grade/difficulty + 3 constraints + 1 UUID + 4 compute + 1 randomInt
- `tests/unit/exercise-difficulty.test.ts` - 10 tests: 8 transition behaviors + 2 constant checks
- `tests/unit/exercise-points.test.ts` - 6 tests: 4 point calculations + 2 constant checks

## Decisions Made
- Division uses answer-first generation: pick divisor in [2, config.max], pick quotient in [1, max/divisor], compute dividend = quotient * divisor. This guarantees whole-number results without retry loops.
- Subtraction swaps operands when operand1 < operand2 to ensure non-negative results.
- Divisor minimum is always 2 (avoids both division-by-zero and trivial divide-by-1).
- Grade validation throws Error for invalid grades (not 1-4) rather than returning a default.

## Deviations from Plan

None - plan executed exactly as written.

## TDD Gate Compliance

- RED gate (test commits): `fd56ac4` and `a3568d3` -- both confirmed failing before implementation
- GREEN gate (feat commits): `95cf23e` and `90f9b8c` -- all tests passing after implementation
- REFACTOR gate: not needed -- code was clean from initial implementation

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Pure functions with no I/O.

## Next Phase Readiness
- All pure functions ready for Plan 02 (Server Actions) to consume
- Types, config, generators, difficulty, and points modules are fully tested
- Plan 02 will wrap these in Server Actions with auth, Supabase writes, and Zod validation

## Self-Check: PASSED

All 8 files verified present. All 4 commits verified in git log.

---
*Phase: 20-exercise-engine*
*Completed: 2026-04-17*
