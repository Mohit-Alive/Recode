/**
 * The 18 canonical patterns (NeetCode roadmap taxonomy) with a prerequisite DAG and
 * "neighbors": the patterns most often confused with each one, used as drill distractors.
 */
export type PatternSeed = {
  slug: string;
  name: string;
  blurb: string;
  /** The recognition cue: what in a problem statement should make you reach for this pattern. */
  cue: string;
  prereqs: string[];
  neighbors: string[];
};

export const PATTERNS: PatternSeed[] = [
  {
    slug: "arrays-hashing",
    name: "Arrays & Hashing",
    blurb: "Trade memory for time with sets, maps and counting.",
    cue: "You need to look something up you have already seen, count frequencies, or group by a key.",
    prereqs: [],
    neighbors: ["two-pointers", "sliding-window", "greedy"],
  },
  {
    slug: "two-pointers",
    name: "Two Pointers",
    blurb: "Walk inward or in lockstep over a sorted or symmetric sequence.",
    cue: "The input is sorted (or can be), or you compare elements from both ends.",
    prereqs: ["arrays-hashing"],
    neighbors: ["sliding-window", "binary-search", "arrays-hashing"],
  },
  {
    slug: "sliding-window",
    name: "Sliding Window",
    blurb: "Grow and shrink a contiguous range while keeping an invariant.",
    cue: "Longest, shortest or count of a contiguous subarray or substring with a constraint.",
    prereqs: ["two-pointers"],
    neighbors: ["two-pointers", "arrays-hashing", "1d-dp"],
  },
  {
    slug: "stack",
    name: "Stack",
    blurb: "Defer work until a matching or smaller element appears.",
    cue: "Matching brackets, nested structure, or the next greater / smaller element.",
    prereqs: ["arrays-hashing"],
    neighbors: ["two-pointers", "heap", "linked-list"],
  },
  {
    slug: "binary-search",
    name: "Binary Search",
    blurb: "Halve a monotonic search space, on indices or on the answer.",
    cue: "Sorted input, rotated arrays, or \"minimum value that works\" with a monotonic check.",
    prereqs: ["two-pointers"],
    neighbors: ["two-pointers", "greedy", "heap"],
  },
  {
    slug: "linked-list",
    name: "Linked List",
    blurb: "Pointer surgery with dummy heads and fast / slow runners.",
    cue: "Reversing, merging, reordering nodes, or detecting a cycle in place.",
    prereqs: ["two-pointers"],
    neighbors: ["two-pointers", "stack", "trees"],
  },
  {
    slug: "trees",
    name: "Trees",
    blurb: "Recursive DFS and level-order BFS over hierarchical data.",
    cue: "A binary tree or BST: depth, paths, ancestors, or level-by-level processing.",
    prereqs: ["binary-search", "linked-list"],
    neighbors: ["graphs", "backtracking", "linked-list"],
  },
  {
    slug: "tries",
    name: "Tries",
    blurb: "Prefix trees for fast word and prefix lookups.",
    cue: "Many words with shared prefixes, autocomplete, or wildcard word search.",
    prereqs: ["trees"],
    neighbors: ["trees", "backtracking", "arrays-hashing"],
  },
  {
    slug: "heap",
    name: "Heap / Priority Queue",
    blurb: "Always pull the current best element in log time.",
    cue: "Top K, K closest, running median, or repeatedly taking the smallest / largest.",
    prereqs: ["trees"],
    neighbors: ["greedy", "binary-search", "stack"],
  },
  {
    slug: "backtracking",
    name: "Backtracking",
    blurb: "Build candidates step by step and undo choices that fail.",
    cue: "Generate all subsets, permutations, combinations or board placements.",
    prereqs: ["trees"],
    neighbors: ["1d-dp", "graphs", "trees"],
  },
  {
    slug: "graphs",
    name: "Graphs",
    blurb: "BFS, DFS, union find and topological order over nodes and edges.",
    cue: "Grids of cells, connectivity, islands, dependencies or prerequisites.",
    prereqs: ["trees", "backtracking"],
    neighbors: ["trees", "advanced-graphs", "backtracking"],
  },
  {
    slug: "advanced-graphs",
    name: "Advanced Graphs",
    blurb: "Shortest paths, spanning trees and ordering with weights.",
    cue: "Weighted edges, cheapest / fastest path, or connecting everything at minimum cost.",
    prereqs: ["graphs", "heap"],
    neighbors: ["graphs", "heap", "2d-dp"],
  },
  {
    slug: "1d-dp",
    name: "1-D Dynamic Programming",
    blurb: "Overlapping subproblems indexed by a single position.",
    cue: "Count ways, min / max over choices at each index, and greedy fails a counterexample.",
    prereqs: ["backtracking"],
    neighbors: ["greedy", "2d-dp", "backtracking"],
  },
  {
    slug: "2d-dp",
    name: "2-D Dynamic Programming",
    blurb: "State over two indices: grids, two strings, or item and capacity.",
    cue: "Compare two sequences, walk a grid, or choose items under a budget.",
    prereqs: ["1d-dp", "graphs"],
    neighbors: ["1d-dp", "backtracking", "graphs"],
  },
  {
    slug: "greedy",
    name: "Greedy",
    blurb: "Commit to the locally best choice when it provably stays optimal.",
    cue: "A single pass where the best local move never needs to be undone.",
    prereqs: ["arrays-hashing", "1d-dp"],
    neighbors: ["1d-dp", "intervals", "two-pointers"],
  },
  {
    slug: "intervals",
    name: "Intervals",
    blurb: "Sort by start or end, then merge or sweep.",
    cue: "Ranges with starts and ends: overlaps, merging, meeting rooms.",
    prereqs: ["arrays-hashing", "heap"],
    neighbors: ["greedy", "heap", "two-pointers"],
  },
  {
    slug: "math-geometry",
    name: "Math & Geometry",
    blurb: "Matrix manipulation, number tricks and coordinate reasoning.",
    cue: "Rotate or spiral a matrix, digit manipulation, or points on a plane.",
    prereqs: ["arrays-hashing"],
    neighbors: ["arrays-hashing", "bit-manipulation", "two-pointers"],
  },
  {
    slug: "bit-manipulation",
    name: "Bit Manipulation",
    blurb: "XOR, masks and shifts on the binary representation.",
    cue: "Find the odd one out, count bits, or arithmetic without operators.",
    prereqs: ["arrays-hashing"],
    neighbors: ["math-geometry", "arrays-hashing", "1d-dp"],
  },
];

export const PATTERN_SLUGS = PATTERNS.map((p) => p.slug);
export type PatternSlug = (typeof PATTERNS)[number]["slug"];
