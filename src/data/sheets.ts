import { ESSENTIALS_SHEET, ROADMAP_SHEET } from "./sheet-names";

/**
 * Curated sheets. Each section lists problem slugs in study order. The pattern of every
 * problem in these lists is hand-assigned (CURATED_PATTERN) and used for drills.
 */
export type SheetSeed = {
  slug: string;
  name: string;
  description: string;
  sections: { title: string; pattern?: string; slugs: string[] }[];
};

const ROADMAP_150: SheetSeed = {
  ...ROADMAP_SHEET,
  description: "150 problems ordered along the pattern roadmap, one pattern at a time.",
  sections: [
    {
      title: "Arrays & Hashing",
      pattern: "arrays-hashing",
      slugs: [
        "contains-duplicate",
        "valid-anagram",
        "two-sum",
        "group-anagrams",
        "top-k-frequent-elements",
        "encode-and-decode-strings",
        "product-of-array-except-self",
        "valid-sudoku",
        "longest-consecutive-sequence",
      ],
    },
    {
      title: "Two Pointers",
      pattern: "two-pointers",
      slugs: [
        "valid-palindrome",
        "two-sum-ii-input-array-is-sorted",
        "3sum",
        "container-with-most-water",
        "trapping-rain-water",
      ],
    },
    {
      title: "Sliding Window",
      pattern: "sliding-window",
      slugs: [
        "best-time-to-buy-and-sell-stock",
        "longest-substring-without-repeating-characters",
        "longest-repeating-character-replacement",
        "permutation-in-string",
        "minimum-window-substring",
        "sliding-window-maximum",
      ],
    },
    {
      title: "Stack",
      pattern: "stack",
      slugs: [
        "valid-parentheses",
        "min-stack",
        "evaluate-reverse-polish-notation",
        "generate-parentheses",
        "daily-temperatures",
        "car-fleet",
        "largest-rectangle-in-histogram",
      ],
    },
    {
      title: "Binary Search",
      pattern: "binary-search",
      slugs: [
        "binary-search",
        "search-a-2d-matrix",
        "koko-eating-bananas",
        "find-minimum-in-rotated-sorted-array",
        "search-in-rotated-sorted-array",
        "time-based-key-value-store",
        "median-of-two-sorted-arrays",
      ],
    },
    {
      title: "Linked List",
      pattern: "linked-list",
      slugs: [
        "reverse-linked-list",
        "merge-two-sorted-lists",
        "linked-list-cycle",
        "reorder-list",
        "remove-nth-node-from-end-of-list",
        "copy-list-with-random-pointer",
        "add-two-numbers",
        "find-the-duplicate-number",
        "lru-cache",
        "merge-k-sorted-lists",
        "reverse-nodes-in-k-group",
      ],
    },
    {
      title: "Trees",
      pattern: "trees",
      slugs: [
        "invert-binary-tree",
        "maximum-depth-of-binary-tree",
        "diameter-of-binary-tree",
        "balanced-binary-tree",
        "same-tree",
        "subtree-of-another-tree",
        "lowest-common-ancestor-of-a-binary-search-tree",
        "binary-tree-level-order-traversal",
        "binary-tree-right-side-view",
        "count-good-nodes-in-binary-tree",
        "validate-binary-search-tree",
        "kth-smallest-element-in-a-bst",
        "construct-binary-tree-from-preorder-and-inorder-traversal",
        "binary-tree-maximum-path-sum",
        "serialize-and-deserialize-binary-tree",
      ],
    },
    {
      title: "Tries",
      pattern: "tries",
      slugs: [
        "implement-trie-prefix-tree",
        "design-add-and-search-words-data-structure",
        "word-search-ii",
      ],
    },
    {
      title: "Heap / Priority Queue",
      pattern: "heap",
      slugs: [
        "kth-largest-element-in-a-stream",
        "last-stone-weight",
        "k-closest-points-to-origin",
        "kth-largest-element-in-an-array",
        "task-scheduler",
        "design-twitter",
        "find-median-from-data-stream",
      ],
    },
    {
      title: "Backtracking",
      pattern: "backtracking",
      slugs: [
        "subsets",
        "combination-sum",
        "combination-sum-ii",
        "permutations",
        "subsets-ii",
        "word-search",
        "palindrome-partitioning",
        "letter-combinations-of-a-phone-number",
        "n-queens",
      ],
    },
    {
      title: "Graphs",
      pattern: "graphs",
      slugs: [
        "number-of-islands",
        "max-area-of-island",
        "clone-graph",
        "walls-and-gates",
        "rotting-oranges",
        "pacific-atlantic-water-flow",
        "surrounded-regions",
        "course-schedule",
        "course-schedule-ii",
        "graph-valid-tree",
        "number-of-connected-components-in-an-undirected-graph",
        "redundant-connection",
        "word-ladder",
      ],
    },
    {
      title: "Advanced Graphs",
      pattern: "advanced-graphs",
      slugs: [
        "network-delay-time",
        "reconstruct-itinerary",
        "min-cost-to-connect-all-points",
        "swim-in-rising-water",
        "alien-dictionary",
        "cheapest-flights-within-k-stops",
      ],
    },
    {
      title: "1-D Dynamic Programming",
      pattern: "1d-dp",
      slugs: [
        "climbing-stairs",
        "min-cost-climbing-stairs",
        "house-robber",
        "house-robber-ii",
        "longest-palindromic-substring",
        "palindromic-substrings",
        "decode-ways",
        "coin-change",
        "maximum-product-subarray",
        "word-break",
        "longest-increasing-subsequence",
        "partition-equal-subset-sum",
      ],
    },
    {
      title: "2-D Dynamic Programming",
      pattern: "2d-dp",
      slugs: [
        "unique-paths",
        "longest-common-subsequence",
        "best-time-to-buy-and-sell-stock-with-cooldown",
        "coin-change-ii",
        "target-sum",
        "interleaving-string",
        "longest-increasing-path-in-a-matrix",
        "distinct-subsequences",
        "edit-distance",
        "burst-balloons",
        "regular-expression-matching",
      ],
    },
    {
      title: "Greedy",
      pattern: "greedy",
      slugs: [
        "maximum-subarray",
        "jump-game",
        "jump-game-ii",
        "gas-station",
        "hand-of-straights",
        "merge-triplets-to-form-target-triplet",
        "partition-labels",
        "valid-parenthesis-string",
      ],
    },
    {
      title: "Intervals",
      pattern: "intervals",
      slugs: [
        "insert-interval",
        "merge-intervals",
        "non-overlapping-intervals",
        "meeting-rooms",
        "meeting-rooms-ii",
        "minimum-interval-to-include-each-query",
      ],
    },
    {
      title: "Math & Geometry",
      pattern: "math-geometry",
      slugs: [
        "rotate-image",
        "spiral-matrix",
        "set-matrix-zeroes",
        "happy-number",
        "plus-one",
        "powx-n",
        "multiply-strings",
        "detect-squares",
      ],
    },
    {
      title: "Bit Manipulation",
      pattern: "bit-manipulation",
      slugs: [
        "single-number",
        "number-of-1-bits",
        "counting-bits",
        "reverse-bits",
        "missing-number",
        "sum-of-two-integers",
        "reverse-integer",
      ],
    },
  ],
};

