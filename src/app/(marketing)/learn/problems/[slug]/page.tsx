import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { CatalogContainer, CatalogHeader, LinkChips, ProblemList, SectionHeading, TrackCta } from "@/components/marketing/catalog";
import { DifficultyLabel } from "@/components/problems/difficulty";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { article, pageMetadata } from "@/lib/seo/metadata";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbSchema, patternTerm, WEBSITE_ID, type Crumb } from "@/lib/seo/schema";
import { DIFFICULTY_LABEL } from "@/lib/format";
import { getCatalogProblem } from "@/server/catalog";

type Data = NonNullable<Awaited<ReturnType<typeof getCatalogProblem>>>;

function trailFor({ problem, pattern }: Data): Crumb[] {
  const parent: Crumb[] = pattern
    ? [
        { name: "Patterns", path: "/learn/patterns" },
        { name: pattern.name, path: `/learn/patterns/${pattern.slug}` },
      ]
    : [];
  return [{ name: "Recode", path: "/" }, ...parent, { name: problem.title, path: `/learn/problems/${problem.slug}` }];
}

export async function generateMetadata(props: PageProps<"/learn/problems/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getCatalogProblem(slug);
  if (!data) return {};
  const { problem, pattern } = data;
  const level = DIFFICULTY_LABEL[problem.difficulty];
  const title = pattern ? `${problem.title}: ${level} ${pattern.name} Problem` : `${problem.title}: ${level} Coding Interview Problem`;
  const description = pattern
    ? `${problem.title} is ${article(level)} ${level} ${pattern.name} problem. Recognise it when: ${pattern.cue} See what to learn first, what it gets confused with, and similar problems to practise.`
    : `${problem.title} is ${article(level)} ${level} coding interview problem. Practise it and keep it in long-term memory with spaced repetition.`;
  return pageMetadata({ title, description, path: `/learn/problems/${slug}`, type: "article" });
}

export default async function ProblemCatalogPage(props: PageProps<"/learn/problems/[slug]">) {
  const { slug } = await props.params;
  const data = await getCatalogProblem(slug);
  if (!data) notFound();
  const { problem, pattern, prereqs, neighbors, related } = data;
  const path = `/learn/problems/${slug}`;
  const trail = trailFor(data);
  const level = DIFFICULTY_LABEL[problem.difficulty];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["WebPage", "LearningResource"],
        "@id": absoluteUrl(path),
        url: absoluteUrl(path),
        name: problem.title,
        description: `${problem.title} is ${article(level)} ${level} coding interview problem${pattern ? ` solved with ${pattern.name}` : ""}.`,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        learningResourceType: "Coding interview problem",
        educationalLevel: level,
        isAccessibleForFree: true,
        ...(problem.topics.length ? { keywords: problem.topics.join(", ") } : {}),
        ...(pattern ? { teaches: patternTerm(pattern) } : {}),
      },
      breadcrumbSchema(trail),
    ],
  };

  return (
    <CatalogContainer className="max-w-[960px]">
      <JsonLd data={jsonLd} />
      <Breadcrumbs crumbs={trail} />
      <CatalogHeader
        title={problem.title}
        description={`${article(level) === "an" ? "An" : "A"} ${level} coding interview problem${pattern ? ` in the ${pattern.name} pattern` : ""}.`}
      >
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <DifficultyLabel difficulty={problem.difficulty} className="text-[14px]" />
          <Button asChild variant="secondary" size="md">
            <a href={problem.url} target="_blank" rel="noreferrer">
              Open Problem <ArrowUpRight size={14} aria-hidden />
            </a>
          </Button>
        </div>
      </CatalogHeader>

      {pattern ? (
        <section aria-labelledby="pattern" className="mt-10 rounded-xl border border-line bg-surface-1 p-6 hairline-top">
          <h2 id="pattern" className="text-[13px] font-medium text-accent-text">
            {problem.patternCurated ? "Pattern" : "Likely pattern"}
          </h2>
          <p className="mt-2 text-[20px] font-semibold tracking-tight">
            <Link href={`/learn/patterns/${pattern.slug}`} className="text-ink hover:text-accent-text">
              {pattern.name}
            </Link>
          </p>
          <p className="mt-1 text-[14px] text-ink-subtle">{pattern.blurb}</p>
          <p className="mt-4 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-muted">
            <span className="text-ink">Recognition cue: </span>
            {pattern.cue}
          </p>
          <dl className="mt-6 grid gap-5 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="text-ink-subtle">Learn first</dt>
              <dd className="mt-2">
                {prereqs.length ? (
                  <LinkChips label="Prerequisites" items={prereqs.map((p) => ({ href: `/learn/patterns/${p.slug}`, label: p.name }))} />
                ) : (
                  <span className="text-ink-muted">Nothing. {pattern.name} is a starting point.</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-ink-subtle">Do not confuse it with</dt>
              <dd className="mt-2">
                <LinkChips label="Similar patterns" items={neighbors.map((p) => ({ href: `/learn/patterns/${p.slug}`, label: p.name }))} />
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {problem.topics.length ? (
        <section aria-labelledby="topics" className="mt-10">
          <SectionHeading id="topics">Topics</SectionHeading>
          <ul aria-labelledby="topics" className="flex flex-wrap gap-2">
            {problem.topics.map((t) => (
              <li key={t} className="rounded-md border border-line bg-surface-1 px-2.5 py-1 text-[13px] text-ink-muted">
                {t}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {related.length && pattern ? (
        <section aria-labelledby="related" className="mt-10">
          <SectionHeading id="related">Practise {pattern.name} next</SectionHeading>
          <ProblemList problems={related} showPattern={false} labelledBy="related" />
        </section>
      ) : null}

      <TrackCta
        className="mt-16"
        title={`Solve ${problem.title} once, keep it for good`}
        body="Tick it in Recode after you solve it. It comes back for a re-solve right before you would forget, and every success pushes the next review further out."
        appHref={`/problems/${slug}`}
      />
    </CatalogContainer>
  );
}
