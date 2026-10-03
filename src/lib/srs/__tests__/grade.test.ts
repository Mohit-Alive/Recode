import { describe, expect, it } from "vitest";
import { Rating } from "ts-fsrs";
import { drillGrade, suggestGrade, type ReviewSignals } from "../grade";

const base: ReviewSignals = {
  difficulty: "MEDIUM",
  solved: true,
  viewedSolution: false,
  hintUsed: false,
  wrongSubmissions: 0,
  minutes: 20,
  patternRecalled: "instant",
};

describe("suggestGrade", () => {
  it("is Good when solved unaided within target", () => {
    expect(suggestGrade(base).grade).toBe(Rating.Good);
  });
  it("is Again when unsolved or solution viewed", () => {
    expect(suggestGrade({ ...base, solved: false }).grade).toBe(Rating.Again);
    expect(suggestGrade({ ...base, viewedSolution: true }).grade).toBe(Rating.Again);
  });
  it("caps at Hard when a hint was used, even if fast", () => {
    const s = suggestGrade({ ...base, hintUsed: true, minutes: 5 });
    expect(s.grade).toBe(Rating.Hard);
    expect(s.cap).toBe(Rating.Hard);
  });
  it("is Hard when far over target time", () => {
    expect(suggestGrade({ ...base, minutes: 40 }).grade).toBe(Rating.Hard);
  });
  it("is Hard after 3+ wrong submissions", () => {
    expect(suggestGrade({ ...base, wrongSubmissions: 3 }).grade).toBe(Rating.Hard);
  });
  it("is Easy only when fast, clean and pattern spotted instantly", () => {
    expect(suggestGrade({ ...base, minutes: 10 }).grade).toBe(Rating.Easy);
    expect(suggestGrade({ ...base, minutes: 10, wrongSubmissions: 1 }).grade).toBe(Rating.Good);
    expect(suggestGrade({ ...base, minutes: 10, patternRecalled: "slow" }).grade).toBe(Rating.Good);
    expect(suggestGrade({ ...base, minutes: null }).grade).toBe(Rating.Good);
  });
  it("caps at Hard when the pattern was not recognised", () => {
    expect(suggestGrade({ ...base, patternRecalled: "no" }).grade).toBe(Rating.Hard);
  });
});

describe("drillGrade", () => {
  it("grades drills by correctness and speed", () => {
    expect(drillGrade(false, 1000)).toBe(Rating.Again);
    expect(drillGrade(true, 4000)).toBe(Rating.Good);
    expect(drillGrade(true, 30000)).toBe(Rating.Hard);
  });
});
