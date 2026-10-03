import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {children}
        <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-ink-subtle">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function PageContainer({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1080px] px-4 py-8 sm:px-8 sm:py-10", className)} {...props} />;
}
