import { cn } from "@/lib/cn";

/** Wordmark plus a single geometric mark: a memory that decays and is restored, three times. */
export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <rect x="0.5" y="0.5" width="23" height="23" rx="6" className="fill-accent" />
        <path
          d="M5 7.5c1.6 0 2.2 6.5 4 6.5V7.8c1.4 0 2 4.2 3.6 4.2V8.2c1.3 0 1.9 2.4 3.4 2.4V8.6"
          fill="none"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withWordmark ? <span className="text-[15px] font-semibold tracking-[-0.02em]">recode</span> : null}
    </span>
  );
}
