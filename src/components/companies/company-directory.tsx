"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/ssr";
import { Input } from "@/components/ui/field";

type Company = { slug: string; name: string; total: number; solved: number };

export function CompanyDirectory({ companies }: { companies: Company[] }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const list = deferred ? companies.filter((c) => c.name.toLowerCase().includes(deferred)) : companies;

  return (
    <div>
      <div className="relative max-w-sm">
        <MagnifyingGlass size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle" aria-hidden />
        <label htmlFor="company-search" className="sr-only">
          Search companies
        </label>
        <Input
          id="company-search"
          name="company"
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search 464 companies…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <p className="mt-3 text-[12px] text-ink-subtle" aria-live="polite">
        {list.length} {list.length === 1 ? "company" : "companies"}
      </p>
      {list.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-subtle">No company matches “{query}”.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <li key={c.slug} className="cv-auto bg-surface-1">
              <Link href={`/companies/${c.slug}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-[12px] font-semibold text-ink-muted">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{c.name}</span>
                <span className="font-mono text-[12px] text-ink-subtle tabular">
                  {c.solved > 0 ? <span className="text-ink">{c.solved}</span> : c.solved}/{c.total}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