const ESSENTIALS_75: SheetSeed = {
  ...ESSENTIALS_SHEET,
  description: "75 must-know interview problems, grouped by data structure.",
  sections: [
    {
      title: "Array",
      slugs: [
        "two-sum",
        "best-time-to-buy-and-sell-stock",
        "contains-duplicate",
        "product-of-array-except-self",
        "maximum-subarray",
        "maximum-product-subarray",
        "find-minimum-in-rotated-sorted-array",
        "search-in-rotated-sorted-array",
        "3sum",
        "container-with-most-water",
      ],
    },
    {
      title: "Binary",
      slugs: [
        "sum-of-two-integers",
        "number-of-1-bits",
        "counting-bits",
        "missing-number",
        "reverse-bits",
      ],
    },
    {
      title: "Dynamic Programming",
      slugs: [
        "climbing-stairs",
        "coin-change",
        "longest-increasing-subsequence",
        "longest-common-subsequence",
        "word-break",
        "combination-sum-iv",
        "house-robber",
        "house-robber-ii",
        "decode-ways",
        "unique-paths",
        "jump-game",
      ],
    },
    {
      title: "Graph",
      slugs: [
        "clone-graph",
        "course-schedule",
        "pacific-atlantic-water-flow",
        "number-of-islands",
        "longest-consecutive-sequence",
        "alien-dictionary",
        "graph-valid-tree",
        "number-of-connected-components-in-an-undirected-graph",
      ],
    },
    {
      title: "Interval",
      slugs: [
        "insert-interval",
        "merge-intervals",
        "non-overlapping-intervals",
        "meeting-rooms",
        "meeting-rooms-ii",
      ],
    },
    {
      title: "Linked List",
      slugs: [
        "reverse-linked-list",
        "linked-list-cycle",
        "merge-two-sorted-lists",
        "merge-k-sorted-lists",
        "remove-nth-node-from-end-of-list",
        "reorder-list",
      ],
    },
    {
      title: "Matrix",
      slugs: ["set-matrix-zeroes", "spiral-matrix", "rotate-image", "word-search"],
    },
    {
      title: "String",
      slugs: [
        "longest-substring-without-repeating-characters",
        "longest-repeating-character-replacement",
        "minimum-window-substring",
        "valid-anagram",
        "group-anagrams",
        "valid-parentheses",
        "valid-palindrome",
        "longest-palindromic-substring",
        "palindromic-substrings",
        "encode-and-decode-strings",
      ],
    },
    {
      title: "Tree",
      slugs: [
        "maximum-depth-of-binary-tree",
        "same-tree",
        "invert-binary-tree",
        "binary-tree-maximum-path-sum",
        "binary-tree-level-order-traversal",
        "serialize-and-deserialize-binary-tree",
        "subtree-of-another-tree",
        "construct-binary-tree-from-preorder-and-inorder-traversal",
        "validate-binary-search-tree",
        "kth-smallest-element-in-a-bst",
        "lowest-common-ancestor-of-a-binary-search-tree",
        "implement-trie-prefix-tree",
        "design-add-and-search-words-data-structure",
        "word-search-ii",
      ],
    },
    {
      title: "Heap",
      slugs: ["top-k-frequent-elements", "find-median-from-data-stream"],
    },
  ],
};

