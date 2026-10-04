import { absoluteUrl, SITE } from "@/lib/site";
import { getPatternCatalog } from "@/server/catalog";

// Rendered per request so builds never need the database.
export const dynamic = "force-dynamic";

/** Plain-text site map for LLM crawlers (llmstxt.org). Harmless for Google, useful for AI answers. */
export async function GET() {
  const patternList = await getPatternCatalog();
  const body = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    "Recode is a free web app for coding interview prep. You solve problems wherever you practise and tick them in Recode. It models your memory of each problem with FSRS-6 and brings it back for a re-solve when predicted recall falls to your target (90% by default). Reviews are interleaved across patterns, and short drills train recognising which pattern a problem needs.",
    "",
    "## Patterns",
    `- [All 18 patterns, in roadmap order](${absoluteUrl("/learn/patterns")})`,
    ...patternList.map((p) => `- [${p.name}](${absoluteUrl(`/learn/patterns/${p.slug}`)}): ${p.blurb} Recognise it when: ${p.cue}`),
    "",
    "## Optional",
    `- [Home](${absoluteUrl("/")}): how the scheduler works, the memory model and FAQ`,
    `- [Sitemap](${absoluteUrl("/sitemap.xml")})`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
