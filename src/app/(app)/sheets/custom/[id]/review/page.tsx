import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react/ssr";
import { PageContainer } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { getCustomSheet } from "@/server/queries";
import { formatDayDelta } from "@/lib/format";

export const metadata = { title: "Review" };

/** Sends the user to the weakest due item of this sheet, or shows the finish screen. */
export default async function NextCustomReviewPage(props: PageProps<"/sheets/custom/[id]/review">) {
  const { id } = await props.params;
  const sheetId = Number(id);
  if (!Number.isSafeInteger(sheetId) || sheetId <= 0) notFound();
  const user = await requireUser();
  const now = await getNow();
  const data = await getCustomSheet(sheetId, user, now);
  if (!data) notFound();
  const next = data.queue[0];
  if (next) redirect(`/sheets/custom/${sheetId}/review/${next.id}`);

  const upcoming = data.items.map((i) => i.dueInDays).filter((d) => d > 0);
  const nextDue = upcoming.length ? Math.min(...upcoming) : null;

  return (
    <PageContainer className="flex max-w-[560px] flex-col items-center py-24 text-center">
      <CheckCircle size={40} weight="fill" className="text-accent-text" aria-hidden />
      <h1 className="mt-5 text-[24px] font-semibold tracking-tight">{data.sheet.name} is up to date</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-subtle">
        Nothing in this sheet is due right now.
        {nextDue !== null ? ` The next review comes up ${formatDayDelta(nextDue)}.` : ""}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button asChild variant="primary">
          <Link href={`/sheets/custom/${sheetId}`}>Back to Sheet</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/today">Today</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
