"use client";

import { useEffect, useRef, useState } from "react";
import { animate, AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/ssr";
import type { MemoryLabData } from "@/lib/srs/demo";
import { cn } from "@/lib/cn";

const H = 200;
const PAD = { top: 14, right: 10, bottom: 26, left: 34 };

/** Tweens a number in place without re-rendering React on every frame. */
function AnimatedNumber({ value, decimals = 1, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = prev.current;
    prev.current = value;
    if (reduce) {
      el.textContent = value.toFixed(decimals) + suffix;
      return;
    }
    const controls = animate(from, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (el.textContent = v.toFixed(decimals) + suffix),
    });
    return () => controls.stop();
  }, [value, decimals, suffix, reduce]);
  return (
    <span ref={ref} className="tabular">
      {value.toFixed(decimals) + suffix}
    </span>
  );
}

const fmtDays = (d: number) => (d >= 365 ? `${(d / 365).toFixed(1)} yr` : `${Math.round(d)} d`);

export function MemoryLab({ data }: { data: MemoryLabData }) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(560);
  const wrap = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const stage = data.stages[index];
  const last = data.stages.length - 1;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (d: number) => PAD.left + (d / data.windowDays) * innerW;
  const y = (r: number) => PAD.top + (1 - r) * innerH;
  const toPath = (pts: { d: number; r: number }[]) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.d).toFixed(1)},${y(p.r).toFixed(1)}`).join("");
  const full = toPath(data.points);
  const lived = toPath(data.points.filter((p) => p.d <= stage.day + 0.001));

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") setIndex((i) => Math.min(last, i + 1));
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    else if (e.key === "Home") setIndex(0);
    else if (e.key === "End") setIndex(last);
    else return;
    e.preventDefault();
  }

  const lapse = data.lapse;
  const ladder = data.ladder.slice(0, 4);
  const body: Record<string, { text: React.ReactNode; cite: string; extra?: React.ReactNode }> = {
    encoding: {
      text: (
        <>
          Solving a problem encodes a memory trace. The model describes it with two numbers set by how the solve went:{" "}
          <Term>difficulty D</Term>, how hard this problem is for you, and <Term>stability S</Term>, the number of days until your chance of
          recalling it falls to 90%. Rated Good, S starts at {data.stages[0].S.toFixed(1)} days.
        </>
      ),
      cite: "Two-component model of long-term memory: Woźniak, Gorzelańczyk & Murakowski, 1995",
    },
    forgetting: {
      text: (
        <>
          <Term>Retrievability R</Term> is the probability you could still solve it right now. It decays along a power-law forgetting curve,
          steep at first and flatter later. By day {Math.round(data.stages[1].day)} it is down to {Math.round(data.stages[1].R * 100)}%, so the
          problem comes back.
        </>
      ),
      cite: "Ebbinghaus, Memory: A Contribution to Experimental Psychology, 1885",
    },
    retrieval: {
      text: (
        <>
          Rebuilding the solution from a blank editor is <Term>retrieval practice</Term>. Pulling it out of memory strengthens the trace far more
          than rereading your old code. One clean re-solve multiplies stability by {data.firstGain.toFixed(1)}×, so the next review is{" "}
          {data.ladder[1]} days away.
        </>
      ),
      cite: "Test-enhanced learning: Roediger & Karpicke, Psychological Science, 2006",
    },
    spacing: {
      text: (
        <>
          The harder a successful retrieval, the more it strengthens memory: a <Term>desirable difficulty</Term>. Recode times each re-solve near
          your 90% target, late enough to be real effort and early enough that you still get it.
        </>
      ),
      cite: "Bjork, 1994; distributed practice meta-analysis: Cepeda et al., Psychological Bulletin, 2006",
      extra: (
        <dl className="mt-4 grid gap-2">
          {data.spacing.map((s) => {
            const max = Math.max(...data.spacing.map((x) => x.gain));
            return (
              <div key={s.day} className="grid grid-cols-[92px_1fr_52px] items-center gap-3 text-[12.5px]">
                <dt className="text-ink-subtle">
                  Day {s.day} <span className="font-mono text-ink-faint">{Math.round(s.r * 100)}%</span>
                </dt>
                <dd className="h-2.5">
                  <motion.span
                    className={cn("block h-full rounded-r-[3px]", s.day === data.stages[2].day ? "bg-accent" : "bg-accent/45")}
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    style={{ width: `${(s.gain / max) * 100}%`, transformOrigin: "left" }}
                  />
                </dd>
                <dd className="text-right font-mono text-ink tabular">×{s.gain.toFixed(1)}</dd>
              </div>
            );
          })}
          <p className="text-[11.5px] text-ink-subtle">Stability gain from the same re-solve, by when it happens and the recall it starts from.</p>
        </dl>
      ),
    },
    lapse: {
      text: (
        <>
          Forgot it? Stability drops from {Math.round(lapse.before)} to {lapse.after.toFixed(1)} days, not to zero: a brand-new memory would start
          at {lapse.fresh.toFixed(1)}. What survives of the old trace makes relearning faster, the effect Ebbinghaus called <Term>savings</Term>.
          Difficulty rises from {lapse.dBefore.toFixed(1)} to {lapse.dAfter.toFixed(1)}, so the problem returns more often.
        </>
      ),
      cite: "Savings in relearning: Ebbinghaus, 1885",
    },
    consolidation: {
      text: (
        <>
          Each success makes the memory more stable, and more stable memories gain less from easy reviews, so the gaps keep widening. That is{" "}
          <Term>consolidation</Term>: {ladder.length - 1} clean re-solves stretch the gap from {ladder[0]} days to {fmtDays(ladder[ladder.length - 1])}.
        </>
      ),
      cite: "FSRS-6 default parameters, fitted on the open-source srs-benchmark review dataset",
      extra: (
        <ol className="mt-4 flex flex-wrap items-center gap-1.5 text-[12.5px]" aria-label="Review intervals">
          {ladder.map((d, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className={cn("rounded-md border px-2 py-1 font-mono tabular", i === ladder.length - 1 ? "border-accent/60 text-ink" : "border-line-strong text-ink-muted")}>
                {fmtDays(d)}
              </span>
              {i < ladder.length - 1 ? <ArrowRight size={11} className="text-ink-faint" aria-hidden /> : null}
            </li>
          ))}
        </ol>
      ),
    },
  };
  const b = body[stage.key];

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:gap-10">
      <div
        role="tablist"
        aria-label="Stages of one memory"
        aria-orientation="vertical"
        onKeyDown={onKey}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
      >
        {data.stages.map((s, i) => (
          <button
            key={s.key}
            role="tab"
            id={`lab-tab-${s.key}`}
            aria-selected={i === index}
            aria-controls="lab-panel"
            tabIndex={i === index ? 0 : -1}
            onClick={() => setIndex(i)}
            className={cn(
              "relative flex shrink-0 items-baseline gap-3 rounded-lg px-3 py-2.5 text-left transition-colors lg:shrink",
              i === index ? "bg-surface-2" : "hover:bg-surface-2/50",
            )}
          >
            {i === index ? (
              <motion.span layoutId="lab-active" className="absolute inset-y-2 left-0 hidden w-0.5 rounded-full bg-accent lg:block" transition={{ type: "spring", stiffness: 400, damping: 34 }} />
            ) : null}
            <span className="font-mono text-[11px] text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
            <span>
              <span className={cn("block text-[14px] font-medium whitespace-nowrap", i === index ? "text-ink" : "text-ink-muted")}>{s.term}</span>
              <span className="block text-[12px] whitespace-nowrap text-ink-subtle">{s.label}</span>
            </span>
          </button>
        ))}
      </div>

      <div id="lab-panel" role="tabpanel" aria-labelledby={`lab-tab-${stage.key}`} className="min-w-0 rounded-2xl border border-line bg-surface-1 p-5 hairline-top sm:p-6">
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
          {[
            { k: "D", name: "Difficulty", hint: "1 to 10", node: <AnimatedNumber value={stage.D} /> },
            { k: "S", name: "Stability", hint: "days to 90%", node: <AnimatedNumber value={stage.S} suffix=" d" /> },
            { k: "R", name: "Retrievability", hint: "recall now", node: <AnimatedNumber value={stage.R * 100} decimals={0} suffix="%" /> },
          ].map((m) => (
            <div key={m.k} className="bg-canvas px-3 py-3 sm:px-4">
              <dt className="flex items-baseline gap-1.5 text-[11.5px] text-ink-subtle">
                <span className="font-mono text-[12px] text-accent-text">{m.k}</span>
                <span className="hidden sm:inline">{m.name}</span>
              </dt>
              <dd className="mt-1 font-mono text-[22px] font-medium tracking-tight text-ink sm:text-[26px]">{m.node}</dd>
              <dd className="text-[11px] text-ink-faint">{m.hint}</dd>
            </div>
          ))}
        </dl>

        <div ref={wrap} className="mt-5">
          <svg width={width} height={H} role="img" aria-label={`Recall over ${data.windowDays} days with reviews. Showing day ${Math.round(stage.day)}.`} className="block">
            {[0.5, 0.9, 1].map((r) => (
              <g key={r}>
                <line x1={PAD.left} x2={PAD.left + innerW} y1={y(r)} y2={y(r)} className={r === 0.9 ? "stroke-line-strong" : "stroke-line"} />
                <text x={PAD.left - 7} y={y(r)} dy="0.32em" textAnchor="end" className="fill-ink-faint font-mono text-[10px]">
                  {r * 100}%
                </text>
              </g>
            ))}
            <path d={full} fill="none" strokeWidth={2} className="stroke-accent" strokeOpacity={0.22} strokeLinejoin="round" />
            <path d={lived} fill="none" strokeWidth={2} className="stroke-accent" strokeLinejoin="round" strokeLinecap="round" />
            {data.reviews.map((d) => (
              <circle key={d} cx={x(d)} cy={y(1)} r={4} strokeWidth={2} className={cn("stroke-surface-1", d <= stage.day + 0.001 ? "fill-ink" : "fill-line-strong")} />
            ))}
            <motion.g initial={false} animate={{ x: x(stage.day) }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 22 }}>
              <line x1={0} x2={0} y1={PAD.top} y2={PAD.top + innerH} className="stroke-ink-subtle" />
              <text x={0} y={H - 8} textAnchor="middle" className="fill-ink text-[10.5px]">
                Day {Math.round(stage.day)}
              </text>
            </motion.g>
          </svg>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stage.key}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.22 }}
            className="mt-5"
          >
            <h3 className="text-[18px] font-semibold tracking-tight text-ink">{stage.term}</h3>
            <p className="mt-2 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-muted">{b.text}</p>
            {b.extra}
            <p className="mt-4 text-[11.5px] text-ink-faint">{b.cite}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-subtle hover:text-ink disabled:opacity-40"
          >
            <ArrowLeft size={13} aria-hidden /> Back
          </button>
          <span className="font-mono text-[12px] text-ink-faint">
            {index + 1}/{data.stages.length}
          </span>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(last, i + 1))}
            disabled={index === last}
            className="inline-flex items-center gap-1.5 text-[13px] text-accent-text hover:underline disabled:opacity-40"
          >
            Next <ArrowRight size={13} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-ink">{children}</span>;
}
