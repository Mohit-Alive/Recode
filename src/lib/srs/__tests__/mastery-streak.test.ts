import { describe, expect, it } from "vitest";
import { memoryLevel, patternMastery, roadmapStatus } from "../mastery";
import { currentStreak, recordActivity, type StreakState } from "../../streak";
import { selectDrills } from "../drills";

describe("patternMastery", () => {
  it("weights hard problems double", () => {
    const m = patternMastery([
      { patternId: 1, difficulty: "EASY", r: 1 },
      { patternId: 1, difficulty: "HARD", r: 0.4 },
      { patternId: null, difficulty: "EASY", r: 0.1 },
    ]);
    const p = m.get(1)!;
    expect(p.solved).toBe(2);
    expect(p.retention).toBeCloseTo((1 + 2 * 0.4) / 3);
    expect(p.atRisk).toBe(1);
    expect(m.size).toBe(1);
  });
  it("labels memory levels", () => {
    expect(memoryLevel(0.95)).toBe("strong");
    expect(memoryLevel(0.75)).toBe("fading");
    expect(memoryLevel(0.4)).toBe("at-risk");
    expect(memoryLevel(null)).toBe("none");
  });
  it("computes roadmap status", () => {
    const started = new Set(["arrays-hashing"]);
    expect(roadmapStatus({ slug: "two-pointers", prereqs: ["arrays-hashing"] }, undefined, 5, started)).toBe("ready");
    expect(roadmapStatus({ slug: "trees", prereqs: ["linked-list"] }, undefined, 5, started)).toBe("locked");
    expect(
      roadmapStatus({ slug: "arrays-hashing", prereqs: [] }, { patternId: 1, solved: 4, retention: 0.9, atRisk: 0 }, 5, started),
    ).toBe("mastered");
  });
});

describe("streak", () => {
  const empty: StreakState = { current: 0, best: 0, freezes: 0, lastActiveOn: null };
  it("counts consecutive days and is idempotent within a day", () => {
    let s = recordActivity(empty, "2026-10-01");
    s = recordActivity(s, "2026-10-01");
    s = recordActivity(s, "2026-10-02");
    expect(s.current).toBe(2);
    expect(s.best).toBe(2);
  });
  it("resets after a missed day without freezes", () => {
    let s = recordActivity(empty, "2026-10-01");
    s = recordActivity(s, "2026-10-03");
    expect(s.current).toBe(1);
  });
  it("earns a freeze at 7 days and spends it on a missed day", () => {
    let s = empty;
    for (let d = 1; d <= 7; d++) s = recordActivity(s, `2026-10-0${d}`);
    expect(s.freezes).toBe(1);
    expect(currentStreak(s, "2026-10-09")).toBe(7);
    s = recordActivity(s, "2026-10-09");
    expect(s.current).toBe(8);
    expect(s.freezes).toBe(0);
  });
  it("displays 0 once lapsed", () => {
    const s = recordActivity(empty, "2026-10-01");
    expect(currentStreak(s, "2026-10-02")).toBe(1);
    expect(currentStreak(s, "2026-10-05")).toBe(0);
  });
});

describe("selectDrills", () => {
  const patterns = [
    { id: 1, slug: "arrays-hashing", name: "A", neighbors: ["two-pointers", "sliding-window"] },
    { id: 2, slug: "two-pointers", name: "B", neighbors: ["arrays-hashing"] },
    { id: 3, slug: "sliding-window", name: "C", neighbors: [] },
    { id: 4, slug: "stack", name: "D", neighbors: [] },
  ];
  const candidates = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
    problemId: i,
    slug: `p${i}`,
    title: `Problem ${i}`,
    difficulty: "MEDIUM" as const,
    patternId: ((i - 1) % 2) + 1,
    solved: i % 3 === 0,
  }));
  const run = (seed: string) =>
    selectDrills({
      patterns,
      candidates,
      patternMemory: new Map(),
      unlocked: new Set([1, 2]),
      now: new Date(),
      count: 4,
      seed,
    });

  it("returns 4 options including the right answer, no duplicate problems", () => {
    const d = run("u:2026-10-03");
    expect(d).toHaveLength(4);
    for (const item of d) {
      expect(item.options).toHaveLength(4);
      expect(item.options).toContain(item.patternId);
      expect(new Set(item.options).size).toBe(4);
    }
    expect(new Set(d.map((x) => x.problemId)).size).toBe(4);
  });
  it("is deterministic per seed", () => {
    expect(run("a")).toEqual(run("a"));
  });
  it("returns nothing when no pattern is unlocked", () => {
    expect(selectDrills({ patterns, candidates, patternMemory: new Map(), unlocked: new Set(), now: new Date(), count: 4, seed: "x" })).toEqual([]);
  });
});
