import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type StatusTone = "info" | "success" | "warning" | "error";

type StatusMessageProps = {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
};

const tones: Record<StatusTone, string> = {
  info: "border-blue-500/30 bg-blue-500/10 text-blue-200",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  error: "border-red-500/30 bg-red-500/10 text-red-200",
};

export default function StatusMessage({ children, tone = "info", className }: StatusMessageProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-xl border px-4 py-3 text-sm leading-6", tones[tone], className)}
    >
      {children}
    </div>
  );
}
