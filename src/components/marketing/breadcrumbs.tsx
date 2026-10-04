import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/ssr";
import type { Crumb } from "@/lib/seo/schema";

/** Visible trail; the matching BreadcrumbList is emitted in the page's JSON-LD graph. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1 text-[12.5px] text-ink-subtle">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.path} className="flex min-w-0 items-center gap-1">
              {last ? (
                <span aria-current="page" className="truncate text-ink-muted">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link href={c.path} className="hover:text-ink">
                    {c.name}
                  </Link>
                  <CaretRight size={11} aria-hidden className="text-ink-faint" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
