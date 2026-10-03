import { cn } from "@/lib/cn";

/** Physical-looking keycap (Raycast style) for shortcuts. */
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line-strong border-b-2 bg-surface-2 px-1 font-mono text-[11px] leading-none text-ink-muted",
        className,
      )}
      {...props}
    />
  );
}
