import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="relative mb-6 sm:mb-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
              <span className="inline-block h-[2px] w-6 rounded-full bg-gradient-gold" />
              {eyebrow}
            </div>
          )}
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-[2rem]">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-[15px]">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
      <div
        aria-hidden
        className="mt-5 h-px w-full bg-gradient-to-r from-border via-border/70 to-transparent"
      />
    </div>
  );
}
