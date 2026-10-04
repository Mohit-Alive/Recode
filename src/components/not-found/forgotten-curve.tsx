"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { cn } from "@/lib/cn";

const W = 560;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 12, left: 16 };
const DAYS = 60;
// Exponential decay tuned so recall lands on exactly 4.04% at the end of the window.
const TAU = DAYS / Math.log(1 / 0.0404);
const recall = (t: number) => Math.exp(-t / TAU);

const innerW = W - PAD.left - PAD.right;
const innerH = H - PAD.top - PAD.bottom;
const x = (t: number) => PAD.left + (t / DAYS) * innerW;
const y = (r: number) => PAD.top + (1 - r) * innerH;

const SAMPLES = Array.from({ length: 121 }, (_, i) => (i / 120) * DAYS);
const LINE = SAMPLES.map((t, i) => `${i ? "L" : "M"}${x(t).toFixed(1)},${y(recall(t)).toFixed(1)}`).join("");
const AREA = `${LINE}L${x(DAYS)},${y(0)}L${x(0)},${y(0)}Z`;

/** The 404 visual: this page's recall decaying, unreviewed, until it is forgotten. */
export function ForgottenCurve({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const progress = useMotionValue(reduce ? 1 : 0);
  const [finished, setFinished] = useState(false);
  const done = finished || Boolean(reduce);

  useEffect(() => {
    if (reduce) {
      progress.set(1);
      return;
    }
    const controls = animate(progress, 1, { duration: 2.8, delay: 0.35, ease: [0.22, 1, 0.36, 1], onComplete: () => setFinished(true) });
    return () => controls.stop();
  }, [reduce, progress]);

  const clipWidth = useTransform(progress, (p) => PAD.left + p * innerW);
  const dotX = useTransform(progress, (p) => x(p * DAYS));
  const dotY = useTransform(progress, (p) => y(recall(p * DAYS)));
  const value = useTransform(progress, (p) => `${(recall(p * DAYS) * 100).toFixed(2)}%`);
  const day = useTransform(progress, (p) => `Day ${Math.round(p * DAYS)}`);

  return (
    <figure className={cn("rounded-2xl border border-line bg-surface-1 p-4 text-left hairline-top sm:p-5", className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] text-ink-subtle">Recall of this page</p>
          <motion.p className="mt-1 font-mono text-[34px] leading-none font-medium tracking-tight text-ink tabular sm:text-[40px]" aria-hidden>
            {value}
          </motion.p>
        </div>
        <motion.p className="pb-1 font-mono text-[12px] text-ink-faint tabular" aria-hidden>
          {day}
        </motion.p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="This page's recall falling from 100 percent to 4.04 percent over 60 days without a single review."
        className="mt-5 block h-auto w-full"
      >
        <defs>
          <clipPath id="nf-reveal">
            <motion.rect x={0} y={0} height={H} style={{ width: clipWidth }} />
          </clipPath>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <line key={r} x1={PAD.left} x2={PAD.left + innerW} y1={y(r)} y2={y(r)} className={r === 0 ? "stroke-line-strong" : "stroke-line"} strokeDasharray={r === 0 ? undefined : "2 4"} />
        ))}

        <g clipPath="url(#nf-reveal)">
          <path d={AREA} className="fill-ink-faint" opacity={0.08} />
          <path d={LINE} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="stroke-ink-subtle" />
        </g>

        <circle cx={x(0)} cy={y(1)} r={4} strokeWidth={2} className="fill-ink stroke-surface-1" />

        {done && !reduce ? (
          <motion.circle
            cx={x(DAYS)}
            cy={y(recall(DAYS))}
            className="fill-none stroke-risk"
            strokeWidth={1.5}
            initial={{ r: 5, opacity: 0.7 }}
            animate={{ r: 18, opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeOut", repeat: 2 }}
          />
        ) : null}
        <motion.circle style={{ cx: dotX, cy: dotY }} r={5} strokeWidth={2} className={cn("stroke-surface-1 transition-colors duration-500", done ? "fill-risk" : "fill-ink")} />
      </svg>

      <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-faint">
        <span>Last visit</span>
        <span>Today</span>
      </div>

      <motion.div
        className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[12px]"
        initial={reduce ? false : { opacity: 0, y: 4 }}
        animate={done ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.4 }}
      >
        <span className="inline-flex items-center gap-1.5 text-ink-muted">
          <span aria-hidden className="size-2 rounded-full bg-risk" />
          Forgotten
        </span>
        <span className="text-ink-subtle">Reviews scheduled: 0</span>
      </motion.div>
    </figure>
  );
}
