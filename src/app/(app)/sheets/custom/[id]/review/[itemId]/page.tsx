import { notFound } from "next/navigation";
import { ReviewSession } from "@/components/review/review-session";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { getCustomReviewItem, getCustomSheet } from "@/server/queries";
import { previewIntervals, retrievability } from "@/lib/srs/fsrs";
import { dayKey, diffDayKeys } from "@/lib/time";

export const metadata = { title: "Review" };

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default async function CustomReviewPage(props: PageProps<"/sheets/custom/[id]/review/[itemId]">) {
  const params = await props.params;
  const sheetId = parseId(params.id);
  const itemId = parseId(params.itemId);
  if (!sheetId || !itemId) notFound();
  const user = await requireUser();
  const now = await getNow();
  const [row, data] = await Promise.all([getCustomReviewItem(sheetId, itemId, user), getCustomSheet(sheetId, user, now)]);
  if (!row || !data) notFound();
  const { item, sheet } = row;

  const position = data.queue.findIndex((q) => q.id === item.id);
  const lastReviewedDays = item.lastReview ? diffDayKeys(dayKey(item.lastReview, user.timezone), dayKey(now, user.timezone)) : null;

  return (
    <ReviewSession
      key={`${item.id}-${item.reps}`}
      problem={{
        id: item.id,
        slug: String(item.id),
        title: item.title,
        difficulty: item.level,
        url: item.url,
        patternId: null,
        insight: item.insight,
      }}
      patterns={[]}
      intervals={previewIntervals(item, now, sheet.desiredRetention, sheet.maxInterval)}
      recall={retrievability(item, now, sheet.desiredRetention)}
      lastReviewedDays={lastReviewedDays}
      lapses={item.lapses}
      remaining={position === -1 ? data.queue.length : data.queue.length - position - 1}
      nextHref={`/sheets/custom/${sheet.id}/review`}
      customItemId={item.id}
      back={{ href: `/sheets/custom/${sheet.id}`, label: sheet.name }}
    />
  );
}
