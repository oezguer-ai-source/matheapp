---
phase: 60-subscription-gate
plan: 01
subsystem: subscription
tags: [subscription, gate, upgrade, rls, teacher-badge]
dependency_graph:
  requires: [init-schema, rls-policies, exercise-session, teacher-dashboard]
  provides: [subscription-gate, upgrade-page, demo-tier, child-school-rls]
  affects: [ueben-page, teacher-dashboard]
tech_stack:
  added: []
  patterns: [server-action-form, rls-chain-lookup, gate-redirect]
key_files:
  created:
    - supabase/migrations/20260418000002_add_demo_tier_and_child_school_read.sql
    - lib/subscription/queries.ts
    - app/(child)/kind/upgrade/page.tsx
    - app/(child)/kind/upgrade/actions.ts
  modified:
    - app/(child)/kind/ueben/page.tsx
    - app/(teacher)/lehrer/dashboard/page.tsx
decisions:
  - "SubscriptionTier als String-Union statt Enum fuer Einfachheit"
  - "isGated als pure Function getrennt von Query fuer Testbarkeit"
  - "textColor explizit in allen Paketen statt optionalem Feld (TS as-const Kompatibilitaet)"
metrics:
  duration: 200s
  completed: 2026-04-18T14:57:49Z
  tasks: 2
  files: 6
---

# Phase 60 Plan 01: Subscription Gate Summary

Subscription-Gate fuer Klasse-4-Inhalte mit DB-Migration (demo-Tier), RLS-Policies, Gate-Check, Upgrade-Seite mit simuliertem Checkout und Teacher-Abo-Badge.

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB-Migration + RLS + Subscription-Query-Helper | 6572e71 | supabase/migrations/20260418000002_*.sql, lib/subscription/queries.ts |
| 2 | Gate-Check + Upgrade-Seite + Server Action + Teacher-Badge | b33bb08 | app/(child)/kind/ueben/page.tsx, app/(child)/kind/upgrade/page.tsx, app/(child)/kind/upgrade/actions.ts, app/(teacher)/lehrer/dashboard/page.tsx |

## What Was Built

### DB-Migration (Task 1)
- CHECK-Constraint um 'demo' erweitert fuer Test/Demo-Accounts
- RLS-Policy `child_reads_own_school`: Kinder koennen ihre Schule lesen (class_id -> school_id Pfad)
- RLS-Policy `child_upgrades_own_school`: Kinder koennen subscription_tier ihrer Schule updaten (simulierter Checkout)

### Subscription-Query-Helper (Task 1)
- `getSchoolSubscriptionTier()`: Laedt Tier ueber profiles -> classes -> schools Pfad
- `isGated()`: Pure Function — blockiert nur bei Klasse 4 + free Tier
- `SubscriptionTier` Type Export

### Gate-Check in ueben/page.tsx (Task 2)
- Nach Profile-Laden: Subscription-Check via getSchoolSubscriptionTier + isGated
- Klasse 1-3: kein Gate (isGated gibt false)
- Klasse 4 + free: redirect zu /kind/upgrade
- Klasse 4 + demo/paid: kein Gate

### Upgrade-Seite (Task 2)
- 3 Abo-Pakete: Grundschulniveau (9,99), Foerderung (14,99), Experte (19,99)
- Kind-UI: grosse Schrift, touch-friendly Buttons, responsive Grid
- Jeder Button ruft upgradeSubscriptionAction mit Tier-Wert auf

### Server Action (Task 2)
- Tier-Validierung gegen Allowlist (T-60-01)
- Auth-Check vor DB-Operation (T-60-03)
- Profil -> Klasse -> Schule Aufloesungskette
- Supabase UPDATE auf schools.subscription_tier (RLS-geschuetzt, T-60-02)
- Redirect zu /kind/ueben nach Erfolg

### Teacher-Badge (Task 2)
- Abo-Status-Badge im Lehrer-Dashboard unter Klassennamen
- Gruen fuer bezahlte Tiers, grau fuer free
- Zeigt "Kostenlos" oder Paketnamen

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript-Fehler bei optionalem textColor**
- **Found during:** Task 2
- **Issue:** `as const` Array mit optionalem `textColor` Feld verursachte TS2339 weil Property nicht in allen Union-Membern existiert
- **Fix:** `textColor` explizit in allen Paketen definiert statt optionalem Feld
- **Files modified:** app/(child)/kind/upgrade/page.tsx
- **Commit:** b33bb08

## Threat Mitigations Applied

| Threat ID | Mitigation | Implementation |
|-----------|-----------|----------------|
| T-60-01 | Tier-Wert Allowlist | VALID_TIERS Array in actions.ts |
| T-60-02 | RLS auf eigene Schule | child_upgrades_own_school Policy in Migration |
| T-60-03 | Auth-Check | supabase.auth.getUser() in actions.ts |
| T-60-04 | Akzeptiert | Kind sieht nur eigene Schule via RLS |

## Known Stubs

Keine — alle Datenquellen sind verdrahtet.

## Self-Check: PASSED

- All 6 created/modified files verified on disk
- Both task commits (6572e71, b33bb08) verified in git log
