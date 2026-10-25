"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCustomSheet, deleteCustomSheet, updateCustomSheet } from "@/actions/custom-sheets";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label } from "@/components/ui/field";
import { previewIntervals, Rating } from "@/lib/srs/fsrs";
import { DEFAULT_PACE, LONGEST_GAPS, RECALL_TARGETS } from "@/lib/srs/pace";
import { formatDayDelta } from "@/lib/format";
import { cn } from "@/lib/cn";

type Sheet = { id: number; name: string; description: string | null; desiredRetention: number; maxInterval: number; total: number };

// Interval previews only depend on the gap between reviews, so any fixed instant works.
const PREVIEW_AT = new Date("2026-01-01T00:00:00Z");

/** Creates a sheet, or edits one (name, description, revision pace) and offers to delete it. */
export function SheetFormDialog({ sheet, children }: { sheet?: Sheet; children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState(sheet?.name ?? "");
  const [description, setDescription] = useState(sheet?.description ?? "");
  const [retention, setRetention] = useState<number>(sheet?.desiredRetention ?? DEFAULT_PACE.desiredRetention);
  const [gap, setGap] = useState<number>(sheet?.maxInterval ?? DEFAULT_PACE.maxInterval);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const firstReview = previewIntervals(null, PREVIEW_AT, retention, gap)[Rating.Good];

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setName(sheet?.name ?? "");
      setDescription(sheet?.description ?? "");
      setRetention(sheet?.desiredRetention ?? DEFAULT_PACE.desiredRetention);
      setGap(sheet?.maxInterval ?? DEFAULT_PACE.maxInterval);
      setError(null);
      setConfirmDelete(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { name, description, desiredRetention: retention, maxInterval: gap };
    start(async () => {
      if (sheet) {
        const res = await updateCustomSheet(sheet.id, input);
        if (!res.ok) return setError(res.error);
        toast.success("Sheet updated. The new pace applies from each problem’s next review.");
        setOpen(false);
      } else {
        const res = await createCustomSheet(input);
        if (!res.ok) return setError(res.error);
        setOpen(false);
        router.push(`/sheets/custom/${res.id}`);
      }
    });
  }

  function remove() {
    if (!sheet) return;
    start(async () => {
      const res = await deleteCustomSheet(sheet.id);
      if (!res.ok) return void toast.error(res.error);
      setOpen(false);
      toast(`Deleted ${sheet.name}.`);
      router.push("/sheets");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        title={sheet ? "Sheet settings" : "New sheet"}
        description={
          sheet
            ? "This sheet keeps its own memory. Its pace never affects your other sheets."
            : "Log problems you solve anywhere by pasting their links. The sheet keeps its own memory and review schedule."
        }
        className="max-w-lg"
      >
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sheet-name">Name</Label>
            <Input
              id="sheet-name"
              name="sheet-name"
              autoComplete="off"
              maxLength={60}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Graphs practice…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sheet-description">
              Description <span className="font-normal text-ink-subtle">(optional)</span>
            </Label>
            <Input
              id="sheet-description"
              name="sheet-description"
              autoComplete="off"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What goes in here…"
            />
          </div>

          <fieldset>
            <legend className="text-[13px] font-medium text-ink-muted">Recall target</legend>
            <Hint className="mt-0.5">Higher means reviews come sooner and more often.</Hint>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label="Recall target">
              {RECALL_TARGETS.map((t) => (
                <Choice key={t.value} checked={retention === t.value} onSelect={() => setRetention(t.value)} label={t.label} hint={t.hint} mono />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[13px] font-medium text-ink-muted">Longest gap between reviews</legend>
            <Hint className="mt-0.5">Even well-known problems come back at least this often.</Hint>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4" role="radiogroup" aria-label="Longest gap between reviews">
              {LONGEST_GAPS.map((g) => (
                <Choice key={g.days} checked={gap === g.days} onSelect={() => setGap(g.days)} label={g.label} />
              ))}
            </div>
          </fieldset>

          <p className="rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink-subtle" aria-live="polite">
            A clean solve comes back <span className="text-ink">{formatDayDelta(firstReview)}</span>, then the gaps grow up to{" "}
            <span className="text-ink">{LONGEST_GAPS.find((g) => g.days === gap)?.label}</span>.
          </p>

          {error ? (
            <p role="alert" className="text-[13px] text-risk">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            {sheet && !confirmDelete ? (
              <Button type="button" variant="ghost" className="mr-auto text-risk hover:text-risk" onClick={() => setConfirmDelete(true)}>
                Delete Sheet
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending || !name.trim()}>
              {sheet ? "Save Changes" : "Create Sheet"}
            </Button>
          </div>

          {sheet && confirmDelete ? (
            <div role="alert" className="flex flex-col gap-3 rounded-lg border border-risk/40 bg-risk/10 p-3.5 sm:flex-row sm:items-center">
              <p className="flex-1 text-[13px] text-ink">
                Delete {sheet.name}
                {sheet.total > 0 ? ` with ${sheet.total} ${sheet.total === 1 ? "problem" : "problems"} and their review history` : ""}? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Keep It
                </Button>
                <Button type="button" size="sm" variant="danger" disabled={pending} onClick={remove}>
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Choice({ checked, onSelect, label, hint, mono }: { checked: boolean; onSelect: () => void; label: string; hint?: string; mono?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 flex-col items-start justify-center rounded-md border px-3 py-1.5 text-left transition-colors",
        checked ? "border-accent bg-surface-2 text-ink" : "border-line bg-surface-1 text-ink-muted hover:border-line-strong hover:text-ink",
      )}
    >
      <span className={cn("text-[13px]", mono && "font-mono tabular")}>{label}</span>
      {hint ? <span className="text-[11.5px] text-ink-subtle">{hint}</span> : null}
    </button>
  );
}
