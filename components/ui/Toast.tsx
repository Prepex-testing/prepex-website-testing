"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ToastState {
  message: string | null;
  show: (message: string, durationMs?: number) => void;
  dismiss: () => void;
}

/** One toast at a time; a newer message replaces the older one. Pair with <Toast state={…} />. */
export function useToast(): ToastState {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setMessage(null);
  }, []);

  const show = useCallback((next: string, durationMs = 4000) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), durationMs);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { message, show, dismiss };
}

/** Announced politely to screen readers; sits above the bottom navigation on phones. */
export function Toast({ state }: { state: ToastState }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60] flex justify-center px-4 lg:bottom-8" aria-live="polite" role="status" data-testid="toast-region">
      {state.message && (
        <div
          data-testid="toast"
          className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-ink px-4 py-3 text-[14px] font-semibold text-background shadow-modal dark:bg-[#FAF7F2] dark:text-[#1A1A4E]"
        >
          <span>{state.message}</span>
          <button type="button" onClick={state.dismiss} aria-label="Dismiss" className="-mr-1 flex size-8 items-center justify-center rounded-lg text-[18px] leading-none opacity-80 hover:opacity-100">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
