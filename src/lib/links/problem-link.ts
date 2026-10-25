export type ParsedProblemLink = {
  /** Canonical form used to dedupe within a sheet: https, no www, no query, hash or trailing slash. */
  url: string;
  host: string;
  /** Catalog slug when the link points at a problem Recode already knows, else null. */
  catalogSlug: string | null;
  /** Best-effort title from the path. The user can rename it. */
  title: string;
};

const MAX_URL_LENGTH = 2048;

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "into", "of", "on", "or", "the", "to", "with"]);

/** "minimum-platforms-1587115620" -> "Minimum Platforms". Drops numeric id suffixes that some sites add. */
export function titleFromSlug(slug: string): string {
  const words = decodeSafe(slug)
    .replace(/\.(html?|php|aspx?)$/i, "")
    .split(/[-_+\s]+/)
    .filter(Boolean);
  while (words.length > 1 && /^\d{4,}$/.test(words.at(-1)!)) words.pop();
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      if (/^[ivx]+$/i.test(w) && i > 0) return w.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function decodeSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

type Rule = { host: RegExp; parse: (segments: string[]) => { title: string; catalogSlug?: string; path?: string } | null };

/**
 * Per-site path rules. Each returns a title and, where the site has stable problem URLs, a canonical
 * path so that the same problem pasted twice (with /description/, /1, query strings) is one entry.
 */
const RULES: Rule[] = [
  {
    host: /(^|\.)leetcode\.(com|cn)$/,
    parse: (s) => {
      const i = s.indexOf("problems");
      const slug = i >= 0 ? s[i + 1] : undefined;
      if (!slug) return null;
      return { title: titleFromSlug(slug), catalogSlug: slug.toLowerCase(), path: `/problems/${slug.toLowerCase()}` };
    },
  },
  {
    host: /(^|\.)geeksforgeeks\.org$/,
    parse: (s) => {
      if (s[0] === "problems" && s[1]) return { title: titleFromSlug(s[1]), path: `/problems/${s[1].toLowerCase()}` };
      const slug = s.filter((x) => !/^\d+$/.test(x)).at(-1);
      return slug ? { title: titleFromSlug(slug) } : null;
    },
  },
  {
    host: /(^|\.)codeforces\.com$/,
    parse: (s) => {
      // /problemset/problem/1850/A, /contest/1850/problem/A, /gym/104114/problem/B
      const p = s.indexOf("problem");
      if (p >= 0 && s[0] === "problemset" && s[p + 1] && s[p + 2]) return { title: `Problem ${s[p + 1]}${s[p + 2].toUpperCase()}` };
      if (p >= 2 && s[p + 1]) return { title: `Problem ${s[p - 1]}${s[p + 1].toUpperCase()}` };
      return null;
    },
  },
  {
    host: /(^|\.)hackerrank\.com$/,
    parse: (s) => {
      const i = s.indexOf("challenges");
      return i >= 0 && s[i + 1] ? { title: titleFromSlug(s[i + 1]), path: `/challenges/${s[i + 1].toLowerCase()}/problem` } : null;
    },
  },
  {
    host: /(^|\.)atcoder\.jp$/,
    parse: (s) => {
      const i = s.indexOf("tasks");
      return i >= 0 && s[i + 1] ? { title: s[i + 1].replace(/_/g, " ").toUpperCase() } : null;
    },
  },
  {
    host: /(^|\.)codechef\.com$/,
    parse: (s) => {
      const i = s.indexOf("problems");
      return i >= 0 && s[i + 1] ? { title: s[i + 1].toUpperCase(), path: `/problems/${s[i + 1].toUpperCase()}` } : null;
    },
  },
  {
    host: /(^|\.)(naukri\.com|codingninjas\.com)$/,
    parse: (s) => {
      const i = s.indexOf("problems");
      const slug = i >= 0 ? s[i + 1] : undefined;
      // Slugs look like "reverse-the-array_1262298".
      return slug ? { title: titleFromSlug(slug.replace(/_\d+$/, "")) } : null;
    },
  },
];

/** Path segments that never name a problem on their own. */
const GENERIC_SEGMENTS = new Set(["problem", "problems", "description", "editorial", "solutions", "submissions", "practice", "1", "0"]);

/**
 * Turns a pasted problem link into something trackable. Pure: never fetches the page, so it works for
 * any site and cannot be used to make the server request arbitrary URLs. Returns null for anything that
 * is not an http(s) link with a path.
 */
export function parseProblemLink(raw: string): ParsedProblemLink | null {
  const input = raw.trim();
  if (!input || input.length > MAX_URL_LENGTH) return null;
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".")) return null;

  const segments = u.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const rule = RULES.find((r) => r.host.test(host));
  const hit = rule?.parse(segments) ?? null;
  const path = hit?.path ?? `/${segments.join("/")}`;
  const fallback = segments.filter((x) => !GENERIC_SEGMENTS.has(x.toLowerCase())).at(-1) ?? segments.at(-1)!;
  const title = (hit?.title || titleFromSlug(fallback)).slice(0, 200) || host;

  return {
    url: `https://${host}${path}`,
    host,
    catalogSlug: hit?.catalogSlug ?? null,
    title,
  };
}

/** Pulls every link out of pasted text (one per line, comma or space separated). */
export function extractLinks(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => /^(https?:\/\/|www\.)/i.test(s) || /^[a-z0-9-]+(\.[a-z0-9-]+)+\/\S+/i.test(s));
}
