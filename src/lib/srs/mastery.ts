import type { Difficulty } from "@/db/schema";

export type MemoryLevel = "strong" | "fading" | "at-risk" | "none";

/** Thresholds on retrievability. At the default 90% target, a card is reviewed as it crosses 0.9. */
export function memoryLevel(r: number | null): MemoryLevel {
  if (r === null || r <= 0) return "none";
  if (r >= 0.85) return "strong";
  if (r >= 0.7) return "fading";
  return "at-risk";
}

export const MEMORY_LABEL: Record<MemoryLevel, string> = {
  strong: "Strong",
  fading: "Fading",
  "at-risk": "At risk",
  none: "Not started",
};

const WEIGHT: Record<Difficulty, number> = { EASY: 1, MEDIUM: 1.5, HARD: 2 };

export type PatternMastery = {
  patternId: number;
  solved: number;
  /** Difficulty-weighted mean retrievability of solved problems, null if none solved. */
  retention: number | null;
  atRisk: number;
};

/**
 * Pattern-level memory: how much of what you have learned in a pattern you could still produce.
 * Hard problems weigh double, because forgetting a Hard is what costs the interview.
 */
export function patternMastery(cards: { patternId: number | null; difficulty: Difficulty; r: number }[]) {
  const acc = new Map<number, { w: number; wr: number; solved: number; atRisk: number }>();
  for (const c of cards) {
    if (c.patternId === null) continue;
    const a = acc.get(c.patternId) ?? { w: 0, wr: 0, solved: 0, atRisk: 0 };
    const w = WEIGHT[c.difficulty];
    a.w += w;
    a.wr += w * c.r;
    a.solved += 1;
    if (c.r < 0.7) a.atRisk += 1;
    acc.set(c.patternId, a);
  }
  const out = new Map<number, PatternMastery>();
  for (const [patternId, a] of acc) {
    out.set(patternId, { patternId, solved: a.solved, retention: a.w ? a.wr / a.w : null, atRisk: a.atRisk });
  }
  return out;
}

export type RoadmapStatus = "mastered" | "learning" | "ready" | "locked";

/**
 * Roadmap status per pattern. Nothing is hard-locked: "locked" only means the prerequisites have
 * not been started yet, so the suggestion engine will not push it.
 */
export function roadmapStatus(
  pattern: { slug: string; prereqs: string[] },
  mastery: PatternMastery | undefined,
  total: number,
  started: Set<string>,
): RoadmapStatus {
  const coverage = total ? (mastery?.solved ?? 0) / total : 0;
  if (mastery && coverage >= 0.6 && (mastery.retention ?? 0) >= 0.85) return "mastered";
  if (mastery && mastery.solved > 0) return "learning";
  if (pattern.prereqs.every((p) => started.has(p))) return "ready";
  return "locked";
}
