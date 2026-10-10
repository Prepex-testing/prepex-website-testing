"use client";

import type { SubjectChapters } from "@/lib/api/dashboard";
import type { Period } from "@/lib/api/logsCommon";
import type { ChapterAccuracy, PracticeAnalytics } from "@/lib/api/practiceLogs";
import { PeriodToggle, Stat } from "@/components/logs/RevisionAnalyticsPanel";
import { SourceDonut, SpeedLine, WeeklyAccuracyLine } from "@/components/logs/LazyCharts";
import { FIELD } from "@/components/study/SubjectChapterFields";
import { BAND_STYLE, labelOf, percentLabel, PRACTICE_SOURCES } from "@/lib/logs/labels";
import { SOURCE_PALETTE } from "@/lib/logs/palette";
import { formatMinutes } from "@/lib/study/format";

export function WeaknessRow({ chapter }: { chapter: ChapterAccuracy }) {
  const band = chapter.band;
  const style = band ? BAND_STYLE[band] : null;
  return (
    <li data-testid={`weak-${chapter.chapterId}`} data-band={band ?? "none"} className="rounded-xl border border-brand/10 px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[14px] font-bold text-ink">{chapter.chapterName ?? "Chapter"}</span>
        <span className={`shrink-0 text-[13px] font-extrabold ${style ? style.fg : "text-muted"}`}>
          {percentLabel(chapter.accuracy)}
          {style ? ` · ${style.label}` : ""}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-tint-strong dark:bg-[#FAF7F214]" aria-hidden>
        <div className={`h-full rounded-full ${band === "red" ? "bg-[#EF4444]" : band === "yellow" ? "bg-[#F59E0B]" : "bg-[#10B981]"}`} style={{ width: `${Math.max(2, chapter.accuracy ?? 0)}%` }} />
      </div>
      <p className="mt-1 text-[12px] font-semibold text-muted">
        {chapter.correct}/{chapter.attempted} correct · {chapter.subjectName ?? ""}
        {chapter.lowSample ? " · only a few questions so far" : ""}
      </p>
    </li>
  );
}

type Props = {
  analytics: PracticeAnalytics | null;
  period: Period;
  onPeriod: (p: Period) => void;
  subjects: SubjectChapters[];
  subjectId: number | null;
  onSubject: (id: number | null) => void;
  error: string | null;
};

/** Practice analytics: where you are weak, how you trend, how fast you solve, and where the questions came from. */
export function PracticeAnalyticsPanel({ analytics, period, onPeriod, subjects, subjectId, onSubject, error }: Props) {
  const maxDay = Math.max(1, ...(analytics?.byDay.map((d) => d.attempted) ?? [1]));
  return (
    <div className="flex flex-col gap-5" data-testid="practice-analytics">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PeriodToggle period={period} onChange={onPeriod} />
        <select aria-label="Subject" data-testid="practice-analytics-subject" className={`${FIELD} sm:w-48`} value={subjectId ?? ""} onChange={(e) => onSubject(e.target.value ? Number(e.target.value) : null)}>
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>
              {s.subjectName}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {!analytics ? (
        <div className="h-40 animate-pulse rounded-xl bg-tint-strong" aria-hidden />
      ) : analytics.totals.sessions === 0 ? (
        <p className="rounded-xl bg-tint-strong px-4 py-10 text-center text-[14px] text-muted dark:bg-[#FAF7F214]" data-testid="practice-analytics-empty">
          No practice logged in this period yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Questions" value={String(analytics.totals.attempted)} testId="prac-total-questions" />
            <Stat label="Accuracy" value={percentLabel(analytics.totals.accuracy)} testId="prac-total-accuracy" />
            <Stat label="Time" value={analytics.totals.minutes > 0 ? formatMinutes(analytics.totals.minutes) : "—"} testId="prac-total-minutes" />
          </div>

          <section aria-label="Weakness heatmap" className="rounded-2xl border border-brand/10 bg-surface p-4" data-testid="weakness-heatmap">
            <h2 className="text-[16px] font-extrabold text-ink">Accuracy by chapter</h2>
            <p className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-semibold text-muted">
              <span className="text-[#DC2626] dark:text-[#F87171]">Red: under 50%</span>
              <span className="text-[#B45309] dark:text-[#FBBF24]">Yellow: 50–75%</span>
              <span className="text-[#047857] dark:text-[#34D399]">Green: over 75%</span>
            </p>
            <ul className="flex flex-col gap-2">
              {analytics.weakness.map((c) => (
                <WeaknessRow key={c.chapterId} chapter={c} />
              ))}
            </ul>
          </section>

          {period !== "all" && analytics.byDay.length > 0 && (
            <section aria-label="Questions by day" className="rounded-2xl border border-brand/10 bg-surface p-4" data-testid="day-strip">
              <h2 className="mb-3 text-[16px] font-extrabold text-ink">Questions by day</h2>
              <ol className="flex h-24 items-end gap-1">
                {analytics.byDay.map((d) => (
                  <li key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.date}: ${d.attempted} questions${d.accuracy !== null ? `, ${d.accuracy}%` : ""}`}>
                    <div className="w-full rounded-t bg-[#6366F1]" style={{ height: `${(d.attempted / maxDay) * 100}%`, minHeight: d.attempted > 0 ? 4 : 0 }} />
                    <span className="text-[10px] font-semibold text-muted">{Number(d.date.slice(8))}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-label="Weekly accuracy" className="rounded-2xl border border-brand/10 bg-surface p-4">
            <h2 className="mb-2 text-[16px] font-extrabold text-ink">Weekly accuracy</h2>
            <WeeklyAccuracyLine data={analytics.byWeek} />
            <table className="sr-only">
              <caption>Accuracy per week</caption>
              <tbody>
                {analytics.byWeek.map((w) => (
                  <tr key={w.weekStart}>
                    <td>{w.weekStart}</td>
                    <td>{percentLabel(w.accuracy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-label="Solving speed" className="rounded-2xl border border-brand/10 bg-surface p-4" data-testid="speed-section">
            <h2 className="mb-2 text-[16px] font-extrabold text-ink">Speed: questions per minute</h2>
            {analytics.speed.length === 0 ? (
              <p className="text-[14px] text-muted">Add the minutes to your practice logs to see your speed.</p>
            ) : (
              <>
                <SpeedLine data={analytics.speedTrend} />
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {analytics.speed.map((s) => (
                    <li key={s.difficulty} data-testid={`speed-${s.difficulty}`} className="rounded-xl bg-tint-strong px-3 py-2 dark:bg-[#FAF7F214]">
                      <p className="text-[12px] font-semibold capitalize text-muted">{s.difficulty}</p>
                      <p className="text-[18px] font-extrabold text-ink">{s.questionsPerMinute ?? "—"}/min</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section aria-label="Where the questions came from" className="rounded-2xl border border-brand/10 bg-surface p-4" data-testid="source-section">
            <h2 className="mb-2 text-[16px] font-extrabold text-ink">Where your questions came from</h2>
            <SourceDonut data={analytics.bySource} />
            <ul className="mt-2 flex flex-col gap-1.5">
              {analytics.bySource.map((s, i) => (
                <li key={s.source} className="flex items-center justify-between gap-3 text-[14px] font-semibold text-body-text dark:text-ink">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ background: SOURCE_PALETTE[i % SOURCE_PALETTE.length] }} />
                    {labelOf(PRACTICE_SOURCES, s.source as never, s.source)}
                  </span>
                  <span className="text-muted">
                    {s.share}% · {percentLabel(s.accuracy)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {analytics.byTopic.length > 0 && (
            <section aria-label="Topics" className="rounded-2xl border border-brand/10 bg-surface p-4">
              <h2 className="mb-2 text-[16px] font-extrabold text-ink">Topics</h2>
              <ul className="flex flex-col gap-1.5">
                {analytics.byTopic.slice(0, 8).map((t) => (
                  <li key={`${t.chapterId}-${t.topic}`} className="flex items-center justify-between gap-3 text-[14px] font-semibold text-body-text dark:text-ink">
                    <span className="truncate">{t.topic}</span>
                    <span className="shrink-0 text-muted">
                      {t.correct}/{t.attempted} · {percentLabel(t.accuracy)}
                    </span>
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
