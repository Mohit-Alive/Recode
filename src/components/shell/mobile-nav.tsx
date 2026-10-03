"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { GearSix, MagnifyingGlass } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { NAV } from "./nav-items";
import { openCommandMenu } from "./command-menu";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-canvas/90 px-4 backdrop-blur md:hidden">
      <Link href="/today" aria-label="Recode home" className="mr-auto">
        <Logo />
      </Link>
      <button
        type="button"
        onClick={openCommandMenu}
        aria-label="Search"
        className="grid size-9 place-items-center rounded-md text-ink-subtle hover:bg-surface-2 hover:text-ink"
      >
        <MagnifyingGlass size={18} aria-hidden />
      </button>
      <Link href="/settings" aria-label="Settings" className="grid size-9 place-items-center rounded-md text-ink-subtle hover:bg-surface-2 hover:text-ink">
        <GearSix size={18} aria-hidden />
      </Link>
      <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
    </header>
  );
}

export function MobileTabBar({ dueCount }: { dueCount: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {NAV.filter((n) => n.mobile).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("relative flex h-14 flex-col items-center justify-center gap-1 text-[11px]", active ? "text-ink" : "text-ink-subtle")}
          >
            <Icon size={20} weight={active ? "fill" : "regular"} className={active ? "text-accent-text" : ""} aria-hidden />
            {label}
            {href === "/today" && dueCount > 0 ? (
              <span className="absolute top-1.5 left-1/2 ml-2 rounded-[4px] bg-accent px-1 font-mono text-[10px] leading-4 text-accent-ink">
                {dueCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
