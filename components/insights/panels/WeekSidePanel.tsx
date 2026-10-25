"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarRow, PanelSection } from "@/components/logs/LogScreenScaffold";
import { GHOST_CLASSES } from "@/components/ui/GhostButton";
import type { Fix } from "@/lib/api/diagnosis";
import { getMasterAnalytics, type MasterAnalytics } from "@/lib/api/masterAnalytics";
import { fixToGoalHref } from "@/lib/goals/prefill";
import { readTargetRank } from "@/lib/insights/targetRank";
import { formatMinutes } from "@/lib/study/format";

type Props = { fixes: Fix[] };

/** This week's right column: the top three fixes (each can become next week's goal), hours by subject, and the streak. */
export function WeekSidePanel({ fixes }: Props) {
  const [data, setData] = useState<MasterAnalytics | null>(null);
  useEffect(() => {
    let alive = true;
    getMasterAnalytics({ targetRank: readTargetRank() }).then(
      (r) => alive && setData(r.data),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);
  const top = fixes.slice(0, 3);
  const max = Math.max(1, ...(data?.bySubject ?? []).map((s) => s.minutes));

  return (
    <>
      <PanelSection title="Top 3 fixes for next week" testId="week-fixes">
        {top.length === 0 ? (
          <p className="text-[13px] text-muted">Run this week&apos;s diagnosis to get your fixes.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {top.map((f, i) => (
              <li key={`${f.title}-${i}`} className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-elevated-2 p-3" data-testid="week-fix">
                <p className="text-[14px] text-ink">{f.title}</p>
                <Link href={fixToGoalHref(f)} data-testid="week-fix-goal" className={`${GHOST_CLASSES} self-start`}>
                  Set as goal
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>

      <PanelSection title="Hours by subject, this month" testId="week-hours">
        {!data ? (
          <p className="text-[13px] text-muted">Loading</p>
        ) : data.bySubject.length === 0 ? (
          <p className="text-[13px] text-muted">Nothing logged yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.bySubject.map((s) => (
              <BarRow key={s.subjectId ?? "other"} label={s.name} value={s.minutes} max={max} text={formatMinutes(s.minutes)} />
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection title="Streak" testId="week-streak">
        <p className="inline-flex w-fit items-center rounded-full border border-border-strong px-3 py-1.5 text-[14px] font-semibold text-ink">
          {data ? `${data.streaks.current} ${data.streaks.current === 1 ? "day" : "days"}` : "…"}
        </p>
      </PanelSection>
    </>
  );
}
