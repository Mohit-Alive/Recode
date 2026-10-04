import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CatalogContainer, CatalogHeader, difficultyStats, LinkChips, ProblemList, SectionHeading, Stats, TrackCta } from "@/components/marketing/catalog";
import { JsonLd } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbSchema, itemListSchema, patternTerm, WEBSITE_ID, type Crumb } from "@/lib/seo/schema";
import { DIFFICULTY_LABEL, formatNumber } from "@/lib/format";
import { getCatalogPattern } from "@/server/catalog";

const crumbs = (slug: string, name: string): Crumb[] => [
  { name: "Recode", path: "/" },
  { name: "Patterns", path: "/learn/patterns" },
  { name, path: `/learn/patterns/${slug}` },
];

export async function generateMetadata(props: PageProps<"/learn/patterns/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getCatalogPattern(slug);
  if (!data) return {};
  const { pattern } = data;
  const title = `${pattern.name} Pattern: How to Recognise It, with ${pattern.total} Practice Problems`;
  const description = `${pattern.blurb} Reach for ${pattern.name} when: ${pattern.cue} What to learn first, what it gets confused with, and ${pattern.total} problems to practise, easiest first.`;
  return pageMetadata({ title, description, path: `/learn/patterns/${slug}` });
}

export default async function PatternCatalogPage(props: PageProps<"/learn/patterns/[slug]">) {
  const { slug } = await props.params;
  const data = await getCatalogPattern(slug);
  if (!data) notFound();
  const { pattern, prereqs, neighbors, next, groups, difficulty } = data;
  const path = `/learn/patterns/${slug}`;
  const trail = crumbs(slug, pattern.name);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": absoluteUrl(path),
        url: absoluteUrl(path),
        name: `${pattern.name} pattern`,
        description: pattern.blurb,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        about: patternTerm(pattern),
        mainEntity: itemListSchema(groups.flatMap((g) => g.problems).map((p) => ({ name: p.title, path: `/learn/problems/${p.slug}` }))),
      },
      breadcrumbSchema(trail),
    ],
  };

  return (
    <CatalogContainer>
      <JsonLd data={jsonLd} />
      <Breadcrumbs crumbs={trail} />
      <CatalogHeader title={`${pattern.name} pattern`} description={pattern.blurb}>
        <Stats items={[{ label: "Problems", value: formatNumber(pattern.total) }, ...difficultyStats(difficulty)]} />
      </CatalogHeader>

      <section aria-labelledby="recognise" className="mt-10 rounded-xl border border-line bg-surface-1 p-6 hairline-top">
        <h2 id="recognise" className="text-[13px] font-medium text-accent-text">
          How to recognise it
        </h2>
        <p className="mt-2 max-w-[62ch] text-[17px] leading-relaxed text-ink">{pattern.cue}</p>
        <dl className="mt-6 grid gap-5 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="text-ink-subtle">Learn first</dt>
            <dd className="mt-2">
              {prereqs.length ? (
                <LinkChips label="Prerequisites" items={prereqs.map((p) => ({ href: `/learn/patterns/${p.slug}`, label: p.name }))} />
              ) : (
                <span className="text-ink-muted">Nothing. This is a starting point.</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Often confused with</dt>
            <dd className="mt-2">
              <LinkChips label="Similar patterns" items={neighbors.map((p) => ({ href: `/learn/patterns/${p.slug}`, label: p.name }))} />
            </dd>
          </div>
          <div>
            <dt className="text-ink-subtle">Unlocks</dt>
            <dd className="mt-2">
              {next.length ? (
                <LinkChips label="Next patterns" items={next.map((p) => ({ href: `/learn/patterns/${p.slug}`, label: p.name }))} />
              ) : (
                <span className="text-ink-muted">The end of its branch of the roadmap.</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {groups.map((g, i) => {
        const id = g.difficulty.toLowerCase();
        const start = 1 + groups.slice(0, i).reduce((n, x) => n + x.problems.length, 0);
        return (
          <section key={g.difficulty} aria-labelledby={id} className="mt-12">
            <SectionHeading id={id} aside={`${g.problems.length}, most approachable first`}>
              {DIFFICULTY_LABEL[g.difficulty]} {pattern.name} problems
            </SectionHeading>
            <ProblemList problems={g.problems} start={start} showPattern={false} labelledBy={id} />
          </section>
        );
      })}

      <TrackCta
        className="mt-16"
        title={`Keep ${pattern.name} in long-term memory`}
        body="Recode schedules each problem you solve for a re-solve right before you would forget it, and drills you on spotting the pattern from the title alone."
        appHref="/patterns"
      />
    </CatalogContainer>
  );
}