export const CURATED_SHEETS: SheetSeed[] = [ROADMAP_150, ESSENTIALS_75];

/** slug -> pattern slug for every hand-curated problem. */
export const CURATED_PATTERN: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const section of ROADMAP_150.sections) {
    for (const slug of section.slugs) map[slug] = section.pattern!;
  }
  // Essentials 75 problems that are not in the Roadmap 150.
  map["combination-sum-iv"] = "1d-dp";
  return map;
})();

/**
 * Metadata for curated problems that might be missing from the company CSV
 * (mostly premium problems). Used only as a fallback by the seed script.
 */
export const FALLBACK_PROBLEMS: Record<string, { title: string; difficulty: "EASY" | "MEDIUM" | "HARD" }> = {
  "encode-and-decode-strings": { title: "Encode and Decode Strings", difficulty: "MEDIUM" },
  "walls-and-gates": { title: "Walls and Gates", difficulty: "MEDIUM" },
  "graph-valid-tree": { title: "Graph Valid Tree", difficulty: "MEDIUM" },
  "number-of-connected-components-in-an-undirected-graph": {
    title: "Number of Connected Components in an Undirected Graph",
    difficulty: "MEDIUM",
  },
  "alien-dictionary": { title: "Alien Dictionary", difficulty: "HARD" },
  "meeting-rooms": { title: "Meeting Rooms", difficulty: "EASY" },
  "meeting-rooms-ii": { title: "Meeting Rooms II", difficulty: "MEDIUM" },
  "detect-squares": { title: "Detect Squares", difficulty: "MEDIUM" },
  "merge-triplets-to-form-target-triplet": { title: "Merge Triplets to Form Target Triplet", difficulty: "MEDIUM" },
  "count-good-nodes-in-binary-tree": { title: "Count Good Nodes in Binary Tree", difficulty: "MEDIUM" },
  "minimum-interval-to-include-each-query": { title: "Minimum Interval to Include Each Query", difficulty: "HARD" },
  "combination-sum-iv": { title: "Combination Sum IV", difficulty: "MEDIUM" },
  "coin-change-ii": { title: "Coin Change II", difficulty: "MEDIUM" },
  "last-stone-weight": { title: "Last Stone Weight", difficulty: "EASY" },
  "car-fleet": { title: "Car Fleet", difficulty: "MEDIUM" },
  "hand-of-straights": { title: "Hand of Straights", difficulty: "MEDIUM" },
  "distinct-subsequences": { title: "Distinct Subsequences", difficulty: "HARD" },
  "swim-in-rising-water": { title: "Swim in Rising Water", difficulty: "HARD" },
  "min-cost-climbing-stairs": { title: "Min Cost Climbing Stairs", difficulty: "EASY" },
  "kth-largest-element-in-a-stream": { title: "Kth Largest Element in a Stream", difficulty: "EASY" },
  "design-add-and-search-words-data-structure": {
    title: "Design Add and Search Words Data Structure",
    difficulty: "MEDIUM",
  },
};
