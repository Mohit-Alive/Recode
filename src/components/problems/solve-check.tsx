"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { markSolved, rateFirstSolve, saveNotes, unmarkSolved } from "@/actions/problems";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { formatDayDelta } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Grade } from "@/lib/srs/fsrs";

export const FIRST_SOLVE_OPTIONS: { grade: Grade; label: string; hint: string }[] = [
  { grade: 1, label: "Needed help", hint: "Looked at the solution" },
  { grade: 2, label: "Struggled", hint: "Got there slowly" },
  { grade: 3, label: "Solid", hint: "Solved it myself" },
  { grade: 4, label: "Breeze", hint: "Fast and clean" },
];

/**
 * The tick box. Ticking creates the memory card immediately (rated Solid), then opens a small
 * popover to adjust how it went and capture a one-line key insight while it is fresh.
 */
export function SolveCheck({ problemId, title, solved, size = "md" }: { problemId: number; title: string; solved: boolean; size?: "md" | "lg" }) {
  const [optimistic, setOptimistic] = useOptimistic(solved);
  const [pending, startTransition] = useTransition();
  const [popover, setPopover] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [grade, setGrade] = useState<Grade>(3);
  const [insight, setInsight] = useState("");
  const reduce = useReducedMotion();
  const anchor = useRef<HTMLButtonElement>(null);

  function tick() {
    if (optimistic) {
      setConfirm(true);
      return;
    }
    startTransition(async () => {
      setOptimistic(true);
      const res = await markSolved(problemId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setGrade(3);
      setInsight("");
      setPopover(true);
      toast.success(`Saved. First review ${formatDayDelta(Math.max(1, res.days))}.`, { id: `solve-${problemId}` });
    });
  }

  function rate(g: Grade) {
    setGrade(g);
    startTransition(async () => {
      const res = await rateFirstSolve(problemId, g);
      if (res.ok) toast.success(`Next review ${formatDayDelta(Math.max(1, res.days))}.`, { id: `solve-${problemId}` });
      else toast.error(res.error);
    });
  }

  function saveInsight(e: React.FormEvent) {
    e.preventDefault();
    const value = insight.trim();
    setPopover(false);
    if (!value) return;
    startTransition(async () => {
      const res = await saveNotes({ problemId, insight: value });
      if (res.ok) toast.success("Insight saved. You will be asked to recall it.");
      else toast.error(res.error);
    });
  }

  function remove() {
    setConfirm(false);
    startTransition(async () => {
      setOptimistic(false);
      await unmarkSolved(problemId);
      toast(`Removed ${title} from your memory.`);
    });
  }

  const dim = size === "lg" ? "size-6" : "size-[18px]";
  return (
    <>
      <Popover open={popover} onOpenChange={setPopover}>
        <PopoverAnchor asChild>
          <button
            ref={anchor}
            type="button"
            role="checkbox"
            aria-checked={optimistic}
            aria-label={optimistic ? `Solved: ${title}. Remove from memory` : `Mark ${title} as solved`}
            onClick={tick}
            disabled={pending && !optimistic}
            className={cn(
              "group/check relative grid shrink-0 place-items-center rounded-[5px] border transition-[background-color,border-color] duration-150",
              dim,
              optimistic
                ? "border-accent bg-accent text-accent-ink"
                : "border-line-strong bg-surface-1 text-transparent hover:border-ink-subtle",
            )}
          >
            <svg viewBox="0 0 16 16" className="size-[70%]" aria-hidden>
              <motion.path
                d="M3.5 8.5 6.5 11.5 12.5 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={false}
                animate={{ pathLength: optimistic ? 1 : 0, opacity: optimistic ? 1 : 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
          </button>
        </PopoverAnchor>
        <PopoverContent align="start" className="w-80" onOpenAutoFocus={(e) => e.preventDefault()}>
          <p className="text-[13px] font-medium text-ink">How did it go?</p>
          <div className="mt-2.5 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="How the solve went">
            {FIRST_SOLVE_OPTIONS.map((o) => (
              <button
                key={o.grade}
                type="button"
                role="radio"
                aria-checked={grade === o.grade}
                title={o.hint}
                onClick={() => rate(o.grade)}
                className={cn(
                  "rounded-md border px-1.5 py-1.5 text-[12px] transition-colors",
                  grade === o.grade
                    ? "border-accent/70 bg-surface-2 text-ink"
                    : "border-line text-ink-subtle hover:border-line-strong hover:text-ink",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <form onSubmit={saveInsight} className="mt-4">
            <label htmlFor={`insight-${problemId}`} className="text-[13px] font-medium text-ink">
              Key insight
            </label>
            <p className="mt-0.5 text-xs text-ink-subtle">One line you would tell yourself next time.</p>
            <Input
              id={`insight-${problemId}`}
              name="insight"
              autoComplete="off"
              maxLength={280}
              value={insight}
              onChange={(e) => setInsight(e.target.value)}
              placeholder="e.g. sort, then sweep with two pointers…"
              className="mt-2"
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setPopover(false)}>
                Skip
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Save Insight
              </Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent
          title="Remove from memory?"
          description={`${title} will stop being scheduled and its review history will be deleted.`}
        >
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep It
            </Button>
            <Button variant="danger" onClick={remove}>
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
