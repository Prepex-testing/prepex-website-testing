import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "task";
type Size = "sm" | "md";

const BASE_CLASSES =
  "flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors";

const SIZE_CLASSES: Record<Size, string> = {
  md: "h-14 w-full text-base",
  sm: "h-9 w-auto px-4 text-sm",
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-cta text-white hover:bg-cta/90",
  secondary:
    "border border-brand/15 bg-surface text-body-text hover:bg-tint-strong",
  task: "border border-brand/15 bg-surface text-body-text hover:border-cta hover:bg-cta hover:text-white active:border-cta active:bg-cta active:text-white",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  href?: string;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  href,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const classes = `${BASE_CLASSES} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
