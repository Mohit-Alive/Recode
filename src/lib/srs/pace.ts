/**
 * Revision pace for custom sheets. Two knobs feed the sheet's own FSRS scheduler:
 * the recall target (higher means reviews come sooner) and the longest gap between reviews.
 */
export const RECALL_TARGETS = [
  { value: 0.8, label: "80%", hint: "Fewest reviews" },
  { value: 0.85, label: "85%", hint: "Lighter" },
  { value: 0.9, label: "90%", hint: "Balanced" },
  { value: 0.95, label: "95%", hint: "Interview soon" },
] as const;

export const LONGEST_GAPS = [
  { days: 14, label: "2 weeks" },
  { days: 30, label: "1 month" },
  { days: 90, label: "3 months" },
  { days: 365, label: "1 year" },
] as const;

export const DEFAULT_PACE = { desiredRetention: 0.9, maxInterval: 90 } as const;

export function isRecallTarget(v: number) {
  return RECALL_TARGETS.some((t) => Math.abs(t.value - v) < 1e-6);
}

export function isLongestGap(v: number) {
  return LONGEST_GAPS.some((g) => g.days === v);
}

export function gapLabel(days: number) {
  return LONGEST_GAPS.find((g) => g.days === days)?.label ?? `${days} days`;
}
