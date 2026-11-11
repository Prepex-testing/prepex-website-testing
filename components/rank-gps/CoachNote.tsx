"use client";

import { Pexo } from "@/components/pexo/Pexo";
import { StatCard } from "@/components/stats/StatCard";
import { COPY } from "@/lib/rankGps/labels";
import { usePexo } from "@/lib/pexo/store";

/**
 * The one short note written for this report (an AI call made once, in the background, with a plain-text fallback).
 * With Pexo on, it is Pexo's note: Pexo's avatar and name, proud when readiness went up, calm otherwise. The note's
 * text is unchanged.
 */
export function CoachNote({ note, change = null }: { note: string; change?: number | null }) {
  const { enabled } = usePexo();
  return (
    <StatCard title={enabled ? "Pexo" : COPY.coach} icon={enabled ? <Pexo mood={change !== null && change > 0 ? "proud" : "calm"} size={48} /> : undefined}>
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-body-text dark:text-ink" data-testid="rank-gps-coach">{note}</p>
    </StatCard>
  );
}
