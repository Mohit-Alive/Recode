"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSettings, type SettingsInput } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Hint, Label } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

const W20 = 0.1542; // FSRS-6 default decay

/** Relative review workload versus a 90% target: shorter intervals mean more reviews. */
function workload(retention: number) {
  const interval = (r: number) => Math.pow(r, -1 / W20) - 1;
  return interval(0.9) / interval(retention);
}

export function SettingsForm({
  initial,
  sheets,
  email,
}: {
  initial: SettingsInput;
  sheets: { slug: string; name: string }[];
  email: string | null;
}) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const timeZones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [initial.timezone];
    }
  }, [initial.timezone]);
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  const hourFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", timeZone: "UTC" });
  const set = <K extends keyof SettingsInput>(k: K, value: SettingsInput[K]) => setV((s) => ({ ...s, [k]: value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateSettings(v);
          if (res.ok) toast.success("Settings saved.");
          else toast.error(res.error);
        });
      }}
      className="flex flex-col"
    >
      <Section title="Memory" description="How hard Recode works to keep problems fresh.">
        <Field>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="retention">Recall target</Label>
            <span className="font-mono text-[13px] text-ink tabular">{Math.round(v.desiredRetention * 100)}%</span>
          </div>
          <input
            id="retention"
            name="retention"
            type="range"
            min={80}
            max={97}
            step={1}
            value={Math.round(v.desiredRetention * 100)}
            onChange={(e) => set("desiredRetention", Number(e.target.value) / 100)}
            className="mt-3 w-full accent-[var(--accent)]"
          />
          <Hint className="mt-2">
            Reviews are scheduled when recall would drop below this. At {Math.round(v.desiredRetention * 100)}% you will do about{" "}
            <span className="font-mono text-ink-muted">{workload(v.desiredRetention).toFixed(1)}×</span> the reviews of a 90% target.
            85 to 92% is the sweet spot.
          </Hint>
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <Label htmlFor="minutes">Daily review budget</Label>
            <div className="mt-2 flex items-center gap-2">
              <select
                id="minutes"
                name="minutes"
                value={v.dailyMinutes}
                onChange={(e) => set("dailyMinutes", Number(e.target.value))}
                className="h-9 w-full rounded-md border border-line px-3 text-sm"
              >
                {[15, 20, 30, 45, 60, 90, 120, 180].map((m) => (
                  <option key={m} value={m}>
                    {m < 60 ? `${m} minutes` : `${m / 60} ${m === 60 ? "hour" : "hours"}`}
                  </option>
                ))}
              </select>
            </div>
            <Hint className="mt-2">Due reviews beyond this roll over to tomorrow, weakest first.</Hint>
          </Field>
          <Field>
            <Label htmlFor="new">New problems per day</Label>
            <select
              id="new"
              name="new"
              value={v.newPerDay}
              onChange={(e) => set("newPerDay", Number(e.target.value))}
              className="mt-2 h-9 w-full rounded-md border border-line px-3 text-sm"
            >
              {[0, 1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <Hint className="mt-2">Every new problem adds future reviews, so more is not always faster.</Hint>
          </Field>
          <Field>
            <Label htmlFor="sheet">New problems come from</Label>
            <select
              id="sheet"
              name="sheet"
              value={v.activeSheetSlug}
              onChange={(e) => set("activeSheetSlug", e.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-line px-3 text-sm"
            >
              {sheets.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <Label htmlFor="tz">Time zone</Label>
            <select
              id="tz"
              name="tz"
              value={v.timezone}
              onChange={(e) => set("timezone", e.target.value)}
              className="mt-2 h-9 w-full rounded-md border border-line px-3 text-sm"
            >
              {timeZones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <Hint className="mt-2">Decides when your day starts and ends.</Hint>
          </Field>
        </div>
      </Section>

      <Section title="Reminders" description={email ? `Sent to ${email} on days with reviews due.` : "Sent on days with reviews due."}>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="remind">Daily email when reviews are due</Label>
          <Switch id="remind" checked={v.emailReminders} onCheckedChange={(c) => set("emailReminders", c)} />
        </div>
        <Field>
          <Label htmlFor="hour">Send at</Label>
          <select
            id="hour"
            name="hour"
            disabled={!v.emailReminders}
            value={v.reminderHour}
            onChange={(e) => set("reminderHour", Number(e.target.value))}
            className="mt-2 h-9 w-full max-w-xs rounded-md border border-line px-3 text-sm disabled:opacity-50"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {hourFmt.format(new Date(Date.UTC(2026, 0, 1, h)))}
              </option>
            ))}
          </select>
          <Hint className="mt-2">In your time zone.</Hint>
        </Field>
      </Section>

      <div className="sticky bottom-20 z-10 mt-2 flex justify-end md:bottom-4">
        <Button type="submit" variant="primary" disabled={!dirty || pending}>
          {pending ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-line py-8 first:pt-0 md:grid-cols-[220px_1fr]">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-[13px] leading-relaxed text-ink-subtle">{description}</p> : null}
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col">{children}</div>;
}
