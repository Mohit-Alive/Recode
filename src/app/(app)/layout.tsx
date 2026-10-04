import type { Metadata } from "next";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileTabBar, MobileTopBar } from "@/components/shell/mobile-nav";
import { CommandMenu } from "@/components/shell/command-menu";
import { TimezoneSync } from "@/components/shell/timezone-sync";
import { DevClock } from "@/components/shell/dev-clock";
import { requireUser } from "@/server/auth";
import { getNow, getTimeOffsetDays } from "@/server/clock";
import { getShellData } from "@/server/queries";
import { currentStreak } from "@/lib/streak";
import { dayKey } from "@/lib/time";

// Signed-in app: personal data, never indexed. The public catalog lives under /learn.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const now = await getNow();
  const { dueCount } = await getShellData(user, now);
  const streak = currentStreak(
    { current: user.streakCurrent, best: user.streakBest, freezes: user.streakFreezes, lastActiveOn: user.lastActiveOn },
    dayKey(now, user.timezone),
  );

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-surface-2 focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <Sidebar dueCount={dueCount} streak={streak} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main id="main" className="flex-1 pb-24 md:pb-0">
          {children}
        </main>
      </div>
      <MobileTabBar dueCount={dueCount} />
      <CommandMenu />
      <TimezoneSync current={user.timezone} locked={user.timezoneLocked} />
      {process.env.NODE_ENV !== "production" ? <DevClock offset={await getTimeOffsetDays()} /> : null}
    </div>
  );
}
