# Technology Stack

**Project:** Matheapp — Math learning web app for Grundschule (grades 1-4)
**Researched:** 2026-04-15
**Overall confidence:** HIGH (core stack verified against official docs; game framework section MEDIUM due to limited tool access)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.2 (latest stable) | Full-stack React framework | Team already knows it. App Router gives Server Components for teacher dashboard data fetching, Server Actions for form submissions (login, exercise answers), built-in route protection via Middleware. React 19 included. |
| React | 19 (bundled with Next.js 15) | UI rendering | Ships with Next.js 15 App Router. `useActionState` replaces boilerplate for form feedback. |
| TypeScript | 5.x (auto-configured) | Type safety | `create-next-app` defaults to TS. Catches role/permission bugs at compile time — critical when same codebase serves children and teachers with different access. |

**Confirmed by:** https://nextjs.org/blog/next-15-2 (Feb 2025), https://nextjs.org/docs/app/getting-started/installation

---

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase Auth | via `@supabase/supabase-js` ^2.x, `@supabase/ssr` ^0.x | Per-child login, teacher accounts | Supabase is explicitly listed in the Next.js 15 official auth docs as a recommended provider. Handles email+password out of the box. Free tier covers the project. No infrastructure to manage. SSR package handles cookie-based sessions compatible with Next.js App Router Server Components. |

**Auth strategy:** Email + password. Children get accounts created by teacher (no self-registration needed for MVP). Two roles: `child` and `teacher`, stored in a `profiles` table and enforced via Supabase Row Level Security (RLS).

**Do NOT use:** NextAuth.js for this project. It adds complexity without benefit for a simple two-role app where Supabase already manages the database. OAuth providers (Google, GitHub) are irrelevant for 6-10 year old children.

**Confirmed by:** https://nextjs.org/docs/app/guides/authentication (Supabase listed as recommended auth library, verified 2026-04-15)

---

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase (PostgreSQL) | Free tier | User accounts, child progress, points, exercises, class/teacher relations | Same service as auth — zero extra setup. PostgreSQL is the right choice: relational data (class → children → progress → exercises) maps naturally to tables. RLS protects per-child data at the database level. Free tier: 500MB DB, 2 projects, sufficient for a university demo. |

**Schema outline (for roadmap):**
- `profiles` — user_id (FK to auth.users), role (child/teacher), grade_level, display_name, class_id
- `classes` — id, teacher_id, name
- `exercise_sessions` — child_id, exercise_type, grade, correct, incorrect, points_earned, created_at
- `points` — child_id, total_points, last_updated
- `subscription_tiers` — simulated only (no payments), stored as a field on the class or profile

**Do NOT use:** Prisma ORM. Adds a migration layer on top of Supabase that conflicts with RLS and Supabase's generated client types. Use Supabase's JS client directly — it auto-generates TypeScript types from the schema.

**Confirmed by:** Supabase is the recommended backend-as-a-service for Next.js projects in the Next.js official auth docs (2026-04-15)

---

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x (latest stable, released Jan 2025) | Utility-first styling | Auto-included in `create-next-app`. v4 is CSS-first (no `tailwind.config.js` needed for basics), 3-8x faster builds, native CSS variables. For a children's app: large touch targets, bold colors, and responsive layouts are fast to build with utilities. |

**Children's UI considerations with Tailwind:**
- Use `text-4xl`/`text-5xl` for question numbers (children need large, legible text)
- Use `rounded-2xl` or `rounded-full` for buttons (friendly, approachable look)
- Use saturated colors via Tailwind's color palette (e.g., `bg-yellow-400`, `bg-green-500`)
- Avoid `sm:` breakpoints — these will likely run on school tablets and desktops, not phones

**Do NOT use:** Material UI, Ant Design, or Chakra UI. These component libraries are designed for professional SaaS apps and require significant restyling to look appropriate for children. The visual weight and typography defaults are wrong for ages 6-10.

