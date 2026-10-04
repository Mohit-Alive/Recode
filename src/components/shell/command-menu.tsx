"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog as D } from "radix-ui";
import { useTheme } from "@/components/theme/theme-provider";
import { Buildings, CircleHalf, Code, ListChecks, MagnifyingGlass } from "@phosphor-icons/react/ssr";
import type { Difficulty } from "@/db/schema";
import { DifficultyLabel } from "@/components/problems/difficulty";
import { Kbd } from "@/components/ui/kbd";
import { NAV, SETTINGS_NAV } from "./nav-items";
import { CURATED_SHEET_NAMES } from "@/data/sheet-names";

const EVENT = "recode:command-menu";
export const openCommandMenu = () => window.dispatchEvent(new Event(EVENT));

type Results = {
  problems: { slug: string; title: string; difficulty: Difficulty }[];
  companies: { slug: string; name: string; total: number }[];
};

const SHEETS = CURATED_SHEET_NAMES;

export function CommandMenu() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>({ problems: [], companies: [] });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { problems: [], companies: [] }))
        .then(setResults)
        .catch(() => {});
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };
  const hasQuery = query.trim().length > 0;

  const item =
    "flex h-10 cursor-pointer items-center gap-3 rounded-md px-3 text-[14px] text-ink-muted data-[selected=true]:bg-surface-3 data-[selected=true]:text-ink";
  const group = "px-1.5 pb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:text-ink-faint";

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-[fade-in_120ms_ease-out]" />
        <D.Content
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden overscroll-contain rounded-xl border border-line bg-surface-1 hairline-top data-[state=open]:animate-[pop-in_140ms_var(--ease-out-quint)]"
        >
          <D.Title className="sr-only">Command menu</D.Title>
          <Command shouldFilter={!hasQuery} loop>
            <div className="flex items-center gap-2.5 border-b border-line px-4">
              <MagnifyingGlass size={16} className="text-ink-subtle" aria-hidden />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search problems, companies, pages…"
                className="h-12 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
              />
              <Kbd>esc</Kbd>
            </div>
            <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain py-1">
              <Command.Empty className="px-4 py-8 text-center text-sm text-ink-subtle">No matches for “{query}”.</Command.Empty>

              {hasQuery && results.problems.length > 0 ? (
                <Command.Group heading="Problems" className={group}>
                  {results.problems.map((p) => (
                    <Command.Item key={p.slug} value={`p:${p.slug}`} onSelect={() => go(`/problems/${p.slug}`)} className={item}>
                      <Code size={15} aria-hidden />
                      <span className="flex-1 truncate">{p.title}</span>
                      <DifficultyLabel difficulty={p.difficulty} />
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}
              {hasQuery && results.companies.length > 0 ? (
                <Command.Group heading="Companies" className={group}>
                  {results.companies.map((c) => (
                    <Command.Item key={c.slug} value={`c:${c.slug}`} onSelect={() => go(`/companies/${c.slug}`)} className={item}>
                      <Buildings size={15} aria-hidden />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="font-mono text-[12px] text-ink-faint tabular">{c.total}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {!hasQuery ? (
                <>
                  <Command.Group heading="Go to" className={group}>
                    {[...NAV, SETTINGS_NAV].map(({ href, label, icon: Icon }) => (
                      <Command.Item key={href} value={label} onSelect={() => go(href)} className={item}>
                        <Icon size={15} aria-hidden />
                        {label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Sheets" className={group}>
                    {SHEETS.map((s) => (
                      <Command.Item key={s.slug} value={s.name} onSelect={() => go(`/sheets/${s.slug}`)} className={item}>
                        <ListChecks size={15} aria-hidden />
                        {s.name}
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Preferences" className={group}>
                    <Command.Item
                      value="Toggle theme"
                      onSelect={() => {
                        setTheme(resolvedTheme === "dark" ? "light" : "dark");
                        setOpen(false);
                      }}
                      className={item}
                    >
                      <CircleHalf size={15} aria-hidden />
                      Switch to {resolvedTheme === "dark" ? "light" : "dark"} theme
                    </Command.Item>
                  </Command.Group>
                </>
              ) : null}
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
