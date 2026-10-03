"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ArrowsClockwise } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { dismissSubmission } from "@/actions/leetcode";
import { markSolved } from "@/actions/problems";
import { Button } from "@/components/ui/button";
import { DifficultyLabel } from "@/components/problems/difficulty";
import type { Difficulty } from "@/db/schema";
import { cn } from "@/lib/cn";

type Item = { slug: string; title: string; problemId: number; difficulty: Difficulty; submittedAt: Date; kind: "new" | "review" };

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function ago(d: Date) {
  const mins = Math.round((d.getTime() - Date.now()) / 60_000);
  if (Math.abs(mins) < 60) return rtf.format(mins, "minute");
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 48) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

/** Accepted LeetCode submissions that have not been logged here yet. Never auto-applied. */
export function SyncSuggestions({ items, className }: { items: Item[]; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <section aria-labelledby="sync" className={cn("rounded-xl border border-line bg-surface-1 hairline-top", className)}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <ArrowsClockwise size={15} className="text-accent-text" aria-hidden />
        <h2 id="sync" className="text-[14px] font-medium">
          Recently accepted on LeetCode
        </h2>
      </div>
      <ul className="divide-y divide-line">
        {items.map((s) => (
          <li key={s.slug} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-ink">{s.title}</p>
              <p className="text-[12px] text-ink-subtle">
                Accepted <time dateTime={new Date(s.submittedAt).toISOString()} suppressHydrationWarning>{ago(new Date(s.submittedAt))}</time>
              </p>
            </div>
            <DifficultyLabel difficulty={s.difficulty} />
            {s.kind === "new" ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await markSolved(s.problemId);
                    if (res.ok) toast.success(`Logged ${s.title}.`);
                    else toast.error(res.error);
                  })
                }
              >
                Log as Solved
              </Button>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/review/${s.slug}`}>Log as Review</Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => void (await dismissSubmission(s.slug)))}>
              Dismiss
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
