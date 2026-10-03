"use server";

import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { drillLogs, problems, reviewLogs, userPatterns, userProblems } from "@/db/schema";
import { Rating, retrievability, schedule, type CardColumns, type Grade } from "@/lib/srs/fsrs";
import { drillGrade, suggestGrade } from "@/lib/srs/grade";
import { bumpActivity } from "@/server/activity";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";

const reviewSchema = z.object({
  problemId: z.number().int().positive(),
  grade: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  solved: z.boolean(),
  viewedSolution: z.boolean(),
  hintUsed: z.boolean(),
  wrongSubmissions: z.number().int().min(0).max(50),
  seconds: z.number().int().min(0).max(6 * 3600).nullable(),
  patternGuessId: z.number().int().positive().nullable(),
  insight: z.string().trim().max(280).optional(),
});

export type ReviewInput = z.input<typeof reviewSchema>;

/** Records a re-solve, reschedules the problem and trains the pattern-recognition memory. */
export async function submitReview(input: ReviewInput) {
  const user = await requireUser();
  const now = await getNow();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid review" };
  const v = parsed.data;

  const [card] = await db
    .select()
    .from(userProblems)
    .where(and(eq(userProblems.userId, user.id), eq(userProblems.problemId, v.problemId)));
  if (!card) return { ok: false as const, error: "This problem is not in your memory yet" };
  const [problem] = await db.select().from(problems).where(eq(problems.id, v.problemId));

  const r = retrievability(card, now, user.desiredRetention);
  const patternCorrect = v.patternGuessId === null || problem.patternId === null ? null : v.patternGuessId === problem.patternId;
  const suggestion = suggestGrade({
    difficulty: problem.difficulty,
    solved: v.solved,
    viewedSolution: v.viewedSolution,
    hintUsed: v.hintUsed,
    wrongSubmissions: v.wrongSubmissions,
    minutes: v.seconds === null ? null : v.seconds / 60,
    patternRecalled: patternCorrect === null ? null : patternCorrect ? "instant" : "no",
  });

  const { card: next, log } = schedule(card, now, v.grade as Grade, user.desiredRetention);
  await db
    .update(userProblems)
    .set({ ...next, updatedAt: now, ...(v.insight ? { insight: v.insight } : {}) })
    .where(and(eq(userProblems.userId, user.id), eq(userProblems.problemId, v.problemId)));
  await db.insert(reviewLogs).values({
    userId: user.id,
    problemId: v.problemId,
    ...log,
    source: "review",
    retrievability: r,
    suggestedRating: suggestion.grade,
    timeTakenSec: v.seconds,
    hintUsed: v.hintUsed,
    viewedSolution: v.viewedSolution,
    wrongSubmissions: v.wrongSubmissions,
    patternCorrect,
  });

  if (patternCorrect !== null && problem.patternId !== null) {
    await trainPattern(user.id, problem.patternId, patternCorrect ? Rating.Good : Rating.Again, now, user.desiredRetention);
  }
  await bumpActivity(user, now, { reviews: 1, seconds: v.seconds ?? 0 });
  refresh();
  return { ok: true as const, due: next.due.toISOString(), days: next.scheduledDays, retrievabilityBefore: r };
}

const drillSchema = z.object({
  problemId: z.number().int().positive(),
  chosenPatternId: z.number().int().positive().nullable(),
  responseMs: z.number().int().min(0).max(10 * 60_000),
});

/** Records a pattern-recognition drill answer. The client already knows if it was right. */
export async function submitDrill(input: z.input<typeof drillSchema>) {
  const user = await requireUser();
  const now = await getNow();
  const parsed = drillSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid drill" };
  const { problemId, chosenPatternId, responseMs } = parsed.data;

  const [problem] = await db
    .select({ patternId: problems.patternId, curated: problems.patternCurated })
    .from(problems)
    .where(eq(problems.id, problemId));
  if (!problem?.patternId || !problem.curated) return { ok: false as const, error: "Not a drillable problem" };

  const correct = chosenPatternId === problem.patternId;
  const grade = drillGrade(correct, responseMs);
  await trainPattern(user.id, problem.patternId, grade, now, user.desiredRetention);
  await db.insert(drillLogs).values({
    userId: user.id,
    problemId,
    patternId: problem.patternId,
    chosenPatternId,
    correct,
    rating: grade,
    responseMs,
    createdAt: now,
  });
  await bumpActivity(user, now, { drills: 1, seconds: Math.round(responseMs / 1000) });
  return { ok: true as const, correct, patternId: problem.patternId };
}

async function trainPattern(userId: string, patternId: number, grade: Grade, now: Date, retention: number) {
  const [existing] = await db
    .select()
    .from(userPatterns)
    .where(and(eq(userPatterns.userId, userId), eq(userPatterns.patternId, patternId)));
  const { card } = schedule(existing ? (existing as CardColumns) : null, now, grade, retention);
  await db
    .insert(userPatterns)
    .values({ userId, patternId, ...card })
    .onConflictDoUpdate({ target: [userPatterns.userId, userPatterns.patternId], set: card });
}
