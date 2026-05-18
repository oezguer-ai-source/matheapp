# Matheapp

Mathe-Lern-App fuer Grundschulkinder mit getrenntem Kinder- und Lehrer-Bereich.

## Stack

- **Next.js 15** (App Router, Turbopack), **React 19**, **TypeScript**
- **Supabase** (Auth, Postgres, RLS) — Clients in `lib/supabase/`
- **Tailwind CSS** + **shadcn/ui** (Style new-york, Base slate, Icons lucide)
- Tests: **Vitest** (Unit/Integration), **Playwright** (E2E)

Route-Gruppen: `app/(child)/kind/**` (Kinder) und `app/(teacher)/lehrer/**` (Lehrer).
Server-Actions liegen pro Feature-Ordner in `actions.ts`.

## Sprache

Alle Antworten und Ausgaben auf **Deutsch**.

## Team aus Subagents — Delegations-Regeln

Die Haupt-Session ist der **operative Projektleiter** und delegiert jede Aufgabe an den
passenden Spezialisten (Definitionen in `.claude/agents/`):

| Aufgabe | Subagent | Name |
|---|---|---|
| Design, Styling, Tailwind, shadcn, Design-Tokens, Animationen | `designer` | Mara |
| Schema, Migration, RLS, Supabase-Client, Zod-Schemas, DB-Typen | `datenbank` | Theo |
| Kinder-Features & -Logik (Ueben, Games, Avatar, Streaks, Chat) | `schueler-bereich` | Lina |
| Lehrer-Features & -Logik (Dashboard, Klassen, Aufgaben, Auswertung) | `lehrer-bereich` | Felix |
| Unklare, grosse oder mehrteilige Aufgabe (mehrere Domaenen) | `projektleiter` | Paul |

Bei mehrteiligen Aufgaben erst `projektleiter` (Paul) konsultieren, dann gemaess seinem
Plan delegieren. Paul ist read-only und plant nur — er kann selbst keine Subagents
starten. Die Haupt-Session fuehrt seinen Delegations-Plan aus.

## Konventionen

- Neue Server-Actions in `actions.ts` des jeweiligen Feature-Ordners.
- Neue Supabase-Migrations: neue Datei mit Timestamp-Praefix, bestehende nie editieren.
- Jede neue Tabelle braucht RLS-Policies.
- `.env.local` niemals committen; `lib/supabase/admin.ts` (Service-Role) nur server-seitig.
- Tests: `npm test` (Vitest), `npm run test:e2e` (Playwright), `npm run test:all`.
