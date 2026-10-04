import "server-only";
import { cache } from "react";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { patterns, problems, type Difficulty } from "@/db/schema";

/**
 * Public, user-independent reads for the indexable catalog under /learn. Wrapped in React `cache`
 * so generateMetadata, the page and its OG image share one query per request.
 *
 * Deliberately limited to Recode's own content (patterns, cues, roadmap, its own classification)
 * plus basic public problem facts. Company lists and curated sheets stay inside the signed-in app.
 * No external problem URLs are selected: public pages only link within Recode.
 */

export type CatalogProblem = {
  slug: string;
  title: string;
  difficulty: Difficulty;
  patternName: string | null;
  patternSlug: string | null;
};

export type DifficultyCounts = Record<Difficulty, number>;

const problemCols = {
  slug: problems.slug,
  title: problems.title,
  difficulty: problems.difficulty,
  patternName: patterns.name,
  patternSlug: patterns.slug,
};

const difficultyRank = sql`case ${problems.difficulty} when 'EASY' then 0 when 'MEDIUM' then 1 else 2 end`;

export function countDifficulties(list: { difficulty: Difficulty }[]): DifficultyCounts {
  const counts: DifficultyCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const p of list) counts[p.difficulty] += 1;
  return counts;
}

/* ------------------------------------------------------------------ patterns */

export const getPatternCatalog = cache(async () => {
  const [all, counts] = await Promise.all([
    db.select().from(patterns).orderBy(asc(patterns.position)),
    db
      .select({ patternId: problems.patternId, total: sql<number>`count(*)::int` })
      .from(problems)
      .groupBy(problems.patternId),
  ]);
  const byId = new Map(counts.map((c) => [c.patternId, c.total]));
  return all.map((p) => ({ ...p, total: byId.get(p.id) ?? 0 }));
});

type CatalogPattern = Awaited<ReturnType<typeof getPatternCatalog>>[number];

/** Prerequisites, look-alikes and follow-ups of a pattern, resolved to names. */
function relations(pattern: CatalogPattern, catalog: CatalogPattern[]) {
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));
  const pick = (slugs: string[]) => slugs.map((s) => bySlug.get(s)).filter((p) => p !== undefined);
  return {
    prereqs: pick(pattern.prereqs),
    neighbors: pick(pattern.neighbors),
    next: catalog.filter((p) => p.prereqs.includes(pattern.slug)),
  };
}

export const getCatalogPattern = cache(async (slug: string) => {
  const catalog = await getPatternCatalog();
  const pattern = catalog.find((p) => p.slug === slug);
  if (!pattern) return null;

  // Most approachable first within each difficulty (acceptance rate is a public per-problem fact).
  const rows = await db
    .select(problemCols)
    .from(problems)
    .leftJoin(patterns, eq(patterns.id, problems.patternId))
    .where(eq(problems.patternId, pattern.id))
    .orderBy(difficultyRank, sql`${problems.acceptanceRate} desc nulls last`, asc(problems.title));

  const groups = (["EASY", "MEDIUM", "HARD"] as const)
    .map((difficulty) => ({ difficulty, problems: rows.filter((r) => r.difficulty === difficulty) }))
    .filter((g) => g.problems.length > 0);

  return { pattern, ...relations(pattern, catalog), groups, difficulty: countDifficulties(rows) };
});

/* ------------------------------------------------------------------ problems */

export const getCatalogProblem = cache(async (slug: string) => {
  const [problem] = await db
    .select({
      ...problemCols,
      id: problems.id,
      patternId: problems.patternId,
      patternCurated: problems.patternCurated,
      topics: problems.topics,
    })
    .from(problems)
    .leftJoin(patterns, eq(patterns.id, problems.patternId))
    .where(eq(problems.slug, slug))
    .limit(1);
  if (!problem) return null;

  const catalog = await getPatternCatalog();
  const pattern = catalog.find((p) => p.id === problem.patternId) ?? null;
  const own = problem.difficulty === "EASY" ? 0 : problem.difficulty === "MEDIUM" ? 1 : 2;

  // Same pattern, closest difficulty first, then the most approachable.
  const related =
    problem.patternId === null
      ? []
      : await db
          .select(problemCols)
          .from(problems)
          .leftJoin(patterns, eq(patterns.id, problems.patternId))
          .where(and(eq(problems.patternId, problem.patternId), ne(problems.id, problem.id)))
          .orderBy(sql`abs((${difficultyRank}) - ${own})`, sql`${problems.acceptanceRate} desc nulls last`, asc(problems.title))
          .limit(8);

  return { problem, pattern, ...(pattern ? relations(pattern, catalog) : { prereqs: [], neighbors: [], next: [] }), related };
});

/* ------------------------------------------------------------------ sitemap */

export async function getSitemapSlugs() {
  const [patternRows, problemRows] = await Promise.all([
    db.select({ slug: patterns.slug }).from(patterns).orderBy(asc(patterns.position)),
    db.select({ slug: problems.slug }).from(problems).orderBy(asc(problems.slug)),
  ]);
  return { patterns: patternRows.map((r) => r.slug), problems: problemRows.map((r) => r.slug) };
}
