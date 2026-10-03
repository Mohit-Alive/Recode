import { memoryLevel, MEMORY_LABEL } from "@/lib/srs/mastery";
import { formatDayDelta, formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";

const FILL = { strong: "bg-strong", fading: "bg-fading", "at-risk": "bg-risk", none: "bg-transparent" } as const;

/**
 * Four ascending ticks, like signal bars: how likely you are to solve it again right now.
 * Ticks drain as the memory fades.
 */
export function MemoryMeter({ r, dueInDays, className }: { r: number | null; dueInDays?: number | null; className?: string }) {
  const level = memoryLevel(r);
  const filled = r === null ? 0 : Math.max(1, Math.ceil(r * 4 - 0.4));
  const label =
    r === null
      ? "Not solved yet"
      : `${MEMORY_LABEL[level]}: ${formatPercent(r)} recall${
          dueInDays !== undefined && dueInDays !== null
            ? dueInDays <= 0
              ? ", review due"
              : `, review ${formatDayDelta(dueInDays)}`
            : ""
        }`;
  return (
    <span role="img" aria-label={label} title={label} className={cn("inline-flex h-3.5 items-end gap-[2px]", className)}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-[1px] transition-colors duration-300",
            i < filled ? FILL[level] : "bg-line-strong",
          )}
          style={{ height: `${5 + i * 3}px` }}
        />
      ))}
    </span>
  );
}
