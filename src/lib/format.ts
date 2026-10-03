export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const COMPANY_NAME_OVERRIDES: Record<string, string> = {
  tcs: "TCS",
  oyo: "OYO",
  jio: "Jio",
  blinkit: "Blinkit",
  carwale: "CarWale",
  ciena: "Ciena",
  fourkites: "FourKites",
  instabase: "Instabase",
  opentext: "OpenText",
  razorpay: "Razorpay",
  smartnews: "SmartNews",
  thoughtspot: "ThoughtSpot",
  "josh technology": "Josh Technology",
  "persistent systems": "Persistent Systems",
  "zeta suite": "Zeta Suite",
};

export function companyDisplayName(raw: string): string {
  return COMPANY_NAME_OVERRIDES[raw] ?? raw;
}

export const DIFFICULTY_LABEL = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" } as const;

const numberFmt = new Intl.NumberFormat("en-US");
export const formatNumber = (n: number) => numberFmt.format(n);

const pctFmt = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 0 });
export const formatPercent = (fraction: number) => pctFmt.format(fraction);

/** "today", "tomorrow", "in 9 days", "3 days ago" relative to day boundaries. */
export function formatDayDelta(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) {
    if (days < 45) return `in ${days} days`;
    const months = Math.round(days / 30);
    return months < 12 ? `in ${months} mo` : `in ${(days / 365).toFixed(1)} yr`;
  }
  return `${-days} days ago`;
}

/** Compact interval for keycaps and tables: "1d", "9d", "3mo", "1.2y". */
export function formatInterval(days: number): string {
  if (days < 1) return "<1d";
  if (days < 45) return `${Math.round(days)}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
