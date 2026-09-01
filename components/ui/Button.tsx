import Link from "next/link";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";

type Variant = "primary" | "secondary" | "task" | "outline" | "danger" | "active";
type Size = "sm" | "md";

const BASE_CLASSES =
  "flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed";

const SIZE_CLASSES: Record<Size, string> = {
  md: "h-14 w-full text-base",
  sm: "h-9 w-auto px-4 text-sm",
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
  "border border-primary-button-border bg-cta text-white hover:bg-[#E8623F] hover:shadow-hover active:bg-[#D9552F] disabled:border-[#D8D4CC] disabled:bg-[#D8D4CC] disabled:text-[#F5F2ED] disabled:hover:bg-[#D8D4CC] disabled:hover:shadow-none",
 secondary:
  "border-[1.5px] border-secondary-button-border bg-surface text-body-text hover:bg-tint-strong disabled:border-[#D8D4CC] disabled:bg-surface disabled:text-[#8B8998] disabled:hover:bg-surface",
  task: "border border-[var(--button-border)] bg-surface text-body-text hover:border-cta hover:bg-cta hover:text-white active:border-cta active:bg-cta active:text-white disabled:border-[#D8D4CC] disabled:bg-surface disabled:text-[#8B8998] disabled:hover:border-[#D8D4CC] disabled:hover:bg-surface disabled:hover:text-[#8B8998]",
  outline:
  "border border-[#1A1A4E] bg-surface text-[#1A1A4E] hover:border-[#FF7A59] hover:bg-[#FF7A59] hover:text-white dark:border-[#FAF7F2] dark:text-[#FAF7F2] dark:hover:border-[#FF7A59] dark:hover:bg-[#FF7A59] dark:hover:text-white disabled:border-[#D8D4CC] disabled:bg-surface disabled:text-[#8B8998] disabled:hover:border-[#D8D4CC] disabled:hover:bg-surface disabled:hover:text-[#8B8998]",
  danger:
  "border border-[#F59E0B] bg-surface text-[#F59E0B] hover:bg-[#F59E0B]/20 disabled:border-[#D8D4CC] disabled:bg-surface disabled:text-[#8B8998] disabled:hover:bg-surface",
  active:
  "border border-[#1A1A4E] bg-surface text-[#1A1A4E] hover:bg-tint-strong dark:border-[#FAF7F2] dark:text-[#FAF7F2] disabled:border-[#D8D4CC] disabled:bg-surface disabled:text-[#8B8998] disabled:hover:bg-surface dark:disabled:text-[#8B8998]",
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
  onClick,
  ...props
}: ButtonProps) {
  const classes = `${BASE_CLASSES} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        onClick={onClick as unknown as MouseEventHandler<HTMLAnchorElement>}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
