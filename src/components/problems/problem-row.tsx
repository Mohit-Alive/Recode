import Link from "next/link";
import { ArrowUpRight, Lightbulb, Star } from "@phosphor-icons/react/ssr";
import type { ProblemRow as Row } from "@/server/queries";
import { formatDayDelta } from "@/lib/format";
import { cn } from "@/lib/cn";
import { DifficultyLabel } from "./difficulty";
import { MemoryMeter } from "./memory-meter";
import { SolveCheck } from "./solve-check";

export function ProblemRow({
  row,
  showPattern = true,
  index,
  trailing,
}: {
  row: Row;
  showPattern?: boolean;
  index?: number;
  trailing?: React.ReactNode;
}) {
  const due =
    row.dueInDays === null ? null : row.dueInDays <= 0 ? (
      <span className="text-accent-text">Review due</span>
    ) : (
      <span>Review {formatDayDelta(row.dueInDays)}</span>
    );

  return (
    <li className="cv-auto group/row relative flex min-h-11 items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-2/60 sm:px-4">
      <SolveCheck problemId={row.id} title={row.title} solved={row.solved} />
      {index !== undefined ? (
        <span className="hidden w-6 shrink-0 text-right font-mono text-[11px] text-ink-faint tabular sm:block">{index}</span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={`/problems/${row.slug}`}
            className={cn(
              "truncate text-[14px] transition-colors hover:text-accent-text",
              row.solved ? "text-ink" : "text-ink-muted",
            )}
          >
            {row.title}
          </Link>
          {row.starred ? <Star size={12} weight="fill" className="shrink-0 text-fading" aria-label="Starred" /> : null}
          {row.hasInsight ? <Lightbulb size={12} className="shrink-0 text-ink-subtle" aria-label="Has a key insight" /> : null}
        </div>
        {showPattern && row.patternName ? (
          <p className="mt-0.5 truncate text-[12px] text-ink-subtle sm:hidden">{row.patternName}</p>
        ) : null}
      </div>
      {showPattern && row.patternName ? (
        <span className="hidden w-40 shrink-0 truncate text-[12px] text-ink-subtle lg:block">{row.patternName}</span>
      ) : null}
      {trailing}
      <DifficultyLabel difficulty={row.difficulty} className="w-14 shrink-0 text-right" />
      <span className="hidden w-32 shrink-0 items-center justify-end gap-2 text-[12px] text-ink-subtle md:flex">
        {due}
        <MemoryMeter r={row.r} dueInDays={row.dueInDays} />
      </span>
      <a
        href={row.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${row.title} in a new tab`}
        className="grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-surface-3 hover:text-ink"
      >
        <ArrowUpRight size={15} aria-hidden />
      </a>
    </li>
  );
}
