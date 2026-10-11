"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SeriesLine } from "@/components/insights/LazyCharts";
import { InsightsTabs } from "@/components/insights/InsightsTabs";
import { StatTile } from "@/components/analytics/StatTile";
import { StrengthGrid } from "@/components/analytics/StrengthGrid";
import { ProfileSubpageHeader } from "@/components/profile/ProfileSubpageHeader";
import { EmptyNote, StatCard } from "@/components/stats/StatCard";
import { SubjectDonut } from "@/components/stats/SubjectDonut";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApiError } from "@/lib/api/http";
import { getMasterAnalytics, type MasterAnalytics } from "@/lib/api/masterAnalytics";
import { drillHref, goalUnitLabel, latestWeek, streakCaption } from "@/lib/insights/analyticsFormat";
import { approxRank, rankLabel } from "@/lib/insights/mockMath";
import { readTargetRank } from "@/lib/insights/targetRank";
import { subjectColor } from "@/lib/study/subjects";
import { formatMinutes } from "@/lib/study/format";

const GOAL_LABEL: Record<string, string> = { HOURS: "Study hours", QUESTIONS: "Questions", REVISIONS: "Revisions", MOCKS: "Mocks", LECTURES: "Lectures" };

export default function AnalyticsPage() {
  const [data, setData] = useState<MasterAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData((await getMasterAnalytics({ targetRank: readTargetRank() })).data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't load your dashboard. Please try again.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load once on arrival
    void load();
  }, [load]);

  const subjectNames = useMemo(() => {
    const names = new Map<number, string>();
    for (const s of data?.bySubject ?? []) if (s.subjectId !== null) names.set(s.subjectId, s.name);
    return (id: number) => names.get(id) ?? `Subject ${id}`;
  }, [data]);

  if (!data && !error) return <PageLoader label="Building your dashboard…" />;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:mx-auto lg:max-w-4xl lg:p-8" data-testid="analytics-page">
      <ProfileSubpageHeader title="Your dashboard" backHref="/home" />
      <InsightsTabs current="/analytics" />

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}{" "}
          <button type="button" className="font-bold underline" onClick={() => void load()}>
            Try again
          </button>
        </p>
      )}

      {data && <Dashboard data={data} subjectNames={subjectNames} />}
    </div>
  );
}

