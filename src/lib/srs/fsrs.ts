import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type FSRS,
  type Grade,
  type ReviewLog,
} from "ts-fsrs";

export { Rating, State };
export type { Card, Grade, ReviewLog };

/** Columns persisted for every FSRS card (problem cards and pattern cards share them). */
export type CardColumns = {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: Date | null;
};

const schedulers = new Map<string, FSRS>();

export const MAX_INTERVAL_DAYS = 365;

/**
 * A scheduler tuned for re-solving problems rather than flipping flashcards:
 * - day granularity (no minute-level learning steps: a re-solve takes 20 minutes, not 10 seconds)
 * - fuzz on, so problems solved together do not all come due on the same day
 * - intervals capped (a year by default; custom sheets can choose a shorter cap) so nothing
 *   disappears before an interview cycle
 */
export function scheduler(desiredRetention = 0.9, maxInterval = MAX_INTERVAL_DAYS): FSRS {
  const retention = Math.round(desiredRetention * 100);
  const cap = Math.max(1, Math.round(maxInterval));
  const key = `${retention}:${cap}`;
  let f = schedulers.get(key);
  if (!f) {
    f = fsrs(
      generatorParameters({
        request_retention: retention / 100,
        maximum_interval: cap,
        enable_fuzz: true,
        enable_short_term: false,
      }),
    );
    schedulers.set(key, f);
  }
  return f;
}

export function newCard(now: Date): Card {
  return createEmptyCard(now);
}

export function toCard(row: CardColumns): Card {
  return {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    learning_steps: row.learningSteps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.lastReview ?? undefined,
  };
}

export function fromCard(card: Card): CardColumns {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ?? null,
  };
}

export function fromLog(log: ReviewLog) {
  return {
    rating: log.rating,
    state: log.state,
    due: log.due,
    stability: log.stability,
    difficulty: log.difficulty,
    elapsedDays: log.elapsed_days,
    lastElapsedDays: log.last_elapsed_days,
    scheduledDays: log.scheduled_days,
    learningSteps: log.learning_steps,
    review: log.review,
  };
}

/** Probability (0..1) the user can still solve it right now. 0 for cards never reviewed. */
export function retrievability(row: CardColumns, now: Date, desiredRetention = 0.9): number {
  if (row.state === State.New || !row.lastReview) return 0;
  return scheduler(desiredRetention).get_retrievability(toCard(row), now, false);
}

/**
 * Retrievability as a function of days since the last review, for drawing forgetting curves.
 * Uses the same FSRS-6 power curve as the scheduler.
 */
export function curve(stability: number, days: number, desiredRetention = 0.9): number {
  if (stability <= 0) return 0;
  return scheduler(desiredRetention).forgetting_curve(Math.max(0, days), stability);
}

export const GRADES = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const satisfies readonly Grade[];

export const GRADE_LABEL: Record<Grade, string> = {
  [Rating.Again]: "Again",
  [Rating.Hard]: "Hard",
  [Rating.Good]: "Good",
  [Rating.Easy]: "Easy",
};

/** Next interval (in days) for each grade, for previewing on the rating keycaps. */
export function previewIntervals(
  row: CardColumns | null,
  now: Date,
  desiredRetention = 0.9,
  maxInterval = MAX_INTERVAL_DAYS,
): Record<Grade, number> {
  const f = scheduler(desiredRetention, maxInterval);
  const preview = f.repeat(row ? toCard(row) : newCard(now), now);
  const out = {} as Record<Grade, number>;
  for (const g of GRADES) {
    const card = capInterval(preview[g].card, now, maxInterval);
    out[g] = Math.max(1, Math.round((card.due.getTime() - now.getTime()) / 86_400_000));
  }
  return out;
}

/** Applies a grade to a card (or to a brand-new card when `row` is null). */
export function schedule(row: CardColumns | null, now: Date, grade: Grade, desiredRetention = 0.9, maxInterval = MAX_INTERVAL_DAYS) {
  const f = scheduler(desiredRetention, maxInterval);
  const { card, log } = f.next(row ? toCard(row) : newCard(now), now, grade);
  return { card: fromCard(capInterval(card, now, maxInterval)), log: fromLog(log) };
}

/**
 * ts-fsrs keeps Easy > Good > Hard by bumping each a day past the one below *after* applying
 * `maximum_interval`, so a short cap can be overshot by a day or two. Clamp so the cap is a promise.
 */
function capInterval(card: Card, now: Date, maxInterval: number): Card {
  const cap = Math.max(1, Math.round(maxInterval));
  if (card.scheduled_days <= cap) return card;
  return { ...card, scheduled_days: cap, due: new Date(now.getTime() + cap * 86_400_000) };
}
