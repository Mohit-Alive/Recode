import Link from "next/link";
import { cn } from "@/lib/cn";

/** Segmented control whose state lives in the URL, so every filtered view can be linked. */
export function FilterLinks({
  label,
  param,
  options,
  current,
  searchParams,
  pathname,
}: {
  label: string;
  param: string;
  options: { value: string; label: string }[];
  current: string;
  searchParams: Record<string, string | undefined>;
  pathname: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-line bg-surface-1 p-0.5">
      {options.map((o) => {
        const next = new URLSearchParams(
          Object.entries({ ...searchParams, [param]: o.value === options[0].value ? undefined : o.value }).filter(
            (e): e is [string, string] => typeof e[1] === "string",
          ),
        ).toString();
        const active = current === o.value;
        return (
          <Link
            key={o.value}
            href={(next ? `${pathname}?${next}` : pathname)}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-[5px] px-2.5 py-1 text-[12.5px] transition-colors",
              active ? "bg-surface-3 text-ink" : "text-ink-subtle hover:text-ink",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
