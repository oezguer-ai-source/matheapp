# Phase 10: Foundation - Research

**Researched:** 2026-04-15
**Domain:** Next.js + Supabase Authentifizierung, RLS, Routing (Greenfield)
**Confidence:** HIGH (Kernstack verifiziert via offizielle Docs + npm registry; PIN-Auth-Lösungsweg MEDIUM — erfordert User-Bestätigung)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Child authentication method**
- **D-01:** Children log in with Benutzername (display name) + 4-digit PIN — no email field shown
- **D-02:** Teachers create child accounts — no self-registration for children in MVP
- **D-03:** Behind the scenes, Supabase receives a generated email (`{username}.{class_id}@matheapp.internal`) + PIN as password via `signInWithPassword()`
- **D-04:** The login form for children shows only two fields: Benutzername and PIN (large, touch-friendly inputs)

**Teacher authentication**
- **D-05:** Teachers log in with standard email + password using Supabase Auth
- **D-06:** Teacher registration is a simple sign-up form (email + password + name) — no admin approval needed for MVP

**Supabase auth strategy**
- **D-07:** Use `@supabase/supabase-js` + `@supabase/ssr` for cookie-based sessions compatible with Next.js App Router
- **D-08:** No NextAuth.js, no OAuth providers — Supabase Auth handles everything directly
- **D-09:** Login page has a role-switch toggle (Kind / Lehrkraft) that shows the appropriate form fields

**Database schema**
- **D-10:** Tables: `profiles` (user_id FK to auth.users, role, grade_level, display_name, class_id, pin_code), `classes` (id, teacher_id, name, school_id), `schools` (id, name, subscription_tier), `progress_entries` (child_id, operation_type, grade, correct, points_earned, created_at)
- **D-11:** RLS policies: children can only read/write their own profile and progress data; teachers can read all profiles and progress in their class; no cross-class data access
- **D-12:** `role` field in `profiles` determines routing and access — values: `child` | `teacher`
- **D-13:** `schools` table includes `subscription_tier` field (default: `free`) for Phase 60 subscription gate — schema created now, logic implemented later

**Route structure and role-based routing**
- **D-14:** Next.js App Router with route groups: `(child)` for child-facing pages, `(teacher)` for teacher dashboard
- **D-15:** Middleware checks auth session + role from `profiles` table and redirects unauthorized access
- **D-16:** Unauthenticated users → `/login`; children trying teacher routes → `/kind/dashboard`; teachers trying child routes → `/lehrer/dashboard`

**UI and styling foundation**
- **D-17:** Tailwind CSS v4 for all styling — no additional component library for child-facing UI
- **D-18:** shadcn/ui initialized but only used in `(teacher)` route group
- **D-19:** Child login form: large text (`text-4xl`), rounded buttons (`rounded-2xl`), saturated colors, touch-friendly targets (min 48px)
- **D-20:** Teacher login form: standard professional form using shadcn/ui components
- **D-21:** German language throughout all UI text

### Claude's Discretion
- Exact color palette choices (within the constraint of bold, child-friendly colors)
- Login page layout and visual hierarchy
- Exact RLS policy SQL syntax
- Supabase project setup details
- Error message wording and validation UX
- Loading states and transition animations on login

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-01 | Kinder können sich einloggen und ihren Fortschritt sehen | Login-Teilbereich erfüllt durch @supabase/ssr Cookie-Session + Middleware-basiertes Role-Routing (§ Architecture Patterns). „Fortschritt sehen" wird in Phase 30 über das Kind-Dashboard abgedeckt — Phase 10 liefert nur die Login- und Auth-Basis. |
</phase_requirements>

## Summary

Die Foundation-Phase ist technisch klar abgegrenzt: Ein Next.js 15 App-Router-Projekt mit Supabase SSR-Auth, einem Postgres-Schema mit RLS und middleware-gesteuertem Rollen-Routing. Alle Bausteine sind offiziell dokumentiert — es gibt keine experimentellen APIs im kritischen Pfad.

