import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { ArrowRight, Check, Shuffle } from "@phosphor-icons/react/ssr";
import { db } from "@/db";
import { companies, problems } from "@/db/schema";
import { JsonLd } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { DifficultyLabel } from "@/components/problems/difficulty";
import { MemoryMeter } from "@/components/problems/memory-meter";
import { ForgettingDemo } from "@/components/landing/forgetting-demo";
import { Reveal } from "@/components/landing/reveal";
import { CompanyMarquee } from "@/components/landing/company-marquee";
import { demoSeries, memoryLab } from "@/lib/srs/demo";
import { MemoryLab } from "@/components/landing/memory-lab";
import { curve, previewIntervals, schedule, Rating } from "@/lib/srs/fsrs";
import { formatInterval, formatNumber } from "@/lib/format";
import { absoluteUrl, SITE } from "@/lib/site";
import { APP_ID, faqSchema, organizationSchema, WEBSITE_ID, webApplicationSchema, websiteSchema } from "@/lib/seo/schema";

const FAQ = [
  [
    "Do I need to give Recode a password for the site I practise on?",
    "No. You solve problems wherever you already practise and tick the box here. Optionally, link your public profile username and Recode will suggest ticks from your recent accepted submissions.",
  ],
  [
    "What if I skip a few days?",
    "Nothing breaks. Overdue problems stay in the queue, weakest first, and the model accounts for the extra time. A daily budget in minutes keeps a backlog from turning into a wall.",
  ],
  [
    "Re-solving a problem I remember feels like a waste.",
    "If it was easy, rate it Easy and it disappears for months. The point is to spend time only where memory is actually slipping.",
  ],
  [
    "Is it free?",
    "Yes. Create an account and start with any sheet.",
  ],
] as const;

const FEATURES = [
  "FSRS-6 scheduling for every coding problem you solve",
  "Daily review queue interleaved across patterns",
  "Pattern recognition drills",
  "Curated study sheets and 464 company question lists",
  "Optional sync of accepted submissions from your public profile",
  "Per-problem and per-pattern memory tracking",
];

const landingSchema = {
  "@context": "https://schema.org",
  "@graph": [
    organizationSchema(),
    websiteSchema(),
    webApplicationSchema(FEATURES),
    {
      "@type": "WebPage",
      "@id": absoluteUrl("/"),
      url: absoluteUrl("/"),
      name: SITE.title,
      description: SITE.description,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": APP_ID },
      primaryImageOfPage: absoluteUrl("/opengraph-image"),
    },
    faqSchema(FAQ),
  ],
};

export const metadata: Metadata = pageMetadata({ title: SITE.title, description: SITE.description, path: "/", absoluteTitle: true });

