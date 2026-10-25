import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  companies,
  companyProblems,
  customSheetItems,
  customSheets,
  dailyActivity,
  leetcodeSubmissions,
  drillLogs,
  patterns,
  problems,
  reviewLogs,
  sheetProblems,
  sheets,
  userPatterns,
  userProblems,
  type CustomSheet,
  type Difficulty,
  type User,
} from "@/db/schema";
import { retrievability, type CardColumns } from "@/lib/srs/fsrs";
import { NEW_ESTIMATE_MINUTES, REVIEW_ESTIMATE_MINUTES } from "@/lib/srs/grade";
import { buildReviewQueue, weakestFirst } from "@/lib/srs/queue";
import { selectDrills } from "@/lib/srs/drills";
import { patternMastery, roadmapStatus } from "@/lib/srs/mastery";
import { addDaysToKey, dayKey, diffDayKeys, endOfLocalDay, startOfLocalDay } from "@/lib/time";

export const DAILY_DRILLS = 5;

/** Columns of user_problems that make up the FSRS card. */
const cardCols = {
  due: userProblems.due,
  stability: userProblems.stability,
  difficulty: userProblems.difficulty,
  elapsedDays: userProblems.elapsedDays,
  scheduledDays: userProblems.scheduledDays,
  learningSteps: userProblems.learningSteps,
  reps: userProblems.reps,
  lapses: userProblems.lapses,
  state: userProblems.state,
  lastReview: userProblems.lastReview,
};

export type ProblemRow = {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  url: string;
  patternId: number | null;
  patternName: string | null;
  solved: boolean;
  starred: boolean;
  hasInsight: boolean;
  /** Current retrievability (0..1), null when unsolved. */
  r: number | null;
  /** Local-day difference until next review; negative when overdue. null when unsolved. */
  dueInDays: number | null;
};

/** Shared select for problem rows with the viewer's card joined in. */
function problemRowQuery(userId: string) {
  return db
    .select({
      id: problems.id,
      slug: problems.slug,
      title: problems.title,
      difficulty: problems.difficulty,
      url: problems.url,
      patternId: problems.patternId,
      patternName: patterns.name,
      solvedAt: userProblems.solvedAt,
      starred: userProblems.starred,
      insight: userProblems.insight,
      card: cardCols,
    })
    .from(problems)
    .leftJoin(patterns, eq(patterns.id, problems.patternId))
    .leftJoin(userProblems, and(eq(userProblems.problemId, problems.id), eq(userProblems.userId, userId)));
}

type RawRow = Awaited<ReturnType<ReturnType<typeof problemRowQuery>["execute"]>>[number];

function toProblemRow(row: RawRow, user: User, now: Date): ProblemRow {
  const solved = row.solvedAt !== null;
  const card = solved && row.card?.due ? (row.card as CardColumns) : null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    difficulty: row.difficulty,
    url: row.url,
    patternId: row.patternId,
    patternName: row.patternName,
    solved,
    starred: row.starred ?? false,
    hasInsight: Boolean(row.insight),
    r: card ? retrievability(card, now, user.desiredRetention) : null,
    dueInDays: card ? diffDayKeys(dayKey(now, user.timezone), dayKey(card.due, user.timezone)) : null,
  };
}

/* ------------------------------------------------------------------ shell */

export async function getShellData(user: User, now: Date) {
  const [{ due }] = await db
    .select({ due: sql<number>`count(*)::int` })
    .from(userProblems)
    .where(and(eq(userProblems.userId, user.id), lte(userProblems.due, endOfLocalDay(now, user.timezone))));
  return { dueCount: due };
}

/* ------------------------------------------------------------------ sheets */

