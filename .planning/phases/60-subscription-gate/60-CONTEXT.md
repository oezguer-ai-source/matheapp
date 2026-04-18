# Phase 60: Subscription Gate - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

Grade 4 content is gated behind a simulated subscription check. Klasse 1-3 free, Klasse 4 requires paid tier. A simulated checkout button sets the school's tier to paid. Demo/test account bypasses the gate.

</domain>

<decisions>
## Implementation Decisions

### Gate Logic
- **D-01:** Gate prüft `schools.subscription_tier` via Supabase Query (Server Component)
- **D-02:** Kinder in Klasse 1-3 werden nie blockiert — kein Gate-Check nötig
- **D-03:** Kinder in Klasse 4 an free-Schulen sehen Upgrade-Prompt statt Übungen
- **D-04:** Gate-Check in `/kind/ueben` Server Component, VOR dem Laden der Exercise Session
- **D-05:** Kein Middleware-Gate — zu teuer für jeden Request, prüfe nur auf der Übungsseite

### Upgrade Flow
- **D-06:** Upgrade-Seite unter `/kind/upgrade` — zeigt simulierte Abo-Pakete
- **D-07:** Drei Pakete: "Grundschulniveau" (9.99€/Monat), "Förderung" (14.99€/Monat), "Experte" (19.99€/Monat)
- **D-08:** "Jetzt freischalten"-Button pro Paket → Server Action setzt `schools.subscription_tier = 'paid'`
- **D-09:** Kein echtes Payment — der Button setzt direkt die DB
- **D-10:** Nach Upgrade → Redirect zu `/kind/ueben`
- **D-11:** Upgrade-Seite nutzt die Kind-UI-Sprache (große Schrift, einfach)

### Demo/Test Bypass
- **D-12:** Wenn `schools.subscription_tier = 'demo'` → Gate wird übersprungen
- **D-13:** Bestehender Test-Account kann als Demo-Account funktionieren

### Teacher View
- **D-14:** Lehrer sehen den Abo-Status ihrer Schule im Dashboard (kleiner Badge)
- **D-15:** Optional: Lehrer können auch upgraden (aber Hauptflow ist über Kind)

### Claude's Discretion
- Exaktes Layout der Abo-Pakete (Cards, Grid)
- Animations/Transitions beim Upgrade
- Genaue Texte auf der Upgrade-Seite
- Ob die Pakete echte Feature-Unterschiede zeigen oder nur Preis-Differenzierung

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `schools` Tabelle hat bereits `subscription_tier` Spalte (TEXT, Default 'free')
- `app/(child)/kind/ueben/page.tsx` — Übungsseite die gegated werden muss
- Server Action Pattern aus Phase 20/40

### Established Patterns
- Server Components für Daten-Checks
- Server Actions für DB-Writes
- Kind-UI: raw Tailwind, große Schrift, Touch-friendly

### Integration Points
- `profiles.class_id` → `classes.school_id` → `schools.subscription_tier`
- `/kind/ueben` ist der Eintrittspunkt für Übungen
- Lehrer-Dashboard zeigt bereits Schulinfos

</code_context>

<specifics>
## Specific Ideas

- Upgrade soll sich "echt" anfühlen — professionelle Paketauswahl wie echte SaaS
- Kein echter Payment-Flow — nur ein Klick und es ist freigeschaltet
- Demo-Modus für die Uni-Präsentation wichtig

</specifics>

<deferred>
## Deferred Ideas

- Echte Stripe/PayPal Integration — außerhalb MVP
- Verschiedene Feature-Level pro Paket — nur visuell, nicht funktional
- Admin-Panel für Abo-Verwaltung

</deferred>
