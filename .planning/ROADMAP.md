# Roadmap: Matheapp

## Overview

Deliver an MVP math learning web app for German Grundschule (grades 1-4) within a 2-4 week university project deadline. The build follows a vertical-slice approach: foundation first (auth, schema, roles), then the core learning loop (exercise engine, child dashboard, points), then the reward layer (mini-game), then the teacher-facing and business-model layers (teacher dashboard, subscription gate), and finally university documentation artifacts. Each phase produces a testable, working increment.

## Milestone: v1.0 MVP

**Goal:** A deployable web app where children log in, solve grade-appropriate math exercises, earn points toward a mini-game reward, teachers view class progress, and a simulated subscription gate demonstrates the B2B model -- plus all university documentation deliverables.

## Phases

**Phase Numbering:**
- Integer phases (10, 20, 30...): Planned milestone work
- Decimal phases (e.g., 20.1): Urgent insertions (marked with INSERTED)

- [x] **Phase 10: Foundation** - Project scaffolding, Supabase auth with child-appropriate login, database schema with RLS, role-based routing (completed 2026-04-17)
- [x] **Phase 20: Exercise Engine** - Server-side math exercise generation and validation for all four grade levels with difficulty tiers (completed 2026-04-18)
- [x] **Phase 30: Child Dashboard & Learning Session** - Child-facing UI for exercise sessions, points display, progress tracking, and immediate feedback (completed 2026-04-18)
- [ ] **Phase 40: Mini-Game Reward** - Points threshold gate and a single timeboxed mini-game unlocked as reward for correct answers
- [ ] **Phase 50: Teacher Dashboard** - Class overview with per-student progress, accuracy by operation type, and activity tracking
- [ ] **Phase 60: Subscription Gate** - Simulated B2B subscription model with Klasse 4 content gated behind a tier check and upgrade prompt
- [ ] **Phase 70: University Documentation** - Marktanalyse, Forschungsfrage, UML/BPMN diagrams, and technical implementation documentation

## Phase Details

### Phase 10: Foundation
**Goal**: A running Next.js application where children and teachers can log in with role-appropriate credentials, sessions persist, and the database schema enforces data isolation through RLS
**Depends on**: Nothing (first phase)
**Requirements**: REQ-01
**Success Criteria** (what must be TRUE):
  1. A child can log in using a simple PIN or username+PIN (no email required) and reach the child dashboard route
  2. A teacher can log in with email+password and reach the teacher dashboard route
  3. A logged-out user visiting any protected route is redirected to the login page
  4. A child cannot access teacher routes, and a teacher cannot access child routes (middleware + RLS enforced)
  5. The database schema (profiles, classes, schools, progress_entries) exists with RLS policies active
**Plans**: 9 plans
**Plan list**:
- [x] 10-01-PLAN.md — Supabase cloud project + .env.local env-var contract (checkpoint)
- [x] 10-02-PLAN.md — Next.js 15.2 scaffolding + shadcn/ui init + route groups
- [x] 10-03-PLAN.md — Vitest + Playwright Wave-0 infrastructure (all test files scaffolded)
- [x] 10-04-PLAN.md — Supabase client/server/middleware/admin helpers + PIN-email mapping
- [x] 10-05-PLAN.md — DB migrations (schema + RLS + teacher trigger) + [BLOCKING] supabase db push
- [x] 10-06-PLAN.md — Zod schemas + Server Actions (childLogin, teacherLogin, teacherSignup, logoutAction)
- [x] 10-07-PLAN.md — /login + /registrieren pages with role toggle, PIN grid, three forms
- [x] 10-08-PLAN.md — Next.js middleware.ts + stub /kind/dashboard + /lehrer/dashboard
- [x] 10-09-PLAN.md — E2E + integration tests (SC-1 through SC-5) + human UI signoff

**Waves**:
- Wave 1: 10-01 (env setup checkpoint)
- Wave 2: 10-02, 10-03 (parallel: scaffolding + test infra)
- Wave 3: 10-04, 10-05 (parallel: Supabase clients + DB schema)
- Wave 4: 10-06 (server actions, needs types from 05)
- Wave 5: 10-07, 10-08 (parallel: login pages + middleware/dashboards)
- Wave 6: 10-09 (tests + human verification)
**UI hint**: yes

