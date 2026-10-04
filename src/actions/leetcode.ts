"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { leetcodeSubmissions, users } from "@/db/schema";
import { profileSummary, recentAccepted } from "@/lib/leetcode/client";
import { requireUser } from "@/server/auth";

const usernameSchema = z
  .string()
  .trim()
  .min(1, "Enter your profile username")
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/, "Usernames contain only letters, numbers, - and _");

/** Step 1: store the username and issue a token to paste into the public profile summary. */
export async function startLeetCodeLink(username: string) {
  const user = await requireUser();
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const token = `recode-${randomBytes(4).toString("hex")}`;
  await db
    .update(users)
    .set({ leetcodeUsername: parsed.data, leetcodeVerified: false, leetcodeVerifyToken: token })
    .where(eq(users.id, user.id));
  refresh();
  return { ok: true as const, token };
}

/** Step 2: confirm the token is in the public profile summary. */
export async function verifyLeetCodeLink() {
  const user = await requireUser();
  if (!user.leetcodeUsername || !user.leetcodeVerifyToken) return { ok: false as const, error: "Start linking first" };
  const profile = await profileSummary(user.leetcodeUsername);
  if (profile === null) return { ok: false as const, error: "The problem site did not respond. Try again in a minute." };
  if (!profile.exists) return { ok: false as const, error: `No LeetCode user named ${user.leetcodeUsername}` };
  if (!profile.aboutMe.includes(user.leetcodeVerifyToken)) {
    return { ok: false as const, error: "Token not found in your profile summary yet. Save it on your profile, then retry." };
  }
  await db.update(users).set({ leetcodeVerified: true }).where(eq(users.id, user.id));
  refresh();
  return { ok: true as const };
}

export async function unlinkLeetCode() {
  const user = await requireUser();
  await db
    .update(users)
    .set({ leetcodeUsername: null, leetcodeVerified: false, leetcodeVerifyToken: null, leetcodeSyncedAt: null })
    .where(eq(users.id, user.id));
  await db.delete(leetcodeSubmissions).where(eq(leetcodeSubmissions.userId, user.id));
  refresh();
  return { ok: true as const };
}

const SYNC_COOLDOWN_MS = 10 * 60_000;

/**
 * Pulls recent accepted submissions. Results only become suggestions in the Today view;
 * nothing is marked solved without the user confirming. Rate limited to once per 10 minutes.
 */
export async function syncLeetCode(force = false) {
  const user = await requireUser();
  if (!user.leetcodeUsername || !user.leetcodeVerified) return { ok: false as const, error: "Link LeetCode first" };
  if (!force && user.leetcodeSyncedAt && Date.now() - user.leetcodeSyncedAt.getTime() < SYNC_COOLDOWN_MS) {
    return { ok: true as const, added: 0, skipped: true };
  }
  const subs = await recentAccepted(user.leetcodeUsername);
  if (subs === null) return { ok: false as const, error: "The problem site is not responding right now" };
  let added = 0;
  for (const s of subs) {
    const res = await db
      .insert(leetcodeSubmissions)
      .values({
        userId: user.id,
        submissionId: s.id,
        titleSlug: s.titleSlug,
        title: s.title,
        submittedAt: new Date(s.timestamp * 1000),
      })
      .onConflictDoNothing()
      .returning({ id: leetcodeSubmissions.submissionId });
    added += res.length;
  }
  await db.update(users).set({ leetcodeSyncedAt: new Date() }).where(eq(users.id, user.id));
  refresh();
  return { ok: true as const, added, skipped: false };
}

export async function dismissSubmission(titleSlug: string) {
  const user = await requireUser();
  await db
    .update(leetcodeSubmissions)
    .set({ dismissed: true })
    .where(and(eq(leetcodeSubmissions.userId, user.id), eq(leetcodeSubmissions.titleSlug, titleSlug)));
  refresh();
  return { ok: true as const };
}
