import Link from "next/link";
import { ArrowRight, Lightning, ListPlus, Shuffle } from "@phosphor-icons/react/ssr";
import { PageContainer } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ProblemRow } from "@/components/problems/problem-row";
import { DifficultyLabel } from "@/components/problems/difficulty";
import { MemoryMeter } from "@/components/problems/memory-meter";
import { SyncSuggestions } from "@/components/today/sync-suggestions";
import { BudgetBar } from "@/components/today/budget-bar";
import { StartReviewsShortcut } from "@/components/today/start-shortcut";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { DAILY_DRILLS, getCustomSheetIndex, getSyncSuggestions, getToday } from "@/server/queries";
import { formatMinutes, formatPercent } from "@/lib/format";
import { REVIEW_ESTIMATE_MINUTES } from "@/lib/srs/grade";
import { sheetName } from "@/data/sheet-names";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const user = await requireUser();
  const now = await getNow();
  const [t, suggestions, ownSheets] = await Promise.all([getToday(user, now), getSyncSuggestions(user), getCustomSheetIndex(user, now)]);
  const ownDue = ownSheets.filter((s) => s.due > 0);
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: user.timezone }).format(now);
  const name = user.name ? `, ${user.name}` : "";
  const isNew = t.solvedTotal === 0;
  const reviewsLeft = t.reviews.length;
  const drillsLeft = Math.max(0, DAILY_DRILLS - t.drillsDone);

  return (
    <PageContainer className="max-w-[880px]">
      <header>
        <p className="text-[13px] text-ink-subtle">{date}</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.025em] text-ink">
          {isNew ? `Welcome${name}` : reviewsLeft > 0 ? `${reviewsLeft} ${reviewsLeft === 1 ? "problem is" : "problems are"} fading` : "Memory is up to date"}
        </h1>
        <p className="mt-1.5 max-w-[60ch] text-[14px] leading-relaxed text-ink-subtle">
          {isNew
            ? "Solve a problem, tick it here, and Recode brings it back right before you would forget it."
            : reviewsLeft > 0
              ? "Re-solve them from scratch today. Each one comes back later than the last time, as long as you keep getting it."
              : t.reviewsDone > 0
                ? `You reviewed ${t.reviewsDone} today. Everything else is safely above your ${formatPercent(user.desiredRetention)} recall target.`
                : `Nothing is below your ${formatPercent(user.desiredRetention)} recall target. A good day to learn something new.`}
        </p>
      </header>

      {!isNew ? (
        <BudgetBar spent={t.spentMinutes} planned={t.plannedMinutes} budget={user.dailyMinutes} className="mt-6" />
      ) : null}

      {suggestions.length > 0 ? <SyncSuggestions items={suggestions} className="mt-8" /> : null}

      {reviewsLeft > 0 ? (
        <section aria-labelledby="reviews" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="reviews" className="text-[17px] font-semibold tracking-tight">
                Reviews
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-subtle">
                <Shuffle size={13} aria-hidden />
                Mixed across patterns on purpose. It feels harder and sticks better.
              </p>
            </div>
            <Button asChild variant="primary">
              <Link href="/review">
                Start Reviews <Kbd className="border-white/25 bg-white/15 text-white">S</Kbd>
              </Link>
            </Button>
          </div>
          <ol className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
            {t.reviews.map((p, i) => (
              <li key={p.id}>
                <Link
                  href={`/review/${p.slug}`}
                  className="group flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/60"
                >
                  <span className="w-5 shrink-0 font-mono text-[12px] text-ink-faint tabular">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{p.title}</span>
                  {p.lapses > 0 ? (
                    <span className="hidden text-[12px] text-ink-subtle sm:inline">
                      forgotten {p.lapses}×
                    </span>
                  ) : null}
                  <DifficultyLabel difficulty={p.difficulty} className="w-14 text-right" />
                  <span className="flex w-24 items-center justify-end gap-2 text-[12px] text-ink-subtle">
                    <span className="font-mono tabular">{formatPercent(p.r)}</span>
                    <MemoryMeter r={p.r} dueInDays={p.dueInDays} />
                  </span>
                  <span className="hidden w-14 text-right font-mono text-[12px] text-ink-faint sm:inline">
                    ~{REVIEW_ESTIMATE_MINUTES[p.difficulty]}m
                  </span>
                  <ArrowRight size={14} className="text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
          {t.deferred.length > 0 ? (
            <p className="mt-3 text-[13px] text-ink-subtle">
              {t.deferred.length} more {t.deferred.length === 1 ? "review is" : "reviews are"} due but past your {formatMinutes(user.dailyMinutes)} budget. They lead tomorrow’s queue.{" "}
              <Link href="/review?all=1" className="text-accent-text hover:underline">
                Review them anyway
              </Link>
            </p>
          ) : null}
          <StartReviewsShortcut />
        </section>
      ) : null}

      {ownDue.length > 0 ? (
        <section aria-labelledby="own-sheets" className="mt-10">
          <h2 id="own-sheets" className="text-[17px] font-semibold tracking-tight">
            Your sheets
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-subtle">
            <ListPlus size={13} aria-hidden />
            Each runs on its own schedule, outside your daily review budget.
          </p>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
            {ownDue.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sheets/custom/${s.id}/review`}
                  className="group flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/60"
                >
                  <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{s.name}</span>
                  <span className="font-mono text-[12px] text-accent-text tabular">{s.due} due</span>
                  <ArrowRight size={14} className="text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!isNew ? (
        <section aria-labelledby="drills" className="mt-10">
          <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface-1 p-5 hairline-top sm:flex-row sm:items-center">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-accent-text">
              <Lightning size={18} weight="fill" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="drills" className="text-[15px] font-semibold tracking-tight">
                Pattern drills
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-subtle">
                {drillsLeft > 0
                  ? `${drillsLeft} quick “which pattern?” calls, about ${Math.max(1, Math.round(drillsLeft * 0.4))} min. Recognising the pattern is half the interview.`
                  : `Done for today: ${t.drillsDone} drills. Extra rounds still help.`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[12px] text-ink-subtle tabular" aria-label={`${Math.min(t.drillsDone, DAILY_DRILLS)} of ${DAILY_DRILLS} drills done`}>
                {Math.min(t.drillsDone, DAILY_DRILLS)}/{DAILY_DRILLS}
              </span>
              <Button asChild variant={reviewsLeft > 0 ? "secondary" : "primary"}>
                <Link href="/drills">{drillsLeft > 0 ? "Start Drills" : "Another Round"}</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="new" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="new" className="text-[17px] font-semibold tracking-tight">
              {isNew ? "Start here" : "New problems"}
            </h2>
            <p className="mt-1 text-[13px] text-ink-subtle">
              Next up from{" "}
              <Link href={`/sheets/${user.activeSheetSlug}`} className="text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-ink">
                {sheetName(user.activeSheetSlug)}
              </Link>
              . Solve it, then tick it here.
            </p>
          </div>
          <Link href="/sheets" className="text-[13px] text-accent-text hover:underline">
            Change sheet
          </Link>
        </div>
        {t.newPicks.length > 0 ? (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
            {t.newPicks.map((p) => (
              <ProblemRow key={p.id} row={p} showPattern={false} />
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-line px-5 py-6 text-[13px] text-ink-subtle">
            {t.solvesDone >= user.newPerDay
              ? `You learned ${t.solvesDone} new ${t.solvesDone === 1 ? "problem" : "problems"} today. New material is capped at ${user.newPerDay} a day so reviews stay manageable.`
              : "Your review budget is used up for today. New problems will show up once reviews are done."}
          </p>
        )}
      </section>

      {isNew ? <HowItWorks /> : null}
    </PageContainer>
  );
}

function HowItWorks() {
  const steps = [
    { title: "Solve", body: "Open the problem and solve it the way you normally would." },
    { title: "Tick and reflect", body: "Tick it here, say how it went, and write the one-line insight that cracked it." },
    { title: "Re-solve on cue", body: "It shows up in Today just before your recall drops below 90%. Each success pushes it further out." },
  ];
  return (
    <section aria-labelledby="how" className="mt-12 border-t border-line pt-8">
      <h2 id="how" className="text-[15px] font-semibold tracking-tight">
        How Recode works
      </h2>
      <ol className="mt-4 grid gap-6 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title}>
            <span className="font-mono text-[12px] text-accent-text">{i + 1}</span>
            <h3 className="mt-1 text-[14px] font-medium text-ink">{s.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-subtle">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
