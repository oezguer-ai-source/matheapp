# Feature Landscape

**Domain:** Math learning web app for German elementary school (Grundschule, Klasse 1-4)
**Researched:** 2026-04-15
**Confidence note:** Web search and WebFetch tools unavailable. Analysis based on training knowledge of Anton, Mathegym, Khan Academy Kids, Sofatutor, Duolingo Math, Blinkist Kids. Confidence is MEDIUM — verified against known, widely-documented platform features as of late 2024/early 2025.

---

## Competitive Landscape Context

Key competitors in the German elementary school math segment:

| Competitor | Positioning | Relevant Strengths |
|---|---|---|
| **Anton App** | German school curriculum, free for students | Grade-aligned content, teacher dashboard, no ads, DSGVO-compliant, works offline |
| **Mathegym** | Web-based drill for Klasse 5+, subscription | Strong exercise engine, parent reports — weak at Grundschule |
| **Khan Academy Kids** | US-focus, gamified, free | Heavy gamification, adaptive learning — limited German curriculum alignment |
| **Sofatutor** | Video-first, premium German tutor platform | Explanatory videos, strong Klasse 3-4 — expensive, not drill-focused |
| **Duolingo Math** | Streak-based habit formation | Strong onboarding + habit loops — too simple, no curriculum tie |
| **Bettermarks** | Adaptive math for Klasse 4+ | Adaptive engine, step-by-step feedback — not Grundschule primary |

**Key insight for this project:** Anton dominates the free German Grundschule segment. Differentiation must come from either (a) tighter gamification loop (points + unlockable mini-game is already the stated direction) or (b) better teacher tooling. The B2B school sales model is the structural differentiator, not the learning content itself.

---

## Table Stakes

