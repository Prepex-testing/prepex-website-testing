"use client";

import { useEffect, useState } from "react";
import { getProfileOverview, type ExamDateEntry } from "@/lib/api/profile";

/**
 * A4: where there is room, both JEE countdowns side by side ("JEE Main in 69 days · JEE Advanced in 185 days").
 * Reads the profile overview the app already caches; renders nothing until it has real dates.
 */
export function ExamDates() {
  const [dates, setDates] = useState<ExamDateEntry[] | null>(null);
  useEffect(() => {
    let alive = true;
    void getProfileOverview().then(
      (r) => {
        if (alive) setDates(r.data.examDates ?? []);
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);
  if (!dates || dates.length === 0) return null;
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted" data-testid="exam-dates">
      {dates.map((e, i) => (
        <span key={e.kind}>
          {i > 0 && <span aria-hidden className="mr-3">·</span>}
          <b className="font-semibold text-ink">{e.label}</b> {e.days === 0 ? "is today" : `in ${e.days} ${e.days === 1 ? "day" : "days"}`}
          {e.isDefault && e.estimated ? " (expected date)" : ""}
        </span>
      ))}
    </p>
  );
}
