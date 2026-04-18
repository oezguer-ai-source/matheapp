---
phase: 40-mini-game-reward
plan: 01
subsystem: minigame-gating
tags: [server-action, migration, gating, dashboard]
dependency_graph:
  requires: [progress_entries, profiles, rewards-config]
  provides: [minigame_redeem-operation, startGameAction, spiel-page, dashboard-game-button]
  affects: [child-dashboard, progress_entries-schema]
tech_stack:
  added: []
  patterns: [server-side-gating, negative-point-entry, conditional-rendering]
key_files:
  created:
    - supabase/migrations/20260418000001_add_minigame_redeem_operation.sql
    - app/(child)/kind/spiel/actions.ts
    - app/(child)/kind/spiel/page.tsx
  modified:
    - app/(child)/kind/dashboard/page.tsx
decisions:
  - "minigame_redeem als negativer progress_entry statt separater Tabelle -- einfacher, konsistent mit bestehendem Punktesystem"
  - "Server-Side Redirect statt Client-Side Check fuer Punkt-Gating (Sicherheit, D-16)"
metrics:
  duration: 2min
  completed: 2026-04-18
  tasks_completed: 3
  tasks_total: 3
---

# Phase 40 Plan 01: Server-seitiges Punkt-Gating und Punkt-Abzug Summary

Server-seitiges Punkt-Gating mit negativem progress_entry (-500) fuer Minigame-Einloesung, DB-Migration fuer minigame_redeem Constraint, und konditionaler Spiel-Button im Dashboard.

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB-Migration + Server Action + Spiel-Seite | 50b5d6c | migrations/20260418000001, spiel/actions.ts, spiel/page.tsx |
| 2 | supabase db push --linked | PENDING | (checkpoint:human-action) |
| 3 | Dashboard-Integration -- Spiel-starten-Button | 0d01e84 | dashboard/page.tsx |

## What Was Built

### DB-Migration (Task 1)
- Erweitert CHECK Constraint auf `progress_entries.operation_type` um `'minigame_redeem'`
- Ermoeglicht negative Punkt-Eintraege fuer Spiel-Einloesung

### Server Action startGameAction (Task 1)
- Auth-Check via `getUser()`
- Punkt-Summe serverseitig berechnet (reduce-Pattern wie Dashboard)
- Race Condition Guard: prueft `totalPoints >= 500` vor INSERT
- Schreibt negativen progress_entry: `points_earned: -MINIGAME_THRESHOLD`
- `revalidatePath("/kind/dashboard")` fuer Cache-Invalidierung

### Spiel-Seite /kind/spiel (Task 1)
- Server Component mit Auth-Check
- Server-Side Punkt-Gating: redirect zu `/kind/dashboard` wenn `totalPoints < 500`
- Rendert `<BalloonGame currentPoints={totalPoints} />` (Komponente wird in Plan 02 erstellt)

### Dashboard Game Button (Task 3)
- Konditionaler Button zwischen "Aufgaben starten" und Logout
- Aktiv (Link zu `/kind/spiel`, bg-child-yellow) wenn `totalPoints >= MINIGAME_THRESHOLD`
- Deaktiviert (bg-slate-200, cursor-not-allowed) wenn unter Threshold

## Pending: DB Push (Task 2)

Die Migration-Datei ist committed, aber muss noch auf die verknuepfte Supabase-Instanz gepusht werden:

```bash
cd <projekt-root>
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push --linked
```

## Deviations from Plan

### Task-Reihenfolge Anpassung
Task 3 (Dashboard-Integration) wurde vor dem Task 2 Checkpoint ausgefuehrt, da es rein lokaler Code ist und nicht von der DB-Migration auf der Cloud abhaengt. Dies ermoeglicht dem Benutzer, nach dem DB push sofort alle Features nutzen zu koennen.

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| app/(child)/kind/spiel/page.tsx | 6 | `import BalloonGame from "@/components/child/balloon-game"` | Komponente wird in Plan 40-02 erstellt |

## Threat Surface

Alle Threat-Mitigations aus dem Plan wurden implementiert:
- T-40-01: Server Action prueft Punkte vor INSERT (Race Condition Guard)
- T-40-02: Server Component redirect bei unzureichenden Punkten
- T-40-04: Auth-Check via getUser() in Server Action und Spiel-Seite

## Self-Check: PASSED

- All 5 files verified present on disk
- Commit 50b5d6c (Task 1) verified in git log
- Commit 0d01e84 (Task 3) verified in git log
- Task 2 (DB push) pending -- checkpoint:human-action
