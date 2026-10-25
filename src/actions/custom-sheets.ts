"use server";

import { refresh } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { customReviewLogs, customSheetItems, customSheets, difficultyEnum, problems, type User } from "@/db/schema";
import { retrievability, schedule, type CardColumns, type Grade } from "@/lib/srs/fsrs";
import { suggestGrade } from "@/lib/srs/grade";
import { isLongestGap, isRecallTarget } from "@/lib/srs/pace";
import { extractLinks, parseProblemLink } from "@/lib/links/problem-link";
import { dayKey } from "@/lib/time";
import { bumpActivity } from "@/server/activity";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";

const MAX_SHEETS = 50;
const MAX_LINKS_PER_PASTE = 30;

const idSchema = z.number().int().positive();
const gradeSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const sheetSchema = z.object({
  name: z.string().trim().min(1, "Give the sheet a name").max(60, "Keep the name under 60 characters"),
  description: z.string().trim().max(200, "Keep the description under 200 characters").optional(),
  desiredRetention: z.number().refine(isRecallTarget, "Pick a recall target"),
  maxInterval: z.number().int().refine(isLongestGap, "Pick a longest gap"),
});

export type CustomSheetInput = z.input<typeof sheetSchema>;

async function ownedSheet(user: User, id: number) {
  if (!idSchema.safeParse(id).success) return null;
  const [sheet] = await db
    .select()
    .from(customSheets)
    .where(and(eq(customSheets.id, id), eq(customSheets.userId, user.id)));
  return sheet ?? null;
}

export async function createCustomSheet(input: CustomSheetInput) {
  const user = await requireUser();
  const parsed = sheetSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const existing = await db.select({ id: customSheets.id }).from(customSheets).where(eq(customSheets.userId, user.id));
  if (existing.length >= MAX_SHEETS) return { ok: false as const, error: `You can keep up to ${MAX_SHEETS} sheets` };
  const [row] = await db
    .insert(customSheets)
    .values({ userId: user.id, ...parsed.data, description: parsed.data.description || null })
    .returning({ id: customSheets.id });
  refresh();
  return { ok: true as const, id: row.id };
}

/** A new pace applies from each item's next review; existing due dates stay put. */
export async function updateCustomSheet(id: number, input: CustomSheetInput) {
  const user = await requireUser();
  const parsed = sheetSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  if (!(await ownedSheet(user, id))) return { ok: false as const, error: "Sheet not found" };
  await db
    .update(customSheets)
    .set({ ...parsed.data, description: parsed.data.description || null })
    .where(and(eq(customSheets.id, id), eq(customSheets.userId, user.id)));
  refresh();
  return { ok: true as const };
}

/** Deletes the sheet with its items and their review history. The UI asks for confirmation first. */
export async function deleteCustomSheet(id: number) {
  const user = await requireUser();
  if (!(await ownedSheet(user, id))) return { ok: false as const, error: "Sheet not found" };
  await db.delete(customSheets).where(and(eq(customSheets.id, id), eq(customSheets.userId, user.id)));
  refresh();
  return { ok: true as const };
}

const addSchema = z.object({
  sheetId: idSchema,
  text: z.string().max(20_000),
  grade: gradeSchema,
  /** null: take it from the catalog when the link is known there, else Medium. */
  difficulty: z.enum(difficultyEnum.enumValues).nullable(),
  insight: z.string().trim().max(280).optional(),
});

export type AddLinksInput = z.input<typeof addSchema>;
export type AddLinksResult =
  | { ok: true; added: number; reviewed: number; skipped: number; invalid: number; firstTitle: string | null; days: number | null }
  | { ok: false; error: string };

/**
 * Logs pasted links as solved today. A new link becomes an item with its own memory card, rated by how
 * the solve went. A link already in the sheet counts as a re-solve (a review), unless it was already
 * logged today.
 */
