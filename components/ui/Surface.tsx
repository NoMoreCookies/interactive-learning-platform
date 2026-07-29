import type {
  ComponentPropsWithoutRef,
  ElementType,
  ReactNode,
} from "react";

import { cn } from "@/lib/utils/cn";

type SurfaceVariant = "default" | "elevated" | "subtle";

type SurfaceProps<T extends ElementType = "section"> = {
  as?: T;
  children: ReactNode;
  className?: string;
  variant?: SurfaceVariant;
} & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "children" | "className"
>;

const variants: Record<SurfaceVariant, string> = {
  default:
    "border-zinc-800 bg-zinc-950/60",
  elevated:
    "border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/20",
  subtle:
    "border-zinc-800/80 bg-zinc-950/35",
};

export default function Surface<
  T extends ElementType = "section",
>({
  as,
  children,
  className,
  variant = "default",
  ...props
}: SurfaceProps<T>) {
  const Component = as ?? "section";

  return (
    <Component
      className={cn(
        "rounded-2xl border",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