Features users (children, teachers, schools) expect. Missing = product feels incomplete or unsafe for school use.

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| **Grade-appropriate math exercises** | Core value delivery — without correct Klasse 1-4 content the app has no purpose | Low | Klasse 1-4 scope already defined in PROJECT.md. Generator can be algorithmic (random operands within Zahlenraum). |
| **Child login / account** | Individual progress tracking; expected by every competing app | Low-Med | Supabase auth already planned. Child accounts need simple login (no email for young children — teacher-created accounts with codes). |
| **Immediate right/wrong feedback** | Children need instant feedback; delay = confusion. Standard in all apps. | Low | Show correct answer on wrong input. Color coding (green/red). |
| **Visual progress indicator** | Children need to see "how far am I?" — star counts, progress bars, level indicators. | Low | Can be a simple points counter + level badge. |
| **Points / score system** | Every competing app has this. Children expect reward for effort. | Low | Core requirement already in PROJECT.md. |
| **Teacher dashboard** | B2B school sale is impossible without it. Teachers need class overview. | Med | Show per-student progress, exercise counts, points. Minimal viable: table with student name + points + exercises done. |
| **DSGVO / data privacy compliance** | German schools legally cannot adopt a product that isn't DSGVO-compliant. Hard requirement. | Med | No third-party analytics on child data. No advertising. Data stays in EU. Supabase EU region. |
| **Class/student management** | Teachers need to create accounts for students (children can't self-register with email). | Med | Teacher creates class, generates login codes per student. Students use code to log in. |
| **Responsive / tablet-friendly UI** | Schools use iPads and Chromebooks heavily. Web app must work on tablet without native install. | Med | CSS responsive layout. Touch targets >= 44px. No hover-only interactions. |
| **German language UI** | Target market is German schools. English UI is a disqualifier for procurement. | Low | Already planned. Consistent German throughout. |
| **Age-appropriate visual design** | 6-10 year olds need large text, simple icons, high contrast, no cluttered UI. | Low-Med | Use large font sizes (18px+), clear iconography, limited color palette. Avoid adult SaaS aesthetics. |
| **Curriculum alignment (Lehrplan)** | Schools require content to match German state curricula. Must be explicit about Zahlenraum per class. | Low | Already scoped: Zahlenraum bis 20 (Kl.1), bis 100 (Kl.2), kleines 1x1 (Kl.3), gemischt (Kl.4). Document alignment in UI. |

---

## Differentiators

Features that set this product apart from Anton and Mathegym. Not universally expected, but valued by target users.

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| **Unlockable mini-game as reward** | Turns exercise completion into a clear goal. More concrete than "earn stars." Children see the reward before they earn it. | High | The stated core differentiator. Mini-game must be fun enough to motivate but not so fun that it replaces learning. Keep it simple: memory card game, a Breakout clone, or a simple puzzle. |
| **Points gate for mini-game access** | "Earn 50 points to unlock game" creates session goals. Unlike Anton's passive star collection. | Low-Med | Depends on points system and mini-game being built. Gate resets daily or per session — decide which motivates more (session reset is more motivating for short daily use). |
| **Simulated subscription tier display** | Shows a realistic B2B SaaS product. Differentiates from free apps by demonstrating commercial viability. | Low | Frontend-only gate with upgrade prompt. Klasse 4 content behind paywall UI, no real payment. |
| **Per-student performance drill-down** | Anton's teacher dashboard is minimal. A slightly richer view (exercise type breakdown, time trend, weak areas) would stand out for teachers. | Med-High | For uni-project scope: keep to points + exercise count + last activity. Drill-down is future work. |
| **Session-based "challenge mode"** | Timed rounds (e.g., "solve 10 problems in 2 minutes") add excitement. Mathegym has this, Anton does not. | Med | Optional feature — timer adds stress for some children. Flag as phase 2. |
| **Streak / habit system** | Duolingo-style daily streak encourages return visits. Not present in Anton. | Med | Requires daily login detection, streak counter, streak-break handling. Good for teacher-assigned daily practice. |
| **Difficulty adaptive hint** | If a child gets 3 wrong in a row, show a visual hint (number line, multiplication table visual). Not just "wrong." | Med | Requires tracking consecutive errors per exercise type. Meaningful for Klasse 1-2 subtraction and Klasse 3 division. |

---

## Anti-Features

Features to deliberately NOT build for this project.

| Anti-Feature | Why Avoid | What to Do Instead |
|---|---|---|
| **Real payment / Stripe integration** | Overscopes the uni-project massively. Legal complexity (KYC, contracts, invoicing). Not evaluable in 2-4 weeks. | Simulate with UI-only upgrade prompt showing tier pricing. Store tier selection in DB without charging. |
| **Video lessons / explanations** | Sofatutor-style video content requires production work. Completely out of scope for solo dev. | Text/visual hints only. Link to external free resources (optional, low effort). |
| **Mobile native app (iOS/Android)** | Separate release process, App Store approval, platform-specific dev. Already out of scope in PROJECT.md. | Responsive web with touch support is sufficient for tablet use in schools. |
| **Social / competitive leaderboards between students** | Creates anxiety and exclusion in 6-10 year olds. Educationally controversial. DSGVO risk. | Personal progress only. Teacher sees aggregate class stats. No public rankings. |
| **Parent portal** | Adds a third user role, auth complexity, and communication features. Not needed for B2B school product. | Teacher dashboard covers the school-side stakeholder. Parent access is future work. |
| **Geometry, fractions, text problems** | Explicitly out of scope in PROJECT.md. Would fragment dev time without adding core value. | Focus depth on arithmetic. Document extension roadmap in uni report. |
| **Content management system / exercise editor** | Teacher-authored exercises sounds valuable but is a separate product. Too complex for solo + 2-4 weeks. | Algorithmic exercise generation within defined Zahlenraum covers all needed variety. |
| **AI-generated personalized exercise paths** | Adaptive learning engines (Bettermarks-style) take months to train and tune. Misleading to promise this. | Simple rule: child completes N exercises correctly → advance to next difficulty level within same class. |
| **Offline mode / PWA caching** | Anton supports offline because it's mobile-native. Web app with Supabase needs complex service worker + sync logic. | Require internet connection. Note in product description. Schools have WiFi. |
| **Multi-language support** | German only for MVP. i18n adds translation overhead and scope creep. | German throughout. Document internationalization as future market expansion. |

---

## Feature Dependencies

```
Child login (Supabase auth)
  └── Points system (requires user ID to store points)
        └── Mini-game unlock gate (requires points threshold check)
              └── Mini-game itself (independent implementation)

Teacher login (separate role)
  └── Class management (teacher creates class)
        └── Student code-based login (student accounts tied to class)
              └── Teacher dashboard (reads student progress per class)

Exercise engine (algorithmic generation by Klassenstufe)
  └── Right/wrong feedback (requires answer evaluation)
        └── Points award on correct answer (requires feedback result)
              └── Progress indicator (reads cumulative points)

Subscription tier display (frontend only)
  └── Klasse 4 content gate (checks user's tier from DB)
```

---

## MVP Recommendation

Given the 2-4 week timeline and solo developer, prioritize ruthlessly:

**Build these (true MVP):**

1. Child auth with teacher-generated login codes (table stakes — without this no tracking)
2. Exercise engine for all 4 class levels with immediate feedback (core value)
3. Points system with visual counter (table stakes — expected by every user)
4. Mini-game unlock gate + one simple mini-game (stated differentiator — this is the hook)
5. Teacher dashboard: class list + per-student points + exercise count (B2B requirement)
6. Subscription tier UI (Klasse 4 gate + simulated upgrade prompt) (uni requirement)

**Defer to documentation only (describe but don't implement):**

- Streak system (document as future feature in uni report)
- Adaptive hints (document as future feature)
- Challenge mode / timed rounds (document as future feature)
- Per-student drill-down analytics (document as future feature)

**Reasoning:** The mini-game is the most differentiating and motivating feature for the target age group. It must actually work and be fun — a broken or boring mini-game undermines the entire value proposition. Budget 30-40% of implementation time for the mini-game if it needs to impress.

---

## Phase Implications for Roadmap

| Phase Topic | Features | Notes |
|---|---|---|
| Foundation / Auth | Child login, teacher login, class management, student code login | Must be first — everything else depends on user identity |
| Exercise Engine | Exercise generation per Klasse, feedback, points award | Core loop — build and validate before adding rewards |
| Reward System | Points display, unlock gate, mini-game | Build after exercise engine is stable |
| Teacher Dashboard | Class view, per-student stats | Can be built in parallel with reward system |
| Subscription UI | Tier display, Klasse 4 gate, upgrade prompt | Low complexity, build last as a layer on top |

---

## Sources

- Training knowledge of Anton App (anton.app), Mathegym (mathegym.de), Khan Academy Kids, Sofatutor, Duolingo Math, Bettermarks — confidence MEDIUM (well-documented platforms, no live verification possible in this session)
- PROJECT.md scope constraints read directly — confidence HIGH
- German DSGVO / school procurement requirements — confidence HIGH (well-established legal framework)
- Child UX research principles (large touch targets, immediate feedback, age-appropriate design) — confidence HIGH (established HCI research)
