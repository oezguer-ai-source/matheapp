# Phase 40: Mini-Game Reward - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

Children who earn enough points through correct answers can unlock and play a single mini-game as a reward, creating the core motivation loop. The mini-game is CSS/React-based (no game engine), playable, fun for ages 6-10, and lasts 1-3 minutes. Playing consumes points, requiring more exercises to play again.

</domain>

<decisions>
## Implementation Decisions

### Mini-Game Type
- **D-01:** Bubble Pop / Ballonplatzen — Kinder tippen auf aufsteigende Ballons um sie platzen zu lassen. Einfach zu implementieren mit CSS-Animationen, sofort verständlich für Kinder 6-10.
- **D-02:** Rein visuell/spielerisch — keine Mathe-Aufgaben im Mini-Game (es ist eine Belohnung, kein Lernen)
- **D-03:** Zeitlimit von 60-90 Sekunden, dann automatisches Ende mit Score-Anzeige
- **D-04:** Implementierung mit React State + CSS Animations (kein Canvas, kein Game-Engine)

### Game Mechanics
- **D-05:** Ballons steigen von unten nach oben mit zufälliger Geschwindigkeit und Position
- **D-06:** Tippen/Klicken auf einen Ballon = Platz-Animation + Punkt
- **D-07:** Verschiedene Ballonfarben (bunt, fröhlich — gleiche Farbpalette wie Kind-UI)
- **D-08:** Einfacher Score-Counter oben am Bildschirm
- **D-09:** Ende-Screen zeigt Ballon-Score und "Zurück zum Dashboard"-Button

### Points & Unlock
- **D-10:** MINIGAME_THRESHOLD bleibt bei 500 Punkten (bereits in lib/config/rewards.ts)
- **D-11:** "Spiel starten"-Button auf Dashboard wird aktiv wenn Punkte >= Threshold
- **D-12:** Spiel starten zieht MINIGAME_THRESHOLD Punkte ab (Server Action, nicht Client)
- **D-13:** Punkt-Abzug via Server Action mit DB-Write (neue Tabelle oder negative progress_entry)
- **D-14:** Nach Punkt-Abzug muss das Kind wieder Aufgaben lösen um erneut zu spielen

### Route & Navigation
- **D-15:** Mini-Game Route: `/kind/spiel` — eigene Seite
- **D-16:** Nur erreichbar wenn Punkte >= Threshold (Server-Side Check, kein Client-only Gate)
- **D-17:** Nach dem Spiel: Button "Zurück zum Dashboard" → `/kind/dashboard`
- **D-18:** Middleware prüft NICHT den Punkt-Stand (zu teuer) — die Seite selbst prüft beim Laden

### Claude's Discretion
- Exact balloon animation timing, easing, and count
- Color selection for individual balloons
- Sound effects (optional, nice-to-have)
- Exact layout and typography on game-over screen
- Whether balloons have varying sizes

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/config/rewards.ts` — MINIGAME_THRESHOLD = 500
- `components/child/dashboard-stats.tsx` — ProgressBar zeigt bereits "Spiel freigeschaltet!" wenn Punkte >= Threshold
- `app/(child)/kind/dashboard/page.tsx` — Dashboard mit Punkte-Abfrage
- `app/(child)/kind/ueben/actions.ts` — Server Action Pattern (Zod + auth + DB)

### Established Patterns
- Kind-Route-Group: `app/(child)/kind/`
- Client Components mit "use client" für interaktive Elemente
- Server Actions für DB-Writes (Zod validation → auth → business logic → DB)
- Tailwind CSS ohne shadcn/ui im Kind-Bereich
- Touch-friendly Buttons (min 48px)

### Integration Points
- Dashboard: "Spiel starten"-Link/Button wenn freigeschaltet
- progress_entries: Punkt-Summe prüfen und Punkte abziehen
- Middleware: `/kind/spiel` muss als Kind-Route erkannt werden (bereits in Route-Group)

</code_context>

<specifics>
## Specific Ideas

- Ballonplatzen ist universell verständlich — keine Erklärung nötig für Kinder
- Zeitlimit sorgt für ein definiertes Ende (kein endloses Spielen)
- PITFALLS.md warnt: Mini-Game auf max 2 Tage Implementierung begrenzen

</specifics>

<deferred>
## Deferred Ideas

- Mehrere Mini-Games zur Auswahl — nur eines im MVP
- Highscore-Liste — nicht im MVP
- Sound-Effekte — nice-to-have, nicht priorisiert
- Animierte Partikel beim Platzen — nur wenn Zeit übrig

</deferred>