export async function addCustomItems(input: AddLinksInput): Promise<AddLinksResult> {
  const user = await requireUser();
  const now = await getNow();
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const v = parsed.data;
  const sheet = await ownedSheet(user, v.sheetId);
  if (!sheet) return { ok: false, error: "Sheet not found" };

  const raw = extractLinks(v.text);
  if (raw.length === 0) return { ok: false, error: "Paste a link to a problem you solved" };
  if (raw.length > MAX_LINKS_PER_PASTE) return { ok: false, error: `Paste up to ${MAX_LINKS_PER_PASTE} links at a time` };
  const links = new Map<string, NonNullable<ReturnType<typeof parseProblemLink>>>();
  for (const r of raw) {
    const link = parseProblemLink(r);
    if (link && !links.has(link.url)) links.set(link.url, link);
  }
  const invalid = raw.filter((r) => !parseProblemLink(r)).length;
  if (links.size === 0) return { ok: false, error: "None of those look like problem links" };

  const urls = [...links.keys()];
  const slugs = [...new Set([...links.values()].map((l) => l.catalogSlug).filter((s): s is string => s !== null))];
  const [catalog, existing] = await Promise.all([
    slugs.length
      ? db.select({ id: problems.id, slug: problems.slug, title: problems.title, difficulty: problems.difficulty }).from(problems).where(inArray(problems.slug, slugs))
      : Promise.resolve([]),
    db
      .select()
      .from(customSheetItems)
      .where(and(eq(customSheetItems.sheetId, sheet.id), eq(customSheetItems.userId, user.id), inArray(customSheetItems.url, urls))),
  ]);
  const catalogBySlug = new Map(catalog.map((c) => [c.slug, c]));
  const existingByUrl = new Map(existing.map((e) => [e.url, e]));
  const today = dayKey(now, user.timezone);
  const single = links.size === 1 ? v.insight || null : null;

  let added = 0;
  let reviewed = 0;
  let skipped = 0;
  let firstTitle: string | null = null;
  let days: number | null = null;

  const fresh = urls.filter((u) => !existingByUrl.has(u));
  if (fresh.length) {
    const scheduled = fresh.map((url) => {
      const link = links.get(url)!;
      const known = link.catalogSlug ? catalogBySlug.get(link.catalogSlug) : undefined;
      const { card, log } = schedule(null, now, v.grade as Grade, sheet.desiredRetention, sheet.maxInterval);
      return {
        values: {
          sheetId: sheet.id,
          userId: user.id,
          url,
          title: known?.title ?? link.title,
          level: v.difficulty ?? known?.difficulty ?? "MEDIUM",
          problemId: known?.id ?? null,
          solvedAt: now,
          insight: single,
          ...card,
          updatedAt: now,
        },
        log,
      };
    });
    const inserted = await db
      .insert(customSheetItems)
      .values(scheduled.map((s) => s.values))
      .onConflictDoNothing()
      .returning({ id: customSheetItems.id, url: customSheetItems.url });
    const logByUrl = new Map(scheduled.map((s) => [s.values.url, s.log]));
    if (inserted.length) {
      await db
        .insert(customReviewLogs)
        .values(inserted.map((i) => ({ itemId: i.id, userId: user.id, ...logByUrl.get(i.url)!, source: "first_solve" as const })));
    }
    added = inserted.length;
    skipped += fresh.length - inserted.length;
    const first = scheduled.find((s) => inserted.some((i) => i.url === s.values.url));
    if (first) {
      firstTitle = first.values.title;
      days = first.values.scheduledDays;
    }
  }

  for (const item of existing) {
    const loggedToday = item.lastReview !== null && dayKey(item.lastReview, user.timezone) === today;
    if (loggedToday) {
      skipped += 1;
      continue;
    }
    const r = retrievability(item, now, sheet.desiredRetention);
    const { card, log } = schedule(item as CardColumns, now, v.grade as Grade, sheet.desiredRetention, sheet.maxInterval);
    await db
      .update(customSheetItems)
      .set({ ...card, updatedAt: now, ...(single ? { insight: single } : {}) })
      .where(and(eq(customSheetItems.id, item.id), eq(customSheetItems.userId, user.id)));
    await db.insert(customReviewLogs).values({ itemId: item.id, userId: user.id, ...log, source: "review", retrievability: r });
    reviewed += 1;
    if (firstTitle === null) {
      firstTitle = item.title;
      days = card.scheduledDays;
    }
  }

  if (added || reviewed) await bumpActivity(user, now, { solves: added, reviews: reviewed });
  refresh();
  return { ok: true, added, reviewed, skipped, invalid, firstTitle, days };
}

