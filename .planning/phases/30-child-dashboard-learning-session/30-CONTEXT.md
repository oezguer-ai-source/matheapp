# Phase 30: Child Dashboard & Learning Session - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Children can see their points and progress, start exercise sessions, answer questions with age-appropriate UI, and receive immediate visual feedback. This phase delivers the complete child-facing learning experience — dashboard + exercise session UI. Connects to the exercise engine from Phase 20.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Layout
- **D-01:** Dashboard route: `/kind/dashboard` (bereits als Stub in Phase 10 angelegt)
- **D-02:** Dashboard zeigt: Gesamtpunkte, Fortschritt zum Mini-Game-Unlock, Klassenstufe, Anzahl gelöster Aufgaben
- **D-03:** Mini-Game-Unlock-Fortschritt als visueller Balken (z.B. "150/500 Punkte bis zum Spiel")
- **D-04:** "Aufgaben starten"-Button prominent auf dem Dashboard — primäre Call-to-Action
- **D-05:** Dashboard lädt Punkte aus der Datenbank (Summe von progress_entries.points_earned)

### Exercise Session UI
- **D-06:** Session-Route: `/kind/ueben` — eigene Seite, kein Modal
- **D-07:** Aufgabe wird groß angezeigt: "7 + 3 = ?" mit großen Zahlen (text-4xl oder größer)
- **D-08:** Antwort-Eingabe über große On-Screen-Nummernbuttons (0-9) — kein Keyboard nötig
- **D-09:** Nummernpad-Layout: 3x3 Grid (1-9) + 0 + Löschen + Bestätigen
- **D-10:** Antwort-Display zeigt eingetippte Ziffern in Echtzeit
- **D-11:** "Beenden"-Button jederzeit sichtbar um Session zu beenden → zurück zum Dashboard

### Visual Feedback
- **D-12:** Richtig: Grüner Hintergrund-Flash + "Richtig! +X Punkte" mit Punkteanimation
- **D-13:** Falsch: Roter Hintergrund-Flash + "Leider falsch. Die Antwort ist: X"
- **D-14:** Feedback wird 1.5-2 Sekunden angezeigt, dann automatisch nächste Aufgabe
- **D-15:** Aktuelle Session-Statistik sichtbar: richtig/falsch Counter, aktuelle Schwierigkeitsstufe

### Styling (Kind-UI)
- **D-16:** Raw Tailwind CSS — kein shadcn/ui (D-17 aus Phase 10: Kind-UI ist custom)
- **D-17:** Große Texte (min text-2xl, Aufgaben text-4xl+), rounded-2xl Buttons
- **D-18:** Kräftige, fröhliche Farben: Gelb (#FFC107), Grün (#4CAF50), Rot (#F44336), Blau (#2196F3)
- **D-19:** Touch-friendly: alle interaktiven Elemente mindestens 48px (besser 56px)
- **D-20:** Mobile-first: funktioniert auf Tablets und Handys (Kinder nutzen oft Tablets)

### Data Flow
- **D-21:** Dashboard: Server Component lädt Punkte via Supabase Query (sum progress_entries)
- **D-22:** Exercise Session: Client Component ruft Server Actions (generateExerciseAction, submitAnswerAction) auf
- **D-23:** Schwierigkeitsstufe und Streak werden im Client-State gehalten (React useState)
- **D-24:** Nach Session-Ende: Dashboard wird neu geladen (router.refresh()) um aktualisierte Punkte zu zeigen

### Claude's Discretion
- Exact layout proportions and spacing
- Animation implementation (CSS transitions vs framer-motion vs simple state toggles)
- Exact shade variations within the given color palette
- Whether to use SVG icons or emoji for visual elements
- Loading states and skeleton UI during data fetching

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/(child)/kind/dashboard/page.tsx` — Stub-Dashboard aus Phase 10 (muss erweitert werden)
- `app/(child)/kind/ueben/actions.ts` — Server Actions aus Phase 20 (generateExerciseAction, submitAnswerAction)
- `lib/exercises/types.ts` — Exercise, ClientExercise, Difficulty types
- `lib/supabase/server.ts` — Server-side Supabase client
- `components/child/logout-button.tsx` — Bestehendes Logout-Button-Component

### Established Patterns
- Kind-Route-Group: `app/(child)/kind/` mit raw Tailwind
- Server Actions Pattern: Zod validation → auth check → business logic → DB write
- Middleware: session check + role routing

### Integration Points
- `progress_entries` Tabelle: Punkte summieren für Dashboard
- `profiles.grade_level`: bestimmt welche Aufgaben generiert werden
- Server Actions aus Phase 20: generateExerciseAction, submitAnswerAction

</code_context>

<specifics>
## Specific Ideas

- Nummernpad soll sich wie ein Taschenrechner anfühlen — große, klare Buttons
- Kinder zwischen 6-10 Jahren — UI muss ohne Lesen auskommen (Icons + große Zahlen)
- Fortschrittsbalken zum Mini-Game motiviert zum Weitermachen

</specifics>

<deferred>
## Deferred Ideas

- Mini-Game selbst ist Phase 40 — hier nur der Fortschrittsbalken
- Erweiterte Statistiken (Tages-/Wochenverlauf) sind Phase 50 (Teacher Dashboard)
- Sounds/Audio-Feedback — nice-to-have, nicht im MVP

</deferred>
