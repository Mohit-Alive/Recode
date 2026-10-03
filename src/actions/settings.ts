"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { dailyActivity, drillLogs, reviewLogs, sheets, userPatterns, userProblems, users } from "@/db/schema";
import { isValidTimeZone } from "@/lib/time";
import { requireUser } from "@/server/auth";
import { TIME_OFFSET_COOKIE } from "@/server/clock";

const settingsSchema = z.object({
  desiredRetention: z.number().min(0.8).max(0.97),
  dailyMinutes: z.number().int().min(10).max(240),
  newPerDay: z.number().int().min(0).max(10),
  activeSheetSlug: z.string().min(1),
  timezone: z.string().refine(isValidTimeZone, "Unknown time zone"),
  emailReminders: z.boolean(),
  reminderHour: z.number().int().min(0).max(23),
});

export type SettingsInput = z.input<typeof settingsSchema>;

export async function updateSettings(input: SettingsInput) {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const [sheet] = await db.select({ id: sheets.id }).from(sheets).where(eq(sheets.slug, parsed.data.activeSheetSlug));
  if (!sheet) return { ok: false as const, error: "Unknown sheet" };
  await db
    .update(users)
    .set({ ...parsed.data, timezoneLocked: parsed.data.timezone !== user.timezone ? true : user.timezoneLocked })
    .where(eq(users.id, user.id));
  refresh();
  return { ok: true as const };
}

export async function setActiveSheet(slug: string) {
  const user = await requireUser();
  const [sheet] = await db.select({ id: sheets.id }).from(sheets).where(eq(sheets.slug, slug));
  if (!sheet) return { ok: false as const };
  await db.update(users).set({ activeSheetSlug: slug }).where(eq(users.id, user.id));
  refresh();
  return { ok: true as const };
}

/** Called once from the browser so "today" matches the user's wall clock. */
export async function syncTimezone(timezone: string) {
  const user = await requireUser();
  if (user.timezoneLocked || user.timezone === timezone || !isValidTimeZone(timezone)) return { ok: true as const };
  await db.update(users).set({ timezone }).where(eq(users.id, user.id));
  refresh();
  return { ok: true as const };
}

export async function resetAllProgress() {
  const user = await requireUser();
  await db.delete(reviewLogs).where(eq(reviewLogs.userId, user.id));
  await db.delete(drillLogs).where(eq(drillLogs.userId, user.id));
  await db.delete(userProblems).where(eq(userProblems.userId, user.id));
  await db.delete(userPatterns).where(eq(userPatterns.userId, user.id));
  await db.delete(dailyActivity).where(eq(dailyActivity.userId, user.id));
  await db
    .update(users)
    .set({ streakCurrent: 0, streakBest: 0, streakFreezes: 0, lastActiveOn: null })
    .where(eq(users.id, user.id));
  refresh();
  return { ok: true as const };
}

/** Development only: shift the app clock by whole days to make reviews come due. */
export async function setTimeOffset(days: number) {
  if (process.env.NODE_ENV === "production") return { ok: false as const };
  await requireUser();
  const jar = await cookies();
  if (!days) jar.delete(TIME_OFFSET_COOKIE);
  else jar.set(TIME_OFFSET_COOKIE, String(Math.round(days)), { path: "/", sameSite: "lax" });
  refresh();
  return { ok: true as const };
}
