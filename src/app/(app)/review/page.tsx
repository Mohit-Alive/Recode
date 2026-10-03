import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react/ssr";
import { PageContainer } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { getToday } from "@/server/queries";

export const metadata = { title: "Review" };

/** Sends the user to the next problem in today's interleaved queue, or shows the finish screen. */
export default async function NextReviewPage(props: PageProps<"/review">) {
  const sp = await props.searchParams;
  const all = sp.all === "1";
  const user = await requireUser();
  const now = await getNow();
  const t = await getToday(user, now);
  const next = t.reviews[0] ?? (all ? t.deferred[0] : undefined);
  if (next) redirect(`/review/${next.slug}${all ? "?all=1" : ""}`);

  return (
    <PageContainer className="flex max-w-[560px] flex-col items-center py-24 text-center">
      <CheckCircle size={40} weight="fill" className="text-accent-text" aria-hidden />
      <h1 className="mt-5 text-[24px] font-semibold tracking-tight">Reviews done</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-subtle">
        {t.reviewsDone > 0
          ? `${t.reviewsDone} ${t.reviewsDone === 1 ? "problem" : "problems"} refreshed today. Each one is now scheduled further out than before.`
          : "Nothing is due right now."}
        {t.deferred.length > 0 ? ` ${t.deferred.length} more are waiting past your daily budget.` : ""}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button asChild variant="primary">
          <Link href="/drills">Pattern Drills</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/today">Back to Today</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
