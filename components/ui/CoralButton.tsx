import type { ButtonHTMLAttributes } from "react";

/**
 * The one filled coral button a screen state is allowed to have (the primary action). Every other button on the same
 * screen is a GhostButton.
 */
export function CoralButton({ className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-brand-coral px-6 py-3 text-[15px] font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
