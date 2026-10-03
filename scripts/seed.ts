/**
 * Idempotent seed: patterns, problems + companies (from data/all_companies_questions.csv),
 * and curated sheets. Safe to re-run; it upserts reference data and never touches user data.
 *
 *   pnpm db:seed
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { parse } from "csv-parse/sync";
import { eq, sql } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../src/db/schema";
import { PATTERNS } from "../src/data/patterns";
import { CURATED_PATTERN, CURATED_SHEETS, FALLBACK_PROBLEMS } from "../src/data/sheets";
import { classifyPattern } from "../src/lib/patterns/classify";
import { companyDisplayName, slugify } from "../src/lib/format";

config({ path: ".env.local" });
config();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const db = /neon\.tech|neon\.build/.test(url)
  ? drizzleNeon({ client: neon(url), schema })
  : drizzlePg({ connection: url, schema });

type CsvRow = {
  Company_Name: string;
  Difficulty: string;
  Title: string;
  Frequency: string;
  Acceptance_Rate: string;
  Link: string;
  Topics: string;
};

const chunk = <T,>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

async function main() {
  const csvPath = join(process.cwd(), "data", "all_companies_questions.csv");
  const rows = parse(readFileSync(csvPath), { columns: true, skip_empty_lines: true }) as CsvRow[];
  console.log(`csv rows: ${rows.length}`);

  // 1. Patterns
  for (const [i, p] of PATTERNS.entries()) {
    await db
      .insert(schema.patterns)
      .values({ ...p, position: i })
      .onConflictDoUpdate({
        target: schema.patterns.slug,
        set: { name: p.name, blurb: p.blurb, cue: p.cue, prereqs: p.prereqs, neighbors: p.neighbors, position: i },
      });
  }
  const patternRows = await db.select().from(schema.patterns);
  const patternId = new Map(patternRows.map((p) => [p.slug, p.id]));

  // 2. Problems
  type ProblemDraft = typeof schema.problems.$inferInsert;
  const problems = new Map<string, ProblemDraft>();
  const companiesOf = new Map<string, Set<string>>();
  for (const r of rows) {
    const slug = r.Link.replace(/\/$/, "").split("/").pop()!;
    const topics = r.Topics.split(",").map((s) => s.trim()).filter(Boolean);
    if (!problems.has(slug)) {
      problems.set(slug, {
        slug,
        title: r.Title.trim(),
        difficulty: r.Difficulty.toUpperCase() as ProblemDraft["difficulty"],
        url: `https://leetcode.com/problems/${slug}/`,
        acceptanceRate: r.Acceptance_Rate ? Number(r.Acceptance_Rate) : null,
        topics,
      });
    }
    if (!companiesOf.has(slug)) companiesOf.set(slug, new Set());
    companiesOf.get(slug)!.add(r.Company_Name.trim());
  }

  const curatedSlugs = new Set(CURATED_SHEETS.flatMap((s) => s.sections.flatMap((x) => x.slugs)));
  const missing: string[] = [];
  for (const slug of curatedSlugs) {
    if (problems.has(slug)) continue;
    const fb = FALLBACK_PROBLEMS[slug];
    if (!fb) {
      missing.push(slug);
      continue;
    }
    problems.set(slug, { slug, title: fb.title, difficulty: fb.difficulty, url: `https://leetcode.com/problems/${slug}/`, topics: [] });
  }
  if (missing.length) throw new Error(`Curated slugs missing from CSV and FALLBACK_PROBLEMS: ${missing.join(", ")}`);

  for (const p of problems.values()) {
    const curated = CURATED_PATTERN[p.slug];
    const slug = curated ?? classifyPattern({ title: p.title, topics: p.topics ?? [] });
    p.patternId = slug ? patternId.get(slug)! : null;
    p.patternCurated = Boolean(curated);
    p.companyCount = companiesOf.get(p.slug)?.size ?? 0;
  }

  for (const batch of chunk([...problems.values()], 400)) {
    await db
      .insert(schema.problems)
      .values(batch)
      .onConflictDoUpdate({
        target: schema.problems.slug,
        set: {
          title: sql`excluded.title`,
          difficulty: sql`excluded.difficulty`,
          url: sql`excluded.url`,
          acceptanceRate: sql`excluded.acceptance_rate`,
          topics: sql`excluded.topics`,
          patternId: sql`excluded.pattern_id`,
          patternCurated: sql`excluded.pattern_curated`,
          companyCount: sql`excluded.company_count`,
        },
      });
  }
  const problemRows = await db.select({ id: schema.problems.id, slug: schema.problems.slug }).from(schema.problems);
  const problemId = new Map(problemRows.map((p) => [p.slug, p.id]));

  // 3. Companies + company_problems (max frequency per pair)
  const companyProblems = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const name = r.Company_Name.trim();
    const slug = r.Link.replace(/\/$/, "").split("/").pop()!;
    const freq = Number(r.Frequency) || 0;
    if (!companyProblems.has(name)) companyProblems.set(name, new Map());
    const m = companyProblems.get(name)!;
    m.set(slug, Math.max(m.get(slug) ?? 0, freq));
  }
  const companyValues = [...companyProblems.entries()].map(([name, m]) => ({
    slug: slugify(name),
    name: companyDisplayName(name),
    problemCount: m.size,
  }));
  const companySlugs = new Set(companyValues.map((c) => c.slug));
  if (companySlugs.size !== companyValues.length) throw new Error("Company slug collision");
  for (const batch of chunk(companyValues, 400)) {
    await db
      .insert(schema.companies)
      .values(batch)
      .onConflictDoUpdate({
        target: schema.companies.slug,
        set: { name: sql`excluded.name`, problemCount: sql`excluded.problem_count` },
      });
  }
  const companyRows = await db.select({ id: schema.companies.id, slug: schema.companies.slug }).from(schema.companies);
  const companyId = new Map(companyRows.map((c) => [c.slug, c.id]));

  await db.delete(schema.companyProblems);
  const cpValues = [...companyProblems.entries()].flatMap(([name, m]) =>
    [...m.entries()].map(([slug, frequency]) => ({
      companyId: companyId.get(slugify(name))!,
      problemId: problemId.get(slug)!,
      frequency,
    })),
  );
  for (const batch of chunk(cpValues, 1000)) await db.insert(schema.companyProblems).values(batch);

  // 4. Curated sheets
  for (const [i, s] of CURATED_SHEETS.entries()) {
    await db
      .insert(schema.sheets)
      .values({ slug: s.slug, name: s.name, description: s.description, position: i, kind: "curated" })
      .onConflictDoUpdate({
        target: schema.sheets.slug,
        set: { name: s.name, description: s.description, position: i },
      });
    const [sheet] = await db.select().from(schema.sheets).where(eq(schema.sheets.slug, s.slug));
    await db.delete(schema.sheetProblems).where(eq(schema.sheetProblems.sheetId, sheet.id));
    let position = 0;
    const values = s.sections.flatMap((section) =>
      section.slugs.map((slug) => ({
        sheetId: sheet.id,
        problemId: problemId.get(slug)!,
        position: position++,
        section: section.title,
      })),
    );
    await db.insert(schema.sheetProblems).values(values);
    console.log(`sheet ${s.slug}: ${values.length} problems`);
  }

  // 5. Report
  const [{ count: pCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.problems);
  const [{ count: cCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.companies);
  const [{ count: cpCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.companyProblems);
  const unlabeled = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.problems)
    .where(sql`${schema.problems.patternId} is null`);
  const byPattern = await db
    .select({ slug: schema.patterns.slug, count: sql<number>`count(${schema.problems.id})::int` })
    .from(schema.patterns)
    .leftJoin(schema.problems, eq(schema.problems.patternId, schema.patterns.id))
    .groupBy(schema.patterns.slug, schema.patterns.position)
    .orderBy(schema.patterns.position);
  console.log({ problems: pCount, companies: cCount, companyProblems: cpCount, unlabeled: unlabeled[0].count });
  console.table(byPattern);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
