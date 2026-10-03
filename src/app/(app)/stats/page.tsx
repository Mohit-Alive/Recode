import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { ActivityHeatmap } from "@/components/charts/activity-heatmap";
import { ForecastChart } from "@/components/charts/forecast-chart";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { getStats } from "@/server/queries";
import { formatMinutes, formatNumber, formatPercent } from "@/lib/format";
import { currentStreak } from "@/lib/streak";
import { addDaysToKey, dayKey } from "@/lib/time";
import { MEMORY_LABEL, memoryLevel } from "@/lib/srs/mastery";
import { cn } from "@/lib/cn";

export const metadata = { title: "Stats" };

const LEVEL_BAR = { strong: "bg-strong", fading: "bg-fading", "at-risk": "bg-risk", none: "bg-line" } as const;

export default async function StatsPage() {
  const user = await requireUser();
  const now = await getNow();
  const s = await getStats(user, now);
  const today = dayKey(now, user.timezone);
  const streak = currentStreak(
    { current: user.streakCurrent, best: user.streakBest, freezes: user.streakFreezes, lastActiveOn: user.lastActiveOn },
    today,
  );

  // Full year of days so the calendar has a stable shape; levels on a fixed scale.
  const byDay = new Map(s.activity.map((a) => [a.day, a]));
  const calendar = Array.from({ length: 365 }, (_, i) => {
    const date = addDaysToKey(today, i - 364);
    const a = byDay.get(date);
    const count = a ? a.reviews + a.solves + a.drills : 0;
    const level = count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4;
    return { date, count, level, solves: a?.solves ?? 0, reviews: a?.reviews ?? 0, drills: a?.drills ?? 0 };
  });

  const learned = s.patterns.filter((p) => p.solved > 0).sort((a, b) => (a.retention ?? 0) - (b.retention ?? 0));

  return (
    <PageContainer>
      <PageHeader title="Stats" description="What you have learned, how much of it you could still produce today, and what is coming due." />

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        <Tile label="Problems in memory" value={formatNumber(s.solved)} sub={`${s.byDifficulty.EASY} easy, ${s.byDifficulty.MEDIUM} medium, ${s.byDifficulty.HARD} hard`} />
        <Tile
          label="Average recall today"
          value={s.avgRetention === null ? "-" : formatPercent(s.avgRetention)}
          sub={s.atRisk > 0 ? `${s.atRisk} below 70%` : "Nothing at risk"}
        />
        <Tile
          label="Review success rate"
          value={s.trueRetention === null ? "-" : formatPercent(s.trueRetention)}
          sub={`Target ${formatPercent(user.desiredRetention)} over ${formatNumber(s.reviews)} reviews`}
        />
        <Tile label="Streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} sub={`Best ${user.streakBest}, ${formatMinutes(Math.round(s.totalSeconds / 60))} logged`} />
      </dl>

      <section aria-labelledby="activity" className="mt-10">
        <h2 id="activity" className="text-[15px] font-semibold tracking-tight">
          Activity
        </h2>
        <p className="mt-1 text-[13px] text-ink-subtle">Reviews, new solves and drills per day over the last year.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface-1 p-4 sm:p-5">
          <ActivityHeatmap data={calendar} />
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="forecast">
          <h2 id="forecast" className="text-[15px] font-semibold tracking-tight">
            Coming due
          </h2>
          <p className="mt-1 text-[13px] text-ink-subtle">Reviews per day for the next two weeks. Overdue ones count as today.</p>
          <div className="mt-4 rounded-xl border border-line bg-surface-1 p-4 sm:p-5">
            {s.solved === 0 ? <Empty>Nothing scheduled yet.</Empty> : <ForecastChart data={s.forecast} />}
          </div>
        </section>

        <section aria-labelledby="by-pattern">
          <h2 id="by-pattern" className="text-[15px] font-semibold tracking-tight">
            Recall by pattern
          </h2>
          <p className="mt-1 text-[13px] text-ink-subtle">Weakest first. Hard problems count double.</p>
          <div className="mt-4 rounded-xl border border-line bg-surface-1 p-4 sm:p-5">
            {learned.length === 0 ? (
              <Empty>Solve a problem to see pattern memory.</Empty>
            ) : (
              <table className="w-full text-[13px]">
                <caption className="sr-only">Recall by pattern</caption>
                <thead className="sr-only">
                  <tr>
                    <th>Pattern</th>
                    <th>Recall</th>
                    <th>Solved</th>
                  </tr>
                </thead>
                <tbody>
                  {learned.map((p) => {
                    const level = memoryLevel(p.retention);
                    return (
                      <tr key={p.slug}>
                        <th scope="row" className="w-[42%] py-1.5 pr-3 text-left font-normal text-ink-muted">
                          <span className="block truncate">{p.name}</span>
                        </th>
                        <td className="py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="relative h-3 flex-1">
                              <span
                                className={cn("absolute inset-y-0 left-0 rounded-r-[3px]", LEVEL_BAR[level])}
                                style={{ width: `${(p.retention ?? 0) * 100}%` }}
                              />
                            </span>
                            <span className="w-24 text-right font-mono text-[12px] text-ink tabular">
                              {formatPercent(p.retention ?? 0)} <span className="font-sans text-[11px] text-ink-subtle">{MEMORY_LABEL[level]}</span>
                            </span>
                          </div>
                        </td>
                        <td className="w-10 py-1.5 text-right font-mono text-[12px] text-ink-subtle tabular">{p.solved}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </PageContainer>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-surface-1 px-4 py-4 sm:px-5">
      <dt className="text-[12px] text-ink-subtle">{label}</dt>
      <dd className="mt-1.5 text-[24px] font-semibold tracking-tight text-ink">{value}</dd>
      <dd className="mt-0.5 text-[12px] text-ink-subtle">{sub}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-[13px] text-ink-subtle">{children}</p>;
}
