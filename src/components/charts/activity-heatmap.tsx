"use client";

import { useTheme } from "@/components/theme/theme-provider";
import { ActivityCalendar, type Activity } from "react-activity-calendar";
import "react-activity-calendar/tooltips.css";

// Sequential single-hue ramp (lavender), stepped separately per theme. Mirrors --heat-* tokens.
const THEME = {
  light: ["#eceef0", "#d6daf6", "#aab2ec", "#7d88df", "#5e6ad2"],
  dark: ["#16171a", "#262a4a", "#363f80", "#4b56b4", "#7c87ec"],
};

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function ActivityHeatmap({ data }: { data: (Activity & { solves: number; reviews: number; drills: number })[] }) {
  const { resolvedTheme } = useTheme();
  const lookup = new Map(data.map((d) => [d.date, d]));
  return (
    <ActivityCalendar
      data={data}
      theme={THEME}
      colorScheme={resolvedTheme === "light" ? "light" : "dark"}
      blockSize={11}
      blockMargin={3}
      blockRadius={2}
      fontSize={11}
      maxLevel={4}
      showTotalCount={false}
      labels={{ legend: { less: "Less", more: "More" } }}
      tooltips={{
        activity: {
          text: (a) => {
            const d = lookup.get(a.date);
            const day = dateFmt.format(new Date(`${a.date}T00:00:00Z`));
            if (!d || a.count === 0) return `${day}: no activity`;
            const parts = [d.reviews && `${d.reviews} reviews`, d.solves && `${d.solves} new`, d.drills && `${d.drills} drills`].filter(Boolean);
            return `${day}: ${parts.join(", ")}`;
          },
        },
      }}
      style={{ color: "var(--ink-subtle)" }}
    />
  );
}