**Ein einziger signifikanter Blocker ist aufgetaucht:** Supabase Cloud enforciert eine Passwort-Mindestlänge von 6 Zeichen ([CITED: supabase/discussions/13315](https://github.com/orgs/supabase/discussions/13315), [CITED: supabase/discussions/7181](https://github.com/orgs/supabase/discussions/7181)). Ein 4-stelliger PIN kann **nicht direkt** als Supabase-Passwort verwendet werden. **Empfehlung:** Das „Password"-Feld beim Login aus PIN + deterministischem Salt konstruieren (z. B. `pin + class_id`), sodass der effektive Supabase-Passwort-String ≥ 6 Zeichen ist. Die Kinder-UI zeigt weiterhin nur die 4 PIN-Ziffern. **Dies muss vom User bestätigt werden** — siehe Assumptions Log A1.

Zweiter wichtiger Punkt: Der offizielle Next.js `with-supabase` Starter verwendet inzwischen `proxy.ts` (Next.js 16+, `middleware.ts` ist deprecated). Da STACK.md Next.js 15.2 spezifiziert, bleiben wir bei `middleware.ts`, welches in 15 voll unterstützt ist. Die Code-Muster sind identisch — nur der Dateiname und der Exportname unterscheiden sich.

**Primary recommendation:** Projekt mit `create-next-app` aufsetzen, @supabase/ssr nach dem verifizierten Drei-Datei-Muster (client.ts / server.ts / middleware.ts) integrieren, Schema per Supabase CLI-Migration anlegen, RLS mit `SECURITY DEFINER`-Hilfsfunktion für Rollen-Lookup (vermeidet Infinite Recursion), Kind-Accounts über einen Server-Action-Workflow erstellen, der den Service-Role-Key nutzt.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Kind-Login-UI (Benutzername + PIN) | Browser/Client | — | Reines Formular, Input-Komponenten, On-Screen-Numpad; kein Server-Rendering nötig |
| Lehrer-Login-UI (Email + Passwort) | Browser/Client | — | Client-Komponente mit shadcn/ui |
| PIN-zu-Email-Mapping-Logik | API/Backend (Server Action) | — | `{username}.{class_id}@matheapp.internal` wird serverseitig konstruiert, niemals im Browser exponiert |
| Session-Token-Refresh | API/Backend (Middleware) | Browser/Client (Cookies) | Middleware ruft `supabase.auth.getClaims()` und rotiert Cookies; Client liest nur |
| Rollen-Routing-Entscheidung | API/Backend (Middleware) | — | Pfad-Whitelist `/kind/*` vs `/lehrer/*` wird serverseitig erzwungen |
| Daten-Isolation (Kind sieht nur eigene Daten) | Database/Storage (RLS) | API/Backend | RLS ist letzte Verteidigungslinie; Server Actions filtern zusätzlich explizit |
| Kind-Account-Erstellung durch Lehrer | API/Backend (Server Action mit Service-Role) | — | `auth.admin.createUser()` darf **niemals** im Browser laufen |
| Schema-Migrationen | Database/Storage | — | Supabase CLI Migrationen in `supabase/migrations/` |
| Env-Variablen-Management | Build/Config | — | `.env.local` (nie committen), Vercel Project Settings für Produktion |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.2.x (STACK.md-Vorgabe) | Full-Stack React Framework | App Router + Server Components + Middleware; explizit in Supabase-Docs als Erstklass-Framework gelistet [VERIFIED: npm view next version → 16.2.4 ist current stable, aber STACK.md lockt 15.2; 15.x bleibt supported] |
| React | 19 (mit Next.js 15 gebündelt) | UI-Rendering | `useActionState` für Formulare, Server Components [CITED: nextjs.org/blog/next-15-2] |
| TypeScript | 5.x (Default bei `create-next-app`) | Typsicherheit | Fängt Rollen-/Permission-Bugs zur Compile-Zeit [VERIFIED: create-next-app default flags] |
| @supabase/supabase-js | ^2.x (aktuell 2.103.3) | Supabase-Client-Basis | Offizieller Supabase Client [VERIFIED: npm view @supabase/supabase-js version → 2.103.3] |
| @supabase/ssr | ^0.x (aktuell 0.10.2) | Cookie-basierte Sessions für Next.js App Router | Offizielles SSR-Paket; ersetzt `@supabase/auth-helpers-nextjs` (deprecated) [VERIFIED: npm view @supabase/ssr version → 0.10.2] [CITED: supabase.com/docs/guides/auth/server-side/nextjs] |
| Tailwind CSS | v4 (aktuell 4.2.2) | Styling | CSS-first, bereits in `create-next-app` integriert [VERIFIED: npm view tailwindcss version → 4.2.2] |
| Zod | ^4.x (aktuell 4.3.6) | Schema-Validierung für Server Actions | Standard in Next.js Auth-Docs [VERIFIED: npm view zod version → 4.3.6] [CITED: nextjs.org/docs/app/guides/authentication] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | latest (copy-paste) | Lehrer-Dashboard-Komponenten | Nur in `(teacher)` Route-Gruppe [STACK.md §UI Component Layer] |
| Supabase CLI | latest | Lokale Migrationen, Typ-Generation | `supabase migration new`, `supabase gen types typescript` [CITED: supabase.com/docs/guides/cli] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | **Nicht verwenden** — offiziell deprecated; Migration-Guide verweist auf @supabase/ssr [CITED: supabase.com/docs/guides/troubleshooting/how-to-migrate-from-supabase-auth-helpers-to-ssr-package-5NRunM] |
| Inline SQL via Supabase-Dashboard | Supabase CLI Migrationen in Git | CLI-Migrationen sind reproduzierbar, reviewbar, in Git versioniert. Für Solo-Developer in 2-4 Wochen: CLI-Migrationen sind der dokumentierte Standard, Inline-Dashboard-SQL ist nur für Prototypen ok |
| Next.js 15 middleware.ts | Next.js 16 proxy.ts | STACK.md lockt Next.js 15.2 → `middleware.ts` bleibt korrekter Dateiname. Falls das Team Next.js 16 möchte, muss STACK.md aktualisiert und der Codemod ausgeführt werden: `npx @next/codemod@canary middleware-to-proxy .` [CITED: nextjs.org/docs/app/api-reference/file-conventions/proxy] |

### Installation

```bash
# Projekt erzeugen (interaktiv, wählt TypeScript + Tailwind + App Router)
npx create-next-app@latest matheapp --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*"

cd matheapp

# Supabase SSR
npm install @supabase/supabase-js @supabase/ssr

# Validation
npm install zod

# shadcn/ui (nur Teacher-UI)
npx shadcn@latest init

# Supabase CLI (lokal, nicht als Projekt-Dependency)
npm install --save-dev supabase
# oder global via brew: brew install supabase/tap/supabase
```

### Version verification (2026-04-15)

| Package | Published Version | Verified |
|---------|-------------------|----------|
| next | 16.2.4 | npm view — STACK.md lockt 15.2 (gültig, 15.x weiter gepflegt) |
| @supabase/supabase-js | 2.103.3 | npm view |
| @supabase/ssr | 0.10.2 | npm view |
| tailwindcss | 4.2.2 | npm view |
| zod | 4.3.6 | npm view |
| react | 19.2.5 | npm view |

## Architecture Patterns

### System Architecture Diagram

```
                ┌──────────────────────────────────────────────┐
                │            Browser (Client)                   │
                │                                                │
                │  [Login-Formular: Kind-Toggle / Lehrer-Toggle] │
                │                    │                           │
                └────────────────────┼───────────────────────────┘
                                     │ HTTP Request
                                     ▼
      ┌────────────────────────────────────────────────────────┐
      │     Next.js middleware.ts (läuft bei JEDEM Request)     │
      │                                                          │
      │  1. updateSession() aus lib/supabase/middleware.ts       │
      │  2. Cookie-Refresh via createServerClient                │
      │  3. supabase.auth.getClaims()  ← NIE getSession()        │
      │                                                          │
      │  ┌───────────────────────────────────────────────────┐  │
      │  │  Routing-Logik:                                    │  │
      │  │   - nicht eingeloggt + protected route → /login    │  │
      │  │   - role=child + /lehrer/* → /kind/dashboard       │  │
      │  │   - role=teacher + /kind/* → /lehrer/dashboard     │  │
      │  └───────────────────────────────────────────────────┘  │
      └────────────────────┬──────────────────┬─────────────────┘
                           │                  │
             rewrites to   │                  │  redirect to
       passende Route-     │                  │  /login bei Auth-Fehler
       Gruppe              ▼                  ▼
      ┌──────────────────────────┐   ┌──────────────────────┐
      │   app/(child)/...         │   │   app/login/page.tsx │
      │    kind/dashboard/        │   │    (Server Comp.)    │
      │   app/(teacher)/...       │   └──────────────────────┘
      │    lehrer/dashboard/      │
      └──────────────┬─────────────┘
                     │ Server Action / Server Component
                     ▼
      ┌────────────────────────────────────────────────────┐
      │  Supabase Postgres (RLS aktiv)                      │
      │                                                      │
      │   auth.users  ◀─FK──  profiles (role, class_id, …) │
      │                         │                           │
      │                         │                           │
      │   schools ──◀── classes ──◀── progress_entries      │
      │                                                      │
      │   Policies:                                          │
      │   - Kind liest eigenes profile + progress            │
      │   - Lehrer liest profiles+progress der eigenen Klasse│
      │   - SECURITY DEFINER fn is_teacher_of_class()        │
      └────────────────────────────────────────────────────┘

  Seitenpfad: Lehrer erstellt Kind-Account
  ┌───────────────────────────────────────────────┐
  │ Server Action (läuft nur server, "use server")│
  │  → Supabase Admin-Client (SERVICE_ROLE_KEY)   │
  │  → supabase.auth.admin.createUser({...})      │
  │  → INSERT profiles { role:'child', pin, ...}  │
  └───────────────────────────────────────────────┘
```

### Recommended Project Structure

```
matheapp/
├── app/
│   ├── (child)/                 # Route-Gruppe für Kind-UI (Tailwind only)
│   │   └── kind/
│   │       └── dashboard/
│   │           └── page.tsx
│   ├── (teacher)/               # Route-Gruppe für Lehrer-UI (shadcn/ui)
│   │   └── lehrer/
│   │       └── dashboard/
│   │           └── page.tsx
│   ├── login/
│   │   ├── page.tsx             # Client-Komponente mit Toggle
│   │   └── actions.ts           # "use server" — Login-Server-Actions
│   ├── layout.tsx               # Root-Layout, lang="de"
│   └── page.tsx                 # Landing → redirect zu /login
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser-Client
│   │   ├── server.ts            # Server-Client
│   │   ├── middleware.ts        # updateSession Helper
│   │   └── admin.ts             # Service-Role-Client (nur Server Actions)
│   ├── schemas/                 # Zod-Schemas
│   │   └── auth.ts              # Login-/Registrierung-Validierung
│   └── utils.ts                 # hasEnvVars() etc.
├── components/
│   ├── ui/                      # shadcn/ui generated (Teacher-only)
│   ├── child/                   # Custom Kind-Komponenten
│   └── login/
│       ├── role-toggle.tsx
│       ├── child-login-form.tsx
│       └── teacher-login-form.tsx
├── supabase/
│   ├── config.toml              # lokale Supabase-Config
│   └── migrations/
│       ├── 20260415000001_init_schema.sql
│       ├── 20260415000002_enable_rls.sql
│       └── 20260415000003_rls_policies.sql
├── types/
│   └── database.types.ts        # generiert via `supabase gen types`
├── middleware.ts                # Next.js Middleware (Projektroot)
├── .env.local                   # NICHT committen
├── .env.example                 # Committed, Platzhalter
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

### Pattern 1: Supabase Browser Client

**What:** Singleton Client für React Client Components.
**When to use:** In `"use client"` Komponenten, z. B. reaktive Login-Forms.
**Example:**
```typescript
// lib/supabase/client.ts
// Source: https://github.com/vercel/next.js/tree/canary/examples/with-supabase
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```
[VERIFIED: raw.githubusercontent.com/vercel/next.js/canary/examples/with-supabase/lib/supabase/client.ts]

### Pattern 2: Supabase Server Client (Server Components & Server Actions)

**What:** Pro Request neuer Client mit Next.js cookies()-API.
**When to use:** In Server Components, Server Actions, Route Handlers.
**Example:**
```typescript
// lib/supabase/server.ts
// Source: https://github.com/vercel/next.js/tree/canary/examples/with-supabase
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll wurde aus einer Server Component aufgerufen.
            // Kann ignoriert werden, wenn Middleware Sessions refresht.
          }
        },
      },
    },
  );
}
```
[VERIFIED: raw.githubusercontent.com/vercel/next.js/canary/examples/with-supabase/lib/supabase/server.ts]

### Pattern 3: Session-Refresh-Middleware Helper

**What:** Zentrale updateSession()-Funktion, die Cookies rotiert und bei fehlender Session redirected.
**When to use:** Aus `middleware.ts` bei jedem Request aufrufen.
**Example:**
```typescript
// lib/supabase/middleware.ts
// Source: Adaptiert von with-supabase Starter (Proxy-Version → middleware)
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // WICHTIG: Zwischen createServerClient und getClaims() KEIN Code!
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const pathname = request.nextUrl.pathname;
  const isPublicPath =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/registrieren");

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Rollen-Routing nur bei eingeloggtem User:
  if (user) {
    // role liegt im JWT als custom_claim oder muss aus profiles geholt werden.
    // Strategie: Auf Supabase-Seite einen Hook/Trigger einrichten, der role
    // in app_metadata legt → steht direkt im JWT claims.
    const role = (user as any).app_metadata?.role as "child" | "teacher" | undefined;

    if (role === "child" && pathname.startsWith("/lehrer")) {
      const url = request.nextUrl.clone();
      url.pathname = "/kind/dashboard";
      return NextResponse.redirect(url);
    }
    if (role === "teacher" && pathname.startsWith("/kind")) {
      const url = request.nextUrl.clone();
      url.pathname = "/lehrer/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // MUSS supabaseResponse zurückgeben; Cookies müssen erhalten bleiben!
  return supabaseResponse;
}
```
[VERIFIED: raw.githubusercontent.com/vercel/next.js/canary/examples/with-supabase/lib/supabase/proxy.ts — adapted from proxy.ts to middleware.ts naming for Next.js 15]

### Pattern 4: middleware.ts (Projekt-Root)

**What:** Next.js Middleware-Datei, die updateSession() delegiert.
**When to use:** Genau einmal im Projekt-Root.
**Example:**
```typescript
// middleware.ts (Projekt-Root)
import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Alle Requests außer:
     * - _next/static (statische Dateien)
     * - _next/image (Image-Optimierung)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Bilddateien
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```
[CITED: nextjs.org/docs/app/api-reference/file-conventions/proxy §matcher (gleiche Semantik in Next.js 15 middleware.ts)]

### Pattern 5: Admin-Client für Teacher-creates-Child

**What:** Separater Client mit Service-Role-Key. **Nie im Browser!**
**When to use:** In Server Actions, die Kind-Accounts erzeugen.
**Example:**
```typescript
// lib/supabase/admin.ts
// NIE in einem "use client" File importieren!
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // NIE NEXT_PUBLIC_ !
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
```
[CITED: supabase.com/docs/reference/javascript/auth-admin-createuser — "This function should only be called on a server. Never expose your service_role key"]

### Pattern 6: Kind-Account-Erzeugung (Server Action)

**What:** Server Action, die der Lehrer aus dem Dashboard triggert.
**Example:**
```typescript
// app/lehrer/dashboard/actions.ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createChildSchema = z.object({
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  pin: z.string().length(4).regex(/^\d{4}$/),
  grade_level: z.number().int().min(1).max(4),
  class_id: z.string().uuid(),
});

