"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PanelSection } from "@/components/logs/LogScreenScaffold";
import { GhostButton } from "@/components/ui/GhostButton";
import type { RankGpsHomeCard } from "@/lib/api/rankGps";
import type { MasterAnalytics } from "@/lib/api/masterAnalytics";
import { getMockAnalytics } from "@/lib/api/mocks";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import { RANK_GPS_HREF } from "@/lib/rankGps/labels";

/** The weakest chapter in the strength grid: lowest accuracy among those labelled weak. */
export function weakestChapter(grid: MasterAnalytics["chapterStrengthGrid"]) {
  return grid.chapters.filter((c) => c.label === "weak").sort((a, b) => (a.accuracy ?? 101) - (b.accuracy ?? 101) || a.name.localeCompare(b.name))[0] ?? null;
}

type Props = { data: MasterAnalytics; rankGps: RankGpsHomeCard | null };

/** The dashboard's right column: Rank GPS, the weakest chapter, and mocks taken this month. */
export function DashboardSidePanel({ data, rankGps }: Props) {
  const [mocks, setMocks] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    getMockAnalytics({ period: "month" }).then(
      (r) => alive && setMocks(r.data.totals.mocks),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);
  const weak = weakestChapter(data.chapterStrengthGrid);

  return (
    <>
      <PanelSection title="Rank GPS" testId="dash-rank-gps">
        {rankGps && rankGps.state === "ready" && rankGps.score !== null ? (
          <>
            <p className="text-[28px] font-bold leading-none text-ink">{Math.round(rankGps.score)}</p>
            {rankGps.topMove && <p className="text-[13px] text-body-text dark:text-ink">Top move: {rankGps.topMove.name}</p>}
          </>
        ) : (
          <p className="text-[13px] text-muted">Your Rank GPS report appears here once it is built.</p>
        )}
        <Link href={RANK_GPS_HREF} data-testid="dash-open-rank-gps" className="self-start text-[13px] font-medium text-ink underline underline-offset-2">
          Open Rank GPS
        </Link>
      </PanelSection>

      <PanelSection title="Weakest chapter" testId="dash-weakest">
        {weak ? (
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-[14px] text-ink">
              <span className="block truncate font-semibold">{weak.name}</span>
              <span className="text-[12px] text-muted">{weak.accuracy !== null ? `${Math.round(weak.accuracy)}% accuracy` : "weak"}</span>
            </p>
            <GhostButton data-testid="dash-study-weak" onClick={() => startFocusSession({ originSource: "syllabus_overview", chapter: weak.chapterId, taskType: "self_study", targetMinutes: 60 })}>
              Study
            </GhostButton>
          </div>
        ) : (
          <p className="text-[13px] text-muted">No weak chapters. Keep going.</p>
        )}
      </PanelSection>

      <PanelSection title="Mocks taken this month" testId="dash-mocks">
        <p className="text-[28px] font-bold leading-none text-ink">{mocks === null ? "…" : mocks}</p>
      </PanelSection>
    </>
  );
}
