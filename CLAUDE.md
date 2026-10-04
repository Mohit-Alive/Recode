@AGENTS.md

# Recode

Spaced-repetition practice tracker for LeetCode (Next.js 16 App Router, Clerk, Neon + Drizzle, ts-fsrs).

## UI rules (read before touching any UI)
- Follow `DESIGN.md` (Linear design system) and the `design-taste-frontend` skill. Tokens live in `src/app/globals.css`; never hard-code colours, use `bg-surface-1`, `text-ink-subtle`, `border-line`, `bg-accent`, etc.
- One accent (lavender) for primary CTA, focus, active nav and links only. Memory colours (`strong`, `fading`, `risk`) appear only inside data and always next to a label or tick count.
- Icons: `@phosphor-icons/react/ssr` only. No Lucide, no emoji, no em or en dashes in copy.
- Third-party names (LeetCode, NeetCode, Blind) never appear in UI copy, URLs, page titles or metadata. Say "coding interview problems", "Open Problem", "Roadmap 150", "Essentials 75". The only exceptions are in-app link targets and the one footer disclaimer.
- Public pages (landing, `/learn/*`, 404) link only within Recode: no links out to problem sites. Problem actions go to `/sign-up` or the in-app `/problems/[slug]`. Allowed external links are essential references only, such as the FSRS algorithm page.
- No drop shadows; depth comes from surface steps and 1px borders. Radii: 6 chips, 8 buttons/inputs, 12 cards.
- Run the `web-design-guidelines` skill on changed UI files before calling UI work done.

## Architecture
- Pure scheduling logic: `src/lib/srs/*` (FSRS adapter, grading, queue, drills, mastery). Keep it pure and unit-tested; pass `now` in.
- Server reads: `src/server/queries.ts`. Mutations: `src/actions/*` (server actions, `auth.protect()` via `requireUser`, then `refresh()`).
- Auth is enforced per page/action (`requireUser`), not in `src/proxy.ts`.
- Public SEO catalog: `src/app/(marketing)/learn/*` (pattern guides and problem pages) reads user-independent data from `src/server/catalog.ts`. It uses only Recode's own content plus basic problem facts: company lists, frequencies and the curated sheets stay inside the signed-in app. Metadata via `pageMetadata` and JSON-LD builders in `src/lib/seo/*`; canonical origin from `src/lib/site.ts`. App and auth routes are noindex.
- Dev clock: the `recode-time-offset` cookie (DevClock widget, bottom right in development) shifts time to make reviews due.

## Commands
- `pnpm test` (vitest), `pnpm typecheck`, `pnpm lint`, `pnpm build`
- `pnpm db:migrate`, `pnpm db:seed` (idempotent; reads `data/all_companies_questions.csv`)
