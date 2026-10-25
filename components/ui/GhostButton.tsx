import type { ButtonHTMLAttributes } from "react";

/**
 * The quiet button: a thin outline, no fill. Everything on a screen that is not its one primary action uses this.
 * The filled coral button is reserved for that single action.
 */
export const GHOST_CLASSES =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-border-strong bg-transparent px-[18px] py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-elevated-2 disabled:cursor-not-allowed disabled:opacity-50";

export function GhostButton({ className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`${GHOST_CLASSES} ${className}`} {...props} />;
}
