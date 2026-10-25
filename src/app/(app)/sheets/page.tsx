import Link from "next/link";
import { ArrowRight, Plus } from "@phosphor-icons/react/ssr";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ActiveSheetButton } from "@/components/sheets/active-sheet-button";
import { SheetFormDialog } from "@/components/custom-sheets/sheet-form-dialog";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { getCompanyIndex, getCustomSheetIndex, getSheetIndex } from "@/server/queries";
import { formatDayDelta, formatPercent } from "@/lib/format";
import { gapLabel } from "@/lib/srs/pace";

export const metadata = { title: "Sheets" };

export default async function SheetsPage() {
  const user = await requireUser();
  const now = await getNow();
  const [sheetList, companyList, ownSheets] = await Promise.all([
    getSheetIndex(user, now),
    getCompanyIndex(user.id),
    getCustomSheetIndex(user, now),
  ]);
  const topCompanies = companyList.slice(0, 12);

  return (
    <PageContainer>
      <PageHeader
        title="Sheets"
        description="Tick problems as you solve them. Each tick becomes a memory Recode keeps alive with timed reviews."
      />

      <section aria-labelledby="curated" className="mt-8">
        <h2 id="curated" className="sr-only">
          Curated sheets
        </h2>
        <div className="grid gap-3 md:grid-cols-[1.25fr_1fr]">
          {sheetList.map((s) => {
            const active = user.activeSheetSlug === s.slug;
            return (
              <article key={s.slug} className="relative flex flex-col rounded-xl border border-line bg-surface-1 p-5 transition-colors hover:border-line-strong hairline-top">
                <div className="flex items-start gap-4">
                  <div className="relative grid place-items-center">
                    <ProgressRing value={s.total ? s.solved / s.total : 0} size={56} stroke={4} label={`${s.solved} of ${s.total} solved`} />
                    <span className="absolute font-mono text-[12px] text-ink tabular">{Math.round((s.solved / s.total) * 100)}%</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[17px] font-semibold tracking-tight">
                      <Link href={`/sheets/${s.slug}`} className="after:absolute after:inset-0 hover:text-accent-text">
                        {s.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-subtle">{s.description}</p>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-4 gap-2 border-t border-line pt-4 text-[12px]">
                  <div>
                    <dt className="text-ink-subtle">Solved</dt>
                    <dd className="mt-0.5 font-mono text-[14px] text-ink tabular">
                      {s.solved}
                      <span className="text-ink-faint">/{s.total}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-subtle">Retention</dt>
                    <dd className="mt-0.5 font-mono text-[14px] text-ink tabular">{s.retention === null ? "-" : formatPercent(s.retention)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-ink-subtle">Mix</dt>
                    <dd className="mt-0.5 font-mono text-[13px] tabular">
                      <span className="text-easy">{s.easy}</span>
                      <span className="text-ink-faint"> / </span>
                      <span className="text-medium">{s.medium}</span>
                      <span className="text-ink-faint"> / </span>
                      <span className="text-hard">{s.hard}</span>
                    </dd>
                  </div>
                </dl>
                <div className="relative z-10 mt-4 flex items-center justify-between">
                  <ActiveSheetButton slug={s.slug} active={active} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="own" className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="own" className="text-[17px] font-semibold tracking-tight">
              Your sheets
            </h2>
            <p className="mt-1 text-[13px] text-ink-subtle">
              Paste links to problems you solve anywhere. Each sheet keeps its own memory and review schedule.
            </p>
          </div>
          {ownSheets.length > 0 ? (
            <SheetFormDialog>
              <Button variant="secondary" size="sm">
                <Plus size={14} aria-hidden /> New Sheet
              </Button>
            </SheetFormDialog>
          ) : null}
        </div>
        {ownSheets.length === 0 ? (
          <div className="mt-4 flex flex-col items-start gap-4 rounded-xl border border-dashed border-line px-5 py-6 sm:flex-row sm:items-center">
            <p className="flex-1 text-[13px] leading-relaxed text-ink-subtle">
              Practising from another list or site? Make a sheet for it, paste each problem’s link the day you solve it, and Recode schedules its
              reviews on that sheet’s own pace, apart from everything else.
            </p>
            <SheetFormDialog>
              <Button variant="primary">
                <Plus size={15} aria-hidden /> New Sheet
              </Button>
            </SheetFormDialog>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ownSheets.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sheets/custom/${s.id}`}
                  className="flex h-full flex-col rounded-xl border border-line bg-surface-1 p-4 transition-colors hover:border-line-strong"
                >
                  <span className="truncate text-[15px] font-semibold tracking-tight text-ink">{s.name}</span>
                  <span className="mt-1 mb-4 line-clamp-2 text-[12.5px] leading-relaxed text-ink-subtle">
                    {s.description ?? `${formatPercent(s.desiredRetention)} recall, gaps up to ${gapLabel(s.maxInterval)}`}
                  </span>
                  <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-3 text-[12px]">
                    <div>
                      <dt className="text-ink-subtle">Tracked</dt>
                      <dd className="mt-0.5 font-mono text-[14px] text-ink tabular">{s.total}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-subtle">Recall</dt>
                      <dd className="mt-0.5 font-mono text-[14px] text-ink tabular">{s.retention === null ? "-" : formatPercent(s.retention)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-subtle">Review</dt>
                      <dd className="mt-0.5 text-[13px] text-ink">
                        {s.due > 0 ? (
                          <span className="text-accent-text">{s.due} due</span>
                        ) : s.nextDueInDays !== null ? (
                          formatDayDelta(s.nextDueInDays)
                        ) : (
                          "-"
                        )}
                      </dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="companies" className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="companies" className="text-[17px] font-semibold tracking-tight">
              Company sheets
            </h2>
            <p className="mt-1 text-[13px] text-ink-subtle">
              {companyList.length} companies, sorted by how often each problem is asked there.
            </p>
          </div>
          <Link href="/companies" className="flex items-center gap-1.5 text-[13px] text-accent-text hover:underline">
            All companies <ArrowRight size={13} aria-hidden />
          </Link>
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-4">
          {topCompanies.map((c) => (
            <li key={c.slug} className="bg-surface-1">
              <Link href={`/companies/${c.slug}`} className="flex h-full flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-surface-2">
                <span className="truncate text-[14px] text-ink">{c.name}</span>
                <span className="flex items-center gap-2">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(c.solved / c.total) * 100}%` }} />
                  </span>
                  <span className="font-mono text-[11px] text-ink-subtle tabular">
                    {c.solved}/{c.total}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}
