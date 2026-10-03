import { Rating, type Grade } from "ts-fsrs";
import type { Difficulty } from "@/db/schema";

/** Target re-solve time per difficulty, in minutes. "Good" means solved unaided within this. */
export const TARGET_MINUTES: Record<Difficulty, number> = { EASY: 15, MEDIUM: 25, HARD: 40 };

/** Planning estimates for the daily budget. A review is usually faster than a first solve. */
export const REVIEW_ESTIMATE_MINUTES: Record<Difficulty, number> = { EASY: 10, MEDIUM: 18, HARD: 30 };
export const NEW_ESTIMATE_MINUTES: Record<Difficulty, number> = { EASY: 15, MEDIUM: 25, HARD: 40 };

export type ReviewSignals = {
  difficulty: Difficulty;
  solved: boolean;
  viewedSolution: boolean;
  hintUsed: boolean;
  wrongSubmissions: number;
  /** Wall-clock minutes spent, if the timer ran. */
  minutes: number | null;
  /** Did the user name the right pattern before solving? null when not asked. */
  patternRecalled: "instant" | "slow" | "no" | null;
};

export type GradeSuggestion = {
  grade: Grade;
  /** Highest grade the signals allow; the user may pick lower but not higher without overriding. */
  cap: Grade;
  reasons: string[];
};

/**
 * Turns objective signals from a re-solve into an FSRS grade.
 *
 * - Again: could not solve it, or needed the solution.
 * - Hard:  solved, but with a hint, more than 1.5x the target time, or 3+ wrong submissions.
 * - Good:  solved unaided within the target time.
 * - Easy:  under half the target time, clean first submission, pattern recognised instantly.
 *
 * Signals also *cap* the grade (a hint can never be Easy), following the observation that
 * self-rating alone drifts optimistic.
 */
export function suggestGrade(s: ReviewSignals): GradeSuggestion {
  const reasons: string[] = [];
  if (!s.solved || s.viewedSolution) {
    reasons.push(s.viewedSolution ? "Looked at the solution" : "Did not reach an accepted solution");
    return { grade: Rating.Again, cap: Rating.Again, reasons };
  }

  const target = TARGET_MINUTES[s.difficulty];
  let cap: Grade = Rating.Easy;
  let grade: Grade = Rating.Good;

  if (s.hintUsed) {
    cap = Rating.Hard;
    reasons.push("Used a hint");
  }
  if (s.wrongSubmissions >= 3) {
    cap = Rating.Hard;
    reasons.push(`${s.wrongSubmissions} wrong submissions`);
  }
  if (s.minutes !== null && s.minutes > target * 1.5) {
    grade = Rating.Hard;
    reasons.push(`Took ${Math.round(s.minutes)} min against a ${target} min target`);
  }
  if (s.patternRecalled === "no") {
    cap = Math.min(cap, Rating.Hard) as Grade;
    reasons.push("Did not recognise the pattern up front");
  }

  const fast = s.minutes !== null && s.minutes <= target * 0.5;
  if (fast && s.wrongSubmissions === 0 && s.patternRecalled === "instant" && grade === Rating.Good) {
    grade = Rating.Easy;
    reasons.push("Fast, clean and pattern spotted instantly");
  }

  grade = Math.min(grade, cap) as Grade;
  if (reasons.length === 0) reasons.push(`Solved unaided within the ${target} min target`);
  return { grade, cap, reasons };
}

/** Pattern drills: correct and quick is Good, correct but slow is Hard, wrong is Again. */
export function drillGrade(correct: boolean, responseMs: number): Grade {
  if (!correct) return Rating.Again;
  return responseMs <= 12_000 ? Rating.Good : Rating.Hard;
}
