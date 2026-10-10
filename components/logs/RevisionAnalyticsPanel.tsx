"use client";

import { useMemo, useState } from "react";
import type { HeatCell, RevisionAnalytics, StaleChapter } from "@/lib/api/revisionLogs";
import type { Period } from "@/lib/api/logsCommon";
import { AccuracyBars } from "@/components/logs/LazyCharts";
import { agoLabel } from "@/lib/logs/dates";
import { percentLabel, REVISION_STATUS_LABEL, REVISION_STATUS_STYLE } from "@/lib/logs/labels";
import { formatMinutes } from "@/lib/study/format";
import { subjectColor } from "@/lib/study/subjects";

export const HEATMAP_INITIAL = 24;

export function PeriodToggle({ period, onChange, label = "Period" }: { period: Period; onChange: (p: Period) => void; label?: string }) {
  return (
    <div className="flex rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]" role="group" aria-label={label} data-testid="period-toggle">
      {(["week", "month", "all"] as const).map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={period === p}
          data-testid={`period-${p}`}
          onClick={() => onChange(p)}
          className={`min-h-10 flex-1 rounded-lg px-3 text-[13px] font-bold ${period === p ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
        >
          {p === "week" ? "Week" : p === "month" ? "Month" : "All time"}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-xl bg-tint-strong px-3 py-3 dark:bg-[#FAF7F214]">
      <p className="text-[12px] font-semibold text-muted">{label}</p>
      <p className="text-[22px] font-extrabold text-ink" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

export function HeatTile({ cell, fallbackName }: { cell: HeatCell; fallbackName: string }) {
  const style = REVISION_STATUS_STYLE[cell.status];
  return (
    <li
      data-testid={`heat-${cell.chapterId}`}
      data-status={cell.status}
      className={`flex min-h-16 flex-col justify-between rounded-xl px-3 py-2 ${style.bg}`}
    >
      <span className="text-[13px] font-bold leading-tight text-ink">{cell.chapterName ?? fallbackName}</span>
      <span className={`text-[12px] font-bold ${style.fg}`}>
        {REVISION_STATUS_LABEL[cell.status]} · {agoLabel(cell.daysAgo)}
      </span>
    </li>
  );
}

type Props = {
  analytics: RevisionAnalytics | null;
  period: Period;
  onPeriod: (p: Period) => void;
  error: string | null;
  onPlanChapter: (chapter: StaleChapter) => void;
};

/** Revision analytics: totals, the chapter freshness heatmap, accuracy by method, and chapters going stale. */
export function RevisionAnalyticsPanel({ analytics, period, onPeriod, error, onPlanChapter }: Props) {
  const [showAll, setShowAll] = useState(false);

  const groups = useMemo(() => {
    if (!analytics) return [];
    const cells = showAll ? analytics.heatmap : analytics.heatmap.slice(0, HEATMAP_INITIAL);
    const bySubject = new Map<number, { name: string; cells: HeatCell[] }>();
    for (const c of cells) {
      const g = bySubject.get(c.subjectId) ?? { name: c.subjectName ?? `Subject ${c.subjectId}`, cells: [] };
      g.cells.push(c);
      bySubject.set(c.subjectId, g);
    }
    return [...bySubject.entries()].sort(([a], [b]) => a - b);
  }, [analytics, showAll]);

  return (
    <div className="flex flex-col gap-5" data-testid="revision-analytics">
      <PeriodToggle period={period} onChange={onPeriod} />
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {!analytics ? (
        <div className="h-40 animate-pulse rounded-xl bg-tint-strong" aria-hidden />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Revisions" value={String(analytics.totals.revisions)} testId="rev-total-count" />
            <Stat label="Time" value={formatMinutes(analytics.totals.minutes)} testId="rev-total-minutes" />
            <Stat label="Accuracy" value={percentLabel(analytics.totals.accuracy)} testId="rev-total-accuracy" />
          </div>

          <section aria-label="Revision by subject" className="rounded-2xl border border-brand/10 bg-surface p-4">
            <h2 className="mb-2 text-[16px] font-extrabold text-ink">Revision time by subject</h2>
            {analytics.perSubject.length === 0 ? (
              <p className="text-[14px] text-muted">No revisions logged in this period.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {analytics.perSubject.map((s) => (
                  <li key={s.subjectId} className="flex items-center justify-between gap-3 text-[14px] font-semibold text-body-text dark:text-ink">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="size-2.5 rounded-full" style={{ background: subjectColor(s.subjectId) }} />
                      {s.subjectName ?? `Subject ${s.subjectId}`}
                    </span>
                    <span>
                      {s.revisions} · {formatMinutes(s.minutes)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Chapter freshness" className="rounded-2xl border border-brand/10 bg-surface p-4" data-testid="revision-heatmap">
            <h2 className="text-[16px] font-extrabold text-ink">When did you last revise each chapter?</h2>
            <p className="mb-3 text-[13px] text-muted">Stale means not revised for more than {analytics.staleAfterDays} days.</p>
            {analytics.heatmap.length === 0 ? (
              <p className="rounded-xl bg-tint-strong px-4 py-6 text-center text-[14px] text-muted dark:bg-[#FAF7F214]">Log a revision and your chapters show up here.</p>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  {groups.map(([subjectId, g]) => (
                    <div key={subjectId}>
                      <h3 className="mb-2 flex items-center gap-2 text-[14px] font-bold text-ink">
                        <span aria-hidden className="size-2.5 rounded-full" style={{ background: subjectColor(subjectId) }} />
                        {g.name}
                      </h3>
                      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {g.cells.map((c) => (
                          <HeatTile key={c.chapterId} cell={c} fallbackName="Chapter" />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {analytics.heatmap.length > HEATMAP_INITIAL && (
                  <button type="button" data-testid="heatmap-toggle" onClick={() => setShowAll((v) => !v)} className="mt-3 min-h-11 w-full rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[14px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
                    {showAll ? "Show fewer" : `Show all ${analytics.heatmap.length} chapters`}
                  </button>
                )}
              </>
            )}
          </section>

          <section aria-label="Accuracy by method" className="rounded-2xl border border-brand/10 bg-surface p-4" data-testid="accuracy-comparison">
            <h2 className="mb-2 text-[16px] font-extrabold text-ink">Revision vs practice vs mock accuracy</h2>
            {analytics.accuracyComparison.length === 0 ? (
              <p className="text-[14px] text-muted">Solve some questions while revising, or log practice, to compare.</p>
            ) : (
              <>
                <AccuracyBars data={analytics.accuracyComparison} />
                <table className="sr-only">
                  <caption>Accuracy by subject</caption>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Revision</th>
                      <th>Practice</th>
                      <th>Mock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.accuracyComparison.map((c) => (
                      <tr key={c.subjectId}>
                        <td>{c.subjectName}</td>
                        <td>{percentLabel(c.revision)}</td>
                        <td>{percentLabel(c.practice)}</td>
                        <td>{percentLabel(c.mock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>

          <section aria-label="Stale chapters" className="rounded-2xl border border-brand/10 bg-surface p-4" data-testid="stale-list">
            <h2 className="mb-1 text-[16px] font-extrabold text-ink">Chapters going stale</h2>
            <p className="mb-3 text-[13px] text-muted">Studied, but not revised for over {analytics.staleAfterDays} days.</p>
            {analytics.stale.length === 0 ? (
              <p className="rounded-xl bg-tint-strong px-4 py-6 text-center text-[14px] text-muted dark:bg-[#FAF7F214]">Nothing is stale. Nice.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {analytics.stale.map((s) => (
                  <li key={s.chapterId} data-testid={`stale-${s.chapterId}`} className="flex items-center justify-between gap-3 rounded-xl border border-brand/10 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-ink">{s.chapterName ?? "Chapter"}</p>
                      <p className="text-[12px] font-semibold text-muted">
                        {s.subjectName ?? ""} · {s.daysAgo === null ? "never revised" : `last revised ${agoLabel(s.daysAgo)}`}
                        {s.practiceAccuracy !== null ? ` · practice ${percentLabel(s.practiceAccuracy)}` : ""}
                      </p>
                    </div>
                    <button type="button" data-testid={`stale-plan-${s.chapterId}`} onClick={() => onPlanChapter(s)} className="min-h-11 shrink-0 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-3 text-[13px] font-bold text-body-text hover:bg-tint-strong dark:text-ink">
                      Add to planner
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
