"use client";

import { useTransition } from "react";
import { Clock } from "@phosphor-icons/react/ssr";
import { setTimeOffset } from "@/actions/settings";

/** Development-only time machine: shifts the app clock so reviews come due on demand. */
export function DevClock({ offset }: { offset: number }) {
  const [pending, start] = useTransition();
  const shift = (d: number) => start(() => void setTimeOffset(d));
  return (
    <div className="fixed right-4 bottom-20 z-30 flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-1 text-[12px] text-ink-subtle md:bottom-4">
      <Clock size={14} className="mx-1" aria-hidden />
      <span className="px-1 font-mono tabular" aria-live="polite">
        {offset === 0 ? "now" : `+${offset}d`}
      </span>
      {[1, 7, 30].map((d) => (
        <button
          key={d}
          type="button"
          disabled={pending}
          onClick={() => shift(offset + d)}
          className="rounded-md px-2 py-1 hover:bg-surface-3 hover:text-ink"
        >
          +{d}d
        </button>
      ))}
      {offset !== 0 ? (
        <button type="button" disabled={pending} onClick={() => shift(0)} className="rounded-md px-2 py-1 hover:bg-surface-3 hover:text-ink">
          Reset
        </button>
      ) : null}
    </div>
  );
}
