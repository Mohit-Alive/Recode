import type { Difficulty } from "@/db/schema";
import { DIFFICULTY_LABEL } from "@/lib/format";
import { cn } from "@/lib/cn";

const COLOR: Record<Difficulty, string> = {
  EASY: "text-easy",
  MEDIUM: "text-medium",
  HARD: "text-hard",
};

export function DifficultyLabel({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return <span className={cn("text-[12px] font-medium", COLOR[difficulty], className)}>{DIFFICULTY_LABEL[difficulty]}</span>;
}
