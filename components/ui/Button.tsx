import Link from "next/link";

import type {
  ButtonHTMLAttributes,
  ComponentProps,
  ReactNode,
} from "react";

import { cn } from "@/lib/utils/cn";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "danger";

type ButtonSize = "sm" | "md" | "lg";

type CommonButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

type NativeButtonProps =
  CommonButtonProps &
    Omit<
      ButtonHTMLAttributes<HTMLButtonElement>,
      "children" | "className"
    > & {
      href?: never;
    };

type LinkButtonProps =
  CommonButtonProps &
    Omit<
      ComponentProps<typeof Link>,
      "children" | "className"
    > & {
      href: string;
      disabled?: boolean;
    };

export type ButtonProps =
  | NativeButtonProps
  | LinkButtonProps;

const variantClasses: Record<
  ButtonVariant,
  string
> = {
  primary:
    "bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500",
  secondary:
    "border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800",
  outline:
    "border border-zinc-700 bg-transparent text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900",
  danger:
    "bg-red-600 text-white shadow-lg shadow-red-950/20 hover:bg-red-500",
};

const sizeClasses: Record<
  ButtonSize,
  string
> = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-3 text-sm",
  lg: "px-6 py-4 text-base",
};

function getButtonClasses({
  className,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
}: {
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
}): string {
  return cn(
    "inline-flex items-center justify-center rounded-xl font-semibold",
    "transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[#020617]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    disabled && "pointer-events-none opacity-50",
    className,
  );
}

export default function Button(
  props: ButtonProps,
) {
  /*
   * The union is narrowed before props are spread.
   * This preserves the native button `type` union instead of widening it
   * to a generic string.
   */
  if (
    "href" in props &&
    typeof props.href === "string"
  ) {
    const {
      children,
      className,
      variant,
      size,
      fullWidth,
      disabled = false,
      href,
      ...linkProps
    } = props;

    return (
      <Link
        href={href}
        aria-disabled={
          disabled || undefined
        }
        tabIndex={disabled ? -1 : undefined}
        className={getButtonClasses({
          className,
          variant,
          size,
          fullWidth,
          disabled,
        })}
        {...linkProps}
      >
        {children}
      </Link>
    );
  }

  const {
    children,
    className,
    variant,
    size,
    fullWidth,
    type = "button",
    disabled = false,
    ...buttonProps
  } = props;

  return (
    <button
      type={type}
      disabled={disabled}
      className={getButtonClasses({
        className,
        variant,
        size,
        fullWidth,
        disabled,
      })}
      {...buttonProps}
    >
      {children}
    </button>
  );
}