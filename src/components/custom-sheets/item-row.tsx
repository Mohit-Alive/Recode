import Link from "next/link";
import { ArrowUpRight, Lightbulb } from "@phosphor-icons/react/ssr";
import type { CustomItemRow } from "@/server/queries";
import { DifficultyLabel } from "@/components/problems/difficulty";
import { MemoryMeter } from "@/components/problems/memory-meter";
import { formatDayDelta } from "@/lib/format";
import { ItemEditDialog } from "./item-edit-dialog";

export function CustomItemRowView({ row }: { row: CustomItemRow }) {
  const due = row.dueInDays <= 0;
  return (
    <li className="cv-auto relative flex min-h-11 items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-2/60 sm:px-4">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[14px] text-ink">{row.title}</span>
          {row.insight ? <Lightbulb size={12} className="shrink-0 text-ink-subtle" aria-label="Has a key insight" /> : null}
        </div>
        <p className="mt-0.5 text-[12px] text-ink-subtle md:hidden">
          {due ? (
            <Link href={`/sheets/custom/${row.sheetId}/review/${row.id}`} className="text-accent-text">
              Review due
            </Link>
          ) : (
            `Review ${formatDayDelta(row.dueInDays)}`
          )}
        </p>
      </div>
      {row.lapses > 0 ? <span className="hidden text-[12px] text-ink-subtle lg:inline">forgotten {row.lapses}×</span> : null}
      <DifficultyLabel difficulty={row.difficulty} className="w-14 shrink-0 text-right" />
      <span className="hidden w-32 shrink-0 items-center justify-end gap-2 text-[12px] text-ink-subtle md:flex">
        {due ? (
          <Link href={`/sheets/custom/${row.sheetId}/review/${row.id}`} className="text-accent-text hover:underline">
            Review due
          </Link>
        ) : (
          <span>Review {formatDayDelta(row.dueInDays)}</span>
        )}
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
      <ItemEditDialog item={{ id: row.id, title: row.title, difficulty: row.difficulty, insight: row.insight, url: row.url }} />
    </li>
  );
}