export async function getSheetIndex(user: User, now: Date) {
  const rows = await db
    .select({
      id: sheets.id,
      slug: sheets.slug,
      name: sheets.name,
      description: sheets.description,
      total: sql<number>`count(${sheetProblems.problemId})::int`,
      solved: sql<number>`count(${userProblems.problemId})::int`,
      easy: sql<number>`count(*) filter (where ${problems.difficulty} = 'EASY')::int`,
      medium: sql<number>`count(*) filter (where ${problems.difficulty} = 'MEDIUM')::int`,
      hard: sql<number>`count(*) filter (where ${problems.difficulty} = 'HARD')::int`,
    })
    .from(sheets)
    .innerJoin(sheetProblems, eq(sheetProblems.sheetId, sheets.id))
    .innerJoin(problems, eq(problems.id, sheetProblems.problemId))
    .leftJoin(userProblems, and(eq(userProblems.problemId, sheetProblems.problemId), eq(userProblems.userId, user.id)))
    .groupBy(sheets.id)
    .orderBy(asc(sheets.position));

  // Average retention of what the user has solved in each sheet.
  const cards = await db
    .select({ sheetId: sheetProblems.sheetId, ...cardCols })
    .from(userProblems)
    .innerJoin(sheetProblems, eq(sheetProblems.problemId, userProblems.problemId))
    .where(eq(userProblems.userId, user.id));
  const retention = new Map<number, { sum: number; n: number }>();
  for (const c of cards) {
    const acc = retention.get(c.sheetId) ?? { sum: 0, n: 0 };
    acc.sum += retrievability(c, now, user.desiredRetention);
    acc.n += 1;
    retention.set(c.sheetId, acc);
  }
  return rows.map((r) => {
    const acc = retention.get(r.id);
    return { ...r, retention: acc ? acc.sum / acc.n : null };
  });
}

export async function getSheet(slug: string, user: User, now: Date) {
  const [sheet] = await db.select().from(sheets).where(eq(sheets.slug, slug)).limit(1);
  if (!sheet) return null;
  const rows = await problemRowQuery(user.id)
    .innerJoin(sheetProblems, eq(sheetProblems.problemId, problems.id))
    .where(eq(sheetProblems.sheetId, sheet.id))
    .orderBy(asc(sheetProblems.position));
  const sectionOf = await db
    .select({ problemId: sheetProblems.problemId, section: sheetProblems.section })
    .from(sheetProblems)
    .where(eq(sheetProblems.sheetId, sheet.id));
  const sectionMap = new Map(sectionOf.map((s) => [s.problemId, s.section]));

  const sections: { title: string; problems: ProblemRow[] }[] = [];
  for (const row of rows) {
    const title = sectionMap.get(row.id)!;
    let section = sections.at(-1);
    if (!section || section.title !== title) {
      section = { title, problems: [] };
      sections.push(section);
    }
    section.problems.push(toProblemRow(row, user, now));
  }
  return { sheet, sections };
}

/* ------------------------------------------------------------------ custom sheets */

/** Card columns of custom_sheet_items. Their memory is separate from user_problems. */
const customCardCols = {
  due: customSheetItems.due,
  stability: customSheetItems.stability,
  difficulty: customSheetItems.difficulty,
  elapsedDays: customSheetItems.elapsedDays,
  scheduledDays: customSheetItems.scheduledDays,
  learningSteps: customSheetItems.learningSteps,
  reps: customSheetItems.reps,
  lapses: customSheetItems.lapses,
  state: customSheetItems.state,
  lastReview: customSheetItems.lastReview,
};

export type CustomItemRow = {
  id: number;
  sheetId: number;
  url: string;
  title: string;
  difficulty: Difficulty;
  insight: string | null;
  solvedAt: Date;
  /** Local day the item was first logged, for grouping ("YYYY-MM-DD"). */
  solvedOn: string;
  due: Date;
  reps: number;
  lapses: number;
  r: number;
  /** Local-day difference until the next review; negative when overdue. */
  dueInDays: number;
};

