"use server";

import { refresh } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { problems, reviewLogs, userProblems } from "@/db/schema";
import { Rating, schedule, type Grade } from "@/lib/srs/fsrs";
import { bumpActivity } from "@/server/activity";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";

const gradeSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

export type MarkSolvedResult = { ok: true; due: string; days: number } | { ok: false; error: string };

/**
 * First solve: creates the problem's memory card. The first solve is itself a review: how it went
 * sets the initial stability (Good by default, adjustable right after via `rateFirstSolve`).
 */
export async function markSolved(problemId: number, grade: Grade = Rating.Good): Promise<MarkSolvedResult> {
  const user = await requireUser();
  const now = await getNow();
  const parsed = z.object({ problemId: z.number().int().positive(), grade: gradeSchema }).safeParse({ problemId, grade });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const [problem] = await db.select({ id: problems.id }).from(problems).where(eq(problems.id, problemId));
  if (!problem) return { ok: false, error: "Problem not found" };

  const [existing] = await db
    .select({ due: userProblems.due })
    .from(userProblems)
    .where(and(eq(userProblems.userId, user.id), eq(userProblems.problemId, problemId)));
  if (existing) {
    return { ok: true, due: existing.due.toISOString(), days: Math.round((existing.due.getTime() - now.getTime()) / 86_400_000) };
  }

  const { card, log } = schedule(null, now, parsed.data.grade, user.desiredRetention);
  await db
    .insert(userProblems)
    .values({ userId: user.id, problemId, solvedAt: now, ...card, updatedAt: now })
    .onConflictDoNothing();
  await db.insert(reviewLogs).values({ userId: user.id, problemId, ...log, source: "first_solve" });
  await bumpActivity(user, now, { solves: 1 });
  refresh();
  return { ok: true, due: card.due.toISOString(), days: card.scheduledDays };
}

/** Re-rates a first solve made moments ago ("it was actually a struggle"). Only before any review. */
export async function rateFirstSolve(problemId: number, grade: Grade): Promise<MarkSolvedResult> {
  const user = await requireUser();
  const parsed = gradeSchema.safeParse(grade);
  if (!parsed.success) return { ok: false, error: "Invalid grade" };

  const [card] = await db
    .select()
    .from(userProblems)
    .where(and(eq(userProblems.userId, user.id), eq(userProblems.problemId, problemId)));
  if (!card) return { ok: false, error: "Not solved yet" };
  if (card.reps > 1) return { ok: false, error: "Already reviewed; rate it in the next review instead" };

  const { card: next, log } = schedule(null, card.solvedAt, parsed.data, user.desiredRetention);
  await db
    .update(userProblems)
    .set({ ...next, updatedAt: new Date() })
    .where(and(eq(userProblems.userId, user.id), eq(userProblems.problemId, problemId)));
  const [first] = await db
    .select({ id: reviewLogs.id })
    .from(reviewLogs)
    .where(and(eq(reviewLogs.userId, user.id), eq(reviewLogs.problemId, problemId), eq(reviewLogs.source, "first_solve")))
    .orderBy(desc(reviewLogs.review))
    .limit(1);
  if (first) await db.update(reviewLogs).set(log).where(eq(reviewLogs.id, first.id));
  refresh();
  return { ok: true, due: next.due.toISOString(), days: next.scheduledDays };
}

/** Removes the problem's memory card and its history. The UI asks for confirmation first. */
export async function unmarkSolved(problemId: number) {
  const user = await requireUser();
  await db.delete(reviewLogs).where(and(eq(reviewLogs.userId, user.id), eq(reviewLogs.problemId, problemId)));
  await db.delete(userProblems).where(and(eq(userProblems.userId, user.id), eq(userProblems.problemId, problemId)));
  refresh();
  return { ok: true as const };
}

const noteSchema = z.object({
  problemId: z.number().int().positive(),
  insight: z.string().trim().max(280).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export async function saveNotes(input: z.input<typeof noteSchema>) {
  const user = await requireUser();
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Insight must be 280 characters or fewer" };
  const { problemId, insight, notes } = parsed.data;
  const set: Partial<typeof userProblems.$inferInsert> = { updatedAt: new Date() };
  if (insight !== undefined) set.insight = insight || null;
  if (notes !== undefined) set.notes = notes || null;
  const updated = await db
    .update(userProblems)
    .set(set)
    .where(and(eq(userProblems.userId, user.id), eq(userProblems.problemId, problemId)))
    .returning({ problemId: userProblems.problemId });
  if (!updated.length) return { ok: false as const, error: "Mark the problem solved before adding notes" };
  refresh();
  return { ok: true as const };
}

export async function toggleStar(problemId: number, starred: boolean) {
  const user = await requireUser();
  await db
    .update(userProblems)
    .set({ starred })
    .where(and(eq(userProblems.userId, user.id), eq(userProblems.problemId, problemId)));
  refresh();
  return { ok: true as const };
}
