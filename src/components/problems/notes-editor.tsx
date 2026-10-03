"use client";

import { useState, useTransition } from "react";
import { Star } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { saveNotes, toggleStar } from "@/actions/problems";
import { Button } from "@/components/ui/button";
import { Hint, Label, Textarea } from "@/components/ui/field";

export function NotesEditor({
  problemId,
  insight: initialInsight,
  notes: initialNotes,
  starred,
}: {
  problemId: number;
  insight: string | null;
  notes: string | null;
  starred: boolean;
}) {
  const [insight, setInsight] = useState(initialInsight ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [pending, start] = useTransition();
  const dirty = insight !== (initialInsight ?? "") || notes !== (initialNotes ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveNotes({ problemId, insight, notes });
          if (res.ok) toast.success("Notes saved.");
          else toast.error(res.error);
        });
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="insight">Key insight</Label>
        <Textarea
          id="insight"
          name="insight"
          autoComplete="off"
          rows={2}
          maxLength={280}
          value={insight}
          onChange={(e) => setInsight(e.target.value)}
          placeholder="The one line that cracks it…"
        />
        <Hint>Shown as the hint during reviews, and revealed after you attempt recall.</Hint>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          autoComplete="off"
          rows={6}
          maxLength={5000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Edge cases, complexity, the bug you hit…"
          className="font-mono text-[13px]"
        />
      </div>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={starred}
          onClick={() => start(async () => void (await toggleStar(problemId, !starred)))}
        >
          <Star size={14} weight={starred ? "fill" : "regular"} className={starred ? "text-fading" : ""} aria-hidden />
          {starred ? "Starred" : "Star"}
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={!dirty || pending}>
          {pending ? "Saving…" : "Save Notes"}
        </Button>
      </div>
    </form>
  );
}
