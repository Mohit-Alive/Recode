"use client";

import { useEffect, useRef, useState } from "react";

const H = 168;
const PAD = { top: 20, right: 4, bottom: 26, left: 4 };

/** Reviews due per day for the next two weeks. One series, value on each non-zero cap. */
export function ForecastChart({ data }: { data: { day: string; count: number }[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = Math.max(1, ...data.map((d) => d.count));
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const band = innerW / data.length;
  const barW = Math.min(24, band - 6);
  const wd = new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" });
  const full = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div ref={wrap} className="relative">
      <svg width={width} height={H} role="img" aria-label="Reviews due per day for the next 14 days" className="block">
        <line x1={PAD.left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} className="stroke-line" />
        {data.map((d, i) => {
          const h = (d.count / max) * innerH;
          const cx = PAD.left + band * i + band / 2;
          const yTop = PAD.top + innerH - h;
          const date = new Date(`${d.day}T00:00:00Z`);
          return (
            <g
              key={d.day}
              tabIndex={0}
              role="img"
              aria-label={`${full.format(date)}: ${d.count} reviews`}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="outline-none"
            >
              <rect x={PAD.left + band * i} y={PAD.top} width={band} height={innerH + PAD.bottom} fill="transparent" />
              {d.count > 0 ? (
                <path
                  d={roundedTop(cx - barW / 2, yTop, barW, h, Math.min(4, h))}
                  className={hover === i ? "fill-accent-hover" : i === 0 ? "fill-accent" : "fill-accent/70"}
                />
              ) : null}
              {d.count > 0 ? (
                <text x={cx} y={yTop - 6} textAnchor="middle" className="fill-ink-muted font-mono text-[10.5px]">
                  {d.count}
                </text>
              ) : null}
              <text x={cx} y={H - 8} textAnchor="middle" className={i === 0 ? "fill-ink text-[10.5px]" : "fill-ink-faint text-[10.5px]"}>
                {i === 0 ? "Today" : wd.format(date)}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null ? (
        <div
          role="status"
          className="pointer-events-none absolute top-0 rounded-md border border-line bg-surface-3 px-2.5 py-1.5 text-[12px]"
          style={{ left: Math.min(width - 140, Math.max(0, PAD.left + band * hover + band / 2 - 50)) }}
        >
          <p className="font-mono text-[13px] font-medium text-ink tabular">{data[hover].count} reviews</p>
          <p className="text-ink-subtle">{full.format(new Date(`${data[hover].day}T00:00:00Z`))}</p>
        </div>
      ) : null}
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
