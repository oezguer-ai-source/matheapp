# Domain Pitfalls

**Domain:** Math learning web app for elementary school children (Grundschule, grades 1-4)
**Researched:** 2026-04-15
**Confidence:** MEDIUM — based on training data covering edtech patterns, child UX research, React/Next.js ecosystem, and Supabase auth. Web search unavailable; mark critical claims for manual validation.

---

## Critical Pitfalls

Mistakes that cause rewrites, missed deadlines, or a product that doesn't work for its users.

---

### Pitfall 1: Children Cannot Remember Passwords — Auth Collapses on Day One

**What goes wrong:** A standard username/password login flow built for adults completely breaks down for 6-8 year olds (Klasse 1-2). Children forget passwords within minutes, cannot type email addresses, and become frustrated and disengaged before reaching a single math problem. Teachers then spend class time on login support instead of teaching.

**Why it happens:** Developers build auth for themselves, not for the actual user. Supabase's default auth flows assume adult literacy and memory.

**Consequences:** Teachers reject the product. The entire auth phase gets rewritten. A university evaluator testing with a child demo sees instant failure.

**Prevention:**
- Class 1-2: Use teacher-generated PIN codes (4-6 digits) or picture-based login (select 3 animals in order). No passwords.
- Class 3-4: Short username + simple numeric PIN is acceptable.
- Teachers create and distribute credentials — children never register themselves.
- Supabase supports custom auth flows: store a hashed PIN per student, bypass email entirely.

**Warning signs:** Your login form has an email field and a "Forgot password?" link.

**Phase:** Auth/Rollen setup (Phase 1) — must be designed correctly from the start. Retrofitting child-appropriate auth onto an adult flow is a near-rewrite.

---

### Pitfall 2: Reward System Replaces Math, Not Rewards It

**What goes wrong:** The points/mini-game reward loop becomes so engaging that children game the system — clicking as fast as possible to get wrong answers, collecting points through speed rather than understanding. The math practice collapses into a clicking game. Teachers notice no learning is happening and stop using it.

**Why it happens:** Reward frequency is miscalibrated. If points arrive on every answer (including wrong ones) or the mini-game unlocks too easily, the reward detaches from the learning behavior.

**Consequences:** The app is technically working but pedagogically useless. B2B customers (schools) will not renew.

**Prevention:**
- Points only for CORRECT answers. Zero points for incorrect.
- Add a short cooldown or "try again" prompt before the next attempt on incorrect answers (prevents random clicking).
- Mini-game unlocks after a meaningful threshold (e.g., 10 correct answers in a session, not 10 attempts).
- Track accuracy rate, not just score — display it to teachers in the dashboard.
- Do NOT add streaks that reward logging in without solving problems.

**Warning signs:** Your points increment fires on every form submit regardless of correctness.

**Phase:** Points/Mini-Game implementation — architect the scoring logic with pedagogical intent from day one.

---

### Pitfall 3: Task Generation Has No Difficulty Curve — Children Either Breeze or Quit

**What goes wrong:** Math tasks for each grade are generated uniformly at random within the number range. A Klasse 1 child gets `18 + 19` (near the ceiling of the Zahlenraum bis 20) as the very first task. Frustration and abandonment follows. Alternatively, a Klasse 4 child gets trivial additions they mastered two years ago and loses interest.

**Why it happens:** Developers implement `random(1, maxRange)` as a single function and call it done. Curriculum alignment is treated as a content decision, not a code architecture decision.

**Consequences:** The app fails its core value proposition — it is not actually "altersgerecht." Teachers notice immediately and stop recommending it.

**Prevention:**
- Implement tiered difficulty within each grade level: Easy (bottom 40% of number range), Medium (40-70%), Hard (70-100%).
- Start every session at Easy tier, progress upward based on consecutive correct answers (e.g., 3 correct → step up, 2 wrong → step down).
- Avoid "borderline" numbers for Klasse 1 at the start: don't generate `19 + 1` as an intro problem.
- Keep the generator as a pure function with difficulty parameter — easy to test.

