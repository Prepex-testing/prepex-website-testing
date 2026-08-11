"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
};

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export function Modal({ open, onClose, ariaLabel, children, size = "md" }: ModalProps) {
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
       className={`modal-scroll-panel w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto rounded-t-2xl bg-background p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-modal sm:w-full sm:rounded-2xl sm:p-8 sm:pb-10 ${SIZE_CLASSES[size]}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>

      {/*
        Panel scrollbar reserves a constant width at all times (never toggled
        on/off), so text/content never shifts when it fades in — only its
        color transitions, slowly, on hover/focus. Scrolling always works.
        `both-edges` reserves that gutter symmetrically on left and right so
        full-bleed children (e.g. AddCustomTaskModal's header/footer) don't
        end up lopsided from the scrollbar-side inset alone.
      */}
      <style>{`
        .modal-scroll-panel {
          scrollbar-gutter: stable both-edges;
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          transition: scrollbar-color 500ms ease;
        }
        .modal-scroll-panel:hover,
        .modal-scroll-panel:focus-within {
          scrollbar-color: color-mix(in srgb, var(--muted) 55%, transparent) transparent;
        }
        .modal-scroll-panel::-webkit-scrollbar {
          width: 6px;
        }
        .modal-scroll-panel::-webkit-scrollbar-track {
          background: transparent;
        }
        .modal-scroll-panel::-webkit-scrollbar-thumb {
          background-color: transparent;
          border-radius: 9999px;
          transition: background-color 500ms ease;
        }
        .modal-scroll-panel:hover::-webkit-scrollbar-thumb,
        .modal-scroll-panel:focus-within::-webkit-scrollbar-thumb {
          background-color: color-mix(in srgb, var(--muted) 55%, transparent);
        }
      `}</style>
    </div>
  );
}
