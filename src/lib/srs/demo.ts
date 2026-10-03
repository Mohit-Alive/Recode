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

export type LabStage = {
  key: string;
  label: string;
  term: string;
  /** Day shown by the time cursor on the trajectory. */
  day: number;
  D: number;
  S: number;
  R: number;
};

/**
 * Every number shown in the landing page's "Inside one memory" walkthrough, computed from the
 * same FSRS-6 model the scheduler uses (default parameters, no fuzz).
 */
export function memoryLab() {
  const f = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: false, request_retention: 0.9 }));
  const t0 = new Date("2026-01-01T09:00:00Z");
  const at = (d: number) => new Date(t0.getTime() + d * DAY);

  // Main trajectory: a first solve, then a Good re-solve each time it comes due.
  const first = f.next(createEmptyCard(t0), t0, Rating.Good).card;
  const reviews = [0];
  const cards = [first];
  let card = first;
  let day = 0;
  for (let i = 0; i < 5; i++) {
    day += card.scheduled_days;
    reviews.push(day);
    card = f.next(card, at(day), Rating.Good).card;
    cards.push(card);
  }
  const ladder = cards.map((c) => c.scheduled_days);
  const firstReview = reviews[1];
  const rAtFirstReview = f.forgetting_curve(firstReview, first.stability);

  // Spacing effect: the same first re-solve, done early, on time, or late.
  const spacing = [1, firstReview, 10].map((d) => {
    const next = f.next(first, at(d), Rating.Good).card;
    return { day: d, r: f.forgetting_curve(d, first.stability), gain: next.stability / first.stability };
  });

  // Lapse: forget the problem well after its third review comes due.
  const beforeLapse = cards[2];
  const lapseDay = reviews[2] + beforeLapse.scheduled_days + 20;
  const lapsed = f.next(beforeLapse, at(lapseDay), Rating.Again).card;
  const freshAgain = f.next(createEmptyCard(t0), t0, Rating.Again).card.stability;

  const windowDays = Math.ceil(reviews[3] * 1.08);
  const points: { d: number; r: number }[] = [];
  for (let i = 0; i < reviews.length - 1 && reviews[i] <= windowDays; i++) {
    const end = Math.min(reviews[i + 1], windowDays);
    for (let d = reviews[i]; d < end; d += 0.25) points.push({ d, r: f.forgetting_curve(d - reviews[i], cards[i].stability) });
    points.push({ d: end, r: f.forgetting_curve(end - reviews[i], cards[i].stability) });
  }

  const stages: LabStage[] = [
    { key: "encoding", label: "First solve", term: "Encoding", day: 0, D: first.difficulty, S: first.stability, R: 1 },
    { key: "forgetting", label: `Days 0 to ${firstReview}`, term: "Forgetting curve", day: firstReview - 0.01, D: first.difficulty, S: first.stability, R: rAtFirstReview },
    { key: "retrieval", label: `Day ${firstReview} re-solve`, term: "Testing effect", day: firstReview, D: cards[1].difficulty, S: cards[1].stability, R: 1 },
    { key: "spacing", label: "Timing the re-solve", term: "Spacing effect", day: firstReview, D: cards[1].difficulty, S: cards[1].stability, R: 1 },
    { key: "lapse", label: "When it slips", term: "Relearning savings", day: reviews[2], D: lapsed.difficulty, S: lapsed.stability, R: 1 },
    { key: "consolidation", label: "Months later", term: "Consolidation", day: reviews[3], D: cards[3].difficulty, S: cards[3].stability, R: 1 },
  ];

  return {
    stages,
    points,
    reviews: reviews.filter((d) => d <= windowDays),
    windowDays,
    ladder,
    spacing,
    lapse: { before: beforeLapse.stability, after: lapsed.stability, fresh: freshAgain, dBefore: beforeLapse.difficulty, dAfter: lapsed.difficulty },
    firstGain: cards[1].stability / first.stability,
  };
}

export type MemoryLabData = ReturnType<typeof memoryLab>;
