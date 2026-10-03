import { notFound } from "next/navigation";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/ssr";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { ProblemRow } from "@/components/problems/problem-row";
import { ProgressRing } from "@/components/ui/progress-ring";
import { FilterLinks } from "@/components/ui/filter-links";
import { ActiveSheetButton } from "@/components/sheets/active-sheet-button";
import { applyFilters, DIFFICULTY_FILTER, STATUS_FILTER, type ListFilters } from "@/components/problems/filters";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { getSheet } from "@/server/queries";
import { formatPercent, slugify } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/sheets/[slug]">) {
  const { slug } = await props.params;
  return { title: slug === "blind-75" ? "Blind 75" : slug === "neetcode-150" ? "NeetCode 150" : "Sheet" };
}

export default async function SheetPage(props: PageProps<"/sheets/[slug]">) {
  const { slug } = await props.params;
  const sp = (await props.searchParams) as Record<string, string | undefined>;
  const user = await requireUser();
  const now = await getNow();
  const data = await getSheet(slug, user, now);
  if (!data) notFound();

  const all = data.sections.flatMap((s) => s.problems);
  const solved = all.filter((p) => p.solved);
  const retention = solved.length ? solved.reduce((a, p) => a + (p.r ?? 0), 0) / solved.length : null;
  const due = solved.filter((p) => (p.dueInDays ?? 1) <= 0).length;
  const filters: ListFilters = { difficulty: sp.difficulty ?? "all", status: sp.status ?? "all" };
  const sections = data.sections
    .map((s) => ({ ...s, visible: applyFilters(s.problems, filters) }))
    .filter((s) => s.visible.length > 0);
  let index = 0;
  const positions = new Map(all.map((p) => [p.id, ++index]));

  return (
    <PageContainer>
      <Link href="/sheets" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-subtle hover:text-ink">
        <CaretLeft size={13} aria-hidden /> Sheets
      </Link>
      <PageHeader
        title={data.sheet.name}
        description={data.sheet.description}
        actions={<ActiveSheetButton slug={slug} active={user.activeSheetSlug === slug} />}
      />

      <dl className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-[13px]">
        <div className="flex items-center gap-3">
          <ProgressRing value={solved.length / all.length} size={36} stroke={3.5} label={`${solved.length} of ${all.length} solved`} />
          <div>
            <dt className="text-ink-subtle">Solved</dt>
            <dd className="font-mono text-ink tabular">
              {solved.length}/{all.length}
            </dd>
          </div>
        </div>
        <div>
          <dt className="text-ink-subtle">Avg. recall</dt>
          <dd className="font-mono text-ink tabular">{retention === null ? "-" : formatPercent(retention)}</dd>
        </div>
        <div>
          <dt className="text-ink-subtle">Due for review</dt>
          <dd className="font-mono text-ink tabular">{due}</dd>
        </div>
      </dl>

      <div className="sticky top-14 z-20 -mx-4 mt-8 flex flex-wrap items-center gap-2 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 md:top-0">
        <FilterLinks label="Status" param="status" options={STATUS_FILTER} current={filters.status} searchParams={sp} pathname={`/sheets/${slug}`} />
        <FilterLinks label="Difficulty" param="difficulty" options={DIFFICULTY_FILTER} current={filters.difficulty} searchParams={sp} pathname={`/sheets/${slug}`} />
      </div>

      {sections.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-subtle">Nothing matches these filters.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {sections.map((section) => {
            const done = section.problems.filter((p) => p.solved).length;
            return (
              <section key={section.title} id={slugify(section.title)} aria-labelledby={`s-${slugify(section.title)}`}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 id={`s-${slugify(section.title)}`} className="text-[15px] font-semibold tracking-tight">
                    {section.title}
                  </h2>
                  <span className="font-mono text-[12px] text-ink-subtle tabular">
                    {done}/{section.problems.length}
                  </span>
                </div>
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
                  {section.visible.map((p) => (
                    <ProblemRow key={p.id} row={p} index={positions.get(p.id)} showPattern={slug !== "neetcode-150"} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
