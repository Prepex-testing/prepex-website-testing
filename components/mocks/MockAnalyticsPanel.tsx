"use client";

import { useState } from "react";
import { SeriesLine } from "@/components/insights/LazyCharts";
import { StatCard } from "@/components/stats/StatCard";
import type { MockAnalytics, MockPeriod } from "@/lib/api/mocks";
import { approxRank, labelOfPattern, labelOfType, rankLabel, signedPoints, SUBJECT_LABEL } from "@/lib/insights/mockMath";
import { formatMinutes } from "@/lib/study/format";

const PERIODS: { value: MockPeriod; label: string }[] = [
  { value: "month", label: "30 days" },
  { value: "quarter", label: "90 days" },
  { value: "all", label: "All time" },
];

export function MockPeriodToggle({ period, onChange }: { period: MockPeriod; onChange: (p: MockPeriod) => void }) {
  return (
    <div role="radiogroup" aria-label="Period" className="grid grid-cols-3 gap-1 rounded-xl bg-tint-strong p-1 dark:bg-[#FAF7F214]">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          role="radio"
          aria-checked={period === p.value}
          data-testid={`mock-period-${p.value}`}
          onClick={() => onChange(p.value)}
          className={`min-h-11 rounded-lg px-2 text-[14px] font-bold ${period === p.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function Tile({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-2xl border border-brand/10 bg-surface p-4">
      <p className="text-[12px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-[24px] font-extrabold leading-none text-ink" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}

type Props = {
  analytics: MockAnalytics | null;
  period: MockPeriod;
  error: string | null;
  onPeriod: (p: MockPeriod) => void;
  targetRank: number | null;
  onTargetRank: (rank: number | null) => void;
};

/** Score trend, projection, subject averages, question totals and the chapters mocks keep flagging. */
export function MockAnalyticsPanel({ analytics, period, error, onPeriod, targetRank, onTargetRank }: Props) {
  const [draft, setDraft] = useState(targetRank === null ? "" : String(targetRank));

  function commitTarget() {
    const t = draft.trim();
    if (t === "") return onTargetRank(null);
    const n = Number(t.replace(/,/g, ""));
    if (Number.isInteger(n) && n >= 1 && n <= 5_000_000) onTargetRank(n);
  }

  return (
    <div className="flex flex-col gap-4" data-testid="mock-analytics">
      <MockPeriodToggle period={period} onChange={onPeriod} />
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {!analytics ? (
        !error && <div className="h-40 animate-pulse rounded-xl bg-tint-strong" aria-hidden />
      ) : analytics.totals.mocks === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand/20 p-6 text-center text-[14px] text-muted" data-testid="mock-analytics-empty">
          No mocks in this period.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Mocks" value={String(analytics.totals.mocks)} testId="mock-total-count" />
            <Tile label="Average" value={analytics.score ? `${analytics.score.averagePercent}%` : "—"} testId="mock-avg-score" />
            <Tile label="Best" value={analytics.score ? `${analytics.score.bestPercent}%` : "—"} testId="mock-best-score" />
            <Tile label="Latest" value={analytics.score ? `${analytics.score.latestPercent}%` : "—"} testId="mock-latest-score" />
          </div>

          {analytics.score && analytics.totals.mocks > 1 && (
            <p className="text-[14px] font-semibold text-body-text dark:text-ink" data-testid="mock-change">
              {analytics.score.changePoints === 0 ? "Level with your first mock in this period." : `${signedPoints(analytics.score.changePoints)} points since your first mock in this period.`}
            </p>
          )}

          <StatCard title="Projected rank" subtitle={analytics.projection ? labelOfPattern(analytics.projection.examPattern).toUpperCase() : undefined}>
            {analytics.projection ? (
              <div className="flex flex-col gap-2" data-testid="mock-projection">
                <p className="text-[32px] font-extrabold leading-none text-ink" data-testid="mock-projected-rank">
                  {approxRank(analytics.projection.projectedRank)}
                </p>
                <p className="text-[13px] text-muted">
                  From your {analytics.projection.latestPercentile} percentile on {analytics.projection.asOf}, against about {rankLabel(analytics.projection.candidatePool)} candidates. An estimate, not a prediction.
                </p>
                {analytics.projection.targetGap !== null && (
                  <p className="text-[14px] font-bold text-ink" data-testid="mock-target-gap">
                    {analytics.projection.targetGap > 0 ? `${rankLabel(analytics.projection.targetGap)} ranks to go to reach ${rankLabel(analytics.projection.targetRank)}.` : `You're ${rankLabel(Math.abs(analytics.projection.targetGap))} ranks inside your target of ${rankLabel(analytics.projection.targetRank)}.`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-muted" data-testid="mock-no-projection">
                Add the percentile from your test platform to a mock and we&apos;ll project your rank.
              </p>
            )}
            <div className="mt-3 flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1 text-[13px] font-semibold text-body-text dark:text-ink" htmlFor="mock-target-rank">
                Your target rank (optional)
                <input
                  id="mock-target-rank"
                  data-testid="mock-target-rank"
                  inputMode="numeric"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitTarget}
                  onKeyDown={(e) => e.key === "Enter" && commitTarget()}
                  className="h-11 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink"
                />
              </label>
              <button type="button" onClick={commitTarget} className="min-h-11 rounded-lg border border-brand/15 bg-surface px-4 text-[13px] font-bold text-ink">
                Set
              </button>
            </div>
          </StatCard>

          <StatCard title="Score trend" subtitle="% OF MAXIMUM">
            <SeriesLine
              testId="mock-trend-chart"
              unit="%"
              scale="percent"
              data={analytics.trend.map((t) => ({ label: t.date.slice(5), value: t.scorePercent }))}
              reference={analytics.score?.averagePercent ?? null}
            />
            <ul className="mt-3 flex flex-col gap-1 text-[13px]" data-testid="mock-trend-list">
              {analytics.trend.map((t) => (
                <li key={t.mockId} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-body-text dark:text-ink">
                    {t.date} · {t.testName ?? labelOfType(t.testType)}
                  </span>
                  <span className="shrink-0 font-bold text-ink">
                    {t.totalMarks}/{t.maxMarks} · {t.scorePercent}%
                  </span>
                </li>
              ))}
            </ul>
          </StatCard>

          {analytics.subjects.length > 0 && (
            <StatCard title="By subject" subtitle="AVERAGE MARKS">
              <ul className="flex flex-col gap-2" data-testid="mock-subjects">
                {analytics.subjects.map((s) => (
                  <li key={s.subject} className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="font-semibold text-body-text dark:text-ink">{SUBJECT_LABEL[s.subject]}</span>
                    <span className="text-muted">
                      <span className="font-bold text-ink">{s.averageMarks}</span> avg · best {s.bestMarks} · latest {s.latestMarks}
                    </span>
                  </li>
                ))}
              </ul>
            </StatCard>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {analytics.questions.mocks > 0 && (
              <StatCard title="Questions" subtitle={`${analytics.questions.mocks} MOCKS WITH DATA`}>
                <p className="text-[14px] text-body-text dark:text-ink" data-testid="mock-questions">
                  <span className="font-extrabold text-ink">{analytics.questions.correct}</span> correct · {analytics.questions.wrong} wrong · {analytics.questions.skipped} skipped
                  {analytics.questions.accuracy !== null && <span className="text-muted"> · {analytics.questions.accuracy}% accuracy</span>}
                </p>
              </StatCard>
            )}
            {analytics.timing.averageMinutes !== null && (
              <StatCard title="Time" subtitle="AVERAGE PER MOCK">
                <p className="text-[24px] font-extrabold text-ink" data-testid="mock-avg-time">
                  {formatMinutes(analytics.timing.averageMinutes)}
                </p>
              </StatCard>
            )}
          </div>

          {analytics.weakChapters.length > 0 && (
            <StatCard title="Chapters your mocks keep flagging" subtitle="FLAGGED WEAK">
              <ul className="flex flex-col gap-2" data-testid="mock-weak-chapters">
                {analytics.weakChapters.map((w) => (
                  <li key={w.chapterId} className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="min-w-0 truncate font-semibold text-body-text dark:text-ink">{analytics.weakChapterNames[w.chapterId] ?? "Chapter"}</span>
                    <span className="shrink-0 text-muted">
                      {w.mocks} mock{w.mocks === 1 ? "" : "s"} · last {w.lastDate}
                    </span>
                  </li>
                ))}
              </ul>
            </StatCard>
          )}
        </>
      )}
    </div>
  );
}