### Phase 20: Exercise Engine
**Goal**: The server can generate grade-appropriate math exercises with tiered difficulty and validate answers server-side, awarding points only for correct answers
**Depends on**: Phase 10
**Requirements**: REQ-02
**Success Criteria** (what must be TRUE):
  1. API generates exercises matching the curriculum for each grade: addition/subtraction within 20 (Kl.1), within 100 (Kl.2), multiplication/division kleines Einmaleins (Kl.3), mixed operations in larger number range (Kl.4)
  2. Each exercise set starts at easy difficulty and progresses to harder problems based on consecutive correct answers
  3. Answer validation happens server-side only -- the client sends the raw answer, the server determines correctness and awards points
  4. A progress_entry record is written to the database for every answered exercise (correct or incorrect, with operation type, grade, and timestamp)
**Plans**: 2 plans
**Plan list**:
- [x] 20-01-PLAN.md — TDD pure exercise engine: types, config, generators, difficulty, points (all 4 grades)
- [x] 20-02-PLAN.md — Zod schemas + Server Actions (generateExercise, submitAnswer) + integration tests

**Waves**:
- Wave 1: 20-01 (pure functions + unit tests, no DB dependency)
- Wave 2: 20-02 (Server Actions + Supabase integration, depends on 20-01)

### Phase 30: Child Dashboard & Learning Session
**Goal**: Children can see their points and progress, start exercise sessions, answer questions with age-appropriate UI, and receive immediate visual feedback
**Depends on**: Phase 20
**Requirements**: REQ-01, REQ-03 (points display portion)
**Success Criteria** (what must be TRUE):
  1. Child sees a dashboard showing current points total, progress toward the next mini-game unlock, and their grade level
  2. Child can start an exercise session and answer questions using large on-screen number buttons (no keyboard required)
  3. Each answer produces immediate visual feedback: green for correct (points awarded), red for incorrect (correct answer shown)
  4. After a session, the dashboard reflects updated points and exercise count
  5. The UI uses large text, bold colors, and touch-friendly targets appropriate for ages 6-10
**Plans**: 3 plans
**Plan list**:
- [x] 30-01-PLAN.md — Dashboard Server Component: theme colors, ProgressBar, DashboardStats, Supabase aggregate queries
- [x] 30-02-PLAN.md — Exercise Session Client Components: NumberPad, FeedbackOverlay, ExerciseSession state machine, ueben page
- [x] 30-03-PLAN.md — E2E tests (dashboard + exercise session) + human visual verification checkpoint

**Waves**:
- Wave 1: 30-01, 30-02 (parallel: dashboard + exercise session, no file overlap)
- Wave 2: 30-03 (E2E tests + human verification, depends on both Wave 1 plans)
**UI hint**: yes

### Phase 40: Mini-Game Reward
**Goal**: Children who earn enough points through correct answers can unlock and play a single mini-game as a reward, creating the core motivation loop
**Depends on**: Phase 30
**Requirements**: REQ-03
**Success Criteria** (what must be TRUE):
  1. A progress bar or visual indicator shows the child how many more points they need to unlock the mini-game
  2. When points reach the threshold, the mini-game becomes accessible from the child dashboard
  3. The mini-game is playable, fun for ages 6-10, and lasts 1-3 minutes (timeboxed scope: CSS/React-based or simple canvas game, no game engine)
  4. Playing the mini-game consumes points, requiring the child to solve more exercises to play again
  5. The mini-game does NOT award points or write to the progress store -- it is purely a reward
**Plans**: TBD
**UI hint**: yes

### Phase 50: Teacher Dashboard
**Goal**: Teachers can view meaningful progress data for their class, answering the questions they actually care about: who is struggling, who is inactive, and how the class performs by operation type
**Depends on**: Phase 20 (progress data must exist in DB)
**Requirements**: REQ-04
**Success Criteria** (what must be TRUE):
  1. Teacher sees a class overview table with each student's name, total points, exercises completed, and accuracy percentage
  2. Teacher can identify students who have not practiced recently (last activity date visible)
  3. Teacher can see accuracy broken down by operation type (addition, subtraction, multiplication, division) per student
  4. All data is scoped to the teacher's own class via RLS -- no cross-class data leakage
