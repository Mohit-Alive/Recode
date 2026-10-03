import "server-only";
import { cookies } from "next/headers";

export const TIME_OFFSET_COOKIE = "recode-time-offset";

/**
 * The current instant. In development a `recode-time-offset` cookie (whole days) shifts the clock,
 * so the whole spaced-repetition loop can be exercised without waiting for reviews to come due.
 */
export async function getNow(): Promise<Date> {
  if (process.env.NODE_ENV === "production") return new Date();
  const raw = (await cookies()).get(TIME_OFFSET_COOKIE)?.value;
  const days = raw ? Number(raw) : 0;
  return new Date(Date.now() + (Number.isFinite(days) ? days : 0) * 86_400_000);
}

export async function getTimeOffsetDays(): Promise<number> {
  if (process.env.NODE_ENV === "production") return 0;
  const raw = (await cookies()).get(TIME_OFFSET_COOKIE)?.value;
  return raw && Number.isFinite(Number(raw)) ? Number(raw) : 0;
}
