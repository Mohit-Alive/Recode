import Link from "next/link";
import { Lightning } from "@phosphor-icons/react/ssr";
import { PageContainer } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { DrillSession } from "@/components/drills/drill-session";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { getDrillSession } from "@/server/queries";

export const metadata = { title: "Pattern drills" };

export default async function DrillsPage() {
  const user = await requireUser();
  const now = await getNow();
  const session = await getDrillSession(user, now);

  if (session.unlockedCount === 0) {
    return (
      <PageContainer className="flex max-w-[560px] flex-col items-center py-24 text-center">
        <Lightning size={36} weight="fill" className="text-accent-text" aria-hidden />
        <h1 className="mt-5 text-[22px] font-semibold tracking-tight">Drills unlock with your first solve</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-subtle">
          Drills ask you to spot the pattern behind problems from topics you have started, including ones you have not solved yet.
        </p>
        <Button asChild variant="primary" className="mt-8">
          <Link href="/today">Find a Problem to Solve</Link>
        </Button>
      </PageContainer>
    );
  }

  return (
    <DrillSession
      key={session.drilledToday}
      items={session.items.map((i) => ({ problemId: i.problemId, slug: i.slug, title: i.title, difficulty: i.difficulty, patternId: i.patternId, solved: i.solved, options: i.options }))}
      patterns={session.patterns.map((p) => ({ id: p.id, name: p.name, cue: p.cue }))}
    />
  );
}
