"use client";

import { useEffect } from "react";
import { sendHeartbeat } from "@/lib/api/xp";

/** How often the app reports that it is open and in use. The server also clamps what it credits. */
export const HEARTBEAT_EVERY_MS = 30_000;

/**
 * Streak 2.0: the day counts after 2 minutes of the app being open AND visible. A hidden tab, a locked phone or another
 * app in front sends nothing, so leaving a tab open all day does not count. Mounted once in the app shell.
 */
export function Heartbeat() {
  useEffect(() => {
    let visibleSince: number | null = document.visibilityState === "visible" ? Date.now() : null;

    const beat = () => {
      if (visibleSince === null) return;
      const now = Date.now();
      const seconds = Math.min(60, Math.round((now - visibleSince) / 1000));
      visibleSince = now;
      if (seconds > 0) void sendHeartbeat(seconds).catch(() => undefined);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        visibleSince = Date.now();
      } else {
        beat();
        visibleSince = null;
      }
    };

    const timer = setInterval(beat, HEARTBEAT_EVERY_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
