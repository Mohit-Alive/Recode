import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import type { CatalogProblem, DifficultyCounts } from "@/server/catalog";
import { DifficultyLabel } from "@/components/problems/difficulty";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Building blocks for the public /learn catalog pages. */

export function CatalogContainer({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1080px] px-4 pt-10 pb-24 sm:px-8 sm:pt-12", className)} {...props} />;
}

export function CatalogHeader({ title, description, children }: { title: React.ReactNode; description?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header>
      <h1 className="text-[32px] leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-ink sm:text-[40px]">{title}</h1>
      {description ? <p className="mt-4 max-w-[64ch] text-[15.5px] leading-relaxed text-ink-subtle">{description}</p> : null}
      {children}
    </header>
  );
}

export function SectionHeading({ id, children, aside }: { id: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4 px-1">
      <h2 id={id} className="scroll-mt-24 text-[17px] font-semibold tracking-tight text-ink">
        {children}
      </h2>
      {aside ? <span className="font-mono text-[12px] text-ink-subtle tabular">{aside}</span> : null}
    </div>
  );
}

export function Stats({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-[13px]">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-ink-subtle">{it.label}</dt>
          <dd className="mt-0.5 font-mono text-[18px] text-ink tabular">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function difficultyStats(d: DifficultyCounts) {
  return [
    { label: "Easy", value: formatNumber(d.EASY) },
    { label: "Medium", value: formatNumber(d.MEDIUM) },
    { label: "Hard", value: formatNumber(d.HARD) },
  ];
}

/**
 * Ordered problem list linking to the public problem pages. Rows are kept lean on purpose: a
 * pattern can list a few hundred problems, and every byte repeats in the RSC payload.
 */
export function ProblemList({
  problems,
  start = 1,
  showPattern = true,
  trailing,
  labelledBy,
}: {
  problems: CatalogProblem[];
  start?: number;
  showPattern?: boolean;
  trailing?: (p: CatalogProblem, i: number) => React.ReactNode;
  labelledBy?: string;
}) {
  return (
    <ol start={start} aria-labelledby={labelledBy} className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
      {problems.map((p, i) => (
        <li key={p.slug} className="cv-auto flex min-h-11 items-center gap-3 px-3 py-2 hover:bg-surface-2/60 sm:px-4">
          <span className="w-7 shrink-0 text-right font-mono text-[11px] text-ink-faint tabular">{start + i}</span>
          <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
            <Link href={`/learn/problems/${p.slug}`} className="block truncate text-[14px] text-ink hover:text-accent-text sm:flex-1">
              {p.title}
            </Link>
            {showPattern && p.patternName ? <span className="block truncate text-[12px] text-ink-subtle sm:w-40 sm:shrink-0">{p.patternName}</span> : null}
          </div>
          {trailing?.(p, i)}
          <DifficultyLabel difficulty={p.difficulty} className="w-14 shrink-0 text-right" />
        </li>
      ))}
    </ol>
  );
}

/** Conversion card: signed-out visitors start free, signed-in users jump to the same list in the app. */
export function TrackCta({ title, body, appHref, className }: { title: string; body: string; appHref: string; className?: string }) {
  return (
    <aside className={cn("flex flex-col items-start gap-5 rounded-xl border border-line bg-surface-1 p-6 hairline-top sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h2>
        <p className="mt-1 max-w-[56ch] text-[14px] leading-relaxed text-ink-subtle">{body}</p>
      </div>
      <Show when="signed-out">
        <Button asChild variant="primary" size="md">
          <Link href="/sign-up">
            Start Free <ArrowRight size={14} aria-hidden />
          </Link>
        </Button>
      </Show>
      <Show when="signed-in">
        <Button asChild variant="primary" size="md">
          <Link href={appHref}>
            Open in Recode <ArrowRight size={14} aria-hidden />
          </Link>
        </Button>
      </Show>
    </aside>
  );
}

export function LinkChips({ items, label }: { items: { href: string; label: string; meta?: React.ReactNode }[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {items.map((it) => (
        <li key={it.href}>
          <Link
            href={it.href}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-surface-1 px-2.5 py-1.5 text-[13px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            {it.label}
            {it.meta !== undefined ? <span className="font-mono text-[11px] text-ink-faint tabular">{it.meta}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
