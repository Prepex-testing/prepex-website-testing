"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCheckInStatus } from "@/lib/api/checkin";
import { getAccessToken } from "@/lib/auth/session";

const WELCOME_BACK_PATH = "/home/session/welcome-back";

/**
 * Verifies today's check-in exists (and the cross-app-study redirect) before
 * the app shell's children are allowed to render, so a protected page never
 * flashes on screen before this bounces the user to /check-in. Only the very
 * first check of the session blocks rendering — the periodic re-checks this
 * also runs on tab focus happen in the background and never re-hide
 * already-rendered UI, so normal in-app navigation isn't interrupted.
 *
 * `enabled: false` (e.g. the revision session's focus mode, which wants no
 * check-in interruptions) skips the gate entirely and always renders.
 */
export function useCheckInGate(enabled: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const [hasVerifiedOnce, setVerifiedOnce] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    const checkStatus = (isInitialCheck: boolean) => {
      if (!getAccessToken()) {
        if (isInitialCheck) setVerifiedOnce(true);
        return;
      }

      getCheckInStatus()
        .then(({ data }) => {
          if (!data.exists) {
            router.push("/check-in");
            return;
          }
          if (data.checkin?.isStudyingCrossApp && pathname !== WELCOME_BACK_PATH) {
            router.push(WELCOME_BACK_PATH);
          }
        })
        .catch(() => {
          // Best-effort — don't block the app if the status check fails.
        })
        .finally(() => {
          if (isInitialCheck) setVerifiedOnce(true);
        });
    };

    checkStatus(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkStatus(false);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    // Re-running this on every pathname change (not just mount) matches the
    // original behavior — it still only *blocks* rendering on the session's
    // first check, per `hasVerifiedOnce` above never resetting afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, pathname, enabled]);

  return enabled ? hasVerifiedOnce : true;
}
