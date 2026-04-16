---
phase: 10
slug: foundation
status: draft
shadcn_initialized: true
preset: manual (no preset; shadcn init with defaults for `(teacher)` scope only)
created: 2026-04-15
---

# Phase 10 — UI Design Contract

> Visual and interaction contract for the Foundation phase. Scope is intentionally minimal: a single `/login` page with a role toggle (Kind / Lehrkraft), a Lehrer sign-up form, and two stub dashboards (`/kind/dashboard`, `/lehrer/dashboard`) that prove routing works. Full child exercise UI is deferred to Phase 30; full teacher dashboard to Phase 50.

## Scope

**In scope (Phase 10):**
- `/login` — role toggle + Kind form (Benutzername + 4-stelliger PIN) + Lehrer form (Email + Passwort)
- `/registrieren` — Lehrer sign-up only (Email + Passwort + Name)
- `/kind/dashboard` — stub: greeting `Hallo, {name}!` + large `Abmelden` button
- `/lehrer/dashboard` — stub: greeting + `Abmelden` button
- Auth states: idle, loading (submit pending), validation error (per-field), auth error (generic)

**Out of scope (other phases):**
- Full child dashboard, exercise UI, points display, on-screen numpad for answers — Phase 30
- Mini-game — Phase 40
- Teacher analytics, class table — Phase 50
- Subscription upgrade prompt — Phase 60
- Teacher creates child account UI — Phase 50 (Phase 10 only ships the server action groundwork if needed; no UI in this phase)

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui (initialized during Phase 10, used in `(teacher)` route group only) |
| Preset | manual — `npx shadcn@latest init` with defaults (New York style, Slate base, CSS variables) |
| Component library | shadcn/ui on Radix primitives — teacher scope only (Lehrer-Login, Lehrer-Signup, Lehrer-Stub) |
| Child-facing UI | custom components with raw Tailwind v4 utilities only — no component library, per CONTEXT.md D-17 / D-18 |
| Icon library | lucide-react (ships with shadcn/ui; used only in teacher scope) |
| Font | Geist Sans (Next.js default, `next/font/google`) for body/UI; Geist Mono unused in Phase 10 |

**Route-group styling boundary (locked by CONTEXT.md D-17 / D-18):**
- `app/(child)/**` and the **Kind side of `/login`** → raw Tailwind only, large text, saturated colors, rounded-2xl, min 48px touch targets
- `app/(teacher)/**` and the **Lehrkraft side of `/login`** + `/registrieren` → shadcn/ui components (Button, Input, Label, Card, Tabs, Alert)

---

## Spacing Scale

