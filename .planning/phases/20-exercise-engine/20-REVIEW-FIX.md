---
phase: 20-exercise-engine
fixed_at: 2026-04-18T00:08:00Z
review_path: .planning/phases/20-exercise-engine/20-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 20: Code Review Fix Report

**Fixed at:** 2026-04-18T00:08:00Z
**Source review:** .planning/phases/20-exercise-engine/20-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### CR-01: Client-supplied operands allow answer forgery in submitAnswerAction

**Files modified:** `app/(child)/kind/ueben/actions.ts`
**Commit:** 30da640
**Applied fix:** Added a `validateOperandsForGrade()` function that checks submitted operands against the child's grade and difficulty configuration from `RANGES`. The function validates: (1) operator is allowed for the grade/difficulty, (2) operands fall within the configured min/max range, (3) subtraction has operand1 >= operand2, (4) division has divisor >= 2, dividend divisible by divisor, and quotient >= 1. This prevents trivial-exercise forgery (e.g., submitting `1+1=2` for grade 4 hard) without requiring server-side exercise storage or HMAC signing -- appropriate for an MVP university project. The validation uses the child's grade from their Supabase profile (already fetched in the action), not a client-supplied grade.

### WR-01: Floating-point comparison for division answers

**Files modified:** `app/(child)/kind/ueben/actions.ts`
**Commit:** 3e53b4a
**Applied fix:** Added an explicit `Number.isInteger(correctAnswer)` guard after `compute()` for division operations. If the server-recomputed answer is not an integer (which should never happen with valid generator output but could occur with tampered operands), the action returns an error instead of proceeding with a float comparison. This hardens the invariant that division exercises always have whole-number answers.

### WR-02: submitAnswerSchema allows negative operand1 values

**Files modified:** `lib/schemas/exercise.ts`
**Commit:** d1a513a
**Applied fix:** Added `.min(1)` constraint to `operand1` in `submitAnswerSchema`. The exercise generator always produces operands >= 1 (config.min is always >= 1 across all grades), so the schema now enforces this boundary. This narrows the attack surface by rejecting negative or zero operand1 values at the Zod validation layer before any processing occurs.

## Skipped Issues

None -- all in-scope findings were fixed.

---

_Fixed: 2026-04-18T00:08:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
