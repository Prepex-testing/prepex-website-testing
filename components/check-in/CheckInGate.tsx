"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCheckInStatus } from "@/lib/api/checkin";
import { getAccessToken } from "@/lib/auth/session";

export function CheckInGate() {
  const router = useRouter();

  useEffect(() => {
    if (!getAccessToken()) return;

    getCheckInStatus()
      .then(({ data }) => {
        if (!data.exists) router.push("/check-in");
      })
      .catch(() => {
        // Best-effort — don't block the app if the status check fails.
      });
  }, [router]);

  return null;
}
