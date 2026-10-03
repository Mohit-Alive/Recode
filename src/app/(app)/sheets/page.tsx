import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ActiveSheetButton } from "@/components/sheets/active-sheet-button";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { getCompanyIndex, getSheetIndex } from "@/server/queries";
import { formatPercent } from "@/lib/format";

export const metadata = { title: "Sheets" };

export default async function SheetsPage() {
  const user = await requireUser();
  const now = await getNow();
  const [sheetList, companyList] = await Promise.all([getSheetIndex(user, now), getCompanyIndex(user.id)]);
  const topCompanies = companyList.slice(0, 12);

  return (
    <PageContainer>
      <PageHeader
        title="Sheets"
        description="Tick problems as you solve them on LeetCode. Each tick becomes a memory Recode keeps alive with timed reviews."
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
