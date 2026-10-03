"use client";

import { Popover as P } from "radix-ui";
import { cn } from "@/lib/cn";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverAnchor = P.Anchor;
export const PopoverClose = P.Close;

export function PopoverContent({ className, sideOffset = 8, ...props }: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-lg border border-line bg-surface-1 p-4 hairline-top outline-none data-[state=open]:animate-[pop-in_140ms_var(--ease-out-quint)]",
          className,
        )}
        {...props}
      />
    </P.Portal>
  );
}
