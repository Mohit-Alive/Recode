"use client";

import { useState, useTransition } from "react";
import { PencilSimple } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { removeCustomItem, updateCustomItem } from "@/actions/custom-sheets";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import type { Difficulty } from "@/db/schema";
import { DIFFICULTY_LABEL } from "@/lib/format";
import { cn } from "@/lib/cn";

type Item = { id: number; title: string; difficulty: Difficulty; insight: string | null; url: string };

const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

/** Rename, re-grade difficulty, edit the key insight, or remove the item from the sheet. */
export function ItemEditDialog({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(item.title);
  const [difficulty, setDifficulty] = useState<Difficulty>(item.difficulty);
  const [insight, setInsight] = useState(item.insight ?? "");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setTitle(item.title);
      setDifficulty(item.difficulty);
      setInsight(item.insight ?? "");
      setConfirm(false);
      setError(null);
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await updateCustomItem(item.id, { title, difficulty, insight });
      if (!res.ok) return setError(res.error);
      setOpen(false);
      toast.success("Saved.");
    });
  }

  function remove() {
    start(async () => {
      await removeCustomItem(item.id);
      setOpen(false);
      toast(`Removed ${item.title} from this sheet.`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Edit ${item.title}`}
          className="grid size-8 shrink-0 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <PencilSimple size={15} aria-hidden />
        </button>
      </DialogTrigger>
      <DialogContent title="Edit problem">
        <form onSubmit={save} className="flex flex-col gap-5">
          <p className="-mt-2 font-mono text-[12px] break-all text-ink-subtle">{item.url}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`item-title-${item.id}`}>Title</Label>
            <Input
              id={`item-title-${item.id}`}
              name="title"
              autoComplete="off"
              maxLength={200}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <fieldset>
            <legend className="text-[13px] font-medium text-ink-muted">Difficulty</legend>
            <div className="mt-2 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Difficulty">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "h-9 rounded-md border px-2 text-[13px] transition-colors",
                    difficulty === d ? "border-accent bg-surface-2 text-ink" : "border-line text-ink-subtle hover:border-line-strong hover:text-ink",
                  )}
                >
                  {DIFFICULTY_LABEL[d]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`item-insight-${item.id}`}>Key insight</Label>
            <Input
              id={`item-insight-${item.id}`}
              name="insight"
              autoComplete="off"
              maxLength={280}
              value={insight}
              onChange={(e) => setInsight(e.target.value)}
              placeholder="The one line that cracks it…"
            />
          </div>

          {error ? (
            <p role="alert" className="text-[13px] text-risk">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            {!confirm ? (
              <Button type="button" variant="ghost" className="mr-auto text-risk hover:text-risk" onClick={() => setConfirm(true)}>
                Remove
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending || !title.trim()}>
              Save
            </Button>
          </div>

          {confirm ? (
            <div role="alert" className="flex flex-col gap-3 rounded-lg border border-risk/40 bg-risk/10 p-3.5 sm:flex-row sm:items-center">
              <p className="flex-1 text-[13px] text-ink">Stop tracking this problem here and delete its review history?</p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setConfirm(false)}>
                  Keep It
                </Button>
                <Button type="button" size="sm" variant="danger" disabled={pending} onClick={remove}>
                  Remove
                </Button>
              </div>
            </div>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
