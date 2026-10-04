import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shell/logo";

// Auth screens carry no content worth ranking.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" aria-label="Recode home">
        <Logo />
      </Link>
      {children}
    </div>
  );
}
