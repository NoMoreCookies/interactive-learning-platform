import type { ReactNode } from "react";

type FormFieldProps = {
  htmlFor: string;
  label: string;
  children: ReactNode;
  description?: string;
  error?: string;
  className?: string;
};

export default function FormField({
  htmlFor,
  label,
  children,
  description,
  error,
  className,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-zinc-300">
        {label}
      </label>
      {children}
      {description && !error && (
        <p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
