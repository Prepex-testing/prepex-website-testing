"use client";

import { useEffect, useState } from "react";
import { PexoBubble, usePexoLine } from "@/components/pexo/PexoBubble";
import { getPexoTeaser, type PexoTeaser } from "@/lib/api/pexo";
import type { PexoPick } from "@/lib/pexo/engine";
import { pexoSay, usePexo } from "@/lib/pexo/store";

export type DaySummaryLike = { minutes: number; tasksDone: number; tasksTotal: number };

/** Which reward line fits the day: a real day of work, a day that still counted, or a quiet one. */
export function rewardTrigger(s: DaySummaryLike): { trigger: string; context: Record<string, number> } {
  if (s.minutes === 0 && s.tasksDone === 0) return { trigger: "dayclose.reward.zero", context: {} };
  const great = s.minutes >= 180 || (s.tasksTotal > 0 && s.tasksDone === s.tasksTotal);
  if (great && s.minutes >= 60 && s.tasksDone > 0) return { trigger: "dayclose.reward.great", context: { hours: Math.round((s.minutes / 60) * 10) / 10, tasks: s.tasksDone } };
  return { trigger: "dayclose.reward.ok", context: {} };
}

/**
 * The end of Day Close with Pexo: one line about the day, then tomorrow's teaser (the first-ever revision, or tomorrow's
 * first task). The teaser is one small request when the reward opens. Nothing renders when Pexo is off.
 */
export function DayClosePexo({ summary }: { summary: DaySummaryLike }) {
  const { enabled } = usePexo();
  const reward = rewardTrigger(summary);
  const line = usePexoLine(reward.trigger, reward.context, `${reward.trigger}:${summary.minutes}:${summary.tasksDone}`);
  const [teaser, setTeaser] = useState<PexoPick | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    getPexoTeaser().then(
      (t: PexoTeaser | null) => {
        if (live && t) setTeaser(pexoSay(t.trigger, t.context));
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [enabled]);

  if (!enabled || (!line && !teaser)) return null;
  return (
    <div className="flex w-full flex-col gap-2 text-left" data-testid="day-close-pexo">
      {line && <PexoBubble pick={line} size={48} testId="day-close-pexo-reward" />}
      {teaser && <PexoBubble pick={teaser} size={48} testId="day-close-pexo-teaser" />}
    </div>
  );
}
