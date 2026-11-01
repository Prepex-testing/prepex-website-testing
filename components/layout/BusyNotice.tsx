"use client";

import { useEffect, useRef, useState } from "react";
import { BUSY_EVENT } from "@/lib/api/authRequest";

/**
 * A small, non-blocking line shown only when the server keeps asking the app to slow down (two or more refusals within
 * half a minute). Screens keep their last data meanwhile, and the request layer retries on its own; nothing here can be
 * tapped, so it never sits on top of a button.
 */
export function BusyNotice() {
  const [shown, setShown] = useState(false);
  const recent = useRef<number[]>([]);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onBusy = () => {
      const now = Date.now();
      recent.current = [...recent.current.filter((t) => now - t < 30_000), now];
      if (recent.current.length < 2) return;
      setShown(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShown(false), 8_000);
    };
    window.addEventListener(BUSY_EVENT, onBusy);
    return () => {
      window.removeEventListener(BUSY_EVENT, onBusy);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!shown) return null;
  return (
    <p role="status" data-testid="busy-notice" className="pointer-events-none fixed inset-x-0 top-2 z-[60] mx-auto w-fit max-w-[90vw] rounded-full border border-border-subtle bg-surface-elevated-2 px-4 py-1.5 text-center text-[13px] font-semibold text-ink shadow">
      Prepex is busy. Your screens are up to date as of a moment ago; retrying on its own.
    </p>
  );
}
