# Phase 20: Exercise Engine - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

The server can generate grade-appropriate math exercises with tiered difficulty and validate answers server-side, awarding points only for correct answers. A progress_entry record is written for every answered exercise. This phase delivers the backend engine — no UI (that's Phase 30).

</domain>

<decisions>
## Implementation Decisions

### Exercise Generation Architecture
- **D-01:** Use Next.js Server Actions for exercise generation and answer validation — consistent with Phase 10 auth pattern, no separate API routes needed
- **D-02:** Exercise generation is a set of pure functions in `lib/exercises/` — easy to unit test, no Supabase dependency in generation logic
- **D-03:** Each exercise is generated on-demand (one at a time per request) — no batch pre-generation, keeps state minimal
- **D-04:** Exercise shape: `{ id: string, operand1: number, operand2: number, operator: '+' | '-' | '*' | '/', correctAnswer: number }` — ID is a UUID for tracking

### Curriculum per Grade (from PROJECT.md)
- **D-05:** Klasse 1: Addition und Subtraktion im Zahlenraum bis 20
- **D-06:** Klasse 2: Addition und Subtraktion im Zahlenraum bis 100
- **D-07:** Klasse 3: Multiplikation und Division (kleines Einmaleins, Zahlen 1-10)
- **D-08:** Klasse 4: Gemischte Operationen (+, -, *, /), Zahlenraum bis 1000
- **D-09:** Division results are always whole numbers (no remainders) — age-appropriate for Grundschule
- **D-10:** Subtraction results are always >= 0 (no negative numbers)

### Difficulty Progression
- **D-11:** 3 Schwierigkeitsstufen: leicht, mittel, schwer
- **D-12:** Leicht: kleinerer Zahlenraum innerhalb der Klassenstufe (z.B. Kl.1: bis 10, Kl.2: bis 50)
- **D-13:** Mittel: voller Zahlenraum der Klassenstufe
- **D-14:** Schwer: oberer Bereich des Zahlenraums + gemischte Operationen wo möglich
- **D-15:** Aufstieg: 3 richtige Antworten in Folge → nächste Stufe
- **D-16:** Abstieg: 2 falsche Antworten in Folge → vorherige Stufe (nicht unter leicht)
- **D-17:** Schwierigkeitsstufe ist session-basiert (wird nicht in DB gespeichert, resettet bei neuem Start)

### Point System
- **D-18:** Basispunkte pro richtige Antwort: 10
- **D-19:** Schwierigkeitsmultiplikator: leicht = 1x (10 Pkt), mittel = 2x (20 Pkt), schwer = 3x (30 Pkt)
- **D-20:** Falsche Antworten: 0 Punkte (kein Punkteabzug — Motivation statt Bestrafung)
- **D-21:** Punkte werden in `progress_entries.points_earned` gespeichert

### API Contract
- **D-22:** Server Action `generateExercise(grade: number, difficulty: 'easy' | 'medium' | 'hard')` → returns Exercise object
- **D-23:** Server Action `submitAnswer(exerciseId: string, answer: number)` → returns `{ correct: boolean, correctAnswer: number, pointsEarned: number, newDifficulty: string }`
- **D-24:** submitAnswer schreibt immer einen `progress_entry` Record (richtig oder falsch)
- **D-25:** submitAnswer berechnet die neue Schwierigkeitsstufe basierend auf der Streak (Client sendet currentDifficulty + streak mit)

### Claude's Discretion
- Exact number ranges per difficulty tier within each grade
- Exercise ID generation strategy (UUID v4 or similar)
- Whether to use a separate exercises module or inline in actions
- Error handling for invalid grades or missing auth
- Test strategy (unit tests for generators, integration for Server Actions)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/supabase/server.ts` — Server-side Supabase client for DB writes
- `lib/supabase/admin.ts` — Admin client (not needed here, children write own progress via RLS)
- `types/database.types.ts` — TypeScript types for all tables including `progress_entries`

### Established Patterns
- Server Actions in `app/*/actions.ts` with Zod validation (from Phase 10)
- Supabase client helpers with cookie-based sessions
- Test infrastructure: Vitest for unit/integration, Playwright for E2E

### Integration Points
- `progress_entries` table: child_id, operation_type, grade, correct, points_earned, created_at
- RLS policy: children can insert their own progress_entries
- `profiles.grade_level` determines which exercises a child gets

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Exercise generation follows standard Grundschule math curriculum.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
