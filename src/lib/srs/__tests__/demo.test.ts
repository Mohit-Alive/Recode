import { describe, expect, it } from "vitest";
import { demoSeries } from "../demo";

describe("demoSeries", () => {
  it("keeps recall near target with reviews and lets it decay without", () => {
    const s = demoSeries(60);
    const endWith = s.withReviews.points.at(-1)!.r;
    const endWithout = s.without.points.at(-1)!.r;
    expect(endWithout).toBeLessThan(endWith);
    expect(Math.min(...s.withReviews.points.map((p) => p.r))).toBeGreaterThan(0.85);
    expect(s.withReviews.reviews.length).toBeGreaterThan(2);
  });
});
