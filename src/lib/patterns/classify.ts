/**
 * Maps a LeetCode problem (tags + title) to one of the 18 canonical patterns.
 * Curated sheets override this; it only labels the long tail of company problems.
 * Rules are ordered from most to least specific: the first match wins.
 */
type Input = { title: string; topics: string[] };

const has = (topics: Set<string>, ...tags: string[]) => tags.some((t) => topics.has(t));

export function classifyPattern({ title, topics }: Input): string | null {
  const t = new Set(topics.map((x) => x.trim()));

  // SQL / pandas / JavaScript problems have no algorithmic pattern.
  if (t.size === 0 || has(t, "Database", "Shell", "Concurrency")) return null;

  if (has(t, "Trie")) return "tries";
  if (has(t, "Tree", "Binary Tree", "Binary Search Tree")) return "trees";
  if (has(t, "Linked List", "Doubly-Linked List")) return "linked-list";
  if (has(t, "Shortest Path", "Minimum Spanning Tree", "Eulerian Circuit", "Strongly Connected Component", "Biconnected Component"))
    return "advanced-graphs";
  if (has(t, "Union Find", "Topological Sort", "Graph")) return "graphs";
  if (has(t, "Backtracking")) return "backtracking";
  if (has(t, "Sliding Window")) return "sliding-window";
  if (/\binterval|meeting room|overlapping/i.test(title)) return "intervals";
  if (has(t, "Heap (Priority Queue)")) return "heap";
  if (has(t, "Dynamic Programming")) {
    const twoSequences = has(t, "String") && /subsequence|distance|interleav|matching/i.test(title);
    return has(t, "Matrix") || twoSequences ? "2d-dp" : "1d-dp";
  }
  if (has(t, "Monotonic Stack", "Stack")) return "stack";
  if (has(t, "Binary Search")) return "binary-search";
  if (has(t, "Two Pointers")) return "two-pointers";
  if (has(t, "Depth-First Search", "Breadth-First Search")) return "graphs";
  if (has(t, "Greedy")) return "greedy";
  if (has(t, "Bit Manipulation", "Bitmask")) return "bit-manipulation";
  if (has(t, "Math", "Geometry", "Matrix", "Simulation", "Number Theory", "Combinatorics")) return "math-geometry";
  return "arrays-hashing";
}
