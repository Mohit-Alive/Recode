"use client";

import { useEffect } from "react";
import { syncTimezone } from "@/actions/settings";

/** Keeps "today" aligned with the user's wall clock unless they pinned a time zone. */
export function TimezoneSync({ current, locked }: { current: string; locked: boolean }) {
  useEffect(() => {
    if (locked) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== current) void syncTimezone(tz);
  }, [current, locked]);
  return null;
}
