"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { QuickLogHub } from "@/components/rituals/QuickLogHub";

/** Fired to open the Quick Log hub from anywhere (the command palette). */
export const QUICK_LOG_EVENT = "prepex:quick-log";

/** True while the student is typing, so a letter shortcut never steals a keystroke. */
export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/**
 * The floating "+" on the main screens, and the L key on a desktop. Coral in both themes (owner's call, P6): it lifts and
 * turns its "+" on hover, pulses softly, and presses in on tap; reduced motion keeps it still.
 */
export function QuickLogFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "l" || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (typeof window.matchMedia === "function" && !window.matchMedia("(min-width: 1024px)").matches) return;
      e.preventDefault();
      toggle();
    };
    const fromPalette = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(QUICK_LOG_EVENT, fromPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(QUICK_LOG_EVENT, fromPalette);
    };
  }, [toggle]);

  // the weekly review has its own buttons at the bottom edge
  const hidden = pathname === "/home/review";
  return (
    <>
      {!hidden && (
      <button
        type="button"
        aria-label="Quick log"
        aria-expanded={open}
        title="Quick log (L)"
        data-testid="quick-log-fab"
        onClick={toggle}
        className="fab-coral fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-40 flex size-14 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cta)] lg:bottom-6 lg:right-6"
      >
        <Plus className="fab-icon size-7" strokeWidth={2.5} aria-hidden />
        <span className="sr-only">Press L on a desktop</span>
      </button>
      )}
      <QuickLogHub open={open} onClose={() => setOpen(false)} />
    </>
  );
}
