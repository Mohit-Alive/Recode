import { curve } from "./fsrs";

const DAY = 86_400_000;

export type CurvePoint = { t: number; r: number };
export type ReviewMark = { t: number; rating: number; rBefore: number | null };

/**
 * Reconstructs the forgetting curve of one problem from its review history.
 * A ts-fsrs review log stores the card state *before* that review, so the stability in effect
 * after review i is the stability logged by review i+1 (or the live card's for the last one).
 */
export function memoryCurve(
  logs: { review: Date; rating: number; stability: number; retrievability: number | null }[],
  card: { stability: number; due: Date },
  now: Date,
  desiredRetention = 0.9,
): { points: CurvePoint[]; reviews: ReviewMark[]; end: number } {
  if (logs.length === 0) return { points: [], reviews: [], end: now.getTime() };
  const sorted = [...logs].sort((a, b) => a.review.getTime() - b.review.getTime());
  const segments = sorted.map((log, i) => ({
    start: log.review.getTime(),
    stability: i + 1 < sorted.length ? sorted[i + 1].stability : card.stability,
  }));
  const start = segments[0].start;
  const horizon = Math.max(now.getTime() + 14 * DAY, card.due.getTime() + 7 * DAY);
  const span = horizon - start;
  const step = Math.max(DAY / 8, span / 240);

  const points: CurvePoint[] = [];
  let seg = 0;
  for (let t = start; t <= horizon; t += step) {
    while (seg + 1 < segments.length && segments[seg + 1].start <= t) {
      // Close the previous segment exactly at the review instant, then jump.
      const s = segments[seg];
      const at = segments[seg + 1].start;
      points.push({ t: at, r: curve(s.stability, (at - s.start) / DAY, desiredRetention) });
      points.push({ t: at, r: 1 });
      seg++;
    }
    const s = segments[seg];
    points.push({ t, r: curve(s.stability, (t - s.start) / DAY, desiredRetention) });
  }
  return {
    points,
    reviews: sorted.map((l) => ({ t: l.review.getTime(), rating: l.rating, rBefore: l.retrievability })),
    end: horizon,
  };
}
