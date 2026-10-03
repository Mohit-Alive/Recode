import type { Difficulty } from "@/db/schema";
import { interleave, seededRandom, shuffle } from "./queue";

export type DrillCandidate = {
  problemId: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  patternId: number;
  solved: boolean;
};

export type DrillPattern = { id: number; slug: string; name: string; neighbors: string[] };

export type DrillItem = DrillCandidate & { options: number[] };

/** Titles that name their own pattern teach nothing in a recognition drill. */
const GIVEAWAY: Record<string, RegExp> = {
  "binary-search": /binary search/i,
  "sliding-window": /sliding window/i,
  intervals: /interval/i,
  tries: /\btrie\b/i,
  heap: /heap|priority/i,
  stack: /stack/i,
  "linked-list": /linked list/i,
  graphs: /graph/i,
  "bit-manipulation": /\bbits?\b/i,
};

/**
 * Picks today's pattern-recognition drills.
 *
 * Pattern order: overdue pattern memories (lowest R first), then unlocked patterns never drilled.
 * Problems alternate between ones the user solved (recall) and ones they have not (transfer), so
 * the skill trained is "recognise the pattern in a fresh problem", not "remember this answer".
 */
export function selectDrills(input: {
  patterns: DrillPattern[];
  candidates: DrillCandidate[];
  patternMemory: Map<number, { r: number; due: Date }>;
  unlocked: Set<number>;
  now: Date;
  count: number;
  seed: string;
}): DrillItem[] {
  const { patterns, candidates, patternMemory, unlocked, now, count } = input;
  const rand = seededRandom(input.seed);
  const bySlug = new Map(patterns.map((p) => [p.slug, p]));
  const byId = new Map(patterns.map((p) => [p.id, p]));

  const eligible = [...unlocked].filter((id) => byId.has(id));
  if (eligible.length === 0) return [];

  const priority = (id: number) => {
    const m = patternMemory.get(id);
    if (!m) return -1; // never drilled: right after the overdue ones
    if (m.due <= now) return -2 + m.r; // overdue: lowest R first (range -2..-1)
    return m.r;
  };
  const order = [...eligible].sort((a, b) => priority(a) - priority(b));

  const pool = new Map<number, DrillCandidate[]>();
  for (const c of candidates) {
    const p = byId.get(c.patternId);
    if (!p || GIVEAWAY[p.slug]?.test(c.title)) continue;
    if (!pool.has(c.patternId)) pool.set(c.patternId, []);
    pool.get(c.patternId)!.push(c);
  }

  const chosen: DrillItem[] = [];
  const used = new Set<number>();
  for (let i = 0; chosen.length < count && i < count * 3; i++) {
    const patternId = order[i % order.length];
    const options = (pool.get(patternId) ?? []).filter((c) => !used.has(c.problemId));
    if (options.length === 0) continue;
    const wantSolved = chosen.length % 2 === 0;
    const preferred = options.filter((c) => c.solved === wantSolved);
    const from = preferred.length ? preferred : options;
    const pick = from[Math.floor(rand() * from.length)];
    used.add(pick.problemId);
    chosen.push({ ...pick, options: buildOptions(byId.get(patternId)!, patterns, bySlug, rand) });
  }
  return interleave(chosen);
}

function buildOptions(
  correct: DrillPattern,
  all: DrillPattern[],
  bySlug: Map<string, DrillPattern>,
  rand: () => number,
): number[] {
  const distractors = correct.neighbors
    .map((s) => bySlug.get(s)?.id)
    .filter((id): id is number => id !== undefined && id !== correct.id)
    .slice(0, 3);
  const others = shuffle(
    all.filter((p) => p.id !== correct.id && !distractors.includes(p.id)).map((p) => p.id),
    rand,
  );
  while (distractors.length < 3 && others.length) distractors.push(others.pop()!);
  return shuffle([correct.id, ...distractors], rand);
}
