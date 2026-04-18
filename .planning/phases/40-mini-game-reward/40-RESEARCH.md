# Phase 40: Mini-Game Reward - Research

**Researched:** 2026-04-18
**Domain:** React Client-Component Game (CSS Animations) + Server Action Points Gate
**Confidence:** HIGH

## Summary

Phase 40 implementiert ein Ballonplatzen-Minispiel als Belohnung fuer Kinder, die genug Punkte gesammelt haben. Die Architektur teilt sich in drei klar getrennte Bereiche: (1) eine Server Action fuer den Punkt-Abzug beim Spielstart, (2) eine Server-Seite `/kind/spiel` die den Punkt-Stand prueft und das Spiel-Gating erzwingt, und (3) eine Client-Komponente `BalloonGame` die das eigentliche Spiel mit React State und CSS-Animationen realisiert.

Das bestehende Codebase bietet bereits die wesentlichen Integrationspunkte: `MINIGAME_THRESHOLD` (500 Punkte) in `lib/config/rewards.ts`, eine `ProgressBar`-Komponente die "Spiel freigeschaltet!" anzeigt, und ein etabliertes Server-Action-Pattern aus Phase 20/30 (Zod-Validierung, Auth-Check, DB-Write). Die `progress_entries`-Tabelle erlaubt negative `points_earned`-Werte, was den Punkt-Abzug als negative progress_entry erleichtert -- keine DB-Migration noetig.

Der kritische Aspekt: Das Spiel ist rein visuell/spielerisch, schreibt keine Punkte, und endet automatisch nach 60-90 Sekunden. Die bestehende Prototype-Game-Route (`app/(child)/game/`) und der `usePoints`-Hook (localStorage-basiert) werden NICHT wiederverwendet -- sie folgen einem veralteten Pattern. Stattdessen wird die neue `/kind/spiel`-Route mit Server-Action-basiertem Punkt-Abzug gebaut.

**Primary recommendation:** Server Action `startGameAction` prueft Punkte >= 500, zieht Punkte als negative `progress_entry` ab, und die `/kind/spiel`-Seite prueft beim Server-Render ob genuegend Punkte vorhanden sind (kein Client-only Gate). Das Ballonspiel selbst ist eine reine Client-Komponente ohne Server-Kommunikation waehrend des Spiels.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Bubble Pop / Ballonplatzen -- Kinder tippen auf aufsteigende Ballons um sie platzen zu lassen. Einfach zu implementieren mit CSS-Animationen, sofort verstaendlich fuer Kinder 6-10.
- **D-02:** Rein visuell/spielerisch -- keine Mathe-Aufgaben im Mini-Game (es ist eine Belohnung, kein Lernen)
- **D-03:** Zeitlimit von 60-90 Sekunden, dann automatisches Ende mit Score-Anzeige
- **D-04:** Implementierung mit React State + CSS Animations (kein Canvas, kein Game-Engine)
- **D-05:** Ballons steigen von unten nach oben mit zufaelliger Geschwindigkeit und Position
- **D-06:** Tippen/Klicken auf einen Ballon = Platz-Animation + Punkt
- **D-07:** Verschiedene Ballonfarben (bunt, froehlich -- gleiche Farbpalette wie Kind-UI)
- **D-08:** Einfacher Score-Counter oben am Bildschirm
- **D-09:** Ende-Screen zeigt Ballon-Score und "Zurueck zum Dashboard"-Button
- **D-10:** MINIGAME_THRESHOLD bleibt bei 500 Punkten (bereits in lib/config/rewards.ts)
- **D-11:** "Spiel starten"-Button auf Dashboard wird aktiv wenn Punkte >= Threshold
- **D-12:** Spiel starten zieht MINIGAME_THRESHOLD Punkte ab (Server Action, nicht Client)
- **D-13:** Punkt-Abzug via Server Action mit DB-Write (neue Tabelle oder negative progress_entry)
- **D-14:** Nach Punkt-Abzug muss das Kind wieder Aufgaben loesen um erneut zu spielen
- **D-15:** Mini-Game Route: `/kind/spiel` -- eigene Seite
- **D-16:** Nur erreichbar wenn Punkte >= Threshold (Server-Side Check, kein Client-only Gate)
- **D-17:** Nach dem Spiel: Button "Zurueck zum Dashboard" -> `/kind/dashboard`
- **D-18:** Middleware prueft NICHT den Punkt-Stand (zu teuer) -- die Seite selbst prueft beim Laden