export async function createChildAccount(formData: FormData) {
  const parsed = createChildSchema.parse({
    username: formData.get("username"),
    pin: formData.get("pin"),
    grade_level: Number(formData.get("grade_level")),
    class_id: formData.get("class_id"),
  });

  // Lehrer-Identität prüfen (nicht Admin-Client!)
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (claims?.claims?.app_metadata?.role !== "teacher") {
    throw new Error("Unauthorized");
  }

  const email = `${parsed.username}.${parsed.class_id.slice(0, 8)}@matheapp.internal`;
  // WICHTIG: Supabase enforciert min 6 Zeichen — PIN + deterministisches Salt:
  const passwordProxy = `${parsed.pin}-${parsed.class_id.slice(0, 8)}`;

  const admin = createAdminClient();
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: passwordProxy,
    email_confirm: true,  // kein Confirmation-Mail nötig
    app_metadata: { role: "child" },
  });
  if (authErr) throw authErr;

  const { error: profileErr } = await admin.from("profiles").insert({
    user_id: authUser.user.id,
    role: "child",
    display_name: parsed.username,
    grade_level: parsed.grade_level,
    class_id: parsed.class_id,
    pin_hint: null,  // PIN wird NUR als Passwort gespeichert, nicht doppelt!
  });
  if (profileErr) throw profileErr;
}
```
[CITED: supabase.com/docs/reference/javascript/auth-admin-createuser, nextjs.org/docs/app/guides/authentication]

### Pattern 7: Kind-Login Server Action

**What:** Login-Flow, der Benutzername + PIN entgegennimmt und intern als Email+Passwort an Supabase sendet.
**Example:**
```typescript
// app/login/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const childLoginSchema = z.object({
  username: z.string().min(2).max(30),
  pin: z.string().length(4).regex(/^\d{4}$/),
});