Declared values (multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px (Tailwind `1`) | Icon gaps inside buttons |
| sm | 8px (Tailwind `2`) | Compact element spacing (e.g. between PIN digits) |
| md | 16px (Tailwind `4`) | Default element spacing (form field label → input) |
| lg | 24px (Tailwind `6`) | Field-to-field spacing, card inner padding |
| xl | 32px (Tailwind `8`) | Form section gaps |
| 2xl | 48px (Tailwind `12`) | Major section breaks, stub dashboard header margin |
| 3xl | 64px (Tailwind `16`) | Page-level vertical padding on `/login` container |

**Exceptions:**
- Kind-side interactive targets (PIN digit buttons, Benutzername input, Einloggen CTA, Abmelden) MUST have a minimum hit area of **56px** (Tailwind `h-14`). This exceeds the 48px CONTEXT.md D-19 floor to keep comfortable tap targets on school tablets for children ages 6-10.
- PIN input grid: gap of 8px between the four digit boxes (sm), 12px horizontal padding on the container is not used — full flex with centered justification instead.

---

## Typography

Phase 10 declares **4 sizes** and **2 weights**. The two route-group styles pull from the same tokens but emphasize different sizes.

| Role | Size | Weight | Line Height | Used By |
|------|------|--------|-------------|---------|
| Body | 16px (Tailwind `text-base`) | 400 (regular) | 1.5 | Teacher form labels, teacher stub body, error helper text |
| Label / small | 14px (Tailwind `text-sm`) | 600 (semibold) | 1.4 | Teacher form field labels, inline validation messages |
| Heading | 24px (Tailwind `text-2xl`) | 600 (semibold) | 1.25 | `/login` page title (Teacher side), `/registrieren` heading, teacher stub greeting |
| Display | 36px (Tailwind `text-4xl`) | 600 (semibold) | 1.2 | Kind-side headings (`Hallo!`, stub greeting), PIN digit glyphs, child CTA button label |

**Rules:**
- Only 400 (regular) and 600 (semibold). No 500, 700, 300, 800.
- Kind-side interactive copy uses Display (36px) weight 600 — per CONTEXT.md D-19 (`text-4xl`).
- Teacher-side interactive copy uses Body (16px) weight 400 with Label (14px) weight 600 for field captions — matches shadcn/ui defaults.
- Numerals in the PIN input use Display 36px weight 600, letter-spacing `0.05em` for legibility.

---

## Color

Palette is declared with a clear 60/30/10 split for each route group. The two groups share the same neutral dominant + secondary but differ on the accent (child is bold, teacher is restrained).

| Role | Value | Tailwind v4 token | Usage |
|------|-------|-------------------|-------|
| Dominant (60%) | `#FFFFFF` | `bg-white` | Page background (both route groups) |
| Secondary (30%) | `#F1F5F9` | `bg-slate-100` | Card surface (login card, stub dashboard card), divider lines use `border-slate-200` |
| Accent — Child (10%) | `#FACC15` | `bg-yellow-400` | Kind-side primary CTA (`Einloggen`), active state of role toggle when Kind is selected, PIN digit focus ring |
| Accent — Teacher (10%) | `#0F172A` | `bg-slate-900` (shadcn default `primary`) | Lehrer-side primary CTA (`Einloggen`, `Konto erstellen`), active state of role toggle when Lehrkraft is selected |
| Destructive | `#DC2626` | `bg-red-600` / `text-red-600` | Inline validation errors, auth-error Alert copy, focus ring on invalid fields |
| Success (reserved, unused in Phase 10) | `#16A34A` | `text-green-600` | Not used in Phase 10 — reserved for Phase 30 correct-answer feedback; declared here so the palette stays stable |

**Accent reserved for (explicit list — never "all interactive elements"):**

Child accent (`yellow-400`):
1. The `Einloggen` primary button on the Kind side of `/login`
2. The role toggle button when `Kind` is the selected role (unselected = `bg-slate-100`)
3. The focus ring (`ring-4 ring-yellow-400`) on the Benutzername input and on each PIN digit input while typing
4. The `Abmelden` button on `/kind/dashboard` (stub)

Teacher accent (`slate-900`):
1. The `Einloggen` primary button on the Lehrer side of `/login`
2. The `Konto erstellen` primary button on `/registrieren`
3. The role toggle button when `Lehrkraft` is the selected role
4. The `Abmelden` button on `/lehrer/dashboard` (stub) — rendered as shadcn `<Button variant="default">`

Everything else that is interactive (secondary buttons, the opposite toggle option, links, hover states on surfaces) uses neutral slate tones. The accent must never appear on a non-interactive decorative element.

**Contrast verification (WCAG AA required for Phase 10):**
- `#FACC15` on `#0F172A` text (Kind CTA label uses `slate-900` on yellow) → contrast ratio 12.6:1 ✓
- `#0F172A` on `#FFFFFF` → 19.3:1 ✓
- `#DC2626` on `#FFFFFF` → 4.8:1 ✓ (AA for normal text)

---

## Copywriting Contract

All copy is German (CONTEXT.md D-21). Copy is prescriptive — executor must use these exact strings.

### Global

| Element | Copy |
|---------|------|
| Document `<title>` (login) | `Matheapp — Anmelden` |
| Document `<title>` (registrieren) | `Matheapp — Lehrkraft registrieren` |
| Document `<title>` (child dashboard stub) | `Matheapp — Startseite` |
| Document `<title>` (teacher dashboard stub) | `Matheapp — Lehrkräfte-Bereich` |

### `/login` — shared

| Element | Copy |
|---------|------|
| Page heading (above toggle) | `Willkommen bei Matheapp` |
| Role toggle — option 1 | `Kind` |
| Role toggle — option 2 | `Lehrkraft` |
| Role toggle — aria-label | `Rolle wählen` |

### `/login` — Kind side

| Element | Copy |
|---------|------|
| Sub-heading | `Melde dich an, um zu üben.` |
| Benutzername label | `Benutzername` |
| Benutzername placeholder | `z. B. mia.k` |
| PIN label | `Dein PIN (4 Ziffern)` |
| PIN aria-label (each digit) | `PIN-Ziffer {N} von 4` |
| Primary CTA (idle) | `Einloggen` |
| Primary CTA (loading) | `Anmelden…` |
| Validation — Benutzername leer | `Bitte gib deinen Benutzernamen ein.` |
| Validation — PIN unvollständig | `Bitte gib alle 4 Ziffern ein.` |
| Auth error (generic, security-safe) | `Benutzername oder PIN stimmt nicht. Frag deine Lehrerin oder deinen Lehrer.` |
| Help link (bottom of card) | `Lehrkraft? Hier anmelden` → switches toggle to `Lehrkraft` |

### `/login` — Lehrer side

| Element | Copy |
|---------|------|
| Sub-heading | `Melden Sie sich mit Ihrer Schul-E-Mail an.` |
| Email label | `E-Mail` |
| Email placeholder | `name@schule.de` |
| Passwort label | `Passwort` |
| Primary CTA (idle) | `Einloggen` |
| Primary CTA (loading) | `Anmelden…` |
| Secondary link | `Noch kein Konto? Jetzt registrieren` → navigates to `/registrieren` |
| Validation — E-Mail ungültig | `Bitte geben Sie eine gültige E-Mail-Adresse ein.` |
| Validation — Passwort leer | `Bitte geben Sie Ihr Passwort ein.` |
| Auth error (generic, security-safe) | `E-Mail oder Passwort ist nicht korrekt.` |
| Help link (bottom of card) | `Kind? Hier anmelden` → switches toggle to `Kind` |

### `/registrieren` — Lehrer sign-up

| Element | Copy |
|---------|------|
| Page heading | `Lehrkraft-Konto erstellen` |
| Sub-heading | `Legen Sie ein Konto an, um Ihre Klasse zu verwalten.` |
| Name label | `Name` |
| Name placeholder | `Vor- und Nachname` |
| Email label | `E-Mail` |
| Email placeholder | `name@schule.de` |
| Passwort label | `Passwort (mindestens 8 Zeichen)` |
| Primary CTA (idle) | `Konto erstellen` |
| Primary CTA (loading) | `Konto wird erstellt…` |
| Secondary link | `Bereits registriert? Zum Login` → navigates to `/login` |
| Validation — Name leer | `Bitte geben Sie Ihren Namen ein.` |
| Validation — E-Mail ungültig | `Bitte geben Sie eine gültige E-Mail-Adresse ein.` |
| Validation — Passwort zu kurz | `Das Passwort muss mindestens 8 Zeichen lang sein.` |
| Server error — E-Mail bereits vergeben | `Mit dieser E-Mail existiert bereits ein Konto.` |
| Server error — allgemein | `Die Registrierung ist fehlgeschlagen. Bitte versuchen Sie es erneut.` |
| Success toast / redirect copy | `Konto angelegt. Sie werden angemeldet…` |

### `/kind/dashboard` — stub

| Element | Copy |
|---------|------|
| Heading | `Hallo, {display_name}!` |
| Sub-heading | `Bald kannst du hier rechnen und Punkte sammeln.` |
| Logout CTA | `Abmelden` |

### `/lehrer/dashboard` — stub

| Element | Copy |
|---------|------|
| Heading | `Willkommen, {name}` |
| Sub-heading | `Ihr Klassen-Dashboard folgt in Kürze.` |
| Logout CTA | `Abmelden` |

### Empty, error, destructive states

| Element | Copy |
|---------|------|
| Empty state heading | N/A — Phase 10 scope (no list views; stubs only show greeting) |
| Empty state body | N/A — Phase 10 scope |
| Error state (generic network/server failure, reused) | Heading: `Etwas ist schiefgelaufen.` — Body: `Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut.` (teacher tone) |
| Error state (Kind variant) | Heading: `Das hat nicht geklappt.` — Body: `Versuch es nochmal.` |
| Destructive confirmation | N/A — Phase 10 scope (logout is a one-click action, no confirm dialog; there is no destructive data action yet) |

**Security note (locked by STACK.md discretion area "Error message wording"):** Auth failures MUST use a generic message that does not disclose whether the username/email exists. The two auth-error strings above satisfy this.

---

## Component Inventory (Phase 10)

| Component | Route | Source | Notes |
|-----------|-------|--------|-------|
| `<RoleToggle>` | `/login` | custom (Tailwind) | Two segmented buttons, controls which form renders. Yellow accent for Kind, slate-900 for Lehrkraft. |
| `<ChildLoginForm>` | `/login` (Kind) | custom (Tailwind) | Benutzername `<input>` (text-4xl, h-14) + 4 single-digit PIN inputs (w-14 h-14 text-4xl, `inputMode="numeric"`, `pattern="[0-9]"`, auto-advance on fill) + yellow submit button. |
| `<TeacherLoginForm>` | `/login` (Lehrkraft) | shadcn/ui `Card`, `Input`, `Label`, `Button`, `Alert` | Standard vertical form. |
| `<TeacherSignupForm>` | `/registrieren` | shadcn/ui `Card`, `Input`, `Label`, `Button`, `Alert` | Name + Email + Passwort. |
| `<LogoutButton>` — child variant | `/kind/dashboard` | custom (Tailwind) | `h-14`, `bg-yellow-400 text-slate-900 rounded-2xl`, text-4xl label. |
| `<LogoutButton>` — teacher variant | `/lehrer/dashboard` | shadcn/ui `Button variant="default"` | Standard slate-900 button. |
| `<AuthErrorAlert>` — child variant | `/login` (Kind) | custom (Tailwind) | Red-600 border, `text-lg` body, friendly tone. |
| `<AuthErrorAlert>` — teacher variant | `/login` (Lehrer), `/registrieren` | shadcn/ui `Alert variant="destructive"` | Standard. |

---

## State Matrix

Every interactive surface must define: `idle`, `hover`, `focus-visible`, `loading` (if submits), `disabled`, `error` (if validates).

| Surface | idle | hover | focus-visible | loading | disabled | error |
|---------|------|-------|---------------|---------|----------|-------|
| Kind `Einloggen` CTA | `bg-yellow-400 text-slate-900` | `bg-yellow-500` | `ring-4 ring-yellow-300 ring-offset-2` | opacity 0.7, text = `Anmelden…`, cursor `wait` | `bg-slate-200 text-slate-400 cursor-not-allowed` | (n/a — form-level error only) |
| Kind Benutzername input | `bg-white border-2 border-slate-300 text-slate-900 text-4xl h-14 rounded-2xl` | `border-slate-400` | `border-yellow-400 ring-4 ring-yellow-200` | readonly | opacity 0.6 | `border-red-600 ring-4 ring-red-200` |
| Kind PIN digit | same as Benutzername, width `w-14` | same | same | readonly | same | same |
| Teacher `Einloggen` / `Konto erstellen` CTA | shadcn `<Button>` default (`bg-slate-900 text-white`) | shadcn default hover | shadcn default focus ring | `disabled`, label swaps to loading copy, optional `<Loader2>` spinner 16px | shadcn default disabled | (form-level Alert) |
| Teacher inputs (shadcn `<Input>`) | shadcn default | shadcn default | shadcn default ring | readonly during submit | shadcn default | `aria-invalid="true"` + red-600 border (shadcn default invalid state) |
| Role toggle — selected Kind | `bg-yellow-400 text-slate-900 font-semibold` | — (already active) | `ring-4 ring-yellow-300` | n/a | n/a | n/a |
| Role toggle — selected Lehrkraft | `bg-slate-900 text-white font-semibold` | — | `ring-2 ring-slate-400 ring-offset-2` | n/a | n/a | n/a |
| Role toggle — unselected | `bg-slate-100 text-slate-600` | `bg-slate-200` | same focus ring as selected variant | n/a | n/a | n/a |

---

## Layout

### `/login`

- Full viewport centered: `min-h-dvh grid place-items-center bg-white px-6 py-16`
- Card: `w-full max-w-md bg-slate-100 rounded-3xl p-8 lg:p-12 shadow-sm`
- Page heading (`text-2xl font-semibold text-slate-900 text-center mb-6`)
- Role toggle (full-width segmented, `flex gap-2 p-1 bg-white rounded-2xl mb-8`)
- Active form (conditional render, not unmount — preserve input values when switching back via the footer link)
- Footer link (`text-sm text-slate-600 underline mt-8 text-center block`)

### `/registrieren`

- Same container as `/login`, replaces role toggle with the page heading + sub-heading.

### `/kind/dashboard` (stub)

- `min-h-dvh bg-white p-8 flex flex-col`
- Heading `text-4xl font-semibold text-slate-900`
- Sub-heading `text-xl text-slate-600 mt-4`
- Logout button pinned bottom-right on desktop (`lg:self-end`), full-width at mobile (`w-full mt-auto`).

### `/lehrer/dashboard` (stub)

- Standard shadcn dashboard shell: `min-h-dvh bg-white p-6`
- Top bar: greeting (`<h1 className="text-2xl font-semibold">`) + `<Button variant="default">Abmelden</Button>` on the right
- Body: shadcn `<Card>` with the sub-heading copy — lightweight placeholder so Phase 50 can expand.

---

## Accessibility Contract

- All forms use native HTML form semantics; Server Actions as the submit target. Labels associated via `htmlFor`.
- Kind PIN inputs: `inputMode="numeric"` + `pattern="[0-9]"` + `autoComplete="off"` + `maxLength={1}` per digit; auto-focus next on input, auto-focus previous on Backspace when empty.
- Role toggle uses `role="tablist"` with `role="tab"` children and `aria-selected`; forms are `role="tabpanel"` with matching `aria-labelledby`.
- Focus order on `/login`: heading → role toggle → first form field → second form field (for Kind, the four PIN digits receive sequential focus) → submit button → footer link.
- Auth-error Alert receives `role="alert"` so screen readers announce it on submission failure.
- Color is never the sole indicator of an error state — red border + error copy + aria-invalid together.
- Minimum tap targets: 48px teacher-side (shadcn defaults satisfy this), 56px Kind-side (enforced in component CSS).
- German lang: `<html lang="de">` in root layout.

---

## Registry Safety

| Registry | Blocks / Components Used | Safety Gate |
|----------|--------------------------|-------------|
| shadcn official | `button`, `input`, `label`, `card`, `tabs` (optional — role toggle can be native; if adopted, use shadcn `tabs`), `alert` | not required — official shadcn registry |
| (none — third-party) | — | not applicable |

No third-party shadcn registries are used in Phase 10. Vetting gate: **not applicable — no third-party blocks declared.**

---

## Out-of-Scope Fields (Phase 10)

The following standard UI-SPEC fields are marked N/A because Phase 10 does not ship the UI surfaces they describe:

- **Empty-state heading / body** — N/A — Phase 10 scope (no list/table views)
- **Destructive confirmation** — N/A — Phase 10 scope (no destructive data action; logout is a non-destructive session end)
- **Success state copy** — N/A — Phase 10 scope (successful login is a navigation away; no toast needed beyond the signup redirect copy noted above)
- **Data-loading skeletons** — N/A — Phase 10 scope (stub dashboards render a static greeting from the session claims; no data fetch)
- **Illustrations / mascot** — N/A — Phase 10 scope (deferred to Phase 30 where the child motivation layer lives)

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
