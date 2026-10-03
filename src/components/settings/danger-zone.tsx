"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { resetAllProgress } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-[48ch] text-[13px] text-ink-subtle">Delete every solved problem, review, drill and streak. Settings stay.</p>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Reset Progress
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Reset all progress?" description="This permanently deletes your memory history. It cannot be undone.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                await resetAllProgress();
                setOpen(false);
                setConfirm("");
                toast("Progress reset.");
              });
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-reset">
                Type <span className="font-mono text-ink">reset</span> to confirm
              </Label>
              <Input id="confirm-reset" name="confirm" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={confirm !== "reset" || pending}>
                {pending ? "Resetting…" : "Delete Everything"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