function toCustomItemRow(
  row: { id: number; sheetId: number; url: string; title: string; level: Difficulty; insight: string | null; solvedAt: Date } & CardColumns,
  sheet: CustomSheet,
  user: User,
  now: Date,
): CustomItemRow {
  const today = dayKey(now, user.timezone);
  return {
    id: row.id,
    sheetId: row.sheetId,
    url: row.url,
    title: row.title,
    difficulty: row.level,
    insight: row.insight,
    solvedAt: row.solvedAt,
    solvedOn: dayKey(row.solvedAt, user.timezone),
    due: row.due,
    reps: row.reps,
    lapses: row.lapses,
    r: retrievability(row, now, sheet.desiredRetention),
    dueInDays: diffDayKeys(today, dayKey(row.due, user.timezone)),
  };
}

const customItemSelect = {
  id: customSheetItems.id,
  sheetId: customSheetItems.sheetId,
  url: customSheetItems.url,
  title: customSheetItems.title,
  level: customSheetItems.level,
  insight: customSheetItems.insight,
  solvedAt: customSheetItems.solvedAt,
  ...customCardCols,
};

/** The viewer's own sheets with per-sheet counts, each measured against its own recall target. */
export async function getCustomSheetIndex(user: User, now: Date) {
  const list = await db
    .select()
    .from(customSheets)
    .where(eq(customSheets.userId, user.id))
    .orderBy(desc(customSheets.createdAt));
  if (list.length === 0) return [];
  const rows = await db.select(customItemSelect).from(customSheetItems).where(eq(customSheetItems.userId, user.id));
  const bySheet = new Map(list.map((s) => [s.id, s]));
  const stats = new Map<number, { total: number; due: number; sum: number; nextDueInDays: number | null }>();
  for (const row of rows) {
    const sheet = bySheet.get(row.sheetId);
    if (!sheet) continue;
    const item = toCustomItemRow(row, sheet, user, now);
    const acc = stats.get(sheet.id) ?? { total: 0, due: 0, sum: 0, nextDueInDays: null };
    acc.total += 1;
    acc.sum += item.r;
    if (item.dueInDays <= 0) acc.due += 1;
    else acc.nextDueInDays = acc.nextDueInDays === null ? item.dueInDays : Math.min(acc.nextDueInDays, item.dueInDays);
    stats.set(sheet.id, acc);
  }
  return list.map((sheet) => {
    const s = stats.get(sheet.id);
    return {
      ...sheet,
      total: s?.total ?? 0,
      due: s?.due ?? 0,
      retention: s?.total ? s.sum / s.total : null,
      nextDueInDays: s?.nextDueInDays ?? null,
    };
  });
}

/** One of the viewer's sheets, newest solves first, plus its own review queue (weakest first). */
export async function getCustomSheet(id: number, user: User, now: Date) {
  const [sheet] = await db
    .select()
    .from(customSheets)
    .where(and(eq(customSheets.id, id), eq(customSheets.userId, user.id)))
    .limit(1);
  if (!sheet) return null;
  const rows = await db
    .select(customItemSelect)
    .from(customSheetItems)
    .where(and(eq(customSheetItems.sheetId, sheet.id), eq(customSheetItems.userId, user.id)))
    .orderBy(desc(customSheetItems.solvedAt), desc(customSheetItems.id));
  const items = rows.map((r) => toCustomItemRow(r, sheet, user, now));
  const queue = weakestFirst(items.filter((i) => i.dueInDays <= 0));
  return { sheet, items, queue };
}

/** A single item with its full card and its sheet, for the review screen. */
export async function getCustomReviewItem(sheetId: number, itemId: number, user: User) {
  const [row] = await db
    .select({ item: customSheetItems, sheet: customSheets })
    .from(customSheetItems)
    .innerJoin(customSheets, eq(customSheets.id, customSheetItems.sheetId))
    .where(and(eq(customSheetItems.id, itemId), eq(customSheetItems.sheetId, sheetId), eq(customSheetItems.userId, user.id)))
    .limit(1);
  return row ?? null;
}

/* ------------------------------------------------------------------ companies */

