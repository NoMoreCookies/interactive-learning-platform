import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export const formControlClassName = [
  "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3",
  "text-sm text-zinc-100 placeholder:text-zinc-600",
  "outline-none transition-colors",
  "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/10",
].join(" ");

const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(formControlClassName, className)}
      {...props}
    />
  );
});

export default Input;
