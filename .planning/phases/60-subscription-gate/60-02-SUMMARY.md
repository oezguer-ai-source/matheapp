---
phase: 60-subscription-gate
plan: 02
subsystem: subscription
tags: [subscription, gate, tests, rls, e2e, integration]
dependency_graph:
  requires: [subscription-gate, upgrade-page, demo-tier, child-school-rls]
  provides: [subscription-gate-tests, rls-fix, child-class-rls]
  affects: [rls-policies, schools-table, classes-table]
tech_stack:
  added: []
  patterns: [integration-test-with-isolated-seed, e2e-playwright-with-admin-setup, security-definer-rls-helper]
key_files:
  created:
    - tests/integration/subscription-gate.test.ts
    - tests/e2e/subscription-gate.spec.ts
    - supabase/migrations/20260418000003_fix_school_rls_recursion.sql
  modified: []
decisions:
  - "private.user_school_id() als SECURITY DEFINER Helper statt inline Subquery in RLS Policy"
  - "child_reads_own_class Policy notwendig damit Subscription-Queries via anon Client funktionieren"
  - "Eigene Seed-Daten (SUB_TEST_*, SUB_E2E_*) pro Test-Suite zur Isolation (T-60-05)"
metrics:
  duration: 689s
  completed: 2026-04-18T15:15:21Z
  tasks: 2
  files: 3
---

# Phase 60 Plan 02: Subscription Gate Tests Summary

Integration- und E2E-Tests fuer Subscription-Gate mit RLS-Policy-Bugfixes (infinite recursion + fehlende child_reads_own_class Policy).

## Task Completion

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Integration-Tests (Gate-Logik + Upgrade-Action + RLS) | 4cb81ac | tests/integration/subscription-gate.test.ts, supabase/migrations/20260418000003_fix_school_rls_recursion.sql |
| 2 | E2E-Tests (Gate-Redirect + Upgrade-Flow) | 8d0a1c1 | tests/e2e/subscription-gate.spec.ts, supabase/migrations/20260418000003_fix_school_rls_recursion.sql |
| 3 | Visuelle Verifikation (Checkpoint) | -- | Auto-approved (auto_advance=true) |

## What Was Built

### Integration-Tests (Task 1) -- 16 Tests, alle bestanden

1. **isGated pure function** (8 Tests): Klasse 1-3 nie blockiert, Klasse 4 nur bei 'free', demo durchgelassen (D-12)
2. **getSchoolSubscriptionTier DB** (3 Tests): Korrekte Tier-Aufloesung ueber profiles -> classes -> schools Pfad
3. **RLS policies** (3 Tests): Kind liest eigene Schule, Kind updated eigene Schule, Kind blockiert bei fremder Schule
4. **Upgrade flow** (2 Tests): free -> grundschule via Kind-Client, invalide Tier-Werte vom CHECK-Constraint abgelehnt

### E2E-Tests (Task 2) -- 4 Tests, alle bestanden

1. **Gate-Redirect**: Klasse-4-Kind an free-Schule wird von /kind/ueben zu /kind/upgrade umgeleitet, Abo-Pakete mit Preisen sichtbar
2. **Upgrade-Flow**: Klick auf "Jetzt freischalten" setzt Tier und leitet zu /kind/ueben mit ExerciseSession
3. **Kein Gate (Klasse 1-3)**: Klasse-2-Kind sieht Aufgaben direkt ohne Redirect
4. **Demo-Bypass**: Klasse-4-Kind an Demo-Schule (tier='demo') sieht Aufgaben direkt

### RLS-Bugfixes (Migration 20260418000003)

Drei Bugs in den Plan-60-01 RLS-Policies gefunden und behoben:
1. **Infinite recursion (42P17)**: Original-Policies JOINten schools innerhalb einer Policy AUF schools
2. **RLS auf classes blockierte Kinder**: Subquery auf classes hatte keine Kind-Policy
3. **Fix**: `private.user_school_id()` SECURITY DEFINER Helper + `child_reads_own_class` Policy

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RLS infinite recursion in child_reads_own_school / child_upgrades_own_school**
- **Found during:** Task 1
- **Issue:** Original RLS-Policies aus Plan 60-01 JOINten `public.schools` innerhalb einer Policy auf `public.schools`, was PostgreSQL-Fehler 42P17 (infinite recursion) verursachte
- **Fix:** SECURITY DEFINER Funktion `private.user_school_id()` erstellt, die den school_id-Lookup kapselt; Policies nutzen jetzt `id = (SELECT private.user_school_id())` statt inline JOINs
- **Files modified:** supabase/migrations/20260418000003_fix_school_rls_recursion.sql
- **Commit:** 4cb81ac

**2. [Rule 1 - Bug] Fehlende child_reads_own_class RLS-Policy**
- **Found during:** Task 2
- **Issue:** `getSchoolSubscriptionTier()` und `upgradeSubscriptionAction()` lesen `classes` via anon-key Client. Kinder hatten keine RLS-Policy auf `classes` -- nur Lehrer konnten Klassen lesen. Dadurch gaben die Queries null zurueck und der Gate-Check konnte nicht funktionieren.
- **Fix:** `child_reads_own_class` Policy hinzugefuegt: Kinder koennen ihre eigene Klasse lesen via `private.user_class_id()` Helper
- **Files modified:** supabase/migrations/20260418000003_fix_school_rls_recursion.sql
- **Commit:** 8d0a1c1

## Threat Mitigations Applied

| Threat ID | Mitigation | Implementation |
|-----------|-----------|----------------|
| T-60-05 | Eindeutige Testnamen + afterAll cleanup | SUB_TEST_*, SUB_E2E_* Prefixe, dedizierte Cleanup-Funktionen |

## Known Stubs

Keine -- alle Tests sind vollstaendig verdrahtet und bestehen.

## Self-Check: PASSED

- All 3 created files verified on disk
- Both task commits (4cb81ac, 8d0a1c1) verified in git log
- Line counts: integration 424 (min 80), e2e 272 (min 50)
