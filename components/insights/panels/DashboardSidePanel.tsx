"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PanelSection } from "@/components/logs/LogScreenScaffold";
import { GhostButton } from "@/components/ui/GhostButton";
import type { ReportListItem } from "@/lib/api/diagnosisReports";
import type { MasterAnalytics } from "@/lib/api/masterAnalytics";
import { getMockAnalytics } from "@/lib/api/mocks";
import { startFocusSession } from "@/lib/focus/startFocusSession";

/** The weakest chapter in the strength grid: lowest accuracy among those labelled weak. */
export function weakestChapter(grid: MasterAnalytics["chapterStrengthGrid"]) {
  return grid.chapters.filter((c) => c.label === "weak").sort((a, b) => (a.accuracy ?? 101) - (b.accuracy ?? 101) || a.name.localeCompare(b.name))[0] ?? null;
}

type Props = { data: MasterAnalytics; lastReport: ReportListItem | null };

/** The dashboard's right column: the last diagnosis, the weakest chapter, and mocks taken this month. */
export function DashboardSidePanel({ data, lastReport }: Props) {
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
      <PanelSection title="Last diagnosis" testId="dash-last-diagnosis">
        {lastReport && lastReport.status === "complete" ? (
          <>
            <p className="text-[12px] text-muted">{new Date(lastReport.completedAt ?? lastReport.triggeredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
            {lastReport.preview && <p className="line-clamp-4 text-[14px] text-ink">{lastReport.preview}</p>}
            <Link href={`/diagnosis/${lastReport.id}`} data-testid="dash-open-report" className="self-start text-[13px] font-medium text-ink underline underline-offset-2">
              Open full report
            </Link>
          </>
        ) : (
          <p className="text-[13px] text-muted">No diagnosis yet. Run one from the card above.</p>
        )}
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