**Confirmed by:** https://tailwindcss.com/blog/tailwindcss-v4 (Jan 2025)

---

### UI Component Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| shadcn/ui | latest (not versioned — copy-paste components) | Admin dashboard components (tables, cards, charts) | NOT for the child-facing UI. Only for the teacher dashboard where professional UI is appropriate. shadcn/ui components are plain Tailwind, no runtime dependency, easy to customize. Use for class progress tables, stat cards, and data grids. |

**Child-facing UI:** Build custom from scratch with Tailwind. Do not use a component library for the exercise UI — the interaction patterns (large answer buttons, star animations, progress bars) require custom components anyway.

**Do NOT use:** shadcn/ui for child-facing screens. Its components have small click targets and professional aesthetics that are wrong for 6-10 year olds.

---

### Animations (child-facing reward UI)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Motion (formerly Framer Motion) | ^11.x | Points animations, correct/wrong feedback, star bursts, level-up screens | The standard React animation library. Declarative API — `<motion.div animate={{ scale: 1.2 }}>` — works without leaving React's component model. `AnimatePresence` handles mount/unmount animations for showing reward screens. Crucial for child engagement: instant visual feedback on correct answers. |

**Confidence:** MEDIUM — version confirmed from training data (Motion v11 is the rebranded Framer Motion). Could not verify exact current version due to tool restrictions.

**Do NOT use:** CSS keyframe animations defined inline. They are hard to trigger programmatically on correct/wrong events. Use Motion's `animate` prop driven by React state instead.

**Do NOT use:** GSAP. Overkill for this project and license restrictions apply for commercial use.

---

### Mini-Game Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Phaser 3 | ^3.87 (latest stable as of early 2025) | Reward mini-game (unlocked after accumulating points) | The mini-game is isolated, canvas-based, and needs game loop logic (sprite movement, collision, scoring). Phaser is purpose-built for exactly this. Integration pattern: render Phaser in a dedicated `<canvas>` inside a React Client Component. Initialize Phaser in `useEffect`, destroy in cleanup. This keeps the game isolated from React's render cycle. |

**Confidence:** MEDIUM — Phaser 3 version is from training data (3.87 was released early 2025). Could not verify exact latest version due to tool restrictions.

**Integration pattern:**
```tsx
'use client'
import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

export default function MiniGame() {
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    gameRef.current = new Phaser.Game({ ... })
    return () => gameRef.current?.destroy(true)
  }, [])

  return <div id="phaser-container" />
}
```

**Alternative considered:** Pure CSS/React mini-game (catch falling numbers, simple matching). For a 2-4 week deadline, this is the safer fallback if Phaser integration proves complex. A canvas-less mini-game built entirely with React state and CSS animations is achievable and requires zero game framework. Recommend starting with the CSS/React approach and escalating to Phaser only if the game concept requires it.

**Do NOT use:** Kaboom.js. Development activity has slowed significantly and it lacks the ecosystem maturity of Phaser. Do NOT use Unity WebGL exports — massive bundle size, overkill for a simple reward game.

---

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React built-ins (`useState`, `useContext`, Server Components) | N/A | Local and session state | For this app's complexity, React's built-ins are sufficient. Exercise state (current question, score in session) is local. User session state comes from Supabase auth via Server Components — no client state management needed. |
| Zustand | ^5.x (if needed) | Global client state (e.g., exercise session in progress) | Add only if prop drilling becomes painful. Lightweight (< 1KB), no Provider boilerplate, works naturally with Next.js App Router client components. |

**Do NOT use:** Redux or Redux Toolkit. Massive overhead for a project of this scope with a solo developer and 2-4 week deadline.

---

### Hosting

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | Free Hobby tier | Deploy Next.js app | Zero-config deployment for Next.js (same company). Push to GitHub → auto-deploy. Free tier: unlimited deployments, custom domain, 100GB bandwidth/month. More than enough for a university demo. Built-in preview URLs for each pull request, useful for showing progress to professors/teammates. |
| Supabase | Free tier | Database + Auth hosting | 500MB database, 50MB file storage, 50,000 monthly active users — far exceeds demo needs. Projects pause after 1 week of inactivity on free tier — restore with one click before demo. |