function Dashboard({ data, subjectNames }: { data: MasterAnalytics; subjectNames: (id: number) => string }) {
  const accuracy = latestWeek(data.accuracyTrend, (w) => w.accuracy !== null);
  const speed = latestWeek(data.speedTrend, (w) => w.secondsPerQuestion !== null);
  const readiness = data.revisionReadiness;
  const goals = data.weeklyGoalProgress;
  const projection = data.mockProjection;

  return (
    <>
      <section aria-label="Hours" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile testId="tile-hours-today" label="Today" value={formatMinutes(data.minutes.today)} caption="studied" href={drillHref("hours", "week")} />
        <StatTile testId="tile-hours-week" label="This week" value={formatMinutes(data.minutes.week)} caption="studied" href={drillHref("hours", "week")} />
        <StatTile testId="tile-hours-month" label="This month" value={formatMinutes(data.minutes.month)} caption="studied" href={drillHref("hours", "month")} />
        <StatTile testId="tile-hours-all" label="All time" value={formatMinutes(data.minutes.all)} caption="studied" href={drillHref("hours", "all")} />
      </section>

      <section aria-label="Highlights" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile testId="tile-streak" label="Streak" value={`${data.streaks.current} day${data.streaks.current === 1 ? "" : "s"}`} caption={streakCaption(data.streaks)} />
        <StatTile testId="tile-goals" label="Weekly goals" value={goals.summary.total > 0 ? `${goals.summary.percent}%` : "—"} caption={goals.summary.total > 0 ? `${goals.summary.done} of ${goals.summary.total} done · ${goals.daysLeft}d left` : "No goals this week"} href="/goals" />
        <StatTile testId="tile-accuracy" label="Accuracy" value={accuracy ? `${accuracy.accuracy}%` : "—"} caption={accuracy ? `week of ${accuracy.weekStart}` : "no practice yet"} href={drillHref("accuracy", "quarter")} />
        <StatTile testId="tile-speed" label="Speed" value={speed ? `${speed.secondsPerQuestion}s` : "—"} caption={speed ? "per question" : "log minutes with practice"} href={drillHref("speed", "quarter")} />
        <StatTile testId="tile-revision" label="Revision ready" value={readiness.readinessPercent !== null ? `${readiness.readinessPercent}%` : "—"} caption={readiness.studiedChapters > 0 ? `${readiness.stale} of ${readiness.studiedChapters} chapters stale` : "no chapters studied yet"} href={drillHref("revisions", "quarter")} />
        <StatTile testId="tile-rank" label="Projected rank" value={approxRank(projection.projectedRank)} caption={projection.latestPercentile !== null ? `${projection.latestPercentile} percentile${projection.targetGap !== null ? ` · ${projection.targetGap > 0 ? `${rankLabel(projection.targetGap)} to go` : "inside your target"}` : ""}` : "add a mock percentile"} href="/logs/mocks" />
        <StatTile testId="tile-backlog" label="Backlog" value={data.backlogSize.total} caption={data.backlogSize.overdue > 0 ? `${data.backlogSize.overdue} overdue` : "nothing overdue"} href="/logs/backlog" />
        <StatTile testId="tile-mistakes" label="Mistakes due" value={data.dueMistakesCount} caption="to review now" href="/mistakes" />
        <StatTile testId="tile-exam" label="Exam in" value={data.exam.daysToExam !== null ? `${data.exam.daysToExam}d` : "—"} caption={data.exam.examDate ?? "set your exam date in your profile"} />
      </section>

      <StatCard title="Where your time went" subtitle="THIS MONTH, BY SUBJECT">
        {data.bySubject.length === 0 ? (
          <EmptyNote>Nothing logged this month yet. Start a Focus session or log what you studied.</EmptyNote>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8" data-testid="subject-split">
            <SubjectDonut segments={data.bySubject.map((s) => ({ label: s.name, value: s.share, color: s.subjectId === null ? "#9CA3AF" : subjectColor(s.subjectId) }))} />
            <ul className="flex w-full flex-1 flex-col gap-2">
              {data.bySubject.map((s) => (
                <li key={s.subjectId ?? "other"} className="flex items-center justify-between gap-3 text-[14px]" data-testid={`split-${s.subjectId ?? "other"}`}>
                  <span className="flex items-center gap-2 font-semibold text-body-text dark:text-ink">
                    <span aria-hidden className="size-3 rounded-full" style={{ background: s.subjectId === null ? "#9CA3AF" : subjectColor(s.subjectId) }} />
                    {s.name}
                  </span>
                  <span className="text-muted">
                    <span className="font-bold text-ink">{formatMinutes(s.minutes)}</span> · {s.share}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </StatCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatCard title="Accuracy, week by week" subtitle="LAST 8 WEEKS" right={<Link href={drillHref("accuracy", "quarter")} className="min-h-11 content-center text-[13px] font-bold text-brand underline dark:text-ink">Details</Link>}>
          <SeriesLine testId="accuracy-trend" unit="%" scale="percent" color="#10B981" data={data.accuracyTrend.map((w) => ({ label: w.weekStart.slice(5), value: w.accuracy }))} />
        </StatCard>
        <StatCard title="Seconds per question" subtitle="LAST 8 WEEKS" right={<Link href={drillHref("speed", "quarter")} className="min-h-11 content-center text-[13px] font-bold text-brand underline dark:text-ink">Details</Link>}>
          <SeriesLine testId="speed-trend" unit="s" scale="count" color="#F59E0B" data={data.speedTrend.map((w) => ({ label: w.weekStart.slice(5), value: w.secondsPerQuestion }))} />
        </StatCard>
      </div>

      <StatCard title="Chapter strength" subtitle="EVERY CHAPTER, ONE SQUARE">
        <StrengthGrid grid={data.chapterStrengthGrid} subjectName={subjectNames} />
        <p className="mt-3 text-[12px] text-muted">Strong needs 75%+ accuracy, 5+ hours and a revision. Weak is under 50%, or under 60% once you&apos;ve studied it. Accuracy counts from 10 questions.</p>
      </StatCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatCard title="This week's goals" subtitle={`${goals.weekStart} – ${goals.weekEnd}`}>
          {goals.goals.length === 0 ? (
            <EmptyNote>No goals set for this week.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-3" data-testid="goal-list">
              {goals.goals.map((g) => (
                <li key={g.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-3 text-[14px]">
                    <span className="font-semibold text-body-text dark:text-ink">{GOAL_LABEL[g.type] ?? g.type}</span>
                    <span className="text-muted">
                      {goalUnitLabel(g.unit, g.current)} / {goalUnitLabel(g.unit, g.target)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-tint-strong" role="img" aria-label={`${g.percent}% complete`}>
                    <div className={`h-full rounded-full ${g.complete ? "bg-[#10B981]" : "bg-[#6366F1]"}`} style={{ width: `${Math.min(100, g.percent)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </StatCard>

        <StatCard title="Coming up" subtitle="NEXT 30 DAYS">
          {data.upcomingTests.length === 0 ? (
            <EmptyNote>No mock days planned. Pin one from your calendar.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-2" data-testid="upcoming-tests">
              {data.upcomingTests.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 text-[14px]">
                  <span className="font-semibold text-body-text dark:text-ink">{t.title ?? "Mock test"}</span>
                  <span className="font-bold text-ink">{t.date}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-col gap-1 text-[13px]" data-testid="readiness-bands">
            <p className="font-bold text-ink">Revision freshness</p>
            <p className="text-muted">
              {readiness.fresh} fresh (a week) · {readiness.ok} OK (two weeks) · {readiness.stale} stale
            </p>
          </div>
        </StatCard>
      </div>
    </>
  );
}
