/** Canonical origin: explicit env first, then Vercel's production domain, then local dev. */
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SITE = {
  name: "Recode",
  url: resolveSiteUrl(),
  title: "Recode: Spaced Repetition for Coding Interview Prep",
  tagline: "Remember every coding problem you solve.",
  description:
    "Free spaced repetition for coding interview prep. Recode schedules every problem you solve for a re-solve right before you would forget it, using the FSRS memory model, and trains you to recognise the 18 core patterns.",
  keywords: [
    "spaced repetition for coding interviews",
    "coding interview prep",
    "DSA revision",
    "algorithm patterns",
    "coding interview patterns",
    "FSRS",
    "data structures and algorithms practice tracker",
  ],
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE.url}/`).toString();
}

/** Only the production deployment should be indexed; previews would duplicate it. */
export const isIndexableDeployment = !process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production";
