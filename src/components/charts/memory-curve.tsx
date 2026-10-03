"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CurvePoint, ReviewMark } from "@/lib/srs/history";
import { formatPercent } from "@/lib/format";

const RATING = ["", "Again", "Hard", "Good", "Easy"];
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 40 };

/**
 * Recall probability over time for one problem: the sawtooth every learner should see.
 * Solid up to today, faded after (projection). Review markers carry a surface ring.
 */
export function MemoryCurve({
  points,
  reviews,
  now,
  due,
  target,
  timeZone,
}: {
  points: CurvePoint[];
  reviews: ReviewMark[];
  now: number;
  due: number;
  target: number;
  timeZone: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const t0 = points[0]?.t ?? now;
  const t1 = points.at(-1)?.t ?? now;
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - t0) / Math.max(1, t1 - t0)) * innerW;
  const y = (r: number) => PAD.top + (1 - r) * innerH;

  const { past, future, area } = useMemo(() => {
    const toPath = (pts: CurvePoint[]) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.r).toFixed(1)}`).join("");
    const pastPts = points.filter((p) => p.t <= now);
    const futurePts = points.filter((p) => p.t >= now);
    const nowR = interpolate(points, now);
    if (pastPts.length && nowR !== null) pastPts.push({ t: now, r: nowR });
    if (futurePts.length && nowR !== null) futurePts.unshift({ t: now, r: nowR });
    const areaPath = pastPts.length ? `${toPath(pastPts)}L${x(pastPts.at(-1)!.t)},${y(0)}L${x(pastPts[0].t)},${y(0)}Z` : "";
    return { past: toPath(pastPts), future: toPath(futurePts), area: areaPath };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, now, width]);

  const dateFmt = useMemo(() => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone }), [timeZone]);
  const ticks = [
    { t: t0, label: dateFmt.format(t0), anchor: "start" as const },
    { t: now, label: "Today", anchor: "middle" as const },
    ...(due > now + 86_400_000 * 2 && due < t1 ? [{ t: due, label: `Due ${dateFmt.format(due)}`, anchor: "middle" as const }] : []),
  ];

  const hoverT = hover === null ? null : t0 + ((hover - PAD.left) / innerW) * (t1 - t0);
  const hoverR = hoverT === null ? null : interpolate(points, hoverT);
  const nearReview = hoverT === null ? null : reviews.find((r) => Math.abs(x(r.t) - x(hoverT)) < 12) ?? null;

  function onKey(e: React.KeyboardEvent) {
    const stepPx = innerW / 30;
    if (e.key === "ArrowRight") setHover((h) => Math.min(PAD.left + innerW, (h ?? x(now)) + stepPx));
    else if (e.key === "ArrowLeft") setHover((h) => Math.max(PAD.left, (h ?? x(now)) - stepPx));
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  }

  if (points.length === 0) return null;

  return (
    <div ref={wrap} className="relative w-full select-none">
      <svg
        width={width}
        height={H}
        role="img"
        aria-label={`Recall over time. Currently ${formatPercent(interpolate(points, now) ?? 0)}. Use arrow keys to inspect.`}
        tabIndex={0}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setHover(Math.max(PAD.left, Math.min(PAD.left + innerW, e.clientX - rect.left)));
        }}
        onPointerLeave={() => setHover(null)}
        className="block rounded-md focus-visible:outline-2"
      >
        {[0, 0.5, 1].map((r) => (
          <g key={r}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(r)} y2={y(r)} className="stroke-line" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(r)} dy="0.32em" textAnchor="end" className="fill-ink-faint font-mono text-[10px]">
              {r * 100}%
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={PAD.left + innerW} y1={y(target)} y2={y(target)} className="stroke-line-strong" strokeWidth={1} />
        <text x={PAD.left + innerW} y={y(target) - 5} textAnchor="end" className="fill-ink-subtle text-[10.5px]">
          {formatPercent(target)} target
        </text>

        <path d={area} className="fill-accent" fillOpacity={0.1} />
        <path d={past} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={future} fill="none" className="stroke-accent" strokeOpacity={0.4} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        <line x1={x(now)} x2={x(now)} y1={PAD.top} y2={PAD.top + innerH} className="stroke-ink-faint" strokeWidth={1} />

        {reviews.map((r) => (
          <circle
            key={r.t}
            cx={x(r.t)}
            cy={y(1)}
            r={4.5}
            strokeWidth={2}
            className={r.rating === 1 ? "fill-risk stroke-surface-1" : "fill-ink-muted stroke-surface-1"}
          />
        ))}

        {ticks.map((tk) => (
          <text key={tk.label} x={x(tk.t)} y={H - 8} textAnchor={tk.anchor} className="fill-ink-subtle text-[10.5px]">
            {tk.label}
          </text>
        ))}

        {hover !== null && hoverR !== null ? (
          <g pointerEvents="none">
            <line x1={hover} x2={hover} y1={PAD.top} y2={PAD.top + innerH} className="stroke-ink-subtle" strokeWidth={1} />
            <circle cx={hover} cy={y(hoverR)} r={4} strokeWidth={2} className="fill-accent stroke-surface-1" />
          </g>
        ) : null}
      </svg>

      {hover !== null && hoverR !== null && hoverT !== null ? (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-md border border-line bg-surface-3 px-2.5 py-1.5 text-[12px]"
          style={{ left: Math.min(width - 150, Math.max(0, hover + 10)) }}
          role="status"
        >
          <p className="font-mono text-[13px] font-medium text-ink tabular">{formatPercent(hoverR)} recall</p>
          <p className="text-ink-subtle">
            {dateFmt.format(hoverT)}
            {hoverT > now ? " (projected)" : ""}
          </p>
          {nearReview ? (
            <p className="mt-0.5 text-ink-muted">
              Reviewed: {RATING[nearReview.rating]}
              {nearReview.rBefore !== null ? ` at ${formatPercent(nearReview.rBefore)}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function interpolate(points: CurvePoint[], t: number): number | null {
  if (!points.length) return null;
  if (t <= points[0].t) return points[0].r;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (t <= b.t) {
      if (b.t === a.t) return b.r;
      return a.r + ((b.r - a.r) * (t - a.t)) / (b.t - a.t);
    }
  }
  return points.at(-1)!.r;
}
