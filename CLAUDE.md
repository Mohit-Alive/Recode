@AGENTS.md

# Recode

Spaced-repetition practice tracker for LeetCode (Next.js 16 App Router, Clerk, Neon + Drizzle, ts-fsrs).

## UI rules (read before touching any UI)
- Follow `DESIGN.md` (Linear design system) and the `design-taste-frontend` skill. Tokens live in `src/app/globals.css`; never hard-code colours, use `bg-surface-1`, `text-ink-subtle`, `border-line`, `bg-accent`, etc.
- One accent (lavender) for primary CTA, focus, active nav and links only. Memory colours (`strong`, `fading`, `risk`) appear only inside data and always next to a label or tick count.
- Icons: `@phosphor-icons/react/ssr` only. No Lucide, no emoji, no em or en dashes in copy.
- No drop shadows; depth comes from surface steps and 1px borders. Radii: 6 chips, 8 buttons/inputs, 12 cards.
- Run the `web-design-guidelines` skill on changed UI files before calling UI work done.

## Architecture
- Pure scheduling logic: `src/lib/srs/*` (FSRS adapter, grading, queue, drills, mastery). Keep it pure and unit-tested; pass `now` in.
- Server reads: `src/server/queries.ts`. Mutations: `src/actions/*` (server actions, `auth.protect()` via `requireUser`, then `refresh()`).
- Auth is enforced per page/action (`requireUser`), not in `src/proxy.ts`.
- Dev clock: the `recode-time-offset` cookie (DevClock widget, bottom right in development) shifts time to make reviews due.

## Commands
- `pnpm test` (vitest), `pnpm typecheck`, `pnpm lint`, `pnpm build`
- `pnpm db:migrate`, `pnpm db:seed` (idempotent; reads `data/all_companies_questions.csv`)
