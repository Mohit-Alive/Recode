import { fromZonedTime } from "date-fns-tz";

/** Local calendar day ("YYYY-MM-DD") of an instant in a time zone. */
export function dayKey(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Last millisecond of the local day containing `date`. Reviews due before this are "due today". */
export function endOfLocalDay(date: Date, timeZone: string): Date {
  return fromZonedTime(`${dayKey(date, timeZone)}T23:59:59.999`, timeZone);
}

export function startOfLocalDay(date: Date, timeZone: string): Date {
  return fromZonedTime(`${dayKey(date, timeZone)}T00:00:00.000`, timeZone);
}

export function addDaysToKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole calendar days from `a` to `b` (b - a). */
export function diffDayKeys(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Hour of day (0-23) for an instant in a time zone. */
export function localHour(date: Date, timeZone: string): number {
  try {
    const h = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(date);
    return Number(h) % 24;
  } catch {
    return date.getUTCHours();
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