export async function getCompanyIndex(userId: string) {
  return db
    .select({
      slug: companies.slug,
      name: companies.name,
      total: companies.problemCount,
      solved: sql<number>`count(${userProblems.problemId})::int`,
    })
    .from(companies)
    .leftJoin(companyProblems, eq(companyProblems.companyId, companies.id))
    .leftJoin(userProblems, and(eq(userProblems.problemId, companyProblems.problemId), eq(userProblems.userId, userId)))
    .groupBy(companies.id)
    .orderBy(desc(companies.problemCount), asc(companies.name));
}

export async function getCompany(slug: string, user: User, now: Date) {
  const [company] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
  if (!company) return null;
  const rows = await problemRowQuery(user.id)
    .innerJoin(companyProblems, eq(companyProblems.problemId, problems.id))
    .where(eq(companyProblems.companyId, company.id))
    .orderBy(desc(companyProblems.frequency), asc(problems.title));
  const freq = await db
    .select({ problemId: companyProblems.problemId, frequency: companyProblems.frequency })
    .from(companyProblems)
    .where(eq(companyProblems.companyId, company.id));
  const freqMap = new Map(freq.map((f) => [f.problemId, f.frequency]));
  return {
    company,
    problems: rows.map((r) => ({ ...toProblemRow(r, user, now), frequency: freqMap.get(r.id) ?? 0 })),
  };
}

/* ------------------------------------------------------------------ problem */

export async function getProblemDetail(slug: string, user: User, now: Date) {
  const [row] = await problemRowQuery(user.id).where(eq(problems.slug, slug)).limit(1);
  if (!row) return null;
  const [meta] = await db
    .select({ topics: problems.topics, acceptanceRate: problems.acceptanceRate, patternSlug: patterns.slug, cue: patterns.cue })
    .from(problems)
    .leftJoin(patterns, eq(patterns.id, problems.patternId))
    .where(eq(problems.id, row.id));
  const [card] = await db
    .select()
    .from(userProblems)
    .where(and(eq(userProblems.userId, user.id), eq(userProblems.problemId, row.id)));
  const logs = await db
    .select()
    .from(reviewLogs)
    .where(and(eq(reviewLogs.userId, user.id), eq(reviewLogs.problemId, row.id)))
    .orderBy(asc(reviewLogs.review));
  const askedBy = await db
    .select({ slug: companies.slug, name: companies.name, frequency: companyProblems.frequency })
    .from(companyProblems)
    .innerJoin(companies, eq(companies.id, companyProblems.companyId))
    .where(eq(companyProblems.problemId, row.id))
    .orderBy(desc(companyProblems.frequency), asc(companies.name));
  const inSheets = await db
    .select({ slug: sheets.slug, name: sheets.name, section: sheetProblems.section })
    .from(sheetProblems)
    .innerJoin(sheets, eq(sheets.id, sheetProblems.sheetId))
    .where(eq(sheetProblems.problemId, row.id));
  return { problem: { ...toProblemRow(row, user, now), ...meta }, card: card ?? null, logs, askedBy, inSheets };
}

/* ------------------------------------------------------------------ today */

export type TodayReview = ProblemRow & { lapses: number; reps: number };

