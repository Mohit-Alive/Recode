import { asc } from "drizzle-orm";
import { db } from "@/db";
import { sheets } from "@/db/schema";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Section, SettingsForm } from "@/components/settings/settings-form";
import { LeetCodeLink } from "@/components/settings/leetcode-link";
import { DangerZone } from "@/components/settings/danger-zone";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const sheetList = await db.select({ slug: sheets.slug, name: sheets.name }).from(sheets).orderBy(asc(sheets.position));
  return (
    <PageContainer className="max-w-[860px]">
      <PageHeader title="Settings" />
      <div className="mt-8">
        <SettingsForm
          email={user.email}
          sheets={sheetList}
          initial={{
            desiredRetention: user.desiredRetention,
            dailyMinutes: user.dailyMinutes,
            newPerDay: user.newPerDay,
            activeSheetSlug: user.activeSheetSlug,
            timezone: user.timezone,
            emailReminders: user.emailReminders,
            reminderHour: user.reminderHour,
          }}
        />
        <Section title="LeetCode" description="Link your profile to turn accepted submissions into one-click log suggestions.">
          <LeetCodeLink username={user.leetcodeUsername} verified={user.leetcodeVerified} token={user.leetcodeVerifyToken} />
        </Section>
        <Section title="Danger zone">
          <DangerZone />
        </Section>
      </div>
    </PageContainer>
  );
}
