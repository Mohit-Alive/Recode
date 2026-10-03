import { createEmptyCard, fsrs, generatorParameters, Rating } from "ts-fsrs";

const DAY = 86_400_000;

/**
 * Deterministic curves for the landing page: one problem solved on day 0, then either never
 * revisited or re-solved (rated Good) whenever FSRS says recall has fallen to 90%.
 */
export function demoSeries(days = 60) {
  const f = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: false, request_retention: 0.9 }));
  const t0 = new Date("2026-01-01T09:00:00Z");
  let card = f.next(createEmptyCard(t0), t0, Rating.Good).card;
  const firstStability = card.stability;

  const reviews: number[] = [];
  const segments = [{ start: 0, stability: card.stability }];
  while (true) {
    const d = (card.due.getTime() - t0.getTime()) / DAY;
    if (d >= days) break;
    reviews.push(Math.round(d * 10) / 10);
    card = f.next(card, card.due, Rating.Good).card;
    segments.push({ start: d, stability: card.stability });
  }

  const sample = (stabilityAt: (d: number) => { start: number; stability: number }) => {
    const pts: { d: number; r: number }[] = [];
    for (let d = 0; d <= days; d += 0.25) {
      const seg = stabilityAt(d);
      pts.push({ d, r: f.forgetting_curve(d - seg.start, seg.stability) });
    }
    return pts;
  };

  const withPoints: { d: number; r: number }[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const end = segments[i + 1]?.start ?? days;
    for (let d = seg.start; d < end; d += 0.25) withPoints.push({ d, r: f.forgetting_curve(d - seg.start, seg.stability) });
    withPoints.push({ d: end, r: f.forgetting_curve(end - seg.start, seg.stability) });
  }

  return {
    days,
    without: { points: sample(() => ({ start: 0, stability: firstStability })), reviews: [0] },
    withReviews: { points: withPoints, reviews: [0, ...reviews] },
  };
}
