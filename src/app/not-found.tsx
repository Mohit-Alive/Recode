import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Graph } from "@phosphor-icons/react/ssr";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { ForgottenCurve } from "@/components/not-found/forgotten-curve";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

/** Global 404. Self-contained (no database reads) so it renders even when everything else fails. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <header className="mx-auto flex h-16 w-full max-w-[1200px] items-center px-4 sm:px-8">
        <Link href="/" aria-label="Recode home">
          <Logo />
        </Link>
      </header>

      <main id="main" className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-[600px] px-4 pt-6 pb-20 text-center sm:px-8">
          <p className="font-mono text-[12px] tracking-[0.04em] text-ink-subtle motion-safe:animate-[fade-in_0.5s_ease-out_both]">Error 404</p>
          <h1 className="mt-3 text-[34px] leading-[1.08] font-semibold tracking-[-0.035em] text-balance text-ink motion-safe:animate-[fade-in_0.6s_ease-out_0.05s_both] sm:text-[44px]">
            This page slipped out of memory.
          </h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-pretty text-ink-subtle motion-safe:animate-[fade-in_0.6s_ease-out_0.1s_both]">
            Nobody reviewed it, so it faded. Or it never existed. Either way, there is nothing here to re-solve.
          </p>

          <ForgottenCurve className="mt-10 motion-safe:animate-[fade-in_0.6s_ease-out_0.15s_both]" />

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="/">
                <ArrowLeft size={15} aria-hidden /> Back to Home
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/learn/patterns">
                <Graph size={15} aria-hidden /> Explore Patterns
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