### Claude's Discretion
- Exact balloon animation timing, easing, and count
- Color selection for individual balloons
- Sound effects (optional, nice-to-have)
- Exact layout and typography on game-over screen
- Whether balloons have varying sizes

### Deferred Ideas (OUT OF SCOPE)
- Mehrere Mini-Games zur Auswahl -- nur eines im MVP
- Highscore-Liste -- nicht im MVP
- Sound-Effekte -- nice-to-have, nicht priorisiert
- Animierte Partikel beim Platzen -- nur wenn Zeit uebrig
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-03 | Punktesystem mit Mini-Game als Belohnung | Server Action fuer Punkt-Abzug, ProgressBar-Update auf Dashboard, `/kind/spiel` Route mit Server-Side Gating, BalloonGame Client-Komponente mit CSS-Animationen und Zeitlimit |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Punkt-Gating (>= 500) | Frontend Server (SSR) | -- | Server Component prueft Punkte beim Laden der `/kind/spiel`-Seite; kein Client-only Gate (D-16) |
| Punkt-Abzug | API / Backend (Server Action) | Database | Server Action schreibt negative progress_entry; DB-Ebene speichert den Abzug (D-12, D-13) |
| Balloon Game Rendering | Browser / Client | -- | Rein interaktive Komponente mit React State + CSS-Animationen; keine Server-Kommunikation waehrend des Spiels (D-04) |
| Dashboard "Spiel starten"-Button | Frontend Server (SSR) | Browser / Client | Server Component berechnet Punkt-Summe und rendert den Button aktiv/inaktiv; Link-Navigation (D-11) |
| Progress Bar Updates | Frontend Server (SSR) | -- | Bereits implementiert in `components/child/dashboard-stats.tsx`; zeigt "Spiel freigeschaltet!" (SC-1) |

## Standard Stack

### Core (bereits im Projekt installiert)

| Library | Version (installiert) | Purpose | Why Standard |
|---------|----------------------|---------|--------------|
| Next.js | 15.2.9 | SSR, Routing, Server Actions | Bereits im Projekt, Route `/kind/spiel` in bestehender Route Group [VERIFIED: node_modules] |
| React | 19.2.5 | Client Component fuer Spiel-Logik | useState/useEffect fuer Game Loop, "use client" Pattern [VERIFIED: node_modules] |
| Tailwind CSS | 4.2.2 | CSS-Animationen, Styling | `@keyframes` und `--animate-*` in `@theme` Block fuer Ballon-Animation [VERIFIED: tailwindcss.com/docs/animation] |
| Zod | 4.3.6 | Server Action Validierung | Bestehendes Pattern: Zod-Schema -> safeParse -> Auth -> Business Logic -> DB [VERIFIED: node_modules] |
| Supabase JS | 2.103.3+ | DB-Zugriff fuer Punkt-Abfrage/-Abzug | createClient aus `lib/supabase/server.ts` [VERIFIED: node_modules] |

