/**
 * Conformance test: an independent implementation of FSRS-6 written straight from
 * https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm
 * compared against the ts-fsrs scheduler the app uses.
 */
import { describe, expect, it } from "vitest";
import { createEmptyCard, default_w, fsrs, generatorParameters, Rating, type Card, type Grade } from "ts-fsrs";

const W = [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542];
const DAY = 86_400_000;
const clampD = (d: number) => Math.min(10, Math.max(1, d));

// --- Wiki formulas (FSRS-6) ---
const factor = Math.pow(0.9, -1 / W[20]) - 1;
const R = (t: number, S: number) => Math.pow(1 + (factor * t) / S, -W[20]);
const S0 = (G: number) => W[G - 1];
const D0 = (G: number) => W[4] - Math.exp(W[5] * (G - 1)) + 1;
const nextD = (D: number, G: number) => {
  const dD = -W[6] * (G - 3);
  const Dp = D + (dD * (10 - D)) / 9; // linear damping
  return clampD(W[7] * D0(4) + (1 - W[7]) * Dp); // mean reversion to D0(4)
};
const Srecall = (D: number, S: number, r: number, G: number) =>
  S * (Math.exp(W[8]) * (11 - D) * Math.pow(S, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * (G === 2 ? W[15] : 1) * (G === 4 ? W[16] : 1) + 1);
const Sforget = (D: number, S: number, r: number) =>
  W[11] * Math.pow(D, -W[12]) * (Math.pow(S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
const Ssameday = (S: number, G: number) => S * Math.exp(W[17] * (G - 3 + W[18])) * Math.pow(S, -W[19]);
const interval = (S: number, r: number) => Math.min(36500, Math.max(1, Math.round((S / factor) * (Math.pow(r, -1 / W[20]) - 1))));

/**
 * Not part of the formulas, but done by every official scheduler (ts-fsrs, py-fsrs, Anki):
 * after rounding, intervals are forced into Again < Hard < Good < Easy order, so a better
 * grade is never scheduled sooner. Reviews of a card already in review skip the Again bound.
 */
function orderedIntervals(stabilities: Record<Grade, number>, r: number, isNew: boolean): Record<Grade, number> {
  let again = interval(stabilities[1], r);
  let hard = interval(stabilities[2], r);
  let good = interval(stabilities[3], r);
  let easy = interval(stabilities[4], r);
  if (isNew) {
    again = Math.min(again, hard);
    hard = Math.max(hard, again + 1);
  } else {
    hard = Math.min(hard, good);
  }
  good = Math.max(good, hard + 1);
  easy = Math.max(easy, good + 1);
  return { 1: again, 2: hard, 3: good, 4: easy };
}

describe("FSRS-6 conformance with the published algorithm", () => {
  it("ships the FSRS-6 default parameters", () => {
    expect([...default_w]).toEqual(W);
  });

  it("forgetting curve: R(S, S) = 90% and matches the formula", () => {
    const f = fsrs();
    for (const S of [0.5, 2.3, 10, 87]) {
      expect(R(S, S)).toBeCloseTo(0.9, 10);
      // ts-fsrs rounds R to 8 decimals.
      for (const t of [0, 1, 5, 30, 200]) expect(f.forgetting_curve(t, S)).toBeCloseTo(R(t, S), 7);
    }
  });

  it("same-day formula (unused by the app, but part of the spec)", () => {
    // SInc >= 1 for Good on a small S, converges for large S.
    expect(Ssameday(1, 3) / 1).toBeGreaterThan(1);
  });

  it("matches review by review: first rating, recall, lapse and interval", () => {
    // Same settings as the app (day granularity), fuzz off for determinism.
    const f = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: false, request_retention: 0.9 }));
    const t0 = new Date("2026-01-01T00:00:00Z");
    const grades: Grade[] = [Rating.Good, Rating.Good, Rating.Hard, Rating.Again, Rating.Good, Rating.Easy, Rating.Good];

    let card: Card = createEmptyCard(t0);
    let now = t0;
    let S = 0;
    let D = 0;
    for (const [i, G] of grades.entries()) {
      const grades4 = [1, 2, 3, 4] as Grade[];
      let next: Record<Grade, { S: number; D: number }>;
      if (i === 0) {
        next = Object.fromEntries(grades4.map((g) => [g, { S: S0(g), D: clampD(D0(g)) }])) as typeof next;
      } else {
        const t = Math.round((now.getTime() - card.last_review!.getTime()) / DAY);
        const r = R(t, S);
        // Stability uses the difficulty from before this review; post-lapse S never exceeds S.
        next = Object.fromEntries(
          grades4.map((g) => [g, { S: g === Rating.Again ? Math.min(Sforget(D, S, r), S) : Srecall(D, S, r, g), D: nextD(D, g) }]),
        ) as typeof next;
      }
      const ivl = orderedIntervals(
        { 1: next[1].S, 2: next[2].S, 3: next[3].S, 4: next[4].S },
        0.9,
        i === 0 || card.state !== 2,
      );
      ({ S, D } = next[G]);

      card = f.next(card, now, G).card;
      expect(card.stability).toBeCloseTo(S, 4); // ts-fsrs rounds R and S to 8 decimals internally
      expect(card.difficulty).toBeCloseTo(D, 4);
      // A lapse from review goes to relearning: its interval is the Again stability's interval.
      expect(card.scheduled_days).toBe(G === Rating.Again && i > 0 ? interval(S, 0.9) : ivl[G]);
      now = new Date(now.getTime() + card.scheduled_days * DAY);
    }
  });

  it("overdue reviews: lower R at review time gives a larger stability gain", () => {
    const D = clampD(D0(3));
    const S = S0(3);
    expect(Srecall(D, S, R(10, S), 3)).toBeGreaterThan(Srecall(D, S, R(2, S), 3));
  });
});
