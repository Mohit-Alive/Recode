import { cn } from "@/lib/cn";

/** Company lists included, as a slow CSS marquee. Paused for reduced motion and on hover. */
export function CompanyMarquee({ companies }: { companies: { name: string; total: number }[] }) {
  const row = (hidden: boolean) => (
    <ul className={cn("flex shrink-0 items-center gap-8 pr-8")} aria-hidden={hidden || undefined}>
      {companies.map((c) => (
        <li key={c.name} className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-[15px] font-medium text-ink-muted">{c.name}</span>
          <span className="font-mono text-[11px] text-ink-faint tabular">{c.total}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
      <div className="flex animate-[marquee_60s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