export async function getToday(user: User, now: Date) {
  const end = endOfLocalDay(now, user.timezone);
  const start = startOfLocalDay(now, user.timezone);

  const dueRows = await problemRowQuery(user.id)
    .where(and(eq(userProblems.userId, user.id), lte(userProblems.due, end)))
    .orderBy(asc(userProblems.due));

  const due = dueRows.map((row) => {
    const base = toProblemRow(row, user, now);
    const card = row.card as CardColumns;
    return { ...base, lapses: card.lapses, reps: card.reps, due: card.due, r: base.r ?? 0, problemId: row.id };
  });

  const todayLogs = await db
    .select({ source: reviewLogs.source, difficulty: problems.difficulty })
    .from(reviewLogs)
    .innerJoin(problems, eq(problems.id, reviewLogs.problemId))
    .where(and(eq(reviewLogs.userId, user.id), gte(reviewLogs.review, start), lte(reviewLogs.review, end)));
  const reviewsDone = todayLogs.filter((l) => l.source === "review");
  const solvesDone = todayLogs.filter((l) => l.source === "first_solve");
  const spentMinutes =
    reviewsDone.reduce((s, l) => s + REVIEW_ESTIMATE_MINUTES[l.difficulty], 0) +
    solvesDone.reduce((s, l) => s + NEW_ESTIMATE_MINUTES[l.difficulty], 0);

  const queue = buildReviewQueue(due, { budgetMinutes: user.dailyMinutes, spentMinutes });

  // New problems: next unsolved in the active sheet, only while the budget has room.
  const newSlots = Math.max(0, user.newPerDay - solvesDone.length);
  let room = user.dailyMinutes - spentMinutes - queue.plannedMinutes;
  const newPicks: ProblemRow[] = [];
  if (newSlots > 0) {
    const [active] = await db.select().from(sheets).where(eq(sheets.slug, user.activeSheetSlug)).limit(1);
    if (active) {
      const candidates = await problemRowQuery(user.id)
        .innerJoin(sheetProblems, eq(sheetProblems.problemId, problems.id))
        .where(and(eq(sheetProblems.sheetId, active.id), sql`${userProblems.problemId} is null`))
        .orderBy(asc(sheetProblems.position))
        .limit(newSlots * 3);
      for (const c of candidates) {
        if (newPicks.length >= newSlots) break;
        const cost = NEW_ESTIMATE_MINUTES[c.difficulty];
        if (cost > room && newPicks.length > 0) break;
        if (cost > room && queue.items.length > 0) break;
        newPicks.push(toProblemRow(c, user, now));
        room -= cost;
      }
    }
  }

  const [{ drills }] = await db
    .select({ drills: sql<number>`count(*)::int` })
    .from(drillLogs)
    .where(and(eq(drillLogs.userId, user.id), gte(drillLogs.createdAt, start), lte(drillLogs.createdAt, end)));
  const [{ solvedTotal }] = await db
    .select({ solvedTotal: sql<number>`count(*)::int` })
    .from(userProblems)
    .where(eq(userProblems.userId, user.id));

  return {
    reviews: queue.items,
    deferred: queue.deferred,
    plannedMinutes: queue.plannedMinutes,
    spentMinutes,
    reviewsDone: reviewsDone.length,
    solvesDone: solvesDone.length,
    newPicks,
    drillsDone: drills,
    solvedTotal,
  };
}

/* ------------------------------------------------------------------ drills */

export async function getDrillSession(user: User, now: Date, count = DAILY_DRILLS) {
  const allPatterns = await db
    .select({ id: patterns.id, slug: patterns.slug, name: patterns.name, neighbors: patterns.neighbors, cue: patterns.cue })
    .from(patterns)
    .orderBy(asc(patterns.position));

  const solved = await db
    .select({ problemId: userProblems.problemId, patternId: problems.patternId })
    .from(userProblems)
    .innerJoin(problems, eq(problems.id, userProblems.problemId))
    .where(eq(userProblems.userId, user.id));
  const solvedIds = new Set(solved.map((s) => s.problemId));
  const unlocked = new Set(solved.map((s) => s.patternId).filter((x): x is number => x !== null));

  const start = startOfLocalDay(now, user.timezone);
  const drilledToday = await db
    .select({ problemId: drillLogs.problemId })
    .from(drillLogs)
    .where(and(eq(drillLogs.userId, user.id), gte(drillLogs.createdAt, start)));
  const skip = new Set(drilledToday.map((d) => d.problemId));

  const candidates = (
    await db
      .select({ problemId: problems.id, slug: problems.slug, title: problems.title, difficulty: problems.difficulty, patternId: problems.patternId })
      .from(problems)
      .where(and(eq(problems.patternCurated, true), sql`${problems.patternId} is not null`))
  )
    .filter((c) => !skip.has(c.problemId))
    .map((c) => ({ ...c, patternId: c.patternId!, solved: solvedIds.has(c.problemId) }));

  const memory = await db.select().from(userPatterns).where(eq(userPatterns.userId, user.id));
  const patternMemory = new Map(
    memory.map((m) => [m.patternId, { r: retrievability(m, now, user.desiredRetention), due: m.due }]),
  );

  const items = selectDrills({
    patterns: allPatterns,
    candidates,
    patternMemory,
    unlocked,
    now,
    count,
    seed: `${user.id}:${dayKey(now, user.timezone)}:${skip.size}`,
  });
  return { items, patterns: allPatterns, drilledToday: skip.size, unlockedCount: unlocked.size };
}

