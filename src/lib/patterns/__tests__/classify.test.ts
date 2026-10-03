import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";
import { PATTERN_SLUGS } from "@/data/patterns";
import { CURATED_PATTERN } from "@/data/sheets";
import { classifyPattern } from "../classify";

describe("classifyPattern", () => {
  it("handles representative problems", () => {
    expect(classifyPattern({ title: "Implement Trie", topics: ["Hash Table", "String", "Design", "Trie"] })).toBe("tries");
    expect(classifyPattern({ title: "Network Delay Time", topics: ["Graph", "Heap (Priority Queue)", "Shortest Path"] })).toBe(
      "advanced-graphs",
    );
    expect(classifyPattern({ title: "Merge Intervals", topics: ["Array", "Sorting"] })).toBe("intervals");
    expect(classifyPattern({ title: "Edit Distance", topics: ["String", "Dynamic Programming"] })).toBe("2d-dp");
    expect(classifyPattern({ title: "House Robber", topics: ["Array", "Dynamic Programming"] })).toBe("1d-dp");
    expect(classifyPattern({ title: "Combine Two Tables", topics: ["Database"] })).toBeNull();
    expect(classifyPattern({ title: "Create Hello World Function", topics: [] })).toBeNull();
  });

  it("labels every algorithmic CSV problem with a known pattern", () => {
    const rows = parse(readFileSync(join(process.cwd(), "data/all_companies_questions.csv")), { columns: true }) as {
      Title: string;
      Topics: string;
    }[];
    for (const r of rows) {
      const topics = r.Topics.split(",").map((s) => s.trim()).filter(Boolean);
      const p = classifyPattern({ title: r.Title, topics });
      if (p !== null) expect(PATTERN_SLUGS).toContain(p);
      else expect(topics.length === 0 || topics.some((t) => ["Database", "Shell", "Concurrency"].includes(t))).toBe(true);
    }
  });

  it("agrees with the curated labels most of the time", () => {
    const rows = parse(readFileSync(join(process.cwd(), "data/all_companies_questions.csv")), { columns: true }) as {
      Title: string;
      Topics: string;
      Link: string;
    }[];
    const seen = new Map<string, { title: string; topics: string[] }>();
    for (const r of rows) seen.set(r.Link.split("/").pop()!, { title: r.Title, topics: r.Topics.split(",").map((s) => s.trim()) });
    let agree = 0;
    let total = 0;
    for (const [slug, pattern] of Object.entries(CURATED_PATTERN)) {
      const p = seen.get(slug);
      if (!p) continue;
      total++;
      if (classifyPattern(p) === pattern) agree++;
    }
    expect(agree / total).toBeGreaterThan(0.6);
  });
});
