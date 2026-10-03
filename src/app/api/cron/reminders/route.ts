import { and, asc, eq, lte } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db";
import { problems, userProblems, users } from "@/db/schema";
import { dailyDigest } from "@/emails/daily-digest";
import { retrievability } from "@/lib/srs/fsrs";
import { currentStreak } from "@/lib/streak";
import { dayKey, endOfLocalDay, localHour } from "@/lib/time";

export const maxDuration = 60;

/**
 * Hourly (Vercel Cron). Emails each opted-in user whose local hour matches their reminder hour
 * and who has reviews due. Idempotent per local day via users.last_reminder_sent_on, because
 * cron delivery can repeat.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const from = process.env.EMAIL_FROM ?? "Recode <reminders@example.com>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const now = new Date();
  const force = new URL(req.url).searchParams.get("force") === "1" && process.env.NODE_ENV !== "production";

  const candidates = await db.select().from(users).where(eq(users.emailReminders, true));

  let sent = 0;
  const skipped: string[] = [];
  for (const user of candidates) {
    if (!user.email) continue;
    const today = dayKey(now, user.timezone);
    if (user.lastReminderSentOn === today) continue;
    if (!force && localHour(now, user.timezone) !== user.reminderHour) continue;

    const due = await db
      .select({ title: problems.title, difficulty: problems.difficulty, card: userProblems })
      .from(userProblems)
      .innerJoin(problems, eq(problems.id, userProblems.problemId))
      .where(and(eq(userProblems.userId, user.id), lte(userProblems.due, endOfLocalDay(now, user.timezone))))
      .orderBy(asc(userProblems.due));
    if (due.length === 0) continue;

    const items = due
      .map((d) => ({ title: d.title, difficulty: d.difficulty, r: retrievability(d.card, now, user.desiredRetention) }))
      .sort((a, b) => a.r - b.r)
      .slice(0, 5);
    const streak = currentStreak(
      { current: user.streakCurrent, best: user.streakBest, freezes: user.streakFreezes, lastActiveOn: user.lastActiveOn },
      today,
    );
    const email = dailyDigest({ name: user.name, due: due.length, items, streak, appUrl });

    if (resend) {
      const { error } = await resend.emails.send({ from, to: user.email, subject: email.subject, html: email.html, text: email.text });
      if (error) {
        skipped.push(user.id);
        continue;
      }
    } else {
      console.info(`[reminders] RESEND_API_KEY missing; would email ${user.email}: ${email.subject}`);
    }
    await db.update(users).set({ lastReminderSentOn: today }).where(eq(users.id, user.id));
    sent++;
  }
  return Response.json({ ok: true, sent, failed: skipped.length });
}
