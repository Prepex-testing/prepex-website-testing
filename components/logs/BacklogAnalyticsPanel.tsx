"use client";

import type { BacklogAnalytics } from "@/lib/api/backlogItems";
import { BacklogTimeline } from "@/components/logs/LazyCharts";
import { Stat } from "@/components/logs/RevisionAnalyticsPanel";
import { percentLabel } from "@/lib/logs/labels";

/** The clearance rate as a ring (SVG; the number is also printed in text). */
export function ClearanceRing({ percent, size = 132 }: { percent: number | null; size?: number }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = percent === null ? 0 : Math.min(100, Math.max(0, percent)) / 100;
  return (
    <div className="relative" style={{ width: size, height: size }} data-testid="clearance-ring" role="img" aria-label={percent === null ? "No backlog items yet" : `${percentLabel(percent)} of your backlog cleared`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} className="text-ink" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#10B981" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - filled)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[26px] font-extrabold leading-none text-ink" data-testid="clearance-rate">
          {percentLabel(percent)}
        </span>
        <span className="mt-1 text-[11px] font-semibold text-muted">cleared</span>
      </div>
    </div>
  );
}

type Props = { analytics: BacklogAnalytics | null; error: string | null };

/** Clearance, time-to-clear, the weekly in/out timeline, and what has sat there too long. */
export function BacklogAnalyticsPanel({ analytics, error }: Props) {
  return (
    <div className="flex flex-col gap-5" data-testid="backlog-analytics">
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {!analytics ? (
        <div className="h-40 animate-pulse rounded-xl bg-tint-strong" aria-hidden />
      ) : (
        <>
          <section aria-label="Clearance" className="flex items-center gap-5 rounded-2xl border border-brand/10 bg-surface p-4">
            <ClearanceRing percent={analytics.clearanceRate} />
            <div className="grid flex-1 grid-cols-2 gap-2">
              <Stat label="Open" value={String(analytics.totals.open + analytics.totals.scheduled)} testId="backlog-open-count" />
              <Stat label="Cleared" value={String(analytics.totals.cleared)} testId="backlog-cleared-count" />
              <Stat label="Avg days to clear" value={analytics.avgDaysToClear === null ? "—" : String(analytics.avgDaysToClear)} testId="backlog-avg-days" />
              <Stat label="Dropped" value={String(analytics.totals.dropped)} />
            </div>
          </section>

          <section aria-label="Weekly timeline" className="rounded-2xl border border-brand/10 bg-surface p-4" data-testid="backlog-timeline-section">
            <h2 className="mb-2 text-[16px] font-extrabold text-ink">Added vs cleared, by week</h2>
            {analytics.totals.total === 0 ? <p className="text-[14px] text-muted">Nothing yet.</p> : <BacklogTimeline data={analytics.timeline} />}
            <table className="sr-only">
              <caption>Backlog items added and cleared per week</caption>
              <thead>
                <tr>
                  <th>Week starting</th>
                  <th>Added</th>
                  <th>Cleared</th>
                </tr>
              </thead>
              <tbody>
                {analytics.timeline.map((w) => (
                  <tr key={w.weekStart}>
                    <td>{w.weekStart}</td>
                    <td>{w.added}</td>
                    <td>{w.cleared}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-label="Red flags" className="rounded-2xl border border-brand/10 bg-surface p-4" data-testid="backlog-red-flags">
            <h2 className="text-[16px] font-extrabold text-ink">Stuck for over {analytics.redFlagAfterDays} days</h2>
            <p className="mb-3 text-[13px] text-muted">Chapters that have sat on your backlog the longest.</p>
            {analytics.redFlags.length === 0 ? (
              <p className="rounded-xl bg-tint-strong px-4 py-6 text-center text-[14px] text-muted dark:bg-[#FAF7F214]">Nothing is stuck.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {analytics.redFlags.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#EF444414] px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-ink">{f.chapterName ?? f.topic ?? f.subjectName ?? "Backlog item"}</p>
                      <p className="text-[12px] font-semibold text-muted">{f.subjectName}</p>
                    </div>
                    <span className="shrink-0 text-[13px] font-extrabold text-[#DC2626] dark:text-[#F87171]">{f.ageDays} days</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {analytics.frequentChapters.length > 0 && (
            <section aria-label="Most frequent chapters" className="rounded-2xl border border-brand/10 bg-surface p-4">
              <h2 className="mb-2 text-[16px] font-extrabold text-ink">Chapters that keep coming back</h2>
              <ul className="flex flex-col gap-2">
                {analytics.frequentChapters.map((f) => (
                  <li key={`${f.subjectId}-${f.chapterId ?? ""}`} className="flex items-center justify-between gap-3 text-[14px] font-semibold text-body-text dark:text-ink">
                    <span className="truncate">{f.chapterName ?? f.subjectName ?? "Subject"}</span>
                    <span className="shrink-0 text-muted">{f.count}×</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
