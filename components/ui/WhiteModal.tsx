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
 * Same behavior as `Modal`, but the panel (`.white-modal-panel` in
 * app/globals.css) carries its own pinned copy of the theme tokens (light
 * values by default, dark values under [data-theme="dark"]) instead of
 * inheriting whatever `<html>` currently has — so it stays visually
 * consistent (flat white in light mode, dark surface in dark mode) regardless
 * of any ancestor override. `CheckInModal` and `GoalSettingModal` are
 * intentionally excluded and keep using `Modal`.
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
        className={`white-modal-panel white-modal-scroll-panel w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto rounded-2xl bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-modal sm:w-full sm:rounded-3xl sm:p-8 sm:pb-10 ${SIZE_CLASSES[size]}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