export async function childLogin(prevState: unknown, formData: FormData) {
  const parsed = childLoginSchema.safeParse({
    username: formData.get("username"),
    pin: formData.get("pin"),
  });
  if (!parsed.success) {
    return { error: "Benutzername oder PIN ungültig." };
  }

  const supabase = await createClient();

  // Username → class_id via profiles-Lookup
  // (RLS erlaubt "display_name" SELECT für anon nur, wenn Policy so gesetzt)
  // ALTERNATIVE: Username ist Teil der Email — siehe Assumption A2
  const { data: profile } = await supabase
    .from("profiles")
    .select("class_id, user_id")
    .eq("display_name", parsed.data.username)
    .eq("role", "child")
    .single();

  if (!profile) {
    return { error: "Benutzername oder PIN ungültig." };
  }

  const email = `${parsed.data.username}.${profile.class_id.slice(0, 8)}@matheapp.internal`;
  const passwordProxy = `${parsed.data.pin}-${profile.class_id.slice(0, 8)}`;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: passwordProxy,
  });

  if (error) {
    return { error: "Benutzername oder PIN ungültig." };
  }

  redirect("/kind/dashboard");
}
```

### Pattern 8: RLS mit SECURITY DEFINER Hilfsfunktion

**What:** Vermeidet Infinite-Recursion beim Abfragen von `profiles` innerhalb von Policies auf `profiles`.
**Example:**
```sql
-- supabase/migrations/20260415000003_rls_policies.sql

-- 1. Hilfsfunktion in privatem Schema
create schema if not exists private;

create or replace function private.user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function private.user_class_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select class_id from public.profiles where user_id = auth.uid() limit 1;
$$;

-- 2. RLS aktivieren
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.schools enable row level security;
alter table public.progress_entries enable row level security;

-- 3. profiles-Policies
-- Kind liest eigenes Profil
create policy "child_reads_own_profile"
on public.profiles for select
to authenticated
using ( (select auth.uid()) = user_id );

-- Lehrer liest alle profiles in der eigenen Klasse
create policy "teacher_reads_class_profiles"
on public.profiles for select
to authenticated
using (
  (select private.user_role()) = 'teacher'
  and class_id in (
    select id from public.classes
    where teacher_id = (select auth.uid())
  )
);

-- 4. progress_entries-Policies
create policy "child_inserts_own_progress"
on public.progress_entries for insert
to authenticated
with check ( child_id = (select auth.uid()) );

create policy "child_reads_own_progress"
on public.progress_entries for select
to authenticated
using ( child_id = (select auth.uid()) );

create policy "teacher_reads_class_progress"
on public.progress_entries for select
to authenticated
using (
  (select private.user_role()) = 'teacher'
  and child_id in (
    select user_id from public.profiles
    where class_id in (
      select id from public.classes
      where teacher_id = (select auth.uid())
    )
  )
);

-- 5. classes-Policies
create policy "teacher_reads_own_classes"
on public.classes for select
to authenticated
using ( teacher_id = (select auth.uid()) );

create policy "teacher_manages_own_classes"
on public.classes for all
to authenticated
using ( teacher_id = (select auth.uid()) )
with check ( teacher_id = (select auth.uid()) );

