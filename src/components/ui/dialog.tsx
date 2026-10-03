"use client";

import { Dialog as D } from "radix-ui";
import { X } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/cn";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  hideClose,
  ...props
}: React.ComponentProps<typeof D.Content> & { title: string; description?: string; hideClose?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-[fade-in_150ms_ease-out]" />
      <D.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overscroll-contain rounded-xl border border-line bg-surface-1 p-6 hairline-top focus:outline-none data-[state=open]:animate-[dialog-in_180ms_var(--ease-out-quint)]",
          className,
        )}
        {...props}
      >
        <D.Title className="text-[17px] font-semibold tracking-tight text-ink">{title}</D.Title>
        {description ? <D.Description className="mt-1.5 text-sm text-ink-subtle">{description}</D.Description> : null}
        <div className="mt-5">{children}</div>
        {hideClose ? null : (
          <D.Close
            aria-label="Close"
            className="absolute top-4 right-4 rounded-md p-1.5 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X size={16} aria-hidden />
          </D.Close>
        )}
      </D.Content>
    </D.Portal>
  );
}