/* ------------------------------------------------------------------ patterns */

export async function getPatternOverview(user: User, now: Date) {
  const allPatterns = await db.select().from(patterns).orderBy(asc(patterns.position));
  const totals = await db
    .select({ patternId: problems.patternId, total: sql<number>`count(*)::int` })
    .from(problems)
    .where(eq(problems.patternCurated, true))
    .groupBy(problems.patternId);
  const totalMap = new Map(totals.map((t) => [t.patternId, t.total]));

  const cards = await db
    .select({ patternId: problems.patternId, diff: problems.difficulty, ...cardCols })
    .from(userProblems)
    .innerJoin(problems, eq(problems.id, userProblems.problemId))
    .where(eq(userProblems.userId, user.id));
  const mastery = patternMastery(
    cards.map((c) => ({ patternId: c.patternId, difficulty: c.diff, r: retrievability(c, now, user.desiredRetention) })),
  );
  const memory = await db.select().from(userPatterns).where(eq(userPatterns.userId, user.id));
  const recognition = new Map(memory.map((m) => [m.patternId, retrievability(m, now, user.desiredRetention)]));

  const started = new Set(allPatterns.filter((p) => (mastery.get(p.id)?.solved ?? 0) > 0).map((p) => p.slug));
  return allPatterns.map((p) => {
    const m = mastery.get(p.id);
    const total = totalMap.get(p.id) ?? 0;
    return {
      ...p,
      total,
      solved: m?.solved ?? 0,
      retention: m?.retention ?? null,
      atRisk: m?.atRisk ?? 0,
      recognition: recognition.get(p.id) ?? null,
      status: roadmapStatus(p, m, total, started),
    };
  });
}

/* ------------------------------------------------------------------ stats */

export async function getStats(user: User, now: Date) {
  const today = dayKey(now, user.timezone);
  const yearAgo = addDaysToKey(today, -364);
  const activity = await db
    .select()
    .from(dailyActivity)
    .where(and(eq(dailyActivity.userId, user.id), gte(dailyActivity.day, yearAgo)))
    .orderBy(asc(dailyActivity.day));

  const cards = await db
    .select({ problemId: userProblems.problemId, diff: problems.difficulty, patternId: problems.patternId, ...cardCols })
    .from(userProblems)
    .innerJoin(problems, eq(problems.id, userProblems.problemId))
    .where(eq(userProblems.userId, user.id));

  // 14-day forecast; anything overdue lands on today.
  const forecast = Array.from({ length: 14 }, (_, i) => ({ day: addDaysToKey(today, i), count: 0 }));
  for (const c of cards) {
    const offset = Math.max(0, diffDayKeys(today, dayKey(c.due, user.timezone)));
    if (offset < 14) forecast[offset].count += 1;
  }

  const rs = cards.map((c) => retrievability(c, now, user.desiredRetention));
  const reviewAgg = await db
    .select({
      total: sql<number>`count(*)::int`,
      passed: sql<number>`count(*) filter (where ${reviewLogs.rating} > 1)::int`,
    })
    .from(reviewLogs)
    .where(and(eq(reviewLogs.userId, user.id), eq(reviewLogs.source, "review")));

  const allPatterns = await db.select({ id: patterns.id, name: patterns.name, slug: patterns.slug }).from(patterns).orderBy(asc(patterns.position));
  const mastery = patternMastery(cards.map((c, i) => ({ patternId: c.patternId, difficulty: c.diff, r: rs[i] })));

  const byDifficulty = { EASY: 0, MEDIUM: 0, HARD: 0 } as Record<Difficulty, number>;
  for (const c of cards) byDifficulty[c.diff] += 1;

  return {
    activity,
    forecast,
    solved: cards.length,
    avgRetention: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
    atRisk: rs.filter((r) => r < 0.7).length,
    reviews: reviewAgg[0].total,
    trueRetention: reviewAgg[0].total ? reviewAgg[0].passed / reviewAgg[0].total : null,
    patterns: allPatterns.map((p) => ({ ...p, ...(mastery.get(p.id) ?? { solved: 0, retention: null, atRisk: 0 }) })),
    byDifficulty,
    totalDays: activity.length,
    totalSeconds: activity.reduce((s, a) => s + a.seconds, 0),
  };
}

