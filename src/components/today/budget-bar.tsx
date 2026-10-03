import { formatMinutes } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Today's study time: done so far, still planned, and the daily budget. */
export function BudgetBar({ spent, planned, budget, className }: { spent: number; planned: number; budget: number; className?: string }) {
  const total = Math.max(budget, spent + planned);
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className={cn("", className)}>
      <div className="flex items-baseline justify-between text-[12px] text-ink-subtle">
        <span>
          <span className="text-ink">{formatMinutes(spent)}</span> done
          {planned > 0 ? (
            <>
              {" "}
              <span aria-hidden>+</span> <span className="text-ink-muted">{formatMinutes(planned)}</span> planned
            </>
          ) : null}
        </span>
        <span>{formatMinutes(budget)} daily budget</span>
      </div>
      <div
        className="mt-2 flex h-1.5 gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={`${formatMinutes(spent)} done and ${formatMinutes(planned)} planned of a ${formatMinutes(budget)} budget`}
      >
        {spent > 0 ? <span className="h-full rounded-full bg-accent" style={{ width: pct(spent) }} /> : null}
        {planned > 0 ? <span className="h-full rounded-full bg-accent/35" style={{ width: pct(planned) }} /> : null}
        <span className="h-full flex-1 rounded-full bg-line" />
      </div>
    </div>
  );
}
