import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
};

export default function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-400">
            {eyebrow}
          </p>
        )}

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
          {title}
        </h1>

        {description && (
          <p className="mt-4 text-base leading-7 text-zinc-400 sm:text-lg">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
