import { cn } from "@/lib/cn";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-[13px] font-medium text-ink-muted", className)} {...props} />;
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-md border border-line bg-surface-1 px-3 text-sm text-ink placeholder:text-ink-faint transition-[border-color] hover:border-line-strong focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-md border border-line bg-surface-1 px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-faint transition-[border-color] hover:border-line-strong focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
        className,
      )}
      {...props}
    />
  );
}

export function Hint({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-xs text-ink-subtle", className)} {...props} />;
}
