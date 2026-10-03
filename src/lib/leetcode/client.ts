import "server-only";

/**
 * Minimal client for LeetCode's public (undocumented) GraphQL endpoint. Server-side only: the
 * endpoint sends no CORS headers. Everything here is best-effort; callers must treat failures
 * (403 from Cloudflare, 429 rate limits, schema changes) as "sync unavailable", never as errors.
 */
const ENDPOINT = "https://leetcode.com/graphql/";

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        referer: "https://leetcode.com/",
        "user-agent": "Mozilla/5.0 (compatible; RecodeSync/1.0)",
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T; errors?: unknown };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export type AcceptedSubmission = { id: string; title: string; titleSlug: string; timestamp: number };

/** The last (up to 20) accepted submissions of a public profile. */
export async function recentAccepted(username: string, limit = 20): Promise<AcceptedSubmission[] | null> {
  const data = await gql<{ recentAcSubmissionList: { id: string; title: string; titleSlug: string; timestamp: string }[] | null }>(
    `query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) { id title titleSlug timestamp }
    }`,
    { username, limit },
  );
  if (!data?.recentAcSubmissionList) return data ? [] : null;
  return data.recentAcSubmissionList.map((s) => ({ ...s, timestamp: Number(s.timestamp) }));
}

/** Profile summary ("aboutMe"), used to prove account ownership with a one-time token. */
export async function profileSummary(username: string): Promise<{ exists: boolean; aboutMe: string } | null> {
  const data = await gql<{ matchedUser: { username: string; profile: { aboutMe: string | null } } | null }>(
    `query userProfile($username: String!) {
      matchedUser(username: $username) { username profile { aboutMe } }
    }`,
    { username },
  );
  if (!data) return null;
  if (!data.matchedUser) return { exists: false, aboutMe: "" };
  return { exists: true, aboutMe: data.matchedUser.profile?.aboutMe ?? "" };
}
