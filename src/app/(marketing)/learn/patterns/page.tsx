import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CatalogContainer, CatalogHeader, TrackCta } from "@/components/marketing/catalog";
import { JsonLd } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbSchema, patternTerm, WEBSITE_ID, type Crumb } from "@/lib/seo/schema";
import { formatNumber } from "@/lib/format";
import { getPatternCatalog } from "@/server/catalog";

const PATH = "/learn/patterns";
const CRUMBS: Crumb[] = [
  { name: "Recode", path: "/" },
  { name: "Patterns", path: PATH },
];

export const metadata: Metadata = pageMetadata({
  title: "Coding Interview Patterns: The 18 Patterns and How to Recognise Each One",
  description:
    "The 18 patterns behind almost every coding interview problem, in roadmap order: what each one is, the cue in a problem statement that should make you reach for it, and the problems to practise.",
  path: PATH,
});

export default async function PatternIndexPage() {
  const patterns = await getPatternCatalog();
  const byslug = new Map(patterns.map((p) => [p.slug, p.name]));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "DefinedTermSet",
        "@id": absoluteUrl(PATH),
        url: absoluteUrl(PATH),
        name: "Coding interview patterns",
        description: "The 18 patterns that cover almost every coding interview problem.",
        isPartOf: { "@id": WEBSITE_ID },
        hasDefinedTerm: patterns.map(patternTerm),
      },
      breadcrumbSchema(CRUMBS),
    ],
  };

  return (
    <CatalogContainer>
      <JsonLd data={jsonLd} />
      <Breadcrumbs crumbs={CRUMBS} />
      <CatalogHeader
        title="Coding interview patterns"
        description="Eighteen patterns cover almost every interview problem. Recognising which one a problem needs is most of the work, so each pattern below comes with the cue in a problem statement that should make you reach for it. They are listed in roadmap order: each builds on the ones before it."
      />

      <ol className="mt-12 grid gap-3 md:grid-cols-2">
        {patterns.map((p, i) => (
          <li key={p.slug}>
            <article className="flex h-full flex-col rounded-xl border border-line bg-surface-1 p-5 hairline-top">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-[17px] font-semibold tracking-tight">
                  <span className="mr-2 font-mono text-[12px] text-ink-faint tabular">{String(i + 1).padStart(2, "0")}</span>
                  <Link href={`/learn/patterns/${p.slug}`} className="text-ink hover:text-accent-text">
                    {p.name}
                  </Link>
                </h2>
                <span className="shrink-0 font-mono text-[12px] text-ink-subtle tabular">{formatNumber(p.total)} problems</span>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{p.blurb}</p>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-subtle">
                <span className="text-ink-muted">Reach for it when: </span>
                {p.cue}
              </p>
              {p.prereqs.length ? (
                <p className="mt-auto pt-4 text-[12px] text-ink-subtle">Builds on {p.prereqs.map((s) => byslug.get(s) ?? s).join(", ")}</p>
              ) : null}
            </article>
          </li>
        ))}
      </ol>

      <TrackCta
        className="mt-16"
        title="Train recognition, not just solutions"
        body="Recode tracks your memory of every pattern, and five-question drills ask you to name the pattern from a problem title alone, the skill an interview actually tests."
        appHref="/patterns"
      />
    </CatalogContainer>
  );
}