**Warning signs:** Your task generator is `Math.floor(Math.random() * maxRange)` with no difficulty parameter.

**Phase:** Math task engine (core feature phase). Must be designed before the UI is built around it.

---

### Pitfall 4: Teacher Dashboard Shows Data That Means Nothing to Teachers

**What goes wrong:** The dashboard displays raw technical metrics: total points, total tasks attempted, session count. Teachers cannot answer the questions they actually care about: "Is this child struggling with multiplication?" "Who hasn't practiced this week?" The dashboard exists but is unused.

**Why it happens:** Developers build dashboards that are easy to build (aggregate counts from DB queries) rather than dashboards that answer user questions.

**Consequences:** Teachers see no value in the B2B product. The dashboard becomes a vanity feature that does not drive renewals.

**Prevention:**
- Design the dashboard from the teacher's question list, not from available data:
  1. "Which students haven't logged in this week?"
  2. "Who has the lowest accuracy on multiplication?"
  3. "Class average accuracy per operation type."
- Store per-answer records with `operation_type`, `correct: boolean`, `timestamp`, `grade_level` — not just aggregate scores.
- Even if UI is simple, the data model must be granular from Phase 1.

**Warning signs:** Your database only stores a `points` integer per student with no per-answer records.

**Phase:** Data model design (Phase 1 or early Phase 2). Changing the schema after building the task flow is expensive.

---

### Pitfall 5: Scope Creep from "Just One More Grade Feature" Kills the Deadline

**What goes wrong:** Each grade level feels like "just a small addition." Klasse 1 works, then Klasse 2 is "basically the same" but needs edge cases, then Klasse 3 introduces multiplication which behaves differently, then Klasse 4 needs mixed operations and the existing task generator breaks. Four weeks becomes eight.

**Why it happens:** Solo developers underestimate horizontal scope. Vertical depth (one grade, deeply) ships on time. Horizontal breadth (all four grades, shallowly) does not.

**Consequences:** Missed deadline. Incomplete submission. Features across all four grades are half-done.

**Prevention:**
- Build Klasse 1 and Klasse 2 first, completely and polished. They share the same operation types (add/subtract) and differ only in number range — one parameterized generator handles both.
- Klasse 3 (multiplication/division) is a genuine increase in complexity: the generator, UI affordances, and answer validation all behave differently. Budget double the time.
- Klasse 4 mixed operations is the hardest: it requires composing multiple operation types and a more complex difficulty model.
- For the deadline: MVP can be grades 1-3. Grade 4 can be a "stub" that shows the paywall/subscription UI without full task content.
- Never start a new grade until the previous grade is testable end-to-end.

**Warning signs:** You've started building the Klasse 4 UI before Klasse 1 is testable.

**Phase:** All phases — a recurring risk. Establish a "freeze gate" per grade before moving on.

---

### Pitfall 6: Multi-Role Auth Without Clear Session Isolation Breaks Everything

**What goes wrong:** The app has two user types — children (Schüler) and teachers (Lehrer). Without proper role separation, a teacher account accidentally sees child task UIs, or a child session can access class data, or role-based route guards are inconsistent between client and server. Edge cases appear only during demo and evaluation.

**Why it happens:** Supabase Row Level Security (RLS) is powerful but requires deliberate design. Developers often protect only client routes and forget server-side data API protection, or vice versa.

**Consequences:** Security failures in a children's product are a legal and reputational catastrophe (DSGVO/GDPR). An evaluator testing both roles in one browser session triggers auth state bugs.

**Prevention:**
- Design RLS policies before writing any data queries. The policy must exist at the DB level, not just in Next.js middleware.
- Use Supabase's `auth.uid()` and a `profiles` table with a `role` column ('teacher' | 'student').
- Server-side: all API routes check role from the session, never from a client-passed parameter.
- Children never see teacher routes; teachers never see child task flows. Separate top-level route groups: `/app/student/` and `/app/teacher/`.
- Test by logging in as each role in an incognito window before calling any phase complete.

