import type { ProblemRow } from "@/server/queries";

export type ListFilters = { difficulty: string; status: string };

export const STATUS_FILTER = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "solved", label: "Solved" },
  { value: "due", label: "Due" },
];

export const DIFFICULTY_FILTER = [
  { value: "all", label: "Any" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function applyFilters<T extends ProblemRow>(rows: T[], f: ListFilters): T[] {
  return rows.filter((p) => {
    if (f.difficulty !== "all" && p.difficulty !== f.difficulty.toUpperCase()) return false;
    if (f.status === "todo") return !p.solved;
    if (f.status === "solved") return p.solved;
    if (f.status === "due") return p.solved && (p.dueInDays ?? 1) <= 0;
    return true;
  });
}
