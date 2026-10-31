"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { QuickLogHub } from "@/components/rituals/QuickLogHub";

/** True while the student is typing, so a letter shortcut never steals a keystroke. */
export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/**
 * The floating "+" on the main screens, and the L key on a desktop. Neutral on purpose: the screen's one coral action
 * stays the only coral thing on it.
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // the weekly review has its own buttons at the bottom edge
  const hidden = pathname === "/home/review";
  return (
    <>
      {!hidden && (
      <button
        type="button"
        aria-label="Quick log"
        data-testid="quick-log-fab"
        onClick={toggle}
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-40 flex size-14 items-center justify-center rounded-full border border-border-subtle bg-surface-elevated-2 text-ink shadow-lg transition active:scale-95 lg:bottom-6 lg:right-6"
      >
        <Plus className="size-7" aria-hidden />
        <span className="sr-only">Press L on a desktop</span>
      </button>
      )}
      <QuickLogHub open={open} onClose={() => setOpen(false)} />
    </>
  );
}