### Supporting (bereits im Projekt)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 1.8.0+ | Icons (optional fuer Game UI) | Game-Over Screen, evtl. Back-Button Icon [VERIFIED: package.json] |
| tw-animate-css | 1.4.0 | CSS Animation Utilities | Bereits installiert, kann fuer Standard-Animationen genutzt werden [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS @keyframes | Framer Motion | Overkill fuer einfache Ballon-Animation; wuerde neue Dependency hinzufuegen. CSS reicht. |
| React State Game Loop | Canvas/WebGL | Nicht noetig (D-04 schliesst Canvas explizit aus); React State genuegt fuer ~15 gleichzeitige Ballons |
| Negative progress_entry | Separate game_sessions Tabelle | Separate Tabelle waere sauberer, aber unnoetig fuer MVP; negative progress_entry vermeidet DB-Migration |

**Installation:** Keine neuen Packages noetig. Alles bereits vorhanden.

## Architecture Patterns

### System Architecture Diagram

```
[Kind Dashboard] ──> "Spiel starten" Link
        │
        ▼
[/kind/spiel (Server Component)] ──> Supabase: SUM(points_earned) >= 500?
        │                                      │
        │ nein ◄──────────────────────────────┘
        │ ──> redirect("/kind/dashboard")
        │
        │ ja
        ▼
[BalloonGame Client Component]
        │
        │ User klickt "Spiel starten"
        ▼
[startGameAction (Server Action)]
        │
        ├─ Zod Validierung
        ├─ Auth Check (getUser)
        ├─ SUM(points_earned) >= 500 ? (Race Condition Guard)
        ├─ INSERT progress_entry (points_earned = -500, operation_type = 'minigame_redeem')
        └─ Return { success: true }
        │
        ▼
[Balloon Game Loop (Client-only)]
        ├─ Timer: 60-90 Sekunden Countdown
        ├─ Ballons steigen von unten nach oben (CSS @keyframes)
        ├─ Klick/Touch = Platz-Animation + Score++
        └─ Timer = 0 → Game Over Screen
                │
                ▼
        [Game Over Screen]
        └─ "Zurueck zum Dashboard" → /kind/dashboard
```

### Recommended Project Structure

```
app/(child)/kind/spiel/
├── page.tsx              # Server Component: Punkt-Check, redirect wenn zu wenig
└── actions.ts            # Server Action: startGameAction (Punkt-Abzug)

components/child/
├── balloon-game.tsx      # "use client" — Haupt-Spielkomponente (Game Loop)
├── balloon.tsx           # Einzelner Ballon mit CSS-Animation
└── game-over-screen.tsx  # Ende-Bildschirm mit Score

lib/config/
└── rewards.ts            # MINIGAME_THRESHOLD = 500 (bereits vorhanden)

lib/schemas/
└── game.ts               # Zod-Schema fuer startGameAction (optional, minimales Schema)

app/globals.css           # @keyframes balloon-rise + @theme --animate-balloon-rise
```

### Pattern 1: Server-Side Points Gate (D-16)

**What:** Die `/kind/spiel`-Seite prueft beim Server-Render ob genug Punkte vorhanden sind.
**When to use:** Beim Laden der Spiel-Seite -- verhindert direkten URL-Zugriff ohne Punkte.

```typescript
// Source: Bestehende Patterns aus app/(child)/kind/dashboard/page.tsx
// app/(child)/kind/spiel/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MINIGAME_THRESHOLD } from "@/lib/config/rewards";
import { BalloonGame } from "@/components/child/balloon-game";

export default async function SpielPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entries } = await supabase
    .from("progress_entries")
    .select("points_earned")
    .eq("child_id", user.id);

  const totalPoints = (entries ?? []).reduce(
    (sum, e) => sum + (e.points_earned ?? 0), 0
  );

  if (totalPoints < MINIGAME_THRESHOLD) {
    redirect("/kind/dashboard");
  }

  return <BalloonGame currentPoints={totalPoints} />;
}
```

### Pattern 2: Server Action fuer Punkt-Abzug (D-12, D-13)

**What:** Server Action die Punkte prueft und als negative progress_entry abzieht.
**When to use:** Wenn das Kind "Spiel starten" klickt, VOR dem eigentlichen Spielbeginn.

```typescript
// Source: Bestehendes Pattern aus app/(child)/kind/ueben/actions.ts
// app/(child)/kind/spiel/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { MINIGAME_THRESHOLD } from "@/lib/config/rewards";

export async function startGameAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nicht angemeldet." };

  // Re-check points (race condition guard)
  const { data: entries } = await supabase
    .from("progress_entries")
    .select("points_earned")
    .eq("child_id", user.id);

  const totalPoints = (entries ?? []).reduce(
    (sum, e) => sum + (e.points_earned ?? 0), 0
  );

  if (totalPoints < MINIGAME_THRESHOLD) {
    return { success: false, error: "Nicht genug Punkte." };
  }

  // Fetch grade for the progress_entry record
  const { data: profile } = await supabase
    .from("profiles")
    .select("grade_level")
    .eq("user_id", user.id)
    .single();

  // Insert negative progress_entry as point deduction
  const { error: insertError } = await supabase
    .from("progress_entries")
    .insert({
      child_id: user.id,
      operation_type: "minigame_redeem",
      grade: profile?.grade_level ?? 1,
      correct: true,
      points_earned: -MINIGAME_THRESHOLD,
    });

  if (insertError) {
    return { success: false, error: "Fehler beim Speichern." };
  }

  return { success: true };
}
```

### Pattern 3: Balloon Game Client Component (D-04, D-05, D-06)

**What:** Reine Client-Komponente mit React State fuer Game Loop.
**When to use:** Nach erfolgreicher Server Action. Keine Server-Kommunikation waehrend des Spiels.

```typescript
// components/child/balloon-game.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Balloon {
  id: number;
  x: number;        // horizontal position (%)
  color: string;     // Tailwind color class
  speed: number;     // animation duration in seconds
  size: number;      // balloon size multiplier
  popped: boolean;
}

const COLORS = [
  "bg-child-yellow",
  "bg-child-green",
  "bg-child-blue",
  "bg-child-red",
  "bg-pink-400",
  "bg-purple-400",
  "bg-orange-400",
];

const GAME_DURATION = 75; // Sekunden (Mitte von 60-90)
const SPAWN_INTERVAL = 800; // ms zwischen Ballon-Spawns
const MAX_BALLOONS = 12;

// [Vereinfachtes Beispiel - vollstaendige Implementierung in Plan]
```

### Pattern 4: CSS Balloon Animation (Tailwind v4)

**What:** Custom `@keyframes` in `globals.css` fuer aufsteigende Ballons.
**When to use:** Tailwind v4 nutzt `@theme` Block fuer Custom Animations.

```css
/* Source: [VERIFIED: tailwindcss.com/docs/animation] */
/* app/globals.css — am Ende hinzufuegen */

@theme inline {
  /* ... bestehende Werte ... */
  --animate-balloon-rise: balloon-rise var(--balloon-speed, 6s) linear forwards;
  --animate-balloon-pop: balloon-pop 0.3s ease-out forwards;
}

@keyframes balloon-rise {
  0% {
    transform: translateY(100vh) scale(1);
    opacity: 1;
  }
  85% {
    opacity: 1;
  }
  100% {
    transform: translateY(-20vh) scale(1);
    opacity: 0;
  }
}

@keyframes balloon-pop {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.4);
    opacity: 0.5;
  }
  100% {
    transform: scale(0);
    opacity: 0;
  }
}
```

### Pattern 5: Dashboard Integration (D-11)

**What:** "Spiel starten"-Button auf dem Dashboard, aktiv nur wenn Punkte >= Threshold.
**When to use:** Erweiterung der bestehenden Dashboard-Seite.

```typescript
// In app/(child)/kind/dashboard/page.tsx — nach "Aufgaben starten" Link
{totalPoints >= MINIGAME_THRESHOLD ? (
  <Link
    href="/kind/spiel"
    className="h-16 flex items-center justify-center rounded-2xl bg-child-yellow text-slate-900 text-3xl font-semibold hover:opacity-90 ..."
  >
    Spiel starten
  </Link>
) : (
  <div className="h-16 flex items-center justify-center rounded-2xl bg-slate-200 text-slate-400 text-3xl font-semibold cursor-not-allowed">
    Spiel starten
  </div>
)}
```

### Anti-Patterns to Avoid

- **Client-only Punkt-Pruefung:** NIEMALS den Punkt-Stand nur client-seitig pruefen. Ein Kind koennte direkt zu `/kind/spiel` navigieren. Server-Side Check ist Pflicht (D-16).
- **Server-Kommunikation waehrend des Spiels:** Das Spiel laeuft 60-90 Sekunden rein client-seitig. Keine Fetch-Calls, keine Server Actions waehrend des Spielens. Die einzige Server Action ist VOR dem Spiel (Punkt-Abzug).
- **Punkte aus dem Spiel zurueckschreiben:** Das Mini-Game ist rein Belohnung (D-02). Es darf KEINE Punkte zurueckschreiben (SC-5). Der Ballon-Score ist nur visuell, nicht persistent.
- **Canvas/Game-Engine:** D-04 schliesst Canvas explizit aus. React State + CSS Animations sind die einzige Option.
- **usePoints Hook wiederverwenden:** Der bestehende `lib/usePoints.ts` nutzt localStorage -- das ist das alte Prototype-Pattern. NICHT verwenden. Punkt-Daten kommen aus Supabase via Server Component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ballon-Animation (aufsteigen) | JS-basierte Position-Updates via setInterval | CSS `@keyframes` + `animation` Property | CSS-Animationen laufen auf dem Compositor-Thread, performanter als JS. Weniger State-Management. |
| Zufall fuer Position/Geschwindigkeit | Eigener Zufallsalgorithmus | `Math.random()` | Fuer ein Kinderspiel voellig ausreichend. Kein Seed oder Reproduzierbarkeit noetig. |
| Touch Event Handling | Eigenes Touch-Event-System | Standard `onClick` / `onPointerDown` | React normalisiert Events bereits. Touch und Click werden gleichermassen behandelt. |
| Timer/Countdown | `setInterval` mit manueller Cleanup | `useEffect` + `setTimeout` Chain oder `requestAnimationFrame` | useEffect-Cleanup verhindert Memory Leaks. setTimeout-Chain ist praeziser als setInterval. |
| Punkt-Summe berechnen | SUM-Query in SQL | Client-seitiges reduce ueber entries | Supabase PostgREST bietet keine aggregate functions. Das bestehende Pattern (`entries.reduce()`) funktioniert. |

**Key insight:** Das gesamte Spiel ist ein reines Frontend-Feature. Die einzige Backend-Interaktion ist der Punkt-Abzug via Server Action vor dem Spiel. Waehrend des Spiels: null Server-Kommunikation.

## Common Pitfalls

### Pitfall 1: Race Condition beim Punkt-Abzug
**What goes wrong:** Kind oeffnet zwei Tabs, klickt in beiden "Spiel starten" -- doppelter Punkt-Abzug oder Spiel ohne genug Punkte.
**Why it happens:** Zwischen Punkt-Check und INSERT liegt ein Zeitfenster.
**How to avoid:** Die Server Action prueft Punkte nochmals (Double-Check Pattern). Bei MVP akzeptabel -- kein echtes Geld involviert. Fuer echte Produktion waere ein DB-Level Lock noetig.
**Warning signs:** Negative Punkt-Summe in der Datenbank.

### Pitfall 2: operation_type Constraint Violation
**What goes wrong:** INSERT mit `operation_type = 'minigame_redeem'` scheitert weil die Tabelle einen CHECK Constraint hat: `operation_type in ('addition', 'subtraktion', 'multiplikation', 'division')`.
**Why it happens:** Die bestehende Schema-Migration beschraenkt operation_type auf 4 Werte.
**How to avoid:** DB-Migration hinzufuegen die den CHECK Constraint erweitert: `ALTER TABLE progress_entries DROP CONSTRAINT ...; ALTER TABLE progress_entries ADD CONSTRAINT ... CHECK (operation_type IN ('addition', 'subtraktion', 'multiplikation', 'division', 'minigame_redeem'));` [VERIFIED: Schema in 20260415000001_init_schema.sql]
**Warning signs:** Supabase INSERT Error bei startGameAction.

### Pitfall 3: Zu viele Ballons gleichzeitig = Performance-Problem
**What goes wrong:** Auf aelteren Tablets/Phones ruckelt die Animation wenn zu viele DOM-Elemente animiert werden.
**Why it happens:** Jeder Ballon ist ein DOM-Element mit CSS-Animation. Ab ~20+ gleichzeitig wird es langsam.
**How to avoid:** Maximum 12-15 gleichzeitige Ballons. Abgelaufene Ballons (die den oberen Rand erreicht haben) sofort aus dem State entfernen. `will-change: transform` auf Ballon-Elementen setzen.
**Warning signs:** FPS-Drops auf dem Smartphone, Lag zwischen Touch und visueller Reaktion.

### Pitfall 4: Prototype-Code wird nicht entfernt
**What goes wrong:** Die alten Routes `/dashboard`, `/exercise`, `/game` und der `usePoints`-Hook bleiben im Codebase.
**Why it happens:** Diese Files stammen von einem fruehen Prototyp und nutzen localStorage statt Supabase.
**How to avoid:** Optional Cleanup-Task: `app/(child)/dashboard/`, `app/(child)/exercise/`, `app/(child)/game/`, `lib/usePoints.ts` entfernen. Nicht blockierend fuer Phase 40, aber wuenschenswert.
**Warning signs:** Build-Warnings ueber unused imports.

### Pitfall 5: Dashboard-Cache zeigt alte Punkte
**What goes wrong:** Nach Punkt-Abzug zeigt das Dashboard noch die alten Punkte.
**Why it happens:** Next.js cached Server Components. Wenn die Spiel-Seite redirect zum Dashboard macht, koennte der Cache stale sein.
**How to avoid:** `router.refresh()` oder `revalidatePath("/kind/dashboard")` in der startGameAction. Der "Zurueck zum Dashboard"-Link sollte eine volle Page-Navigation sein (kein client-side Router), damit der Server Component neu rendert.
**Warning signs:** Punkte auf Dashboard stimmen nicht mit DB ueberein.

### Pitfall 6: Scope Creep -- Spiel wird zu komplex
**What goes wrong:** Feature-Creep: Partikel, Sounds, Levels, Power-Ups...
**Why it happens:** Spiele sind "nie fertig". PITFALLS.md warnt: max 2 Tage.
**How to avoid:** Strikt an D-01 bis D-09 halten. Kein Sound, keine Partikel, keine Levels. Nur: Ballons steigen, Kind klickt, Score zaehlt, Timer laeuft ab, Ende.
**Warning signs:** Mehr als 2 Dateien fuer Spiel-Logik, Animations-Code > 100 Zeilen.

## Code Examples

### Balloon Element mit CSS-Animation

```tsx
// Source: Tailwind v4 @theme pattern [VERIFIED: tailwindcss.com/docs/animation]
// components/child/balloon.tsx
"use client";

interface BalloonProps {
  id: number;
  x: number;
  color: string;
  speed: number;
  onPop: (id: number) => void;
}

export function Balloon({ id, x, color, speed, onPop }: BalloonProps) {
  return (
    <button
      type="button"
      onClick={() => onPop(id)}
      className={`absolute bottom-0 w-16 h-20 rounded-full ${color} animate-balloon-rise cursor-pointer active:animate-balloon-pop`}
      style={{
        left: `${x}%`,
        ["--balloon-speed" as string]: `${speed}s`,
      }}
      aria-label="Ballon platzen lassen"
    >
      {/* Ballon-Knoten */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-2 h-3 bg-slate-400 rounded-b-full" />
    </button>
  );
}
```

### Server Action mit revalidatePath

```typescript
// Source: Bestehendes Pattern [VERIFIED: app/(child)/kind/ueben/actions.ts]
// Vollstaendiges Beispiel -- in Architecture Patterns > Pattern 2 oben gezeigt
```

### Dashboard Button (bedingt aktiv)

```tsx
// Source: Bestehendes Dashboard Pattern [VERIFIED: app/(child)/kind/dashboard/page.tsx]
import { MINIGAME_THRESHOLD } from "@/lib/config/rewards";

// Im Dashboard JSX:
const gameUnlocked = totalPoints >= MINIGAME_THRESHOLD;

// Konditionaler Button -- Link wenn freigeschaltet, div wenn gesperrt
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage-basierte Punkte (`usePoints.ts`) | Supabase progress_entries (Server Component) | Phase 30 (2026-04-18) | Prototype-Code (`/dashboard`, `/exercise`, `/game`) ist obsolet |
| Tailwind v3 `tailwind.config.js` Animation | Tailwind v4 `@theme` Block in `globals.css` | Tailwind v4 (2025) | Keyframes werden direkt in CSS definiert, nicht in JS-Config |
| React Client Components fuer alles | Server Components + Client Islands | Next.js 15 / React 19 | Punkt-Check als Server Component, Spiel als "use client" Island |

**Deprecated/outdated:**
- `lib/usePoints.ts`: localStorage-basierter Hook -- ersetzt durch Supabase-basierte Server-Queries in Phase 30
- `app/(child)/game/page.tsx`: Prototype-Minispiel "Sternen-Jaeger" -- wird durch `/kind/spiel` mit BalloonGame ersetzt
- `app/(child)/dashboard/page.tsx` und `app/(child)/exercise/page.tsx`: Alte Prototype-Routes -- `kind/`-Routes sind die aktiven

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `progress_entries.operation_type` CHECK Constraint muss erweitert werden fuer 'minigame_redeem' | Pitfall 2 | INSERT schlaegt fehl -- Server Action liefert Fehler. Einfacher DB-Migration Fix. |
| A2 | Negative `points_earned` Werte sind in progress_entries erlaubt (kein CHECK >= 0) | Architecture Patterns | Wenn negativer Wert geblockt wird: braeuchte separate Tabelle oder ALTER TABLE. Schema-Pruefung zeigt keinen solchen Constraint. [VERIFIED: 20260415000001_init_schema.sql -- kein CHECK auf points_earned Vorzeichen] |
| A3 | 12-15 gleichzeitige CSS-animierte DOM-Elemente performen gut auf Schul-Tablets | Pitfall 3 | Ruckeln auf sehr alten Geraeten. Fallback: Balloon-Limit auf 8 reduzieren. |
| A4 | `tw-animate-css` (bereits installiert) bietet keine Balloon-spezifische Animation -- Custom @keyframes noetig | Standard Stack | Wenn doch vorhanden: Custom keyframes waeren ueberfluessig, aber nicht schaedlich. |

**Fazit:** A2 ist verifiziert (kein CHECK auf points_earned). A1 ist durch Schema-Analyse hochwahrscheinlich und muss mit einer Migration adressiert werden. A3 und A4 sind Low-Risk.

## Open Questions

1. **operation_type fuer Punkt-Abzug**
   - What we know: Die Tabelle hat einen CHECK Constraint auf operation_type mit 4 festen Werten
   - What's unclear: Soll der Wert `minigame_redeem` heissen oder anders benannt werden?
   - Recommendation: `minigame_redeem` verwenden -- klar, nicht mit Rechenoperationen verwechselbar. DB-Migration noetig.

2. **Alte Prototype-Routes aufraemen?**
   - What we know: `/dashboard`, `/exercise`, `/game` und `usePoints.ts` sind obsolet
   - What's unclear: Soll das in Phase 40 passieren oder spaeter?
   - Recommendation: Optional als letzten Plan in Phase 40 -- nicht blockierend, aber haelt den Codebase sauber.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + Playwright 1.59.1 |
| Config file | `vitest.config.ts` + `playwright.config.ts` |
| Quick run command | `npx vitest run tests/unit/balloon-game.test.tsx` |
| Full suite command | `npm run test:all` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-03-SC1 | Progress bar zeigt Punkte bis zum Spiel | unit | `npx vitest run tests/unit/progress-bar.test.tsx` | Bereits vorhanden |
| REQ-03-SC2 | Spiel wird bei >= 500 Punkten zugaenglich | e2e | `npx playwright test tests/e2e/minigame-gate.spec.ts` | Wave 0 |
| REQ-03-SC3 | Spiel ist spielbar, 60-90s, Ballons platzen | unit | `npx vitest run tests/unit/balloon-game.test.tsx` | Wave 0 |
| REQ-03-SC4 | Spielstart verbraucht 500 Punkte | integration | `npx vitest run tests/integration/start-game-action.test.ts` | Wave 0 |
| REQ-03-SC5 | Spiel schreibt KEINE Punkte zurueck | unit + manual | `npx vitest run tests/unit/balloon-game.test.tsx` (kein Supabase-Import) | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --changed`
- **Per wave merge:** `npm run test:all`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/balloon-game.test.tsx` -- covers REQ-03-SC3, REQ-03-SC5 (Spiel-Logik, kein DB-Write)
- [ ] `tests/integration/start-game-action.test.ts` -- covers REQ-03-SC4 (Punkt-Abzug Server Action)
- [ ] `tests/e2e/minigame-gate.spec.ts` -- covers REQ-03-SC2 (Gate bei Punkt-Schwelle)
- [ ] DB-Migration fuer `operation_type` CHECK Constraint Erweiterung

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | ja | Bestehend: Supabase Auth + Middleware. Spiel-Seite prueft getUser() |
| V3 Session Management | ja | Bestehend: Supabase Session Cookies via Middleware |
| V4 Access Control | ja | Server-Side Punkt-Check (D-16); RLS auf progress_entries |
| V5 Input Validation | ja | Zod-Validierung in Server Action (minimal -- keine User-Inputs ausser "starten") |
| V6 Cryptography | nein | Keine kryptographischen Operationen im Spiel |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client-Manipulation: Kind umgeht Punkt-Check | Tampering | Server-Side Check in page.tsx + Server Action Double-Check (D-16) |
| Doppel-Einloesung: Zwei Tabs gleichzeitig | Tampering | Server Action prueft Punkte nochmals vor INSERT. MVP-akzeptables Restrisiko |
| Direct URL Access: /kind/spiel ohne Punkte | Elevation of Privilege | Server Component redirect wenn Punkte < 500 |
| Spiel schreibt Punkte zurueck | Tampering | BalloonGame hat KEINEN Supabase-Import. Nur Client-State. Verifizierbar in Code Review |

## Sources

### Primary (HIGH confidence)
- Codebase-Analyse: `lib/config/rewards.ts`, `components/child/dashboard-stats.tsx`, `app/(child)/kind/dashboard/page.tsx`, `app/(child)/kind/ueben/actions.ts` -- bestehendes Pattern fuer Server Actions, Punkt-Berechnung, Dashboard-Integration
- Schema: `supabase/migrations/20260415000001_init_schema.sql` -- progress_entries Tabelle, CHECK Constraints, points_earned hat keinen Vorzeichen-Check
- Tailwind CSS v4 Docs: `tailwindcss.com/docs/animation` -- `@theme` + `@keyframes` Syntax fuer Custom Animations [VERIFIED: WebFetch]

### Secondary (MEDIUM confidence)
- Next.js Server Actions: `/websites/nextjs` Context7 -- redirect + revalidatePath Pattern [VERIFIED: Context7]

### Tertiary (LOW confidence)
- Performance Limit von ~15 CSS-animierten DOM-Elementen auf Tablets [ASSUMED -- basiert auf allgemeiner Web-Performance-Erfahrung]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- alles bereits installiert und verifiziert
- Architecture: HIGH -- folgt 1:1 den bestehenden Patterns (Server Action + Server Component + Client Island)
- Pitfalls: HIGH -- Schema-Constraint verifiziert, Race Condition Pattern bekannt, Performance-Limit konservativ geschaetzt
- Game Implementation: MEDIUM -- CSS-Animation Pattern verifiziert, aber genaues Ballon-Verhalten erst beim Bauen validierbar

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (stabiler Stack, keine Fast-Moving Dependencies)
