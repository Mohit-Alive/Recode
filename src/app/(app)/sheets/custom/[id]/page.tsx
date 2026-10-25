import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CaretLeft, GearSix } from "@phosphor-icons/react/ssr";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { AddLinksForm } from "@/components/custom-sheets/add-links-form";
import { CustomItemRowView } from "@/components/custom-sheets/item-row";
import { SheetFormDialog } from "@/components/custom-sheets/sheet-form-dialog";
import { requireUser } from "@/server/auth";
import { getNow } from "@/server/clock";
import { getCustomSheet, type CustomItemRow } from "@/server/queries";
import { formatDayDelta, formatPercent } from "@/lib/format";
import { gapLabel } from "@/lib/srs/pace";
import { addDaysToKey, dayKey } from "@/lib/time";

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata(props: PageProps<"/sheets/custom/[id]">) {
  const { id } = await props.params;
  const sheetId = parseId(id);
  if (!sheetId) return { title: "Sheet" };
  const user = await requireUser();
  const data = await getCustomSheet(sheetId, user, await getNow());
  return { title: data?.sheet.name ?? "Sheet" };
}

export default async function CustomSheetPage(props: PageProps<"/sheets/custom/[id]">) {
  const { id } = await props.params;
  const sheetId = parseId(id);
  if (!sheetId) notFound();
  const user = await requireUser();
  const now = await getNow();
  const data = await getCustomSheet(sheetId, user, now);
  if (!data) notFound();
  const { sheet, items, queue } = data;

  const retention = items.length ? items.reduce((a, i) => a + i.r, 0) / items.length : null;
  const upcoming = items.filter((i) => i.dueInDays > 0).map((i) => i.dueInDays);
  const nextDue = upcoming.length ? Math.min(...upcoming) : null;

  const today = dayKey(now, user.timezone);
  const yesterday = addDaysToKey(today, -1);
  const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const label = (key: string) => (key === today ? "Today" : key === yesterday ? "Yesterday" : dayFmt.format(new Date(`${key}T00:00:00Z`)));
  const groups: { day: string; items: CustomItemRow[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last?.day === item.solvedOn) last.items.push(item);
    else groups.push({ day: item.solvedOn, items: [item] });
  }

  return (
    <PageContainer>
      <Link href="/sheets" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-subtle hover:text-ink">
        <CaretLeft size={13} aria-hidden /> Sheets
      </Link>
      <PageHeader
        title={sheet.name}
        description={sheet.description ?? "Your own sheet. It keeps its own memory and review schedule, apart from every other sheet."}
        actions={
          <>
            <SheetFormDialog sheet={{ ...sheet, total: items.length }}>
              <Button variant="secondary">
                <GearSix size={15} aria-hidden /> Settings
              </Button>
            </SheetFormDialog>
            {queue.length > 0 ? (
              <Button asChild variant="primary">
                <Link href={`/sheets/custom/${sheet.id}/review`}>
                  Review {queue.length} Due <ArrowRight size={14} aria-hidden />
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <dl className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-[13px]">
        <div>
          <dt className="text-ink-subtle">Tracked</dt>
          <dd className="font-mono text-ink tabular">{items.length}</dd>
        </div>
        <div>
          <dt className="text-ink-subtle">Avg. recall</dt>
          <dd className="font-mono text-ink tabular">{retention === null ? "-" : formatPercent(retention)}</dd>
        </div>
        <div>
          <dt className="text-ink-subtle">Due for review</dt>
          <dd className="font-mono text-ink tabular">{queue.length}</dd>
        </div>
        <div>
          <dt className="text-ink-subtle">Next review</dt>
          <dd className="text-ink">{queue.length > 0 ? "Now" : nextDue === null ? "-" : formatDayDelta(nextDue)}</dd>
        </div>
        <div>
          <dt className="text-ink-subtle">Pace</dt>
          <dd className="text-ink">
            <span className="font-mono tabular">{formatPercent(sheet.desiredRetention)}</span> recall, gaps up to {gapLabel(sheet.maxInterval)}
          </dd>
        </div>
      </dl>

      <AddLinksForm sheetId={sheet.id} className="mt-8" />

      {groups.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-line px-5 py-8 text-center text-[13px] leading-relaxed text-ink-subtle">
          Nothing tracked yet. Paste the link of a problem you solved today, and its first review gets scheduled on this sheet’s pace.
        </p>
      ) : (
        <div className="mt-10 flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g.day} aria-labelledby={`day-${g.day}`}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 id={`day-${g.day}`} className="text-[15px] font-semibold tracking-tight">
                  <time dateTime={g.day}>{label(g.day)}</time>
                </h2>
                <span className="font-mono text-[12px] text-ink-subtle tabular">
                  {g.items.length} {g.items.length === 1 ? "problem" : "problems"}
                </span>
              </div>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
                {g.items.map((item) => (
                  <CustomItemRowView key={item.id} row={item} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
