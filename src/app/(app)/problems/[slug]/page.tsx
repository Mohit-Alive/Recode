import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import { PageContainer } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { DifficultyLabel } from "@/components/problems/difficulty";
import { SolveCheck } from "@/components/problems/solve-check";
import { NotesEditor } from "@/components/problems/notes-editor";
import { MemoryCurve } from "@/components/charts/memory-curve";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { getProblemDetail } from "@/server/queries";
import { memoryCurve } from "@/lib/srs/history";
import { MEMORY_LABEL, memoryLevel } from "@/lib/srs/mastery";
import { formatDayDelta, formatDuration, formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";

const RATING = ["", "Again", "Hard", "Good", "Easy"];
const LEVEL_COLOR = { strong: "text-strong", fading: "text-fading", "at-risk": "text-risk", none: "text-ink-subtle" } as const;

export async function generateMetadata(props: PageProps<"/problems/[slug]">) {
  const { slug } = await props.params;
  return { title: slug.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ") };
}

export default async function ProblemPage(props: PageProps<"/problems/[slug]">) {
  const { slug } = await props.params;
  const user = await requireUser();
  const now = await getNow();
  const data = await getProblemDetail(slug, user, now);
  if (!data) notFound();
  const { problem, card, logs, askedBy, inSheets } = data;
  const level = memoryLevel(problem.r);
  const series = card ? memoryCurve(logs, card, now, user.desiredRetention) : null;
  const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: user.timezone });

  return (
    <PageContainer className="max-w-[960px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-subtle">
        <DifficultyLabel difficulty={problem.difficulty} />
        {problem.patternName ? (
          <Link href="/patterns" className="hover:text-ink">
            {problem.patternName}
          </Link>
        ) : null}
        {problem.acceptanceRate ? <span>{formatPercent(problem.acceptanceRate)} acceptance</span> : null}
        {inSheets.map((s) => (
          <Link key={s.slug} href={`/sheets/${s.slug}`} className="hover:text-ink">
            {s.name}
          </Link>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-start gap-4">
        <h1 className="min-w-0 flex-1 text-[28px] font-semibold tracking-[-0.025em] text-ink">{problem.title}</h1>
        <div className="flex items-center gap-2">
          {card ? (
            <Button asChild variant="secondary">
              <Link href={`/review/${slug}`}>Review Now</Link>
            </Button>
          ) : null}
          <Button asChild variant="primary">
            <a href={problem.url} target="_blank" rel="noreferrer">
              Open on LeetCode <ArrowUpRight size={14} aria-hidden />
            </a>
          </Button>
        </div>
      </div>

      {card && series ? (
        <>
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            <Stat label="Recall now">
              <span className={cn(LEVEL_COLOR[level])}>{formatPercent(problem.r ?? 0)}</span>
              <span className="ml-2 text-[12px] font-normal text-ink-subtle">{MEMORY_LABEL[level]}</span>
            </Stat>
            <Stat label="Next review">
              {problem.dueInDays !== null && problem.dueInDays <= 0 ? "Due now" : formatDayDelta(problem.dueInDays ?? 0)}
            </Stat>
            <Stat label="Memory stability">
              {card.stability < 1 ? "<1" : Math.round(card.stability)} days
            </Stat>
            <Stat label="Reviews">
              {Math.max(0, card.reps - 1)}
              <span className="ml-2 text-[12px] font-normal text-ink-subtle">{card.lapses} forgotten</span>
            </Stat>
          </dl>

          <section aria-labelledby="curve" className="mt-6 rounded-xl border border-line bg-surface-1 p-4 sm:p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="curve" className="text-[14px] font-medium">
                Forgetting curve
              </h2>
              <p className="text-[12px] text-ink-subtle">Each review resets recall and flattens the next drop</p>
            </div>
            <MemoryCurve
              points={series.points}
              reviews={series.reviews}
              now={now.getTime()}
              due={card.due.getTime()}
              target={user.desiredRetention}
              timeZone={user.timezone}
            />
          </section>
        </>
      ) : (
        <section className="mt-8 flex flex-col items-start gap-4 rounded-xl border border-dashed border-line p-6 sm:flex-row sm:items-center">
          <SolveCheck problemId={problem.id} title={problem.title} solved={false} size="lg" />
          <p className="text-[14px] text-ink-muted">
            Solved it on LeetCode? Tick it to start tracking your memory of it. The first review lands a few days out.
          </p>
        </section>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-8">
          {card ? (
            <section aria-labelledby="notes-h">
              <h2 id="notes-h" className="mb-3 text-[15px] font-semibold tracking-tight">
                Your notes
              </h2>
              <NotesEditor problemId={problem.id} insight={card.insight} notes={card.notes} starred={card.starred} />
            </section>
          ) : null}

          {logs.length > 0 ? (
            <section aria-labelledby="history-h">
              <h2 id="history-h" className="mb-3 text-[15px] font-semibold tracking-tight">
                History
              </h2>
              <table className="w-full text-left text-[13px]">
                <thead className="text-[12px] text-ink-subtle">
                  <tr className="border-b border-line">
                    <th className="py-2 font-normal">Date</th>
                    <th className="py-2 font-normal">Type</th>
                    <th className="py-2 font-normal">Rating</th>
                    <th className="py-2 text-right font-normal">Recall before</th>
                    <th className="py-2 text-right font-normal">Time</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {[...logs].reverse().map((l) => (
                    <tr key={l.id} className="border-b border-line/60">
                      <td className="py-2 text-ink-muted">{dateFmt.format(l.review)}</td>
                      <td className="py-2 text-ink-subtle">{l.source === "first_solve" ? "First solve" : "Review"}</td>
                      <td className={cn("py-2", l.rating === 1 ? "text-risk" : "text-ink")}>{RATING[l.rating]}</td>
                      <td className="py-2 text-right font-mono text-ink-muted">{l.retrievability === null ? "-" : formatPercent(l.retrievability)}</td>
                      <td className="py-2 text-right font-mono text-ink-muted">{l.timeTakenSec ? formatDuration(l.timeTakenSec) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-8">
          {problem.cue ? (
            <section aria-labelledby="cue-h">
              <h2 id="cue-h" className="text-[13px] font-medium text-ink-muted">
                Recognition cue
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">{problem.cue}</p>
            </section>
          ) : null}
          {problem.topics && problem.topics.length > 0 ? (
            <section aria-labelledby="topics-h">
              <h2 id="topics-h" className="text-[13px] font-medium text-ink-muted">
                LeetCode topics
              </h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {problem.topics.map((t) => (
                  <li key={t} className="rounded-[5px] border border-line px-2 py-0.5 text-[12px] text-ink-subtle">
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {askedBy.length > 0 ? (
            <section aria-labelledby="asked-h">
              <h2 id="asked-h" className="text-[13px] font-medium text-ink-muted">
                Asked at {askedBy.length} {askedBy.length === 1 ? "company" : "companies"}
              </h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {askedBy.slice(0, 18).map((c) => (
                  <li key={c.slug}>
                    <Link href={`/companies/${c.slug}`} className="block rounded-[5px] border border-line px-2 py-0.5 text-[12px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink">
                      {c.name}
                    </Link>
                  </li>
                ))}
                {askedBy.length > 18 ? <li className="px-1 py-0.5 text-[12px] text-ink-subtle">+{askedBy.length - 18} more</li> : null}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </PageContainer>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-1 px-4 py-3.5">
      <dt className="text-[12px] text-ink-subtle">{label}</dt>
      <dd className="mt-1 text-[18px] font-semibold tracking-tight text-ink">{children}</dd>
    </div>
  );
}
