"use client";

import { useEffect, useState } from "react";
import { XIcon } from "@/components/ui/icons";
import { clearAccountRestoredNotice, hasAccountRestoredNotice } from "@/lib/auth/accountRestored";

/**
 * One-time confirmation after a sign-in cancelled a scheduled account
 * deletion. Rendered by AppShell, which only mounts after AuthGate has
 * authorised on the client — so reading sessionStorage here never has to
 * match any server-rendered HTML.
 */
export function AccountRestoredNotice() {
  const [visible, setVisible] = useState(hasAccountRestoredNotice);

  // Clear the flag once it's on screen, so a reload doesn't show it again.
  useEffect(() => {
    if (visible) clearAccountRestoredNotice();
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="px-4 pt-4 sm:px-6 lg:px-8">
      <section
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success-bg px-4 py-3.5 sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-6 text-success">Welcome back — your account is restored.</p>
          <p className="text-[13px] leading-5 text-body-text">
            Signing in cancelled your scheduled account deletion. Nothing was removed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-success transition-colors hover:bg-success/10"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </section>
    </div>
  );
}
