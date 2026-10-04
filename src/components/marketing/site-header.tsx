import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#model", label: "Memory model" },
  { href: "/#science", label: "Science" },
  { href: "/learn/patterns", label: "Patterns" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-canvas/85 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-4 sm:px-8">
        <Link href="/" aria-label="Recode home">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-6 text-[13.5px] text-ink-subtle lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-ink">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <Show when="signed-out">
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild variant="primary" size="sm">
              <Link href="/sign-up">Start Free</Link>
            </Button>
          </Show>
          <Show when="signed-in">
            <Button asChild variant="primary" size="sm">
              <Link href="/today">Open App</Link>
            </Button>
          </Show>
        </div>
      </nav>
    </header>
  );
}