const itemSchema = z.object({
  title: z.string().trim().min(1, "Give it a title").max(200, "Keep the title under 200 characters"),
  difficulty: z.enum(difficultyEnum.enumValues),
  insight: z.string().trim().max(280, "Insight must be 280 characters or fewer"),
});

export async function updateCustomItem(itemId: number, input: z.input<typeof itemSchema>) {
  const user = await requireUser();
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(itemId).success) {
    return { ok: false as const, error: parsed.error?.issues[0].message ?? "Invalid input" };
  }
  const { title, difficulty, insight } = parsed.data;
  const updated = await db
    .update(customSheetItems)
    .set({ title, level: difficulty, insight: insight || null, updatedAt: new Date() })
    .where(and(eq(customSheetItems.id, itemId), eq(customSheetItems.userId, user.id)))
    .returning({ id: customSheetItems.id });
  if (!updated.length) return { ok: false as const, error: "Problem not found" };
  refresh();
  return { ok: true as const };
}

export async function removeCustomItem(itemId: number) {
  const user = await requireUser();
  if (!idSchema.safeParse(itemId).success) return { ok: false as const };
  await db.delete(customSheetItems).where(and(eq(customSheetItems.id, itemId), eq(customSheetItems.userId, user.id)));
  refresh();
  return { ok: true as const };
}

const reviewSchema = z.object({
  grade: gradeSchema,
  solved: z.boolean(),
  viewedSolution: z.boolean(),
  hintUsed: z.boolean(),
  wrongSubmissions: z.number().int().min(0).max(50),
  seconds: z.number().int().min(0).max(6 * 3600).nullable(),
  insight: z.string().trim().max(280).optional(),
});

export type CustomReviewInput = z.input<typeof reviewSchema>;

/** Records a re-solve of a custom sheet item and reschedules it on the sheet's own pace. */
export async function submitCustomReview(itemId: number, input: CustomReviewInput) {
  const user = await requireUser();
  const now = await getNow();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(itemId).success) return { ok: false as const, error: "Invalid review" };
  const v = parsed.data;

  const [row] = await db
    .select({ item: customSheetItems, sheet: customSheets })
    .from(customSheetItems)
    .innerJoin(customSheets, eq(customSheets.id, customSheetItems.sheetId))
    .where(and(eq(customSheetItems.id, itemId), eq(customSheetItems.userId, user.id)));
  if (!row) return { ok: false as const, error: "This problem is not in the sheet anymore" };
  const { item, sheet } = row;

  const r = retrievability(item, now, sheet.desiredRetention);
  const suggestion = suggestGrade({
    difficulty: item.level,
    solved: v.solved,
    viewedSolution: v.viewedSolution,
    hintUsed: v.hintUsed,
    wrongSubmissions: v.wrongSubmissions,
    minutes: v.seconds === null ? null : v.seconds / 60,
    patternRecalled: null,
  });

  const { card, log } = schedule(item as CardColumns, now, v.grade as Grade, sheet.desiredRetention, sheet.maxInterval);
  await db
    .update(customSheetItems)
    .set({ ...card, updatedAt: now, ...(v.insight ? { insight: v.insight } : {}) })
    .where(and(eq(customSheetItems.id, itemId), eq(customSheetItems.userId, user.id)));
  await db.insert(customReviewLogs).values({
    itemId,
    userId: user.id,
    ...log,
    source: "review",
    retrievability: r,
    suggestedRating: suggestion.grade,
    timeTakenSec: v.seconds,
    hintUsed: v.hintUsed,
    viewedSolution: v.viewedSolution,
    wrongSubmissions: v.wrongSubmissions,
  });
  await bumpActivity(user, now, { reviews: 1, seconds: v.seconds ?? 0 });
  refresh();
  return { ok: true as const, due: card.due.toISOString(), days: card.scheduledDays, retrievabilityBefore: r };
}
