# Phase 10: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 10-foundation
**Mode:** --auto (all decisions auto-selected with recommended defaults)
**Areas discussed:** Kinder-Login-Methode, Supabase-Auth-Strategie, Datenbankschema, UI-Grundlagen

---

## Kinder-Login-Methode

| Option | Description | Selected |
|--------|-------------|----------|
| Nur PIN | Kind gibt nur eine PIN ein, kein Benutzername | |
| Benutzername + PIN | Kind gibt Anzeigename + 4-stellige PIN ein | ✓ |
| Code-basiert | Lehrkraft generiert Einmalcodes | |

**User's choice:** [auto] Benutzername + PIN (empfohlener Default)
**Notes:** Lehrkraft erstellt Kinder-Accounts. Supabase erhält generierte E-Mail hinter den Kulissen.

---

## Supabase-Auth-Strategie

| Option | Description | Selected |
|--------|-------------|----------|
| Generierte E-Mail + PIN als Passwort | Login-Formular zeigt nur Username+PIN, Backend übersetzt zu signInWithPassword | ✓ |
| Custom Auth Provider | Eigener Auth-Flow ohne Supabase Auth | |
| Magic Link via Lehrkraft | Lehrkraft generiert Login-Links | |

**User's choice:** [auto] Generierte E-Mail + PIN als Passwort (empfohlener Default)
**Notes:** Einfachster Ansatz, der Supabase Auth unverändert nutzt.

---

## Datenbankschema

| Option | Description | Selected |
|--------|-------------|----------|
| STACK.md-Schema übernehmen | profiles, classes, schools, progress_entries mit RLS | ✓ |
| Minimales Schema | Nur profiles + progress, keine schools/classes | |
| Erweitertes Schema | Zusätzliche Tabellen für Achievements, Badges etc. | |

**User's choice:** [auto] STACK.md-Schema übernehmen (empfohlener Default)
**Notes:** Schools-Tabelle wird für Phase 60 (Abo-Modell) vorbereitet.

---

## UI-Grundlagen

| Option | Description | Selected |
|--------|-------------|----------|
| Tailwind + getrennte Route-Gruppen | (child) mit Custom-Tailwind, (teacher) mit shadcn/ui | ✓ |
| Einheitliche Component Library | Eine Library für beide Zielgruppen | |
| CSS Modules | Klassisches CSS-Module-Approach | |

**User's choice:** [auto] Tailwind + getrennte Route-Gruppen (empfohlener Default)
**Notes:** Kinder-UI braucht komplett andere visuelle Sprache als Lehrer-Dashboard.

---

## Claude's Discretion

- Farbpalette, Login-Layout, RLS-SQL-Syntax, Error Messages, Loading States

## Deferred Ideas

Keine — Diskussion blieb im Phase-Scope.