/* ------------------------------------------------------------------ search */

export async function searchProblems(q: string, limit = 12) {
  const term = q.trim();
  if (!term) return [];
  const asNumber = term.replace(/[^a-z0-9 -]/gi, "");
  return db
    .select({ slug: problems.slug, title: problems.title, difficulty: problems.difficulty })
    .from(problems)
    .where(sql`${problems.title} ilike ${"%" + term + "%"} or ${problems.slug} ilike ${"%" + asNumber.replace(/\s+/g, "-") + "%"}`)
    .orderBy(desc(problems.companyCount))
    .limit(limit);
}

export async function searchCompanies(q: string, limit = 6) {
  const term = q.trim();
  if (!term) return [];
  return db
    .select({ slug: companies.slug, name: companies.name, total: companies.problemCount })
    .from(companies)
    .where(sql`${companies.name} ilike ${"%" + term + "%"}`)
    .orderBy(desc(companies.problemCount))
    .limit(limit);
}

export async function getPatternsById() {
  const rows = await db.select().from(patterns);
  return new Map(rows.map((p) => [p.id, p]));
}


/* ------------------------------------------------------------------ leetcode sync */

/**
 * Accepted LeetCode submissions that are worth logging: problems not yet in memory ("log as solved")
 * and problems already in memory that were re-solved on LeetCode after their last review
 * ("log as review").
 */
export async function getSyncSuggestions(user: User) {
  if (!user.leetcodeVerified) return [];
  const rows = await db
    .select({
      titleSlug: leetcodeSubmissions.titleSlug,
      title: leetcodeSubmissions.title,
      submittedAt: leetcodeSubmissions.submittedAt,
      problemId: problems.id,
      difficulty: problems.difficulty,
      lastReview: userProblems.lastReview,
      solvedAt: userProblems.solvedAt,
    })
    .from(leetcodeSubmissions)
    .innerJoin(problems, eq(problems.slug, leetcodeSubmissions.titleSlug))
    .leftJoin(userProblems, and(eq(userProblems.problemId, problems.id), eq(userProblems.userId, user.id)))
    .where(and(eq(leetcodeSubmissions.userId, user.id), eq(leetcodeSubmissions.dismissed, false)))
    .orderBy(desc(leetcodeSubmissions.submittedAt));

  const seen = new Set<string>();
  const out: { slug: string; title: string; problemId: number; difficulty: Difficulty; submittedAt: Date; kind: "new" | "review" }[] = [];
  for (const r of rows) {
    if (seen.has(r.titleSlug)) continue;
    seen.add(r.titleSlug);
    if (r.solvedAt === null) out.push({ slug: r.titleSlug, title: r.title, problemId: r.problemId, difficulty: r.difficulty, submittedAt: r.submittedAt, kind: "new" });
    else if (r.lastReview && r.submittedAt.getTime() > r.lastReview.getTime() + 3_600_000)
      out.push({ slug: r.titleSlug, title: r.title, problemId: r.problemId, difficulty: r.difficulty, submittedAt: r.submittedAt, kind: "review" });
  }
  return out.slice(0, 6);
}
