"use client";

import { useEffect } from "react";
import { sendHeartbeat } from "@/lib/api/xp";
import { pexoReact, returnPexoBatch, takePexoBatch } from "@/lib/pexo/store";

/** How often the app reports that it is open and in use. The server also clamps what it credits. */
export const HEARTBEAT_EVERY_MS = 60_000;

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
      if (seconds <= 0) return;
      // what Pexo showed since the last beat rides along; a failed beat hands it back for the next one
      const pexo = takePexoBatch();
      void sendHeartbeat(seconds, pexo)
        .then((r) => {
          // a friend tapped Join on me in Studying Now: told once, on the beat that already runs
          const friend = r?.pexoJoined?.[0]?.name;
          if (friend) pexoReact("focus.friend_joined", { friend }, { kind: "celebration" });
        })
        .catch(() => {
        if (pexo) returnPexoBatch(pexo);
      });
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
