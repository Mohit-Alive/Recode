"use client";

import { useTransition } from "react";
import { CheckCircle } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { setActiveSheet } from "@/actions/settings";
import { Button } from "@/components/ui/button";

export function ActiveSheetButton({ slug, active }: { slug: string; active: boolean }) {
  const [pending, start] = useTransition();
  if (active) {
    return (
      <span className="flex items-center gap-1.5 text-[12.5px] text-ink-muted">
        <CheckCircle size={15} weight="fill" className="text-accent-text" aria-hidden />
        New problems come from this sheet
      </span>
    );
  }
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setActiveSheet(slug);
          toast.success("Today will suggest new problems from this sheet.");
        })
      }
      className="-ml-2"
    >
      Use for New Problems
    </Button>
  );
}