**Warning signs:** Your route protection is only in Next.js middleware `matcher` config with no server-side role check in the actual data layer.

**Phase:** Phase 1 (Auth/Rollen). This is the foundation; getting it wrong contaminates every subsequent phase.

---

## Moderate Pitfalls

---

### Pitfall 7: Keyboard-First UX Excludes the Target Users

**What goes wrong:** Children ages 6-8 hunt-and-peck type on keyboards. A number input box requiring keyboard entry is a bottleneck. Children with tablets (common in German Grundschulen) may have no keyboard at all.

**Prevention:**
- Use large on-screen number buttons (virtual numpad) as the primary answer input.
- Make the tap target at minimum 48x48px — WCAG AA for touch targets.
- The native `<input type="number">` on mobile triggers unpredictable OS keyboards; a custom numpad is more reliable.
- Reserve native keyboard input as a fallback, not the default.

**Warning signs:** Your answer input is a plain `<input type="text">` with no numpad alternative.

**Phase:** Task UI implementation.

---

### Pitfall 8: Subscription Gate Blocks Demo — Teachers Bounce Before Seeing Value

**What goes wrong:** The paywall is implemented eagerly: Klasse 4 immediately redirects to a subscription page. During a demo or evaluation, the person clicking around hits the paywall and cannot see the product. The subscription model confuses evaluators who expected a free demo.

**Prevention:**
- For the university project: implement an explicit "demo mode" bypass or a test account that unlocks Klasse 4 without going through the subscription flow.
- The subscription UI should be a static page explaining the concept, with a "Simulated Checkout" button that sets a DB flag — not a real payment.
- Separate the "paywall gate logic" from the "subscription UI" in code: the gate is a middleware check, the UI is a standalone page.

**Warning signs:** There is no way to access Klasse 4 content without completing the simulated checkout.

**Phase:** Subscription/Abo phase.

---

### Pitfall 9: Animation and Sound Effects Are Built Before Core Logic

**What goes wrong:** The "fun" parts of the app — celebration animations when answering correctly, sound effects, particle effects on point gain — are built first because they're motivating to build. Core functionality (task persistence, score saving, teacher data) is left for the last week and never finishes properly.

**Prevention:**
- Enforce a rule: no animations or sounds until the feature works end-to-end with dummy styling.
- Build the task flow → save to DB → display in teacher dashboard in one vertical slice first.
- Animations are enhancement passes, scheduled after core logic is merged.

**Warning signs:** You have a celebration animation component but the points are not yet being saved to the database.

**Phase:** Task/mini-game phases — a recurring temptation.

---

### Pitfall 10: Mini-Game Is a Scope Bomb

**What goes wrong:** "Mini-game as reward" sounds small but game development is a separate discipline. Even a simple game (dodge obstacles, catch falling numbers) requires its own game loop, collision detection, state management, and mobile input handling. A solo developer can easily spend a full week on it.

**Prevention:**
- Define the mini-game as a strictly timeboxed feature with a hard ceiling (e.g., max 2 days).
- The simplest acceptable mini-game: a canvas-free, CSS animation-based "collect the stars" where stars fall and the child taps them. No game loop, no physics.
- Alternatively: a short unlocked animation sequence (character does a happy dance, fireworks appear) rather than an interactive game. This is a completely valid MVP choice.
- Decide the mini-game format before starting any implementation. Do not let it grow during development.

**Warning signs:** You are researching game engines or physics libraries.

**Phase:** Mini-game phase. Must be scoped aggressively before Phase begins.

---

### Pitfall 11: German Curriculum Alignment Is Treated as Content, Not Architecture

**What goes wrong:** The specific number ranges per grade (bis 20, bis 100, Einmaleins, etc.) are hardcoded as magic numbers scattered throughout the codebase. When a requirement changes (e.g., "actually Klasse 2 should also include multiplication of small numbers") the change requires hunting down a dozen scattered constants.

