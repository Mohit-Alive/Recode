"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Fire, MagnifyingGlass } from "@phosphor-icons/react/ssr";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { NAV, SETTINGS_NAV } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { openCommandMenu } from "./command-menu";

export function Sidebar({ dueCount, streak }: { dueCount: number; streak: number }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-line bg-canvas px-3 py-4 md:flex">
      <Link href="/today" className="mx-2 mb-5 rounded-md" aria-label="Recode home">
        <Logo />
      </Link>

      <button
        type="button"
        onClick={openCommandMenu}
        className="mb-4 flex h-8 items-center gap-2 rounded-md border border-line bg-surface-1 px-2.5 text-[13px] text-ink-subtle transition-colors hover:border-line-strong hover:text-ink-muted"
      >
        <MagnifyingGlass size={14} aria-hidden />
        <span className="flex-1 text-left">Search problems…</span>
        <Kbd>⌘&nbsp;K</Kbd>
      </button>

      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors",
                active ? "bg-surface-2 text-ink" : "text-ink-subtle hover:bg-surface-2/60 hover:text-ink",
              )}
            >
              <Icon size={16} weight={active ? "fill" : "regular"} className={active ? "text-accent-text" : ""} aria-hidden />
              <span className="flex-1">{label}</span>
              {href === "/today" && dueCount > 0 ? (
                <span className="rounded-[4px] bg-surface-3 px-1.5 font-mono text-[11px] text-ink-muted tabular" aria-label={`${dueCount} reviews due`}>
                  {dueCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="mx-2.5 flex items-center gap-2 text-[13px] text-ink-subtle" title="Days in a row with at least one review or solve">
          <Fire size={15} weight={streak > 0 ? "fill" : "regular"} className={streak > 0 ? "text-fading" : ""} aria-hidden />
          <span className="tabular">
            <span className="text-ink">{streak}</span> day streak
          </span>
        </div>
        <Link
          href={SETTINGS_NAV.href}
          aria-current={isActive(SETTINGS_NAV.href) ? "page" : undefined}
          className={cn(
            "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors",
            isActive(SETTINGS_NAV.href) ? "bg-surface-2 text-ink" : "text-ink-subtle hover:bg-surface-2/60 hover:text-ink",
          )}
        >
          <SETTINGS_NAV.icon size={16} aria-hidden />
          Settings
        </Link>
        <div className="flex items-center justify-between border-t border-line px-1 pt-3">
          <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
