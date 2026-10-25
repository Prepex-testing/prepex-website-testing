"use client";

import { useEffect, useState } from "react";
import { BarRow, PanelSection, Sparkline } from "@/components/logs/LogScreenScaffold";
import { GhostButton } from "@/components/ui/GhostButton";
import { getMockAnalytics, type MockAnalytics } from "@/lib/api/mocks";

type Props = { onLog: () => void };

const NAMES: Record<string, string> = { physics: "Physics", chemistry: "Chemistry", maths: "Maths", biology: "Biology" };

/** Mocks' right column: the last ten scores, the three subjects with the best averages, the projected rank, and a way to log. */
export function MockSidePanel({ onLog }: Props) {
  const [data, setData] = useState<MockAnalytics | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getMockAnalytics({ period: "all" }).then(
      (r) => alive && setData(r.data),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, []);

  const scores = (data?.trend ?? []).slice(-10).map((t) => t.scorePercent);
  const subjects = [...(data?.subjects ?? [])].sort((a, b) => b.averageMarks - a.averageMarks).slice(0, 3);
  const top = Math.max(1, ...subjects.map((s) => s.averageMarks));
  const projection = data?.projection ?? null;

  return (
    <>
      <PanelSection title="Score, last 10 mocks" testId="mk-trend">
        {failed ? (
          <p className="text-[13px] text-muted">Couldn&apos;t load this.</p>
        ) : !data ? (
          <p className="text-[13px] text-muted">Loading</p>
        ) : (
          <>
            <Sparkline points={scores} label="Score percent over the last 10 mocks" />
            {data.score && (
              <p className="text-[13px] text-muted">
                Latest {data.score.latestPercent}% · best {data.score.bestPercent}% · average {data.score.averagePercent}%
              </p>
            )}
          </>
        )}
      </PanelSection>

      <PanelSection title="Subject averages" testId="mk-subjects">
        {subjects.length === 0 ? (
          <p className="text-[13px] text-muted">{data ? "Log a mock with subject marks to see this." : "Loading"}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {subjects.map((s) => (
              <BarRow key={s.subject} label={NAMES[s.subject] ?? s.subject} value={s.averageMarks} max={top} text={String(Math.round(s.averageMarks))} />
            ))}
          </div>
        )}
      </PanelSection>

      {projection && (
        <PanelSection title="Projected rank" testId="mk-rank">
          <p className="inline-flex w-fit items-center rounded-full border border-border-strong px-3 py-1.5 text-[14px] font-semibold text-ink">About {projection.projectedRank.toLocaleString("en-IN")}</p>
          <p className="text-[12px] text-muted">From your latest percentile ({projection.latestPercentile}). An estimate, not a prediction.</p>
        </PanelSection>
      )}

      <GhostButton data-testid="mk-side-log" onClick={onLog}>
        + Log a mock attempt
      </GhostButton>
    </>
  );
}
