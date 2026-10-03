import { diffDayKeys } from "./time";

export type StreakState = {
  current: number;
  best: number;
  freezes: number;
  lastActiveOn: string | null;
};

const MAX_FREEZES = 2;

/**
 * Records activity on `today` (a local day key). A streak survives one missed day per banked
 * freeze; a freeze is earned every 7 consecutive days. Missing reviews never resets memory, only
 * the streak counter.
 */
export function recordActivity(s: StreakState, today: string): StreakState {
  if (s.lastActiveOn === today) return s;
  let { current, freezes } = s;
  const gap = s.lastActiveOn ? diffDayKeys(s.lastActiveOn, today) : Infinity;

  if (gap === 1) {
    current += 1;
  } else if (gap > 1 && gap - 1 <= freezes) {
    freezes -= gap - 1;
    current += 1;
  } else {
    current = 1;
  }
  if (current > 0 && current % 7 === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
  return { current, best: Math.max(s.best, current), freezes, lastActiveOn: today };
}

/** The streak as it should be displayed today (0 if it has already lapsed beyond the freezes). */
export function currentStreak(s: StreakState, today: string): number {
  if (!s.lastActiveOn) return 0;
  const gap = diffDayKeys(s.lastActiveOn, today);
  if (gap <= 1) return s.current;
  return gap - 1 <= s.freezes ? s.current : 0;
}
