"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

type WhiteModalProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
};

const SIZE_CLASSES: Record<NonNullable<WhiteModalProps["size"]>, string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

/**
 * Same behavior as `Modal`, but with a 16px panel radius at every breakpoint.
 * The panel's colors (`bg-surface` etc.) resolve through the same light/dark
 * tokens already defined in app/globals.css (`:root` / `[data-theme="dark"]`)
 * via normal CSS inheritance — no separate token copy needed here. Scrollbar
 * styling for `.white-modal-scroll-panel` also lives in app/globals.css.
 * `CheckInModal` and `GoalSettingModal` are intentionally excluded and keep
 * using `Modal`.
 */
export function WhiteModal({ open, onClose, ariaLabel, children, size = "md" }: WhiteModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-6"
      onClick={onClose}
    >
      <div
        className={`white-modal-scroll-panel w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto rounded-2xl bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-modal sm:w-full sm:p-8 sm:pb-10 ${SIZE_CLASSES[size]}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
