---
phase: 20-exercise-engine
plan: 02
subsystem: api
tags: [server-actions, zod, supabase, auth, exercise-engine, progress-tracking, input-validation]

# Dependency graph
requires:
  - phase: 20-exercise-engine
    plan: 01
    provides: Pure-function exercise generators, difficulty, points, types
  - phase: 10-foundation
    provides: Supabase client helpers, auth patterns, Zod convention, test fixtures
provides:
  - Zod validation schemas for exercise generation and answer submission
  - Server Actions (generateExerciseAction, submitAnswerAction) with auth guards
  - Progress entry writes for every answered exercise
  - Server-side answer re-computation preventing client cheating
affects: [30-exercise-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [Server Action with Zod validation + auth guard + Supabase write, stateless answer validation via client-sent operands, isolated integration test fixtures]

key-files:
  created:
    - lib/schemas/exercise.ts
    - app/(child)/kind/ueben/actions.ts
    - tests/unit/exercise-schemas.test.ts
    - tests/integration/exercise-actions.test.ts
  modified: []

key-decisions:
  - "Stateless answer validation: client sends operands back, server re-computes correctAnswer (Pattern 3 from RESEARCH)"
  - "submitAnswerSchema enforces operand2 >= 1 at Zod level to prevent division-by-zero at validation boundary"
  - "Integration tests use isolated fixtures (unique school/teacher/child names) to prevent parallel test collision"
  - "Grade for progress_entry read from profiles.grade_level server-side, not from client input (T-20-06 mitigation)"

patterns-established:
  - "Pattern: Server Action with Zod safeParse -> auth check -> business logic -> DB write -> response"
  - "Pattern: Isolated integration test fixtures with unique entity names per test suite"
  - "Pattern: ClientExercise explicitly constructed without correctAnswer field in Server Action return"

requirements-completed: [REQ-02]

# Metrics
duration: 5min
completed: 2026-04-18
---

# Phase 20 Plan 02: Server Actions & Zod Schemas Summary

**Zod-validated Server Actions for exercise generation and answer submission with auth guards, server-side answer re-computation, and progress_entry writes -- 21 new tests (13 unit + 8 integration), full suite 87 tests green**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-17T23:55:56Z
- **Completed:** 2026-04-18T00:01:10Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- Built Zod validation schemas for generateExercise (grade 1-4, difficulty enum) and submitAnswer (UUID, operand2 >= 1, non-negative streaks) inputs
- Implemented two Server Actions with full auth guards via supabase.auth.getUser()
- generateExerciseAction returns ClientExercise without correctAnswer (T-20-07 mitigation)
- submitAnswerAction re-computes correct answer server-side, calculates points, computes difficulty progression, writes progress_entry for every answer
- Full TDD cycle for schemas (RED -> GREEN), integration tests for Server Action business logic

## Task Commits

Each task was committed atomically following TDD RED/GREEN:

1. **Task 1 RED: Zod schema failing tests** - `13aa7d7` (test)
2. **Task 1 GREEN: Zod schema implementation** - `b651202` (feat)
3. **Task 2: Server Actions + integration tests** - `0117d9d` (feat)

## Files Created/Modified
- `lib/schemas/exercise.ts` - Zod schemas: generateExerciseSchema, submitAnswerSchema with exported types
- `app/(child)/kind/ueben/actions.ts` - Server Actions: generateExerciseAction, submitAnswerAction
- `tests/unit/exercise-schemas.test.ts` - 13 tests: 6 for generateExerciseSchema, 7 for submitAnswerSchema
- `tests/integration/exercise-actions.test.ts` - 8 tests: ClientExercise shape, progress_entry writes, full flow, schema validation

## Decisions Made
- Stateless answer validation: client sends operands back, server re-computes correctAnswer from operands (Pattern 3 from RESEARCH.md). Trades minor cheat vector (trivial exercises) for significant complexity reduction.
- submitAnswerSchema enforces operand2 >= 1 at Zod validation level, preventing division-by-zero before any business logic runs.
- Integration tests use isolated fixtures with unique entity names (school: "Testschule Exercise", child: "emma.exercise") to avoid collision with RLS test suite's parallel execution.
- Grade for progress_entry always comes from profiles.grade_level (server-side), never from client input, mitigating grade elevation attacks (T-20-06).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Isolated integration test fixtures to fix parallel test collision**
- **Found during:** Task 2 (integration tests)
- **Issue:** Exercise-actions tests shared seedTestData/cleanupTestData with rls-policies tests. When running `npm test`, parallel execution caused "Database error creating new user" due to cleanup race condition.
- **Fix:** Created dedicated exerciseSeed/exerciseCleanup functions with unique entity names (school, teacher, child) that don't collide with the shared fixture constants.
- **Files modified:** tests/integration/exercise-actions.test.ts
- **Verification:** Full test suite (10 files, 87 tests) passes consistently with zero failures
- **Committed in:** 0117d9d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for test reliability. No scope creep -- same tests, just isolated data.

## Threat Mitigations Verified

| Threat ID | Status | Implementation |
|-----------|--------|----------------|
| T-20-01 | Mitigated | generateExerciseAction: getUser() at top, returns error if no user |
| T-20-02 | Mitigated | submitAnswerAction: getUser() at top, returns error if no user |
| T-20-04 | Mitigated | Server calculates points via calculatePoints(), client never sends points_earned |
| T-20-06 | Mitigated | Grade read from profiles.grade_level, not client input |
| T-20-07 | Mitigated | ClientExercise explicitly constructed without correctAnswer |
| T-20-08 | Mitigated | Zod schemas validate all inputs before business logic |

## Issues Encountered
None beyond the test isolation deviation documented above.

## TDD Gate Compliance

- RED gate (test commit): `13aa7d7` -- confirmed failing before implementation
- GREEN gate (feat commit): `b651202` -- all 13 schema tests passing after implementation
- REFACTOR gate: not needed -- code was clean from initial implementation

## User Setup Required
None - uses existing Supabase configuration from Phase 10.

## Next Phase Readiness
- Server Actions ready for Phase 30 (Child Dashboard UI) to consume
- generateExerciseAction provides ClientExercise for rendering in exercise UI
- submitAnswerAction provides SubmitAnswerResult for feedback display
- All Phase 20 tests green (58 unit + integration across 5 test files)
- Full project test suite green (87 tests across 10 files)

## Self-Check: PASSED

All 4 files verified present. All 3 commits verified in git log.

---
*Phase: 20-exercise-engine*
*Completed: 2026-04-18*
