import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyActivity, users, type User } from "@/db/schema";
import { recordActivity } from "@/lib/streak";
import { dayKey } from "@/lib/time";

type Delta = { solves?: number; reviews?: number; drills?: number; seconds?: number };

/** Adds to today's activity row and advances the streak. */
export async function bumpActivity(user: User, now: Date, delta: Delta) {
  const day = dayKey(now, user.timezone);
  const v = { solves: delta.solves ?? 0, reviews: delta.reviews ?? 0, drills: delta.drills ?? 0, seconds: delta.seconds ?? 0 };
  await db
    .insert(dailyActivity)
    .values({ userId: user.id, day, ...v })
    .onConflictDoUpdate({
      target: [dailyActivity.userId, dailyActivity.day],
      set: {
        solves: sql`${dailyActivity.solves} + ${v.solves}`,
        reviews: sql`${dailyActivity.reviews} + ${v.reviews}`,
        drills: sql`${dailyActivity.drills} + ${v.drills}`,
        seconds: sql`${dailyActivity.seconds} + ${v.seconds}`,
      },
    });

  const next = recordActivity(
    { current: user.streakCurrent, best: user.streakBest, freezes: user.streakFreezes, lastActiveOn: user.lastActiveOn },
    day,
  );
  if (next.lastActiveOn !== user.lastActiveOn) {
    await db
      .update(users)
      .set({ streakCurrent: next.current, streakBest: next.best, streakFreezes: next.freezes, lastActiveOn: next.lastActiveOn })
      .where(eq(users.id, user.id));
  }
}
