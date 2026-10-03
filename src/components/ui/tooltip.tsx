"use client";

import { Tooltip as T } from "radix-ui";
import { cn } from "@/lib/cn";

export const TooltipProvider = T.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className={cn(
            "z-50 max-w-64 rounded-md border border-line bg-surface-3 px-2.5 py-1.5 text-xs text-ink-muted data-[state=delayed-open]:animate-[fade-in_120ms_ease-out]",
            className,
          )}
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
