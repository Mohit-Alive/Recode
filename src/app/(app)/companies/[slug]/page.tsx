import { notFound } from "next/navigation";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/ssr";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { ProblemRow } from "@/components/problems/problem-row";
import { FilterLinks } from "@/components/ui/filter-links";
import { ProgressRing } from "@/components/ui/progress-ring";
import { applyFilters, DIFFICULTY_FILTER, STATUS_FILTER } from "@/components/problems/filters";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { getCompany } from "@/server/queries";

export default async function CompanyPage(props: PageProps<"/companies/[slug]">) {
  const { slug } = await props.params;
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const user = await requireUser();
  const now = await getNow();
  const data = await getCompany(slug, user, now);
  if (!data) notFound();

  const { company, problems } = data;
  const solved = problems.filter((p) => p.solved).length;
  const filters = { difficulty: sp.difficulty ?? "all", status: sp.status ?? "all" };
  const visible = applyFilters(problems, filters);
  const maxFreq = Math.max(...problems.map((p) => p.frequency), 1);

  return (
    <PageContainer>
      <Link href="/companies" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-subtle hover:text-ink">
        <CaretLeft size={13} aria-hidden /> Companies
      </Link>
      <PageHeader
        title={company.name}
        description={`${problems.length} problems reported at ${company.name}, most frequent first. Recode reminds you to revisit each one you solve.`}
        actions={
          <div className="flex items-center gap-3">
            <ProgressRing value={solved / problems.length} size={36} label={`${solved} of ${problems.length} solved`} />
            <span className="font-mono text-[13px] text-ink tabular">
              {solved}/{problems.length}
            </span>
          </div>
        }
      />

      <div className="sticky top-14 z-20 -mx-4 mt-8 flex flex-wrap items-center gap-2 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 md:top-0">
        <FilterLinks label="Status" param="status" options={STATUS_FILTER} current={filters.status} searchParams={sp} pathname={`/companies/${slug}`} />
        <FilterLinks label="Difficulty" param="difficulty" options={DIFFICULTY_FILTER} current={filters.difficulty} searchParams={sp} pathname={`/companies/${slug}`} />
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-subtle">Nothing matches these filters.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
          {visible.map((p) => (
            <ProblemRow
              key={p.id}
              row={p}
              trailing={
                <span className="hidden w-16 shrink-0 items-center gap-1.5 sm:flex" title={`Frequency score ${p.frequency.toFixed(1)}`}>
                  <span className="sr-only">Frequency {Math.round(p.frequency)}</span>
                  <span aria-hidden className="h-1 flex-1 rounded-full bg-accent/80" style={{ maxWidth: `${(p.frequency / maxFreq) * 100}%` }} />
                </span>
              }
            />
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
