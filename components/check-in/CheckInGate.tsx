"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCheckInStatus } from "@/lib/api/checkin";
import { getAccessToken } from "@/lib/auth/session";

const WELCOME_BACK_PATH = "/home/session/welcome-back";

export function CheckInGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkStatus = () => {
      if (!getAccessToken()) return;

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
        });
    };

    checkStatus();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkStatus();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [router, pathname]);

  return null;
}
