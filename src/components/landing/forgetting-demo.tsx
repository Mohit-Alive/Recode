"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";

type Series = { points: { d: number; r: number }[]; reviews: number[] };

const H = 300;
const PAD = { top: 20, right: 12, bottom: 30, left: 36 };

/**
 * Live hero visual: the same problem's recall over 60 days, with and without timed reviews.
 * Both curves come from the FSRS-6 model with default parameters (computed on the server).
 */
export function ForgettingDemo({ without, withReviews, days }: { without: Series; withReviews: Series; days: number }) {
  const [mode, setMode] = useState<"without" | "with">("with");
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(520);
  const wrap = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const s = mode === "with" ? withReviews : without;
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (d: number) => PAD.left + (d / days) * innerW;
  const y = (r: number) => PAD.top + (1 - r) * innerH;
  const path = s.points.map((p, i) => `${i ? "L" : "M"}${x(p.d).toFixed(1)},${y(p.r).toFixed(1)}`).join("");
  const area = `${path}L${x(days)},${y(0)}L${x(0)},${y(0)}Z`;
  const end = s.points.at(-1)!.r;

  const hoverDay = hover === null ? null : Math.round(((hover - PAD.left) / innerW) * days);
  const hoverR = hoverDay === null ? null : nearest(s.points, hoverDay);

  return (
    <div className="rounded-2xl border border-line bg-surface-1 p-4 hairline-top sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Scenario" className="inline-flex rounded-md border border-line bg-canvas p-0.5">
          {(
            [
              ["without", "Solve once"],
              ["with", "With Recode"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "rounded-[5px] px-3 py-1 text-[12.5px] transition-colors",
                mode === value ? "bg-surface-3 text-ink" : "text-ink-subtle hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-ink-subtle" aria-live="polite">
          Day {days}: <span className="font-mono text-ink tabular">{Math.round(end * 100)}%</span> recall
          {mode === "with" ? <span> after {withReviews.reviews.length - 1} short re-solves</span> : null}
        </p>
      </div>

      <div ref={wrap} className="relative mt-4">
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`Recall of one problem over ${days} days, ${mode === "with" ? "with spaced reviews" : "solved once and never reviewed"}. Ends at ${Math.round(end * 100)} percent.`}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHover(Math.max(PAD.left, Math.min(PAD.left + innerW, e.clientX - rect.left)));
          }}
          onPointerLeave={() => setHover(null)}
          className="block touch-pan-y"
        >
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <g key={r}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={y(r)} y2={y(r)} className="stroke-line" />
              <text x={PAD.left - 8} y={y(r)} dy="0.32em" textAnchor="end" className="fill-ink-faint font-mono text-[10px]">
                {r * 100}%
              </text>
            </g>
          ))}
          <line x1={PAD.left} x2={PAD.left + innerW} y1={y(0.9)} y2={y(0.9)} className="stroke-line-strong" />
          <text x={PAD.left + innerW} y={y(0.9) - 6} textAnchor="end" className="fill-ink-subtle text-[10.5px]">
            90% target
          </text>

          <motion.path
            key={`area-${mode}`}
            d={area}
            className="fill-accent"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 0.1 }}
            transition={{ duration: 0.6 }}
          />
          <motion.path
            key={`line-${mode}`}
            d={path}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            className={mode === "with" ? "stroke-accent" : "stroke-ink-subtle"}
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
          {s.reviews.map((d) => (
            <motion.circle
              key={`${mode}-${d}`}
              cx={x(d)}
              cy={y(1)}
              r={4.5}
              strokeWidth={2}
              className="fill-ink stroke-surface-1"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 0.2 + (d / days) * 0.9 }}
            />
          ))}
          {[0, 15, 30, 45, 60].filter((d) => d <= days).map((d) => (
            <text key={d} x={x(d)} y={H - 10} textAnchor={d === 0 ? "start" : d === days ? "end" : "middle"} className="fill-ink-faint text-[10.5px]">
              {d === 0 ? "Solved" : `Day ${d}`}
            </text>
          ))}
          {hover !== null && hoverR !== null ? (
            <g pointerEvents="none">
              <line x1={hover} x2={hover} y1={PAD.top} y2={PAD.top + innerH} className="stroke-ink-subtle" />
              <circle cx={hover} cy={y(hoverR)} r={4} strokeWidth={2} className="fill-accent stroke-surface-1" />
            </g>
          ) : null}
        </svg>
        {hover !== null && hoverR !== null ? (
          <div
            className="pointer-events-none absolute top-1 rounded-md border border-line bg-surface-3 px-2.5 py-1.5 text-[12px]"
            style={{ left: Math.min(width - 120, Math.max(0, hover + 10)) }}
          >
            <p className="font-mono text-[13px] font-medium text-ink tabular">{Math.round(hoverR * 100)}%</p>
            <p className="text-ink-subtle">Day {hoverDay}</p>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-[11.5px] text-ink-faint">Modelled with FSRS-6 default parameters, one problem rated Good at each review.</p>
    </div>
  );
}

function nearest(points: { d: number; r: number }[], d: number) {
  let best = points[0];
  for (const p of points) if (Math.abs(p.d - d) < Math.abs(best.d - d) || (p.d === d && p.r < best.r)) best = p;
  return best.r;
}