**Confirmed by:** https://vercel.com/docs/deployments/overview (2026-04-15)

---

### Form Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zod | ^3.x | Schema validation for Server Actions | The Next.js official auth docs use Zod explicitly for validating form data in Server Actions. Validates login forms, teacher-created student accounts. TypeScript-first. |

**Confirmed by:** https://nextjs.org/docs/app/guides/authentication (Zod used in official example, 2026-04-15)

---

## Full Installation Commands

```bash
# Create project with recommended defaults
npx create-next-app@latest matheapp

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Animations
npm install motion

# Game framework (defer until mini-game phase)
npm install phaser

# Validation
npm install zod

# Optional state management (add only when needed)
npm install zustand

# shadcn/ui CLI (teacher dashboard only, run after project created)
npx shadcn@latest init
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth | Supabase Auth | NextAuth.js | NextAuth adds a separate auth layer on top of the database — Supabase handles both together, reducing complexity for a solo developer |
| Auth | Supabase Auth | Custom JWT + bcrypt | Building secure custom auth from scratch is risky and time-consuming for a 2-4 week project |
| Database | Supabase (PostgreSQL) | PlanetScale (MySQL) | Supabase is already chosen for auth, using the same service eliminates cross-service complexity |
| Database | Supabase (PostgreSQL) | Firebase | Supabase is relational (SQL), which fits the class/student/progress data model better than Firebase's document model |
| Styling | Tailwind v4 | styled-components | No SSR complications, no runtime CSS-in-JS overhead, faster iteration |
| Game | Phaser 3 | Unity WebGL | Bundle size (Unity exports are 50-100MB), Phaser 3 is 1MB and purpose-built for web |
| Game | Phaser 3 / CSS-React | Kaboom.js | Kaboom has reduced maintenance activity; Phaser has larger community and documentation |
| Hosting | Vercel | Railway / Render | Vercel is the canonical host for Next.js, zero config, free tier is sufficient |
| Animation | Motion | GSAP | GSAP requires commercial license; Motion is free and React-native |
| Components | shadcn/ui (teacher only) | MUI / Chakra | MUI/Chakra add runtime JS overhead and require heavy restyling for children's UI |

---

## Key Architectural Decision: Separate UI Modes

The most important stack-level decision is to **not use a single component library for both child and teacher UI**. These two audiences have radically different needs:

- **Child UI:** Large targets, bold colors, animated feedback, emoji-friendly, minimal text
- **Teacher UI:** Dense data tables, charts, small-screen-optimized for teacher laptops

Recommended: Tailwind utilities for child UI (custom components), shadcn/ui for teacher dashboard only. Keep these in separate route groups: `(child)` and `(teacher)` in the Next.js App Router.

---

## Sources

- Next.js 15.2 blog: https://nextjs.org/blog/next-15-2 (Feb 2025, HIGH confidence)
- Next.js 15 release: https://nextjs.org/blog/next-15 (Oct 2024, HIGH confidence)
- Next.js auth documentation: https://nextjs.org/docs/app/guides/authentication (verified 2026-04-15, HIGH confidence)
- Next.js installation docs: https://nextjs.org/docs/app/getting-started/installation (verified 2026-04-15, HIGH confidence)
- Tailwind CSS v4 release: https://tailwindcss.com/blog/tailwindcss-v4 (Jan 2025, HIGH confidence)
- Vercel deployment docs: https://vercel.com/docs/deployments/overview (verified 2026-04-15, HIGH confidence)
- Motion (Framer Motion) version: training data — MEDIUM confidence, verify at https://motion.dev
- Phaser 3 version: training data — MEDIUM confidence, verify at https://phaser.io
