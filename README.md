# Recode

Spaced repetition for coding interview prep. Tick problems as you solve them; Recode schedules each one for a
re-solve right before you would forget it (FSRS-6), interleaves reviews across patterns, trains
pattern recognition with quick drills, and tracks memory per problem and per pattern.

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · Clerk · Neon Postgres + Drizzle · ts-fsrs ·
Tailwind v4 · Motion · Resend + Vercel Cron.

## Setup

1. **Install**: `pnpm install`
2. **Database**: create a Neon project (or run Postgres locally) and put the connection string in
   `.env.local` as `DATABASE_URL` (see `.env.example`).
   For local development: `docker run -d --name recode-pg -e POSTGRES_PASSWORD=recode -e POSTGRES_USER=recode -e POSTGRES_DB=recode -p 54329:5432 postgres:17-alpine`
3. **Schema and data**: `pnpm db:migrate && pnpm db:seed`
   (seeds 18 patterns, 1,868 problems, 464 company lists, Roadmap 150 and Essentials 75)
4. **Clerk**: create an application at dashboard.clerk.com and copy
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` into `.env.local`
   (or run `npx clerk@latest init`). Optional: add a webhook to `/api/webhooks/clerk` for
   `user.updated` and `user.deleted`, and set `CLERK_WEBHOOK_SIGNING_SECRET`.
5. **Run**: `pnpm dev`

### Reminders (optional, off by default)
The reminder email route exists at `/api/cron/reminders` but is not scheduled. To enable it, set
`RESEND_API_KEY`, `EMAIL_FROM` and `CRON_SECRET`, then add a `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/reminders", "schedule": "0 13 * * *" }] }
```

Vercel Hobby allows one run per day (the schedule is in UTC), so every user gets the email at that
hour. On Pro, use `"0 * * * *"` to send at each user's chosen local hour. Test locally with
`curl -H "Authorization: Bearer $CRON_SECRET" "localhost:3000/api/cron/reminders?force=1"`.

## How scheduling works
- **FSRS-6** (`src/lib/srs/fsrs.ts`): one memory card per (user, problem), day granularity, fuzz on,
  per-user recall target (default 90%).
- **Grading** (`src/lib/srs/grade.ts`): time against a target, hints, solution viewed and wrong
  submissions suggest and cap the grade.
- **Daily queue** (`src/lib/srs/queue.ts`): lowest recall first, filled to a budget in minutes,
  reordered so consecutive reviews never share a pattern (interleaving).
- **Drills** (`src/lib/srs/drills.ts`): "which pattern?" questions with near-miss distractors,
  training a separate FSRS card per pattern.
- **Pattern memory** (`src/lib/srs/mastery.ts`): difficulty-weighted recall per pattern plus a
  prerequisite roadmap.

## Development
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`
- A clock widget (bottom right, development only) shifts time by days so reviews come due.
