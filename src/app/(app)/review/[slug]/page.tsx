import { notFound, redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { patterns } from "@/db/schema";
import { ReviewSession } from "@/components/review/review-session";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { getProblemDetail, getToday } from "@/server/queries";
import { previewIntervals } from "@/lib/srs/fsrs";
import { diffDayKeys, dayKey } from "@/lib/time";

export const metadata = { title: "Review" };

export default async function ReviewPage(props: PageProps<"/review/[slug]">) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const user = await requireUser();
  const now = await getNow();
  const detail = await getProblemDetail(slug, user, now);
  if (!detail) notFound();
  if (!detail.card) redirect(`/problems/${slug}`);

  const [allPatterns, today] = await Promise.all([
    db.select({ id: patterns.id, name: patterns.name, cue: patterns.cue }).from(patterns).orderBy(asc(patterns.position)),
    getToday(user, now),
  ]);
  const queue = [...today.reviews, ...(sp.all === "1" ? today.deferred : [])];
  const position = queue.findIndex((q) => q.slug === slug);
  const card = detail.card;
  const lastReviewedDays = card.lastReview ? diffDayKeys(dayKey(card.lastReview, user.timezone), dayKey(now, user.timezone)) : null;

  return (
    <ReviewSession
      key={`${slug}-${card.reps}`}
      problem={{
        id: detail.problem.id,
        slug,
        title: detail.problem.title,
        difficulty: detail.problem.difficulty,
        url: detail.problem.url,
        patternId: detail.problem.patternId,
        insight: card.insight,
      }}
      patterns={allPatterns}
      intervals={previewIntervals(card, now, user.desiredRetention)}
      recall={detail.problem.r ?? 0}
      lastReviewedDays={lastReviewedDays}
      lapses={card.lapses}
      remaining={position === -1 ? queue.length : queue.length - position - 1}
      nextHref={sp.all === "1" ? "/review?all=1" : "/review"}
    />
  );
}
