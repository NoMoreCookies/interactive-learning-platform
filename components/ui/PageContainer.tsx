import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type PageContainerSize =
  | "narrow"
  | "default"
  | "wide";

type PageContainerProps =
  HTMLAttributes<HTMLDivElement> & {
    size?: PageContainerSize;
  };

const sizes: Record<
  PageContainerSize,
  string
> = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};

export default function PageContainer({
  children,
  className,
  size = "wide",
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6",
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
