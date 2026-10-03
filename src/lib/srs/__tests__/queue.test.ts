import { describe, expect, it } from "vitest";
import { buildReviewQueue, interleave, type QueueItem } from "../queue";

const item = (id: number, patternId: number | null, r: number, difficulty: QueueItem["difficulty"] = "MEDIUM"): QueueItem => ({
  problemId: id,
  slug: `p${id}`,
  title: `P${id}`,
  difficulty,
  patternId,
  r,
  due: new Date(2026, 0, 1),
});

describe("buildReviewQueue", () => {
  it("puts the weakest memories in and defers the rest past the budget", () => {
    const due = [item(1, 1, 0.9), item(2, 2, 0.5), item(3, 3, 0.7), item(4, 4, 0.8)];
    const q = buildReviewQueue(due, { budgetMinutes: 40 }); // 2 mediums at 18 min
    expect(q.items.map((x) => x.problemId).sort()).toEqual([2, 3]);
    expect(q.deferred.map((x) => x.problemId)).toEqual([4, 1]);
    expect(q.plannedMinutes).toBe(36);
  });

  it("never returns an empty queue on a fresh day when something is due", () => {
    const q = buildReviewQueue([item(1, 1, 0.5, "HARD")], { budgetMinutes: 10 });
    expect(q.items).toHaveLength(1);
  });

  it("respects minutes already spent today", () => {
    const q = buildReviewQueue([item(1, 1, 0.5)], { budgetMinutes: 30, spentMinutes: 20 });
    expect(q.items).toHaveLength(0);
    expect(q.deferred).toHaveLength(1);
  });

  it("never places two same-pattern reviews next to each other when avoidable", () => {
    const due = [item(1, 1, 0.1), item(2, 1, 0.2), item(3, 1, 0.3), item(4, 2, 0.4), item(5, 3, 0.5)];
    const q = buildReviewQueue(due, { budgetMinutes: 1000 });
    const pats = q.items.map((x) => x.patternId);
    expect(pats).toEqual([1, 2, 1, 3, 1]);
  });
});

describe("interleave", () => {
  it("keeps order when patterns already alternate", () => {
    const xs = [item(1, 1, 0), item(2, 2, 0), item(3, 1, 0)];
    expect(interleave(xs).map((x) => x.problemId)).toEqual([1, 2, 3]);
  });
  it("treats null patterns as compatible with anything", () => {
    const xs = [item(1, null, 0), item(2, null, 0)];
    expect(interleave(xs).map((x) => x.problemId)).toEqual([1, 2]);
  });
});
