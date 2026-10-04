import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import { Logo } from "@/components/shell/logo";
import { getPatternCatalog } from "@/server/catalog";

/** Footer doubles as the crawl hub: every pattern guide is one hop from any public page. */
export async function SiteFooter() {
  const patterns = await getPatternCatalog();
  const half = Math.ceil(patterns.length / 2);
  const columns = [
    {
      title: "Recode",
      links: [
        { href: "/#how", label: "How it works" },
        { href: "/#model", label: "Memory model" },
        { href: "/#science", label: "The science" },
        { href: "/#faq", label: "FAQ" },
        { href: "/learn/patterns", label: "All 18 patterns" },
        { href: "/sign-up", label: "Start free" },
      ],
    },
    { title: "Patterns", links: patterns.slice(0, half).map((p) => ({ href: `/learn/patterns/${p.slug}`, label: p.name })) },
    { title: "More patterns", links: patterns.slice(half).map((p) => ({ href: `/learn/patterns/${p.slug}`, label: p.name })) },
  ];

  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.2fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3 text-[13px] text-ink-subtle">
          <Logo />
          <p className="max-w-[32ch] leading-relaxed">Spaced repetition for coding interviews. Solve once, re-solve on cue, keep it for good.</p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-[12px] font-medium text-ink">{col.title}</h2>
            <ul className="mt-3 flex flex-col gap-2 text-[13px] text-ink-subtle">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-6 text-[12px] text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Recode is an independent project, not affiliated with or endorsed by LeetCode. Problem names and trademarks belong to their owners.</p>
          <a
            href="https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm"
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 hover:text-ink"
          >
            About FSRS <ArrowUpRight size={12} aria-hidden />
          </a>
        </div>
      </div>
    </footer>
  );
}
