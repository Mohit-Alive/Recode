import type { Difficulty } from "@/db/schema";
import { REVIEW_ESTIMATE_MINUTES } from "./grade";

export type QueueItem = {
  problemId: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  patternId: number | null;
  /** Current retrievability, 0..1. */
  r: number;
  due: Date;
};

export type ReviewQueue<T extends QueueItem> = {
  /** Today's reviews, weakest memories first, interleaved across patterns. */
  items: T[];
  /** Due reviews that did not fit the budget. They stay due and lead tomorrow's queue. */
  deferred: T[];
  plannedMinutes: number;
};

/**
 * Builds today's review queue:
 * 1. weakest memory (lowest R) first, so the most-at-risk problems are never the ones deferred
 * 2. fill the daily budget in minutes, not in card count (a Hard re-solve costs 3x an Easy)
 * 3. interleave so two consecutive reviews never share a pattern (Rohrer & Taylor 2007)
 */
export function buildReviewQueue<T extends QueueItem>(
  due: T[],
  opts: { budgetMinutes: number; spentMinutes?: number },
): ReviewQueue<T> {
  const sorted = weakestFirst(due);
  let remaining = Math.max(0, opts.budgetMinutes - (opts.spentMinutes ?? 0));
  const chosen: T[] = [];
  const deferred: T[] = [];
  let plannedMinutes = 0;

  for (const item of sorted) {
    const cost = REVIEW_ESTIMATE_MINUTES[item.difficulty];
    // Always allow the single weakest item so an over-spent day still has something to do.
    if (cost <= remaining || (chosen.length === 0 && (opts.spentMinutes ?? 0) === 0)) {
      chosen.push(item);
      remaining -= cost;
      plannedMinutes += cost;
    } else {
      deferred.push(item);
    }
  }

  return { items: interleave(chosen), deferred, plannedMinutes };
}

/** Lowest retrievability first, then the longest overdue. */
export function weakestFirst<T extends { r: number; due: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.r - b.r || a.due.getTime() - b.due.getTime());
}

/**
 * Greedy reorder that keeps priority order but skips ahead whenever the next item would repeat
 * the previous item's pattern. Falls back to repeating only when nothing else is left.
 */
export function interleave<T extends { patternId: number | null }>(items: T[]): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (pool.length) {
    const prev = out.at(-1)?.patternId ?? null;
    let idx = pool.findIndex((x) => prev === null || x.patternId === null || x.patternId !== prev);
    if (idx === -1) idx = 0;
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

/** Deterministic PRNG (mulberry32) so a day's drill set is stable across reloads. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
