"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Short helper line under the title. */
  description?: string;
  children: ReactNode;
  /** Sticks to the bottom of the sheet (the primary button). */
  footer?: ReactNode;
  "data-testid"?: string;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A bottom sheet on phones and a centred panel on larger screens. Escape and a tap on the dim area close it, focus moves
 * into it when it opens and returns to where it was, and Tab stays inside while it is open.
 */
export function Sheet({ open, onClose, title, description, children, footer, "data-testid": testId }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const firstItem = items[0]!;
      const lastItem = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-6" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-background shadow-modal sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-brand/20" />
        </div>
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[20px] font-extrabold leading-tight text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 text-[13px] leading-snug text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-[22px] leading-none text-muted hover:bg-tint-strong"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-brand/10 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">{footer}</div>}
        {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
      </div>
    </div>
  );
}