-- 6. Index für RLS-Performance
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_class_id on public.profiles(class_id);
create index if not exists idx_progress_entries_child_id on public.progress_entries(child_id);
create index if not exists idx_classes_teacher_id on public.classes(teacher_id);
```
[CITED: supabase.com/docs/guides/database/postgres/row-level-security §Performance, §Use Security Definer Functions; supabase/discussions/1138 zu Infinite-Recursion-Pattern]

### Anti-Patterns to Avoid

- **`supabase.auth.getSession()` in Server Code:** Offiziell unsicher. Immer `getUser()` oder `getClaims()` — die validieren das JWT mit dem Supabase-Server. `getSession()` gibt blind den Cookie-Inhalt zurück. [CITED: supabase.com/docs/guides/auth/server-side/nextjs "Never trust supabase.auth.getSession() inside server code"]
- **Service-Role-Key im Browser:** Niemals mit `NEXT_PUBLIC_` prefixen. Nur in Server Actions / API Routes. [CITED: supabase.com/docs/reference/javascript/admin-api]
- **RLS-Policies, die dieselbe Tabelle selbst abfragen:** Infinite Recursion. Stattdessen SECURITY DEFINER Funktion in `private` Schema. [CITED: github.com/orgs/supabase/discussions/1138]
- **Code zwischen `createServerClient` und `getClaims()` in Middleware:** Offiziell riskant — User können zufällig ausgeloggt werden. [CITED: with-supabase Starter-Kommentar verbatim]
- **PIN als 4 Zeichen direkt an `signInWithPassword`:** Supabase Cloud lehnt mit „Password too short" ab. Padding nötig — siehe Pattern 6 & 7. [CITED: github.com/orgs/supabase/discussions/13315]
- **`auth.uid()` ohne SELECT-Wrap:** 94% langsamer. Immer `(select auth.uid())` in Policies. [CITED: supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv]
- **`middleware.ts` in Next.js 16:** Dort heißt die Datei `proxy.ts`. Mit Next.js 15 bleibt `middleware.ts` korrekt. [CITED: nextjs.org/docs/app/api-reference/file-conventions/proxy]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session-Management | Eigene JWT-Logik, Cookie-Handling | `@supabase/ssr` `createServerClient` / `createBrowserClient` | Cookie-Rotation, Secure/HttpOnly-Flags, Token-Refresh sind delikat; ein Bug = Session-Leak |
| Passwort-Hashing | bcrypt selbst aufrufen | `supabase.auth.admin.createUser()` | Supabase macht bcrypt + Salt intern. Niemals selbst hashen. |
| PIN-Speicherung | `pin_code`-Spalte im Klartext in `profiles` | PIN = Teil des Supabase-Auth-Passworts (gehashed in `auth.users`) | Klartext-PINs sind GDPR-kritisch. Durch Zweckentfremdung des Auth-Felds bleibt der PIN gehashed. Die `profiles.pin_code`-Spalte aus D-10 wird daher weggelassen oder als `pin_hint` (optional, nullable) umbenannt. **Assumption A1 — User bestätigen!** |
| Role-Guard-Logik im Client | `if (user.role === 'child') ...` | Middleware + RLS | Client-Checks sind umgehbar. Middleware ist Server-seitig, RLS auf DB-Ebene. |
| Form-Validierung | Eigene if/else-Chains | Zod + `useActionState` | Runtime-Validation + TypeScript-Typen aus einem Schema; Next.js-Docs verwenden genau dieses Pattern. |
| Migrations-Tracking | Manuelles SQL im Dashboard | Supabase CLI (`supabase migration new`) | Versionierte, reproduzierbare Migrationen in Git. |
| TypeScript-Typen für DB | Manuell pflegen | `supabase gen types typescript --project-id <id> > types/database.types.ts` | Auto-generiert aus Schema; bleibt nach Migrationen synchron. |

**Key insight:** Auth, Passwort-Hashing und Session-Handling sind Felder, in denen Do-It-Yourself zu 99% ein Sicherheitsrisiko bedeutet. Das gesamte Auth-Thema dieser Phase ist „Supabase korrekt konfigurieren" — nicht „Auth selbst implementieren".

## Runtime State Inventory

*Nicht anwendbar — Greenfield-Projekt ohne bestehende Laufzeit. Nichts zu migrieren.*

## Common Pitfalls

### Pitfall 1: Middleware-Matcher zu aggressiv

**What goes wrong:** Middleware läuft auch auf `_next/data/*` oder statische Assets, verursacht unnötige DB-Calls und langsamere Page-Loads. Oder umgekehrt: Matcher ist zu restriktiv, Server Actions laufen ohne Middleware-Schutz.
**Why it happens:** Die Next.js-Doku warnt explizit: Server Actions sind POST-Requests auf dieselbe Route und werden von Middleware-Exclusions mitgetroffen.
**How to avoid:** Verwende den offiziellen Matcher aus dem with-supabase-Starter (siehe Pattern 4). Verifiziere Auth **zusätzlich in jeder Server Action** ("in depth defense"), nicht nur im Middleware.
**Warning signs:** 401/403-Fehler, die ohne Grund verschwinden, wenn Matcher geändert wird.
[CITED: nextjs.org/docs/app/api-reference/file-conventions/proxy §Execution order]

### Pitfall 2: Cookies werden in Server Components gesetzt, aber Response nicht zurückgegeben

**What goes wrong:** In `app/xyz/page.tsx` wird `cookieStore.set()` aufgerufen → Next.js wirft keinen Error, Cookies landen aber nie beim Client. User wird zufällig ausgeloggt.
**Why it happens:** Server Components können Cookies nicht schreiben. Nur Middleware, Server Actions und Route Handlers.
**How to avoid:** Cookie-Rotation ausschließlich in Middleware. Das `try {} catch {}` Pattern aus dem Starter-Code ist richtig (ignoriert den Fehler, weil Middleware es übernimmt).
**Warning signs:** User sieht "Sitzung abgelaufen" nach wenigen Minuten obwohl Token-Laufzeit 1h beträgt.
[CITED: raw.githubusercontent.com/vercel/next.js/canary/examples/with-supabase/lib/supabase/server.ts Kommentar]

### Pitfall 3: `app_metadata.role` ist nicht im JWT

**What goes wrong:** Middleware liest `user.app_metadata.role` → ist `undefined`, weil Rolle nur in `profiles`-Tabelle steht.
**Why it happens:** Supabase packt `app_metadata` in JWT, aber `profiles` ist eine separate Tabelle. Standardmäßig keine Sync.
**How to avoid:** **Zwei Optionen:**
1. **Bei `auth.admin.createUser()`:** `app_metadata: { role: 'child' }` setzen → wandert automatisch ins JWT (siehe Pattern 6).
2. **Auth-Hook** (Supabase Feature): `custom_access_token_hook` — Postgres-Funktion, die Custom Claims ins JWT injiziert. [CITED: supabase.com/docs/guides/auth/auth-hooks]

**Empfehlung für Phase 10:** Option 1 (Metadata beim Erstellen setzen) — simpler, kein Hook nötig.
**Warning signs:** Middleware redirected nie zwischen Rollen; `console.log(user)` zeigt leeres `app_metadata`.

### Pitfall 4: RLS blockiert eigene Admin-Inserts

**What goes wrong:** Server Action nutzt `createClient()` (User-Context) statt `createAdminClient()` (Service-Role) beim Kind-Account-Erstellen → RLS blockiert INSERT in `profiles` weil der User noch keinen Anker hat.
**Why it happens:** Beim ersten INSERT existiert noch kein `profiles`-Row, also greift `auth.uid() = user_id`-Policy nicht.
**How to avoid:** Kind-Account-Erstellung **immer** mit Admin-Client (Service-Role bypasst RLS). Self-Registration (falls später: Lehrer-Signup) mit Policy „INSERT erlaubt wenn `auth.uid() = user_id` UND Row noch nicht existiert".
**Warning signs:** `"new row violates row-level security policy"` beim Kind-Anlegen.
[CITED: supabase.com/docs/guides/troubleshooting/why-is-my-service-role-key-client-getting-rls-errors-or-not-returning-data-7_1K9z]

### Pitfall 5: Supabase Free-Tier pausiert das Projekt

**What goes wrong:** Nach 7 Tagen Inaktivität pausiert das Projekt → Demo am Prüfungstag funktioniert nicht.
**Why it happens:** Supabase Free-Tier Policy.
**How to avoid:** Während Entwicklungsphase mindestens 1x/Woche eine DB-Query triggern (oder einen Cron/GitHub-Actions-Ping einrichten). Am Prüfungstag mit einem Klick im Dashboard reaktivieren.
**Warning signs:** DB-Calls timeouten, Dashboard zeigt „Paused".
[CITED: STATE.md Blockers/Concerns §PITFALLS.md]

### Pitfall 6: Login-UI verrät Existenz von Benutzernamen

**What goes wrong:** Bei falschem Benutzername Error „Unbekannter Benutzer", bei falschem PIN Error „Falscher PIN" → Angreifer können User enumerieren.
**Why it happens:** Naives Error-Handling.
**How to avoid:** Immer dieselbe generische Fehlermeldung „Benutzername oder PIN ungültig." (siehe Pattern 7). Bei Kindern ist das UX-egal — sie kennen ihren Namen — und es schützt vor Enumeration.
**Warning signs:** Unterschiedliche Fehlertexte für „User nicht gefunden" vs. „PIN falsch".

### Pitfall 7: Benutzername-Kollision zwischen Klassen

**What goes wrong:** Zwei Lehrer wollen jeweils ein Kind „max" anlegen → die generierte Email-ID muss unique sein. Wenn die Email nur `{username}@matheapp.internal` wäre, kollidiert.
**Why it happens:** Supabase `auth.users.email` ist global unique.
**How to avoid:** Email enthält `class_id` (D-03): `{username}.{class_id}@matheapp.internal`. Das garantiert Unique-ness. Display-Name kann dabei innerhalb einer Klasse kollidieren — also Constraint auf `(class_id, display_name)` UNIQUE im `profiles`-Schema anlegen.
**Warning signs:** `auth.admin.createUser()` wirft „User already registered".

## Code Examples

### Umgebungsvariablen (.env.local Template)

```bash
# .env.example — committed, .env.local NICHT committen

# Supabase Public (sicher im Browser)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Supabase Secret (NUR Server!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### Datenbank-Schema-Migration

```sql
-- supabase/migrations/20260415000001_init_schema.sql
create extension if not exists "uuid-ossp";

create table public.schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'grundschule', 'foerderung', 'experte')),
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('child', 'teacher')),
  display_name text not null,
  grade_level int check (grade_level between 1 and 4),  -- null bei Lehrer
  class_id uuid references public.classes(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (class_id, display_name)  -- Kollisions-Schutz pro Klasse
);

create table public.progress_entries (
  id uuid primary key default uuid_generate_v4(),
  child_id uuid not null references auth.users(id) on delete cascade,
  operation_type text not null
    check (operation_type in ('addition', 'subtraktion', 'multiplikation', 'division')),
  grade int not null check (grade between 1 and 4),
  correct boolean not null,
  points_earned int not null default 0,
  created_at timestamptz not null default now()
);
```

### Supabase-Projekt-Setup-Sequenz

```bash
# 1. Lokale CLI initialisieren
npx supabase init

# 2. An Cloud-Projekt linken
npx supabase login
npx supabase link --project-ref <project-ref>

# 3. Migration erzeugen (erzeugt timestamped file in supabase/migrations/)
npx supabase migration new init_schema

# 4. SQL einfügen (siehe oben), dann gegen Cloud pushen
npx supabase db push

# 5. TypeScript-Typen generieren
npx supabase gen types typescript --project-id <project-ref> > types/database.types.ts
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Ende 2023 | Das alte Paket ist deprecated; Migrationsleitfaden existiert. [CITED: supabase.com/docs/guides/troubleshooting/how-to-migrate-from-supabase-auth-helpers-to-ssr-package-5NRunM] |
| `supabase.auth.getSession()` in Server Code | `supabase.auth.getClaims()` | 2025 | `getClaims()` ist schneller (prüft JWT-Signatur ohne DB-Call) und sicherer. [CITED: supabase.com/docs/guides/auth/server-side/nextjs] |
| Next.js `middleware.ts` mit `middleware`-Export | `proxy.ts` mit `proxy`-Export | Next.js 16 (Q4 2025) | Nur Namenswechsel, Semantik identisch. Codemod verfügbar. **STACK.md lockt 15.2 → wir bleiben bei `middleware.ts`.** [CITED: nextjs.org/docs/app/api-reference/file-conventions/proxy] |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 2025 | Umbenennung in neueren Supabase-Docs; beide Keys funktionieren aktuell noch. Für Neuprojekte: neuen Namen verwenden. [CITED: with-supabase Starter] |

**Deprecated/outdated:**
- `@supabase/auth-helpers-*` — alle Varianten deprecated
- `getSession()` in Server-Kontext — unsicher, ersetzt durch `getUser()` oder `getClaims()`
- Next.js `pages/`-Router — App Router ist Default seit 13.4

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PIN wird serverseitig zu einem 6+-Zeichen-String erweitert (`{pin}-{class_id-prefix}`) um Supabase-Mindestpasswortlänge einzuhalten, und `profiles.pin_code` wird **nicht** zusätzlich im Klartext gespeichert. Stattdessen bleibt der PIN ausschließlich als bcrypt-Hash in `auth.users.encrypted_password`. | Standard Stack, Pattern 6, Don't Hand-Roll | **HOCH** — widerspricht teilweise D-10 (`pin_code`-Spalte). Falls der User unbedingt ein separates `pin_code`-Feld zum Anzeigen für Lehrer („PIN vergessen?") will, muss Klartext- oder reversibel-verschlüsselte Speicherung diskutiert werden. Empfehlung: Spalte in D-10 streichen oder als `pin_hint text null` (optional, nullable) umbenennen. |
| A2 | Benutzername-Lookup in `profiles` ist **entweder** über eine permissive SELECT-Policy für `display_name` (erlaubt Enumeration!) **oder** über eine Server Action mit Admin-Client machbar. Die Admin-Variante ist sicherer. Pattern 7 zeigt den Admin-Weg implizit — muss in der Implementation bestätigt werden. | Pattern 7 | **MITTEL** — falls Enumeration kein Sorge ist (Schulkontext, interne App), kann eine einfache anon-lesbare Policy für `display_name + class_id` gesetzt werden. Aus Sicherheitssicht besser: Server-Action mit Admin-Client. |
| A3 | Teacher-Registrierung (D-06) ist Teil dieser Phase. Die Erzeugung der zugehörigen `profiles`-Row mit `role='teacher'` geschieht über einen Supabase Database Trigger auf `auth.users`, nicht manuell im Client. | Architecture Patterns | **MITTEL** — Alternative: Server Action nach `signUp()`. Trigger ist robuster (läuft immer), Server Action ist sichtbarer. Für 2-4 Wochen Deadline: Server Action wählen (einfacher zu debuggen). |
| A4 | Die `middleware.ts` Datei ist korrekt, weil STACK.md Next.js 15.2 lockt. Falls das Team auf Next.js 16 gehen möchte, muss der Codemod laufen und die Datei nach `proxy.ts` umbenannt werden. | Architecture Patterns | **NIEDRIG** — pure Namenskonvention, Semantik identisch. |
| A5 | Supabase Password-Policy wird im Dashboard auf „min 6 Zeichen, keine Komplexitätsregeln" gesetzt. Falls der User „leaked password protection" aktivieren möchte, wird das PIN-Padding eventuell abgelehnt (HaveIBeenPwned kann triviale Kombinationen kennen). | Architecture Patterns, Pitfalls | **NIEDRIG** — Free-Tier erlaubt HaveIBeenPwned-Check nicht (Pro-Feature). Solange wir Free-Tier nutzen, kein Problem. |

**User-Entscheidung vor Planung nötig für A1 und A2** — der Planer sollte diese beiden Assumptions in der Plan-Phase zur Klärung zurück an Discussion eskalieren oder explizit mit dem User abstimmen.

## Open Questions

1. **Wie persistiert `subscription_tier` Default-Schools-Zuordnung?**
   - What we know: Phase 60 gated Klasse-4-Content per `schools.subscription_tier`.
   - What's unclear: In Phase 10 muss bereits eine Default-Schule erzeugt werden (oder pro Lehrer-Signup eine), damit Kind-Accounts eine `class_id` bekommen können, die wiederum ein `school_id` hat.
   - Recommendation: Beim Teacher-Signup fragen: „Name der Schule" + „Name der Klasse". Beides wird on-the-fly erzeugt. Alternativ: Ein „Demo-Schule"-Seed in der Migration.

2. **Soll ein Seed-Skript für Demo-Daten existieren?**
   - What we know: Universitäts-Demo am Prüfungstag braucht funktionierende Accounts.
   - What's unclear: Wie wird der initiale Lehrer + Klasse + ein Test-Kind erzeugt?
   - Recommendation: `supabase/seed.sql` mit 1 Schule, 1 Lehrer, 1 Klasse, 2 Kindern — aber **nur für lokale Entwicklung**, nicht gegen Produktion pushen.

3. **Wie wird der PIN-Reset geflowt, wenn ein Kind ihn vergisst?**
   - What we know: Kinder (6-10 Jahre) werden PINs vergessen.
   - What's unclear: Ist in Phase 10 ein „Lehrer setzt PIN zurück"-Flow nötig, oder reicht „PIN wird per neuer `auth.admin.updateUserById()` überschrieben"?
   - Recommendation: Für MVP Phase 10 reicht **kein** Reset-UI. Lehrer kann über das Supabase-Dashboard direkt updaten. Reset-UI wird in Phase 50 (Teacher-Dashboard) eingebaut.

4. **Wie werden Next.js 15 → 16 Upgrades nach Projekt-Abgabe behandelt?**
   - What we know: Next.js 16 ist seit Q4 2025 stable; 15.x bleibt gepflegt.
   - What's unclear: Keine Auswirkung auf Phase 10, aber Langzeit-Relevanz.
   - Recommendation: Für Uni-Projekt: auf 15.2 bleiben (STACK.md). Migrationsnotiz in Doku-Phase 70 festhalten.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js + npm scripts | ✓ | 24.13.0 (→ übersteigt Next.js 15 min 18.17) | — |
| npm | Package-Management | ✓ | 11.6.2 | — |
| npx | Supabase CLI + shadcn/ui | ✓ | 11.6.2 | — |
| git | Version Control | ✓ | 2.50.1 | — |
| Supabase CLI | Migrationen, Typ-Generierung | ✗ | — | `npx supabase` (kein globaler Install nötig — funktioniert lokal via `--save-dev`) |
| Supabase Cloud-Projekt | Auth + DB | ✗ | — | **MUSS manuell im Dashboard erzeugt werden** — kein Fallback. Siehe Planer-Schritt 0. |
| Vercel-Account | Deployment (optional für Phase 10) | ✗ | — | Lokaler `npm run dev` reicht für Phase 10; Deployment in späterer Phase oder Uni-Abgabe-Tag |

**Missing dependencies with no fallback:**
- **Supabase Cloud-Projekt** — blockiert alles nach Scaffolding. Planer muss als Task 0 oder Wave-0-Voraussetzung einplanen: „Supabase-Projekt im Dashboard anlegen, URL + keys in `.env.local` eintragen."

**Missing dependencies with fallback:**
- Supabase CLI → `npx supabase …` funktioniert ohne globalen Install.
- Vercel-Deployment → in Phase 10 nicht zwingend nötig.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x + React Testing Library + Playwright (E2E) — Empfehlung, da Vitest in Next.js 15 + Turbopack native funktioniert und schneller startet als Jest |
| Config file | `vitest.config.ts` (Wave 0 — noch nicht vorhanden), `playwright.config.ts` (Wave 0) |
| Quick run command | `npx vitest run --reporter=verbose --passWithNoTests` (< 5 s bei leerem Suite) |
| Full suite command | `npx vitest run && npx playwright test` |

**Alternative:** Jest via `create-next-app` Official Template. Da wir aber Supabase + Server-Actions testen, ist Vitest's ESM-Unterstützung angenehmer. Für Uni-Deadline: **Vitest ist die sichere Wahl** — offiziell in Next.js-Docs gelistet.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| REQ-01 / SC-1 | Kind loggt mit Benutzername + PIN ein und erreicht `/kind/dashboard` | e2e | `npx playwright test tests/e2e/child-login.spec.ts -g "child logs in with username and pin"` | ❌ Wave 0 |
| REQ-01 / SC-2 | Lehrer loggt mit Email+Passwort ein und erreicht `/lehrer/dashboard` | e2e | `npx playwright test tests/e2e/teacher-login.spec.ts -g "teacher logs in"` | ❌ Wave 0 |
| REQ-01 / SC-3 | Nicht eingeloggter User wird von `/kind/dashboard` auf `/login` redirected | e2e | `npx playwright test tests/e2e/auth-redirect.spec.ts -g "redirects unauthenticated users"` | ❌ Wave 0 |
| REQ-01 / SC-4a | Kind kann keine `/lehrer/*` Route erreichen (Middleware redirect) | integration | `npx vitest run tests/integration/middleware-role-routing.test.ts -t "child cannot access teacher routes"` | ❌ Wave 0 |
| REQ-01 / SC-4b | Lehrer kann keine `/kind/*` Route erreichen (Middleware redirect) | integration | `npx vitest run tests/integration/middleware-role-routing.test.ts -t "teacher cannot access child routes"` | ❌ Wave 0 |
| REQ-01 / SC-4c | RLS blockiert Kind-Zugriff auf Lehrer-Daten (DB-Ebene) | integration | `npx vitest run tests/integration/rls-policies.test.ts -t "child cannot read other child's progress"` | ❌ Wave 0 |
| REQ-01 / SC-5 | Schema existiert: `profiles`, `classes`, `schools`, `progress_entries` mit RLS aktiv | integration | `npx vitest run tests/integration/schema.test.ts -t "all required tables exist with RLS enabled"` | ❌ Wave 0 |

Zusätzliche Unit-Tests (empfohlen):
- Zod-Schemas für Login-Formulare (`lib/schemas/auth.ts`)
- PIN-zu-Email-Mapping-Funktion (reine Funktion, einfach testbar)

### Sampling Rate

- **Per task commit:** `npx vitest run --changed` (nur Dateien mit Diff) — < 10 s
- **Per wave merge:** `npx vitest run && npx playwright test --project=chromium` — ca. 30-60 s
- **Phase gate:** `npx vitest run && npx playwright test` — vollständig vor `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — Vitest-Config mit jsdom-Umgebung
- [ ] `playwright.config.ts` — Playwright-Config mit `baseURL: http://localhost:3000`
- [ ] `tests/setup.ts` — Shared Test-Setup (Supabase-Testclient, Reset zwischen Tests)
- [ ] `tests/fixtures/supabase.ts` — Test-User-Fixtures (ein Test-Kind, ein Test-Lehrer)
- [ ] `tests/e2e/child-login.spec.ts` — SC-1 Coverage
- [ ] `tests/e2e/teacher-login.spec.ts` — SC-2 Coverage
- [ ] `tests/e2e/auth-redirect.spec.ts` — SC-3 Coverage
- [ ] `tests/integration/middleware-role-routing.test.ts` — SC-4a, SC-4b
- [ ] `tests/integration/rls-policies.test.ts` — SC-4c
- [ ] `tests/integration/schema.test.ts` — SC-5
- [ ] Framework-Install: `npm install --save-dev vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @playwright/test`
- [ ] Playwright-Browser-Install: `npx playwright install chromium`

**Note für Solo-Developer / Deadline:** Bei Zeitnot lässt sich die Coverage auf E2E-Tests komprimieren (SC-1, SC-2, SC-3). Integration-Tests (SC-4a–c, SC-5) können durch manuelle Dashboard-Verification ersetzt werden, wenn sie in Verifizierungs-Notizen dokumentiert sind. E2E-Tests sind aber **nicht verzichtbar** — sie sind gleichzeitig die Demo für die Uni-Präsentation.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Supabase Auth (bcrypt, JWT, Cookie-Session); keine Eigenentwicklung |
| V3 Session Management | yes | @supabase/ssr (HttpOnly + Secure Cookies, JWT-Refresh in Middleware) |
| V4 Access Control | yes | Middleware-Guards + Postgres RLS (Defense in depth) |
| V5 Input Validation | yes | Zod-Schemas auf allen Server-Actions |
| V6 Cryptography | yes | Supabase verwaltet Passwort-Hashes + JWT-Signing; **niemals selbst hashen** |
| V7 Error Handling & Logging | partial | Generische Login-Fehler (keine User-Enumeration); Logging via Next.js / Vercel Default |
| V10 Malicious Code | no | Keine File-Uploads in Phase 10 |
| V13 API & Web Service | yes | Server Actions sind Next.js' API-Layer — mit Middleware geschützt |

### Known Threat Patterns für Next.js 15 + Supabase + Kinder-App

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL Injection | Tampering | Supabase-Client parameterisiert automatisch; kein raw SQL im Client-Code |
| XSS in User-Input (z. B. `display_name`) | Tampering | React escaped by default; zusätzlich Zod-`.regex()` auf erlaubte Zeichen |
| CSRF gegen Server Actions | Tampering | Next.js fügt automatisch CSRF-Protection für Server Actions hinzu [CITED: nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations] |
| Session-Hijacking | Spoofing | HttpOnly + Secure + SameSite-Lax Cookies (Supabase Default) |
| Rollen-Eskalation (Kind wird Lehrer) | Elevation of Privilege | Rolle in `app_metadata` via Admin-Action — User-Metadaten kann User nicht selbst ändern; Middleware + RLS doppelt gesichert |
| PIN-Bruteforce | Spoofing | Supabase Auth hat eingebautes Rate-Limiting (Default 30 Requests/5min pro IP). Zusätzlich: 4-stelliger PIN = 10.000 Kombinationen → mit Ratelimit praxistauglich geschützt. [CITED: supabase.com/docs/guides/platform/going-into-prod] |
| Service-Role-Key-Leak | Elevation of Privilege | Niemals mit `NEXT_PUBLIC_` prefixen; `.env.local` in `.gitignore`; Vercel Env-Settings nutzen |
| Enumeration von Benutzernamen | Information Disclosure | Immer identische Fehlermeldung „Benutzername oder PIN ungültig." (Pitfall 6) |
| GDPR: Kinder-PII ohne Einwilligung | Compliance | Assumption: Uni-Projekt läuft in Demo-Scope — keine echten Schüler-Daten. **Für späteren Produktiv-Use:** Einwilligungserklärung per Schule, Datenminimierung (kein `pin_code`-Klartext) |

**Besondere Aufmerksamkeit:**
- **PIN-Speicherung:** Nicht im Klartext in `profiles.pin_code`. Der PIN sollte ausschließlich als bcrypt-Hash in `auth.users.encrypted_password` leben (via Supabase Auth). Siehe Assumption A1.
- **Service-Role-Key-Pfad:** Sicherstellen, dass `lib/supabase/admin.ts` nie in eine Client Component importiert wird. ESLint-Regel oder TypeScript-Kommentar markieren.
- **Middleware + RLS:** Beide Layer gleichzeitig — Middleware kann umgangen werden (z. B. direkter REST-Call gegen Supabase), aber RLS nicht.

## Sources

### Primary (HIGH confidence)

- [Supabase Docs — Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — Kernpattern @supabase/ssr
- [Supabase Docs — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS-Patterns, Performance-Tipps
- [Supabase Docs — RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — Benchmarks, SELECT-Wrap
- [Supabase Docs — Password Security](https://supabase.com/docs/guides/auth/password-security) — Mindestlänge, Konfiguration
- [Supabase Docs — Auth Admin (createUser)](https://supabase.com/docs/reference/javascript/auth-admin-createuser) — Service-Role-Requirements
- [Next.js Docs — Proxy/Middleware File Convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — Matcher, Cookies
- [Next.js Docs — Authentication Guide](https://nextjs.org/docs/app/guides/authentication) — offizielle Zod+Server-Action-Patterns
- [Vercel `with-supabase` Example (raw files)](https://raw.githubusercontent.com/vercel/next.js/canary/examples/with-supabase/lib/supabase/server.ts) — Verifizierter Produktions-Code
- [npm Registry](https://www.npmjs.com/) — Versions-Verifikation via `npm view`

### Secondary (MEDIUM confidence)

- [Supabase Discussion #13315 — Minimum Password Length](https://github.com/orgs/supabase/discussions/13315) — PIN-Längenproblem bestätigt
- [Supabase Discussion #1138 — Infinite Recursion in RLS](https://github.com/orgs/supabase/discussions/1138) — SECURITY DEFINER Pattern
- [Supabase Docs — Migration von auth-helpers zu SSR](https://supabase.com/docs/guides/troubleshooting/how-to-migrate-from-supabase-auth-helpers-to-ssr-package-5NRunM) — Deprecation-Status
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — middleware→proxy Rename
- [STACK.md](../../research/STACK.md) — Projekt-Tech-Entscheidungen

### Tertiary (LOW confidence, markiert für Validation)

- Medium-Artikel zu @supabase/ssr-Pattern (2025 Guides) — wurden nur als Cross-Check verwendet, keine Patterns von dort übernommen

## Project Constraints (from CLAUDE.md)

*Nicht anwendbar — kein `CLAUDE.md` im Projekt vorhanden (Greenfield).*

## Metadata

**Confidence breakdown:**
- Standard Stack: **HIGH** — alle Versionen via `npm view` am 2026-04-15 verifiziert; Supabase-SSR-Pattern aus Vercel-Official-Starter.
- Architecture / Code Examples: **HIGH** — Server-/Browser-Client und Middleware-Helper sind wortgetreu aus dem Vercel `with-supabase` Starter, nur auf Next.js-15-Namen (`middleware.ts` statt `proxy.ts`) angepasst.
- RLS-Patterns: **HIGH** — direkt aus offizieller Supabase-Doku; SECURITY-DEFINER-Pattern durch mehrere Quellen bestätigt.
- PIN-Auth-Workaround: **MEDIUM** — die 6-Zeichen-Mindestlänge ist verifiziert, aber das konkrete Padding-Schema (`pin + class_id-prefix`) ist Claude's Discretion. User-Bestätigung empfohlen (Assumption A1).
- Pitfalls: **HIGH** — alle aus verifizierten Quellen (GitHub-Discussions, offizielle Docs).
- Validation-Architecture: **MEDIUM** — Vitest-Empfehlung ist Standard, aber abhängig vom User-Präferenz; Test-File-Struktur ist Vorschlag, keine Vorgabe.

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (30 Tage — Supabase SSR und Next.js 15 sind stabil; nur @supabase/ssr 0.x kann potentiell Breaking Changes bringen, daher nicht länger)
