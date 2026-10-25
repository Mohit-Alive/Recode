import { describe, expect, it } from "vitest";
import { extractLinks, parseProblemLink, titleFromSlug } from "../problem-link";

describe("titleFromSlug", () => {
  it("title-cases words and keeps small words lowercase", () => {
    expect(titleFromSlug("lowest-common-ancestor-of-a-binary-tree")).toBe("Lowest Common Ancestor of a Binary Tree");
  });
  it("drops long numeric id suffixes", () => {
    expect(titleFromSlug("minimum-platforms-1587115620")).toBe("Minimum Platforms");
  });
  it("keeps roman numerals upper case", () => {
    expect(titleFromSlug("house-robber-ii")).toBe("House Robber II");
  });
});

describe("parseProblemLink", () => {
  it("canonicalises catalog links and exposes the slug", () => {
    const a = parseProblemLink("https://leetcode.com/problems/two-sum/description/?envType=study-plan");
    const b = parseProblemLink("leetcode.com/problems/Two-Sum");
    expect(a).toEqual({ url: "https://leetcode.com/problems/two-sum", host: "leetcode.com", catalogSlug: "two-sum", title: "Two Sum" });
    expect(b?.url).toBe(a?.url);
  });

  it("dedupes practice-site variants of the same problem", () => {
    const a = parseProblemLink("https://www.geeksforgeeks.org/problems/minimum-platforms-1587115620/1");
    const b = parseProblemLink("https://geeksforgeeks.org/problems/minimum-platforms-1587115620/0?category=Arrays");
    expect(a?.url).toBe("https://geeksforgeeks.org/problems/minimum-platforms-1587115620");
    expect(b?.url).toBe(a?.url);
    expect(a?.title).toBe("Minimum Platforms");
    expect(a?.catalogSlug).toBeNull();
  });

  it("names contest problems by id", () => {
    expect(parseProblemLink("https://codeforces.com/problemset/problem/1850/a")?.title).toBe("Problem 1850A");
    expect(parseProblemLink("https://codeforces.com/contest/1850/problem/B")?.title).toBe("Problem 1850B");
    expect(parseProblemLink("https://atcoder.jp/contests/abc300/tasks/abc300_a")?.title).toBe("ABC300 A");
  });

  it("falls back to the last meaningful path segment on unknown sites", () => {
    const p = parseProblemLink("https://example.org/practice/graphs/word-ladder/");
    expect(p?.title).toBe("Word Ladder");
    expect(p?.url).toBe("https://example.org/practice/graphs/word-ladder");
  });

  it("rejects non-web links and bare domains", () => {
    expect(parseProblemLink("javascript:alert(1)")).toBeNull();
    expect(parseProblemLink("ftp://example.org/x")).toBeNull();
    expect(parseProblemLink("https://leetcode.com/")).toBeNull();
    expect(parseProblemLink("not a link")).toBeNull();
    expect(parseProblemLink("https://user:pass@example.org/x")).toBeNull();
  });
});

describe("extractLinks", () => {
  it("splits pasted text on lines, commas and spaces", () => {
    const text = "https://leetcode.com/problems/two-sum/\n www.geeksforgeeks.org/problems/x/1, codeforces.com/contest/1/problem/A  hello";
    expect(extractLinks(text)).toEqual([
      "https://leetcode.com/problems/two-sum/",
      "www.geeksforgeeks.org/problems/x/1",
      "codeforces.com/contest/1/problem/A",
    ]);
  });
});
