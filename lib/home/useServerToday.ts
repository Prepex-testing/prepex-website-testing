"use client";

import { useEffect, useState } from "react";
import { getServerToday } from "@/lib/api/profile";
import { withRetry } from "@/lib/api/retry";

/**
 * A3: the date Home shows is the server's IST date, never the device clock (a phone set to the wrong day or zone
 * used to show the wrong date). It is read again when the tab comes back into view and right after IST midnight.
 * Null until the server has answered.
 */
export function useServerToday(): string | null {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let midnightTimer: ReturnType<typeof setTimeout> | undefined;

    const load = () =>
      withRetry(getServerToday)
        .then((r) => {
          if (!alive) return;
          setToday(r.data.today);
          // the server's clock, not ours, decides when the day turns over
          const offset = Date.parse(r.data.now) - Date.now();
          const wait =
            Date.parse(r.data.nextMidnightAt) - (Date.now() + offset) + 1_000;
          clearTimeout(midnightTimer);
          midnightTimer = setTimeout(
            load,
            Math.max(1_000, Math.min(wait, 24 * 60 * 60_000)),
          );
        })
        .catch(() => undefined);

    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return today;
}

const FULL = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** "Thursday, 12 November" for a `YYYY-MM-DD` label, independent of the device's time zone. */
export function formatDayLabel(label: string): string {
  return FULL.format(new Date(`${label}T00:00:00Z`));
}
