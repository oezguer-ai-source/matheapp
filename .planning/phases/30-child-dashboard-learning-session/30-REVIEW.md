---
phase: 30-child-dashboard-learning-session
reviewed: 2026-04-18T15:30:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - app/(child)/kind/dashboard/page.tsx
  - app/(child)/kind/ueben/page.tsx
  - app/globals.css
  - components/child/dashboard-stats.tsx
  - components/child/exercise-session.tsx
  - components/child/feedback-overlay.tsx
  - components/child/number-pad.tsx
  - lib/config/rewards.ts
  - tests/e2e/child-dashboard.spec.ts
  - tests/e2e/exercise-session.spec.ts
  - tests/unit/feedback-overlay.test.tsx
  - tests/unit/number-pad.test.tsx
  - tests/unit/progress-bar.test.tsx
  - vitest.config.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-04-18T15:30:00Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

The child dashboard and exercise session implementation is well-structured overall. Server actions correctly strip the `correctAnswer` before sending to the client, input validation is thorough with Zod schemas and operand-range checks, and RLS is relied upon for data access. The component hierarchy is clean with proper separation of concerns. Three warnings and two informational items were found -- no critical security or crash issues.

## Warnings

### WR-01: ProgressBar `remaining` can be negative

**File:** `components/child/dashboard-stats.tsx:11`
**Issue:** When `currentPoints` exceeds `MINIGAME_THRESHOLD`, the `remaining` variable becomes negative. Although the current render logic hides this behind the `unlocked` branch, the variable is still computed and passed to the JSX template on line 39. If the branching logic is ever refactored (e.g., showing both messages, or a future developer removes the conditional), users would see "Noch -200 Punkte!" which is nonsensical for a child-facing UI.
**Fix:**
```tsx
const remaining = Math.max(MINIGAME_THRESHOLD - currentPoints, 0);
```

### WR-02: `test.slow()` called at describe scope affects all subsequent tests

**File:** `tests/e2e/exercise-session.spec.ts:103`
**Issue:** `test.slow()` is called as a bare statement inside `test.describe()` at lines 103, 133, 166, and 212. In Playwright, calling `test.slow()` at the describe level (outside any test body) marks ALL tests in that describe block as slow, not just the next test. This means even the fast tests ("exercise session loads and shows an exercise", "number pad buttons are visible and clickable", "Beenden button returns to dashboard") silently inherit the 3x timeout multiplier. While this does not break tests, it masks genuine timeout regressions and slows CI unnecessarily.
**Fix:** Move `test.slow()` inside each test body that actually needs it:
```typescript
test("submitting correct answer shows green feedback", async ({ page }) => {
  test.slow(); // This test involves network round-trip for answer submission
  await loginAsChild(page);
  // ...
});
```

### WR-03: Missing error handling in `generateExerciseAction` call

**File:** `components/child/exercise-session.tsx:38-46`
**Issue:** The `loadNextExercise` callback checks `result.data` but does not log or surface `result.error` when the action fails. The user sees a generic "Ein Fehler ist aufgetreten" message with no way to diagnose what went wrong (network error, auth expired, invalid grade, etc.). More importantly, if `generateExerciseAction` throws an unhandled exception (rather than returning `{ error }`) -- for example, if the Supabase client fails to initialize -- the promise rejection is unhandled and the component will remain stuck in the "loading" state with no error UI shown.
**Fix:** Wrap in try/catch and surface the error:
```tsx
const loadNextExercise = useCallback(async () => {
  setState("loading");
  try {
    const result = await generateExerciseAction(grade, difficulty);
    if (result.data) {
      setExercise(result.data);
      setAnswer("");
      setState("answering");
    } else {
      console.error("Exercise generation failed:", result.error);
      setState("error");
    }
  } catch (err) {
    console.error("Exercise generation exception:", err);
    setState("error");
  }
}, [grade, difficulty]);
```
Apply the same pattern to `handleConfirm` (lines 72-109).

## Info

### IN-01: Type assertion `as any` in vitest config

**File:** `vitest.config.ts:7`
**Issue:** `react() as any` bypasses type checking on the Vite plugin. This is a known workaround for `@vitejs/plugin-react` type incompatibility with Vitest's bundled Vite version, but it suppresses any future type errors from plugin misconfiguration.
**Fix:** Add a comment documenting the reason and pin the plugin version:
```typescript
// TODO: Remove `as any` when @vitejs/plugin-react types align with vitest's Vite version
plugins: [react() as any],
```

### IN-02: Suppressed exhaustive-deps lint rule

**File:** `components/child/exercise-session.tsx:56-57`
**Issue:** The `eslint-disable-next-line react-hooks/exhaustive-deps` suppresses the warning that `loadNextExercise` is not in the dependency array. This is intentional (the effect should only run on mount), but the comment does not explain why the suppression is safe. Future developers may not understand the intent.
**Fix:** Add an explanatory comment:
```tsx
useEffect(() => {
  loadNextExercise();
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
  // Intentionally run only on mount. Difficulty changes are handled
  // via the handleConfirm -> loadNextExercise call chain, not via effect re-runs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

---

_Reviewed: 2026-04-18T15:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
