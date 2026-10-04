"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { MemoryMeter } from "@/components/problems/memory-meter";
import { formatPercent, slugify } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ROADMAP_SHEET } from "@/data/sheet-names";

export type RoadmapNode = {
  slug: string;
  name: string;
  prereqs: string[];
  status: "mastered" | "learning" | "ready" | "locked";
  solved: number;
  total: number;
  retention: number | null;
  atRisk: number;
};

const STATUS_LABEL = { mastered: "Mastered", learning: "Learning", ready: "Ready", locked: "Later" } as const;

/** Longest-path layering of the prerequisite DAG. */
function layers(nodes: RoadmapNode[]) {
  const by = new Map(nodes.map((n) => [n.slug, n]));
  const depth = new Map<string, number>();
  const d = (slug: string): number => {
    if (depth.has(slug)) return depth.get(slug)!;
    const n = by.get(slug)!;
    const v = n.prereqs.length ? 1 + Math.max(...n.prereqs.map(d)) : 0;
    depth.set(slug, v);
    return v;
  };
  nodes.forEach((n) => d(n.slug));
  const rows: RoadmapNode[][] = [];
  for (const n of nodes) (rows[depth.get(n.slug)!] ??= []).push(n);
  return rows;
}

export function Roadmap({ nodes }: { nodes: RoadmapNode[] }) {
  const rows = layers(nodes);
  const container = useRef<HTMLDivElement>(null);
  const refs = useRef(new Map<string, HTMLElement>());
  const [edges, setEdges] = useState<{ key: string; d: string; active: boolean }[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const next: { key: string; d: string; active: boolean }[] = [];
      for (const n of nodes) {
        const to = refs.current.get(n.slug)?.getBoundingClientRect();
        if (!to) continue;
        for (const p of n.prereqs) {
          const from = refs.current.get(p)?.getBoundingClientRect();
          if (!from) continue;
          const x1 = from.left + from.width / 2 - box.left;
          const y1 = from.bottom - box.top;
          const x2 = to.left + to.width / 2 - box.left;
          const y2 = to.top - box.top;
          const my = (y1 + y2) / 2;
          const started = nodes.find((x) => x.slug === p)!.solved > 0;
          next.push({ key: `${p}-${n.slug}`, d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`, active: started });
        }
      }
      setEdges(next);
      setSize({ w: box.width, h: box.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nodes]);

  return (
    <div ref={container} className="relative">
      <svg className="pointer-events-none absolute inset-0 hidden md:block" width={size.w} height={size.h} aria-hidden>
        {edges.map((e) => (
          <path key={e.key} d={e.d} fill="none" strokeWidth={1.25} className={e.active ? "stroke-accent/60" : "stroke-line-strong"} />
        ))}
      </svg>
      <ol className="relative flex flex-col gap-4 md:gap-10">
        {rows.map((row, i) => (
          <li key={i} className="flex flex-col gap-2 md:flex-row md:flex-wrap md:justify-center md:gap-4">
            {row.map((n) => (
              <Link
                key={n.slug}
                ref={(el) => {
                  if (el) refs.current.set(n.slug, el);
                  else refs.current.delete(n.slug);
                }}
                href={`/sheets/${ROADMAP_SHEET.slug}#${slugify(n.name)}`}
                className={cn(
                  "group relative flex flex-col gap-2 rounded-lg border bg-surface-1 px-3.5 py-3 transition-colors md:w-[188px]",
                  n.status === "learning" || n.status === "mastered" ? "border-line-strong" : "border-line",
                  n.status === "locked" && "opacity-60",
                  "hover:border-ink-faint",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13.5px] font-medium text-ink">{n.name}</span>
                  <MemoryMeter r={n.retention} />
                </span>
                <span className="flex items-center justify-between text-[11.5px] text-ink-subtle">
                  <span className={cn(n.status === "mastered" && "text-strong", n.status === "ready" && "text-accent-text")}>{STATUS_LABEL[n.status]}</span>
                  <span className="font-mono tabular">
                    {n.retention !== null ? `${formatPercent(n.retention)} · ` : ""}
                    {n.solved}/{n.total}
                  </span>
                </span>
                <span className="absolute inset-x-3.5 bottom-0 h-px overflow-hidden" aria-hidden>
                  <span className="block h-full bg-accent" style={{ width: `${n.total ? (n.solved / n.total) * 100 : 0}%` }} />
                </span>
              </Link>
            ))}
          </li>
        ))}
      </ol>
    </div>
  );
}
