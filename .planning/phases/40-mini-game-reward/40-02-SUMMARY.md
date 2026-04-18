---
phase: 40-mini-game-reward
plan: 02
subsystem: child-minigame
tags: [balloon-game, css-animations, game-loop, client-components]
dependency_graph:
  requires: []
  provides: [BalloonGame, Balloon, GameOverScreen, balloon-css-animations]
  affects: [app/globals.css]
tech_stack:
  added: []
  patterns: [css-keyframes-animation, react-game-loop, client-only-state]
key_files:
  created:
    - components/child/balloon-game.tsx
    - components/child/balloon.tsx
    - components/child/game-over-screen.tsx
  modified:
    - app/globals.css
decisions:
  - "CSS @keyframes for balloon animations (rise + pop) registered in Tailwind @theme block"
  - "Balloon cleanup uses createdAt timestamp comparison instead of onAnimationEnd for reliability"
  - "GameOverScreen uses <a href> instead of next/link for full page navigation (server component refresh)"
  - "Game score is purely client-side, no persistence (SC-5 compliance)"
metrics:
  duration: 2min
  completed: "2026-04-18T14:06:12Z"
  tasks: 2
  files: 4
---

# Phase 40 Plan 02: Balloon Game UI Components Summary

Ballonplatzen-Minispiel mit CSS-Animationen, Balloon/GameOverScreen-Komponenten und BalloonGame-Hauptkomponente mit vollstaendigem Game Loop (idle/starting/playing/over).

## Completed Tasks

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | CSS-Animationen + Balloon + GameOverScreen | d365462 | globals.css, balloon.tsx, game-over-screen.tsx |
| 2 | BalloonGame Haupt-Komponente mit Game Loop | 1dc2870 | balloon-game.tsx |

## What Was Built

### CSS-Animationen (globals.css)
- `balloon-rise` Keyframes: Ballon steigt von 100vh nach -20vh mit linearer Animation
- `balloon-pop` Keyframes: Ballon skaliert auf 1.4x und verschwindet in 300ms
- `--animate-balloon-rise` und `--animate-balloon-pop` im @theme Block registriert
- Variable Geschwindigkeit via `--balloon-speed` CSS Custom Property

### Balloon-Komponente (balloon.tsx)
- Klickbarer Button mit `type="button"` und `onPop` Handler
- Absolute Positionierung mit variabler X-Position und Geschwindigkeit
- `will-change: transform` fuer GPU-beschleunigte Animation
- Visueller Ballon-Knoten am unteren Ende
- `aria-label` fuer Accessibility

### GameOverScreen-Komponente (game-over-screen.tsx)
- Zeigt Score: "{score} Ballons geplatzt!"
- "Zurueck zum Dashboard" als `<a href>` (volle Page-Navigation, kein next/link)
- Touch-friendly Button (min-h 48px, h-16)
- Froehliches Design mit bg-yellow-50

### BalloonGame-Hauptkomponente (balloon-game.tsx)
- Vollstaendiger Game Loop: idle -> starting -> playing -> over
- `startGameAction()` wird VOR Spielbeginn aufgerufen (Punkt-Abzug via Server Action)
- Ballon-Spawning: alle 800ms, max 12 gleichzeitig, zufaellige Position/Farbe/Geschwindigkeit
- 7 verschiedene Ballon-Farben aus der Kind-UI-Palette
- Score-Counter oben links, Timer (75s) oben rechts, beide mit bg-white/80 Overlay
- Automatisches Spielende bei Timer = 0
- Balloon-Cleanup entfernt Ballons nach ihrer Animations-Dauer
- Alle useEffect-Cleanups vorhanden (keine Memory Leaks)
- Kein direkter Supabase-Import (T-40-05 Mitigation)
- MAX_BALLOONS = 12 Cap (T-40-06 Mitigation)

## Deviations from Plan

None - plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation | Verified |
|-----------|-----------|----------|
| T-40-05 (Tampering) | Kein Supabase-Import in balloon-game.tsx, Score rein client-seitig | grep confirms no supabase import |
| T-40-06 (DoS) | MAX_BALLOONS = 12 Cap verhindert DOM-Overflow | grep confirms MAX_BALLOONS constant |

## Known Stubs

None - all components are fully functional with real data flow.

## Self-Check: PASSED

All 4 files verified on disk. Both commit hashes (d365462, 1dc2870) found in git log.