**Prevention:**
- Centralize curriculum configuration in a single file: `config/curriculum.ts`.
- Each grade level is a typed config object with: `operations[]`, `numberRange: { min, max }`, `difficultyTiers: { easy, medium, hard }`.
- The task generator takes a config object, not raw numbers.
- This also makes the UML/BPMN documentation for the university submission easier to write.

**Warning signs:** You have `Math.random() * 20` in a component file.

**Phase:** Task engine design (early). Costs almost nothing to do right; costs a lot to fix later.

---

## Minor Pitfalls

---

### Pitfall 12: Points Displayed Without Context Feel Meaningless to Children

**What goes wrong:** A child sees "250 Punkte" and has no reference for whether that is good. Points only feel rewarding when children understand their meaning: "You need 50 more to unlock the game."

**Prevention:**
- Always show points in relation to the next reward threshold: progress bar toward mini-game unlock.
- Show a simple visual (stars filled, trophy progress) alongside the number.

**Phase:** Points UI implementation.

---

### Pitfall 13: Supabase Free Tier Limitations Cause Demo Failures

**What goes wrong:** Supabase free tier projects pause after 1 week of inactivity. During a university evaluation demo that follows a week of no testing, the database is paused and the app shows blank screens or errors.

**Prevention:**
- Keep the Supabase project active by making at least one query per week (a simple health-check cron or manual login).
- Alternatively, use Supabase's "keep alive" feature or upgrade to the $25/month Pro tier for the submission period.
- Have a backup: seed data exported as a SQL file, ready to restore in 5 minutes.

**Phase:** Deployment/demo preparation.

---

### Pitfall 14: No Loading and Error States for Young Users

**What goes wrong:** When the network is slow (common on school WiFi), the app shows a blank white screen. Children interpret this as "broken" and call the teacher. Adults understand "loading" — 7-year-olds do not.

**Prevention:**
- Every async operation has a visual loading state: a large friendly spinner or animated character.
- Error states use simple German text: "Etwas ist schiefgelaufen. Bitte lade die Seite neu." — not technical error codes.
- Network timeouts should retry automatically once before showing an error.

**Phase:** All phases — apply as a standard during every component build.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Auth / Rollen | Adult-oriented login flow fails for young children | Design PIN/picture login for students before writing code |
| Auth / Rollen | RLS not enforced server-side | Write Supabase RLS policies before any data queries |
| Task Engine | No difficulty curve — random generation only | Implement tiered difficulty as core generator feature, not an afterthought |
| Task Engine | Curriculum constants scattered in code | Centralize in `config/curriculum.ts` from day one |
| Points/Rewards | Score increments on wrong answers | Scoring logic must be server-validated, not client-only |
| Points/Rewards | Mini-game grows into a scope bomb | Timebox to 2 days maximum; define format before starting |
| Teacher Dashboard | Dashboard stores only aggregate counts | Design per-answer data model before building any task UI |
| Teacher Dashboard | Dashboard unusable by actual teachers | Design from teacher questions, not from available DB columns |
| Abo/Subscription | Paywall blocks demo evaluation | Always provide a demo mode or bypass account |
| All phases | Scope creep across four grade levels | Complete and freeze each grade before starting the next |
| All phases | Animations built before core logic | Enforce: no polish before end-to-end vertical slice works |

---

## Sources

- Domain expertise from training data covering: edtech research (Duolingo, Khan Academy architecture patterns), child UX guidelines (Nielsen Norman Group research on children's interfaces), React/Next.js App Router patterns, Supabase RLS documentation patterns, gamification research (Deterding et al., Kapp), German Grundschule curriculum structure (KMK Bildungsstandards Mathematik Primarstufe).
- Confidence: MEDIUM. Web search was unavailable; claims around Supabase free tier behavior and specific child login pattern implementations should be validated against current Supabase docs before the auth phase begins.