export default async function LandingPage() {
  const [[counts], [companyCount], topCompanies] = await Promise.all([
    db.select({ problems: sql<number>`count(*)::int` }).from(problems),
    db.select({ n: sql<number>`count(*)::int` }).from(companies),
    db.select({ name: companies.name, total: companies.problemCount }).from(companies).orderBy(desc(companies.problemCount)).limit(28),
  ]);
  const demo = demoSeries(60);
  const lab = memoryLab();

  // Recall of each topic four weeks into a month of study, solved once and never revisited.
  const firstStability = schedule(null, new Date("2026-01-01"), Rating.Good).card.stability;
  const month = [
    { week: "Week 1", topic: "Arrays & Hashing", problem: "Group Anagrams", age: 28 },
    { week: "Week 2", topic: "Two Pointers", problem: "3Sum", age: 21 },
    { week: "Week 3", topic: "Linked List", problem: "Reorder List", age: 14 },
    { week: "Week 4", topic: "Trees", problem: "Validate Binary Search Tree", age: 3 },
  ].map((m) => ({ ...m, r: curve(firstStability, m.age) }));

  // Real intervals for a problem on its second successful review.
  const t0 = new Date("2026-01-01T09:00:00Z");
  const reviewed = schedule(null, t0, Rating.Good).card;
  const intervals = previewIntervals(reviewed, reviewed.due);

  return (
    <>
      <JsonLd data={landingSchema} />
      {/* Hero: split, copy left, live model right */}
      <section aria-labelledby="hero-title" className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-4 pt-14 pb-20 sm:px-8 md:pt-20 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:pt-12">
        <div className="min-w-0">
          <p className="mb-5 text-[13px] font-medium tracking-[0.02em] text-accent-text">Spaced repetition for coding interviews</p>
          <h1 id="hero-title" className="text-[40px] leading-[1.05] font-semibold tracking-[-0.035em] text-ink sm:text-[52px] lg:text-[58px]">
            You solved it.
            <br />
            <span className="text-ink-subtle">Three weeks later, it is gone.</span>
          </h1>
          <p className="mt-6 max-w-[44ch] text-[17px] leading-relaxed text-ink-muted">
            Recode brings back every coding problem you solve right before you would forget it.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="/sign-up">
                Start Free <ArrowRight size={15} aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href="#how">See How It Works</a>
            </Button>
          </div>
        </div>
        <Reveal delay={0.1} className="min-w-0">
          <ForgettingDemo without={demo.without} withReviews={demo.withReviews} days={demo.days} />
        </Reveal>
      </section>

      {/* The problem: full-width statement + a month of decay */}
      <section className="border-y border-line bg-surface-1/40">
        <div className="mx-auto max-w-[1200px] px-4 py-24 sm:px-8">
          <Reveal>
            <h2 className="max-w-[22ch] text-[32px] leading-[1.12] font-semibold tracking-[-0.03em] sm:text-[40px]">
              Arrays in week one. Trees in week four. Group Anagrams feels new again.
            </h2>
            <p className="mt-5 max-w-[60ch] text-[16px] leading-relaxed text-ink-subtle">
              Practising topic by topic builds momentum, then quietly erases whatever came first. Here is a typical month, with each topic solved once and never revisited.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ol className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {month.map((m) => (
                <li key={m.week} className="flex flex-col gap-6 bg-canvas p-5">
                  <div className="flex items-center justify-between text-[12px] text-ink-subtle">
                    <span>{m.week}</span>
                    <MemoryMeter r={m.r} />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-ink">{m.topic}</p>
                    <p className="mt-0.5 text-[13px] text-ink-subtle">{m.problem}</p>
                  </div>
                  <p className="mt-auto font-mono text-[28px] font-medium tracking-tight text-ink">
                    {Math.round(m.r * 100)}
                    <span className="text-[16px] text-ink-subtle">%</span>
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] text-ink-faint">Recall at the end of week four, from the FSRS-6 forgetting curve after a single solve.</p>
          </Reveal>
        </div>
      </section>

      {/* How it works: steps left, real UI right */}
      <section id="how" className="mx-auto grid max-w-[1200px] gap-14 px-4 py-28 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-[32px] leading-[1.12] font-semibold tracking-[-0.03em] sm:text-[38px]">Solve once. Re-solve on cue.</h2>
          <ol className="mt-10 flex flex-col gap-8">
            {[
              ["Encode", "Solve it wherever you practise, from the Roadmap 150, Essentials 75 or any of 464 company lists. Tick it here and the model starts tracking that memory."],
              ["Elaborate", "Rate how it went and write the one-line insight that cracked it. Explaining the key idea in your own words makes it easier to retrieve later."],
              ["Retrieve on schedule", "When predicted recall drifts down to 90%, it appears in Today. You rebuild the solution from memory, and each success stretches the next gap."],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 font-mono text-[13px] text-accent-text">{i + 1}</span>
                <div>
                  <h3 className="text-[16px] font-medium text-ink">{title}</h3>
                  <p className="mt-1.5 max-w-[46ch] text-[14.5px] leading-relaxed text-ink-subtle">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        <div className="flex flex-col gap-4">
          <Reveal>
            <div className="rounded-xl border border-line bg-surface-1 hairline-top">
              <p className="border-b border-line px-4 py-2.5 text-[12px] text-ink-subtle">Sheet</p>
              <ul className="divide-y divide-line">
                {[
                  { title: "Longest Consecutive Sequence", d: "MEDIUM" as const, solved: true, r: 0.94 },
                  { title: "Container With Most Water", d: "MEDIUM" as const, solved: true, r: 0.78 },
                  { title: "Trapping Rain Water", d: "HARD" as const, solved: false, r: null },
                ].map((p) => (
                  <li key={p.title} className="flex items-center gap-3 px-4 py-2.5">
                    <span
                      className={
                        p.solved
                          ? "grid size-[18px] place-items-center rounded-[5px] bg-accent text-accent-ink"
                          : "size-[18px] rounded-[5px] border border-line-strong"
                      }
                      aria-hidden
                    >
                      {p.solved ? <Check size={11} weight="bold" /> : null}
                    </span>
                    <span className="flex-1 truncate text-[14px] text-ink">{p.title}</span>
                    <DifficultyLabel difficulty={p.d} />
                    <MemoryMeter r={p.r} />
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="rounded-xl border border-line bg-surface-1 p-4 hairline-top">
              <p className="text-[12px] text-ink-subtle">How did the re-solve go?</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["Again", "Hard", "Good", "Easy"] as const).map((label, i) => (
                  <div
                    key={label}
                    className={
                      "flex flex-col gap-2 rounded-lg border border-b-[3px] bg-canvas p-3 " + (label === "Good" ? "border-accent" : "border-line-strong")
                    }
                  >
                    <span className="flex items-center justify-between">
                      <Kbd>{i + 1}</Kbd>
                      <span className="font-mono text-[12px] text-ink-subtle">{formatInterval(intervals[(i + 1) as 1 | 2 | 3 | 4])}</span>
                    </span>
                    <span className="text-[14px] font-medium text-ink">{label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[12px] text-ink-subtle">Each key shows when you would see the problem again. Hints and time taken cap the grade.</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-xl border border-line bg-surface-1 hairline-top">
              <p className="flex items-center gap-1.5 border-b border-line px-4 py-2.5 text-[12px] text-ink-subtle">
                <Shuffle size={12} aria-hidden /> Today, mixed across patterns
              </p>
              <ol className="divide-y divide-line">
                {[
                  ["Koko Eating Bananas", "Binary Search", 0.86],
                  ["Course Schedule", "Graphs", 0.81],
                  ["Daily Temperatures", "Stack", 0.88],
                  ["Coin Change", "1-D DP", 0.74],
                ].map(([t, p, r], i) => (
                  <li key={t as string} className="flex items-center gap-3 px-4 py-2.5 text-[14px]">
                    <span className="w-4 font-mono text-[12px] text-ink-faint">{i + 1}</span>
                    <span className="flex-1 truncate text-ink">{t}</span>
                    <span className="hidden text-[12px] text-ink-subtle sm:inline">{p}</span>
                    <span className="w-10 text-right font-mono text-[12px] text-ink-muted">{Math.round((r as number) * 100)}%</span>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Memory model walkthrough */}
      <section id="model" className="border-t border-line bg-surface-1/30">
        <div className="mx-auto max-w-[1200px] px-4 py-28 sm:px-8">
          <Reveal>
            <h2 className="max-w-[26ch] text-[32px] leading-[1.12] font-semibold tracking-[-0.03em] sm:text-[38px]">
              Inside one memory, from first solve to long-term.
            </h2>
            <p className="mt-4 max-w-[60ch] text-[15.5px] leading-relaxed text-ink-subtle">
              Recode models every problem you solve with three numbers. Step through the life of one problem and watch them change, with the same model the scheduler runs.
            </p>
          </Reveal>
          <Reveal delay={0.05} className="mt-12">
            <MemoryLab data={lab} />
          </Reveal>
        </div>
      </section>

      {/* Science: asymmetric bento */}
      <section id="science" className="border-t border-line">
        <div className="mx-auto max-w-[1200px] px-4 py-28 sm:px-8">
          <Reveal>
            <p className="text-[13px] font-medium tracking-[0.02em] text-accent-text">The science</p>
            <h2 className="mt-3 max-w-[24ch] text-[32px] leading-[1.12] font-semibold tracking-[-0.03em] sm:text-[38px]">
              Built on what memory research actually shows.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-3 md:grid-cols-[1.3fr_1fr] md:grid-rows-[auto_auto]">
            <Reveal className="md:row-span-2">
              <article className="flex h-full flex-col rounded-xl border border-line bg-surface-1 p-6 hairline-top">
                <h3 className="text-[18px] font-semibold tracking-tight">FSRS, not fixed intervals</h3>
                <p className="mt-2 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-subtle">
                  The Free Spaced Repetition Scheduler, the model behind modern Anki, tracks how difficult each problem is for you and how stable your memory of it has become. It predicts the day your recall crosses your target and schedules the re-solve for that day, not a generic 1, 3, 7.
                </p>
                <div className="mt-8 rounded-lg border border-line bg-canvas p-5">
                  <p className="font-mono text-[15px] text-ink" translate="no">
                    R(t) = (1 + f · t / S)<sup>−w</sup>
                  </p>
                  <dl className="mt-4 grid grid-cols-3 gap-3 text-[12px]">
                    <div>
                      <dt className="font-mono text-ink-muted">R</dt>
                      <dd className="text-ink-subtle">chance you can still solve it</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-ink-muted">S</dt>
                      <dd className="text-ink-subtle">stability, grows with each success</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-ink-muted">t</dt>
                      <dd className="text-ink-subtle">days since your last solve</dd>
                    </div>
                  </dl>
                </div>
                <p className="mt-auto pt-6 text-[13px] text-ink-subtle">
                  Overdue? No penalty. A late success counts for more, because you recalled it against the odds.
                </p>
              </article>
            </Reveal>
            <Reveal delay={0.05}>
              <article className="rounded-xl border border-line bg-surface-1 p-6 hairline-top">
                <h3 className="text-[18px] font-semibold tracking-tight">Mixed beats blocked</h3>
                <div className="mt-4 flex items-end gap-6">
                  <p>
                    <span className="text-[40px] font-semibold tracking-tight text-ink">63%</span>
                    <span className="block text-[12px] text-ink-subtle">mixed practice</span>
                  </p>
                  <p>
                    <span className="text-[40px] font-semibold tracking-tight text-ink-faint">20%</span>
                    <span className="block text-[12px] text-ink-subtle">one topic at a time</span>
                  </p>
                </div>
                <p className="mt-4 text-[13.5px] leading-relaxed text-ink-subtle">
                  Test scores a week later when practice problems were interleaved versus grouped by type. Your review queue never puts two problems of the same pattern back to back.
                </p>
                <p className="mt-3 text-[11.5px] text-ink-faint">Rohrer &amp; Taylor, Instructional Science, 2007</p>
              </article>
            </Reveal>
            <Reveal delay={0.1}>
              <article className="grid gap-5 rounded-xl border border-line bg-surface-1 p-6 hairline-top sm:grid-cols-[1fr_auto]">
                <div>
                  <h3 className="text-[18px] font-semibold tracking-tight">Recall first, then look</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-subtle">
                    Every review starts by naming the pattern from the title alone. Five-question drills train the same skill on problems you have not seen, which is what an interview actually tests.
                  </p>
                </div>
                <ul className="flex flex-col gap-1.5 self-center text-[13px]" aria-label="Example drill options">
                  {["Sliding Window", "Two Pointers", "Arrays & Hashing", "1-D DP"].map((p, i) => (
                    <li
                      key={p}
                      className={
                        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 " +
                        (i === 0 ? "border-strong/50 bg-strong/10 text-ink" : "border-line text-ink-subtle")
                      }
                    >
                      <Kbd>{i + 1}</Kbd>
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Coverage: sheets + company marquee */}
      <section id="sheets" aria-labelledby="sheets-title" className="border-t border-line bg-surface-1/40">
        <div className="mx-auto max-w-[1200px] px-4 pt-24 pb-10 sm:px-8">
          <Reveal className="grid gap-10 md:grid-cols-2 md:items-end">
            <h2 id="sheets-title" className="text-[32px] leading-[1.12] font-semibold tracking-[-0.03em] sm:text-[38px]">
              {formatNumber(counts.problems)} problems.
              <br />
              {formatNumber(companyCount.n)} company lists.
            </h2>
            <div>
              <p className="max-w-[52ch] text-[15px] leading-relaxed text-ink-subtle">
                Work through the Roadmap 150 or Essentials 75 in roadmap order, or target a company by what it asks most. A problem you solve once counts on every list it appears on.
              </p>
              <Link href="/learn/patterns" className="mt-4 inline-flex items-center gap-1 text-[14px] text-accent-text hover:underline">
                Explore the 18 patterns <ArrowRight size={13} aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>
        <div className="pb-24">
          <CompanyMarquee companies={topCompanies} />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-[820px] px-4 py-28 sm:px-8">
        <h2 id="faq-title" className="text-[28px] font-semibold tracking-[-0.03em]">
          Questions
        </h2>
        <div className="mt-8 border-t border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[15.5px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                {q}
                <span className="relative size-3 shrink-0 text-ink-subtle" aria-hidden>
                  <span className="absolute top-1/2 left-0 h-px w-3 bg-current" />
                  <span className="absolute top-0 left-1/2 h-3 w-px bg-current transition-transform duration-200 group-open:scale-y-0" />
                </span>
              </summary>
              <p className="max-w-[62ch] pb-6 text-[14.5px] leading-relaxed text-ink-subtle">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-8">
        <Reveal>
          <div className="flex flex-col items-start gap-8 rounded-2xl border border-line bg-surface-1 p-8 hairline-top sm:p-12 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[28px] leading-tight font-semibold tracking-[-0.03em] sm:text-[34px]">Keep what you learn.</h2>
              <p className="mt-2 text-[15px] text-ink-subtle">Tick your first problem in under a minute.</p>
            </div>
            <Button asChild variant="primary" size="lg">
              <Link href="/sign-up">
                Start Free <ArrowRight size={15} aria-hidden />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </>
  );
}