**Plans**: TBD
**UI hint**: yes

### Phase 60: Subscription Gate
**Goal**: Grade 4 content is gated behind a simulated subscription check, demonstrating the B2B freemium model (Klasse 1-3 free, Klasse 4 requires paid tier)
**Depends on**: Phase 10 (auth + schools table)
**Requirements**: REQ-05
**Success Criteria** (what must be TRUE):
  1. A child in Klasse 1-3 can access all exercises without restriction
  2. A child in Klasse 4 at a free-tier school is redirected to an upgrade prompt when accessing exercises
  3. The upgrade prompt displays simulated subscription packages with pricing (no real payment)
  4. A "simulated checkout" button sets the school's tier to paid in the database, immediately unlocking Klasse 4 content
  5. A demo/test account exists that can bypass the gate for evaluation purposes
**Plans**: TBD
**UI hint**: yes

### Phase 70: University Documentation
**Goal**: All required university deliverables are complete: market analysis, research question, UML/BPMN diagrams, and technical documentation of the implementation
**Depends on**: Phase 50 (most features must be built to document them accurately)
**Requirements**: REQ-06, REQ-07, REQ-08, REQ-09
**Success Criteria** (what must be TRUE):
  1. A Marktanalyse document covers competitors (Anton, Mathegym, Sofatutor), market potential, and product positioning
  2. A Forschungsfrage is stated and derived with supporting reasoning
  3. UML diagrams (class diagram, sequence diagrams for core flows) and at least one BPMN diagram exist
  4. Technical documentation describes the architecture, tech stack decisions, and implementation steps
**Plans**: TBD

## Requirements Mapping

| ID | Requirement | Phase | Status |
|----|-------------|-------|--------|
| REQ-01 | Kinder konnen sich einloggen und ihren Fortschritt sehen | Phase 10, 30 | Pending |
| REQ-02 | Mathe-Aufgaben nach Klassenstufe (1-4) mit Grundrechenarten | Phase 20 | Pending |
| REQ-03 | Punktesystem mit Mini-Game als Belohnung | Phase 30, 40 | Pending |
| REQ-04 | Lehrer-Dashboard fur Klassenfortschritt | Phase 50 | Pending |
| REQ-05 | Simuliertes Abo-Modell (Klasse 1-3 kostenlos, ab Klasse 4 Abo-Auswahl) | Phase 60 | Pending |
| REQ-06 | Marktanalyse mit Konkurrenz, Potenziale, Positionierung | Phase 70 | Pending |
| REQ-07 | Forschungsfrage und Ableitung | Phase 70 | Pending |
| REQ-08 | UML/BPMN-Diagramme der Anwendung | Phase 70 | Pending |
| REQ-09 | Technische Dokumentation der Umsetzungsschritte | Phase 70 | Pending |

**Coverage: 9/9 requirements mapped. No orphans.**

Note on split requirements:
- REQ-01 spans Phase 10 (login) and Phase 30 (see progress). Phase 10 delivers the login capability; Phase 30 delivers the "see progress" part through the child dashboard.
- REQ-03 spans Phase 30 (points display) and Phase 40 (mini-game reward). Phase 30 delivers the points system; Phase 40 delivers the mini-game unlock mechanism.

## Progress

**Execution Order:**
Phases execute in numeric order: 10 -> 20 -> 30 -> 40 -> 50 -> 60 -> 70
Note: Phase 50 and 60 could run in parallel after Phase 30 if desired (both depend on earlier phases, not on each other).

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 10. Foundation | 9/9 | Complete    | 2026-04-17 |
| 20. Exercise Engine | 2/2 | Complete    | 2026-04-18 |
| 30. Child Dashboard & Learning Session | 3/3 | Complete   | 2026-04-18 |
| 40. Mini-Game Reward | 0/TBD | Not started | - |
| 50. Teacher Dashboard | 0/TBD | Not started | - |
| 60. Subscription Gate | 0/TBD | Not started | - |
| 70. University Documentation | 0/TBD | Not started | - |
