import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";
import { formControlClassName } from "./Input";

const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(formControlClassName, "appearance-none", className)}
      {...props}
    >
      {children}
    </select>
  );
});

export default Select;
