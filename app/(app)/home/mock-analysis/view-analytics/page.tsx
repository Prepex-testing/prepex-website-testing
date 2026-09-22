"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UserMenu } from "@/components/layout/UserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { LineChart, type LineChartSeries } from "@/components/ui/LineChart";
import { CalendarIcon, ClockIcon, TargetIcon, ArrowLeftIcon } from "@/assets/icons";
import { FileIcon, SparkleIcon, TrendingUpIcon } from "@/components/ui/icons";
import {
  getMockById,
  getMockInsights,
  type MockAnalysisItem,
  type MockComparedSlice,
  type MockDelta,
  type MockInsights,
} from "@/lib/api/mock";
import type { ReactNode } from "react";
import { PageLoader } from "@/components/ui/PageLoader";

/** e.g. "20 Aug 2026, Thu" */
function formatTestDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const year = date.getFullYear();
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  return `${day} ${month} ${year}, ${weekday}`;
}

/** "12 Aug" — compact enough for a chart's x axis. */
function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.getDate()} ${date.toLocaleDateString("en-US", { month: "short" })}`;
}

/**
 * Severity is a single theme ink stepped from strong to light — no red/amber/
 * green. What a card *means* is carried by its written label ("Act now",
 * "Watch"), so the shade only sets how loudly it competes for attention.
 */
const SEVERITY_STYLES: Record<string, { wrap: string; badge: string; label: string }> = {
  CRITICAL: {
    wrap: "border-ink/25 bg-ink/8",
    badge: "bg-ink text-surface",
    label: "Act now",
  },
  WARNING: {
    wrap: "border-brand/25 bg-brand/8",
    badge: "bg-brand/25 text-ink",
    label: "Watch",
  },
  POSITIVE: {
    wrap: "border-brand/15 bg-brand/4",
    badge: "bg-brand/12 text-ink",
    label: "Working",
  },
  INFO: {
    wrap: "border-brand/10 bg-tint-strong",
    badge: "bg-brand/10 text-ink",
    label: "Note",
  },
};

/**
 * Up/down is fully carried by the arrow and the signed number, so the shade
 * doesn't have to mean "good" or "bad": a gain gets the solid ink pill, a drop
 * a light tint of the same ink, and no move the flat neutral.
 */
const TREND_EMPHASIS: Record<string, string> = {
  IMPROVED: "bg-ink text-surface",
  DECLINED: "bg-brand/15 text-ink",
  SAME: "bg-tint-strong text-muted",
};

/** Signed delta chip — arrow + sign, so the direction never rests on shade. */
function DeltaChip({ delta, unit = "pts" }: { delta: MockDelta; unit?: string }) {
  const styles = TREND_EMPHASIS[delta.trend] ?? TREND_EMPHASIS.SAME!;
  const arrow = delta.trend === "IMPROVED" ? "↑" : delta.trend === "DECLINED" ? "↓" : "→";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${styles}`}
    >
      {arrow} {Math.abs(delta.deltaPoints)} {unit}
    </span>
  );
}

/** One subject row: current marks, the bar, and how it moved across mocks. */
function SubjectRow({ slice }: { slice: MockComparedSlice }) {
  const percent = Math.round(slice.accuracy ?? 0);
  const previous = slice.previousMocks[0];
  const twoAgo = slice.previousMocks[1];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted">
          {slice.name}
        </span>
        {slice.vsPrevious && <DeltaChip delta={slice.vsPrevious} />}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="font-bold">
          <span className="text-ink">{slice.score}</span>
          <span className="text-muted/50">/{slice.maxScore}</span>
        </span>
        <span className="font-bold text-ink">{percent}%</span>
      </div>

      <div className="h-1.5 rounded-full bg-tint-strong">
        <div
          className="h-1.5 rounded-full bg-brand dark:bg-[#FAF7F2]"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* The trail across the last two mocks — the same numbers the chart
          plots, written out, so the detail doesn't depend on reading a line. */}
      {previous && (
        <p className="text-[11px] leading-4 text-muted">
          {twoAgo ? `${Math.round(twoAgo.accuracy)}% → ` : ""}
          {Math.round(previous.accuracy)}% → <span className="font-semibold text-ink">{percent}%</span>
          {slice.vsPrevious?.deltaPercent != null && slice.vsPrevious.deltaPoints !== 0 && (
            <> ({slice.vsPrevious.deltaPercent > 0 ? "+" : ""}
              {slice.vsPrevious.deltaPercent}% vs last mock)</>
          )}
        </p>
      )}
    </div>
  );
}

export default function ViewAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <ViewAnalyticsContent />
    </Suspense>
  );
}

function ViewAnalyticsContent() {
  const searchParams = useSearchParams();
  const mockId = searchParams.get("id");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [mock, setMock] = useState<MockAnalysisItem | null>(null);
  const [insights, setInsights] = useState<MockInsights | null>(null);
  const [isLoading, setLoading] = useState(!!mockId);
  const [error, setError] = useState<string | null>(null);
  // Subject split plots either accuracy or time spent per subject — both on one
  // chart would need more stroke patterns than a readable legend has.
  const [subjectMetric, setSubjectMetric] = useState<"accuracy" | "time">("accuracy");

  useEffect(() => {
    if (!mockId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getMockById(mockId),
      // Derived analytics are additive — the page still renders the mock's own
      // numbers if this one fails.
      getMockInsights(mockId).catch(() => null),
    ])
      .then(([mockRes, insightRes]) => {
        if (cancelled) return;
        setMock(mockRes.data);
        setInsights(insightRes?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this mock's analysis. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mockId]);

  const header = (
    <div className="flex items-start justify-between gap-3 sm:gap-4">
      <div className="min-w-0 flex-1 flex items-center gap-3">
        <Link href="/home/mock-analysis" aria-label="Back to Mock Analysis" className="text-ink">
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-h1 text-ink">View Analytics</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </div>
  );

  if (!mockId) {
    return (
      <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
        {header}
        <p className="text-sm text-muted">
          No mock selected. Go back to{" "}
          <Link href="/home/mock-analysis" className="font-semibold text-cta">
            Mock Analysis
          </Link>{" "}
          and pick one to view.
        </p>
      </div>
    );
  }

  // Whole page waits on the fetch — no partial chrome before the data is in.
  if (isLoading) {
    return <PageLoader label="Loading analysis…" />;
  }

  if (error || !mock) {
    return (
      <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
        {header}
        <p className="py-8 text-center text-sm text-warning">
          {error ?? "Couldn't load this mock's analysis."}
        </p>
      </div>
    );
  }

  const subtitleParts = [mock.sourceInstitute, mock.examType].filter(Boolean);
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" · ") : "Mock Test";

  const headerStats: { icon: ReactNode; label: string; value: string }[] = [
    { icon: <CalendarIcon />, label: "Test Date", value: formatTestDate(mock.attemptedDate) },
    {
      icon: <ClockIcon />,
      label: "Duration",
      value: mock.testDurationMinutes ? `${mock.testDurationMinutes} min` : "—",
    },
    { icon: <FileIcon />, label: "Total Marks", value: mock.maxScore != null ? String(mock.maxScore) : "—" },
  ];

  const hasScore = mock.totalScore != null && mock.maxScore != null;
  const accuracyPercent = Math.round(Number(mock.accuracyPercentage)) || 0;

  // Stable subject order (by id) so each subject keeps the same stroke pattern
  // in the chart no matter which mocks it appears in.
  const subjectOrder = [
    ...new Set(
      [
        ...(insights?.progression ?? []).flatMap((point) =>
          point.subjects.map((s) => s.subjectId),
        ),
        ...mock.subjectAnalysis.map((s) => s.subjectId),
      ].sort((a, b) => a - b),
    ),
  ];

  // Fall back to the mock's own subject rows when insights didn't load, so the
  // section never disappears.
  const subjectSlices: MockComparedSlice[] =
    insights?.subjects ??
    mock.subjectAnalysis.map((s) => ({
      key: String(s.subjectId),
      name: s.subject.name,
      score: s.score,
      maxScore: s.maxScore,
      accuracy: Math.round(Number(s.accuracyPercentage)) || 0,
      previousMocks: [],
      vsPrevious: null,
      vsTwoMocksAgo: null,
    }));

  const progression = insights?.progression ?? [];
  const chartLabels = progression.map((p) => formatShortDate(p.attemptedDate));
  const currentIndex = progression.findIndex((p) => p.isCurrent);

  // Time is drawn on the same 0–100 axis as the score — minutes used as a share
  // of the test's duration — so this mock's pacing reads directly against the
  // earlier ones. The readout still gives the minutes.
  const timeUsedPercent = progression.map((p) =>
    p.timeTakenMinutes != null && p.testDurationMinutes
      ? Math.min(100, (p.timeTakenMinutes / p.testDurationMinutes) * 100)
      : null,
  );
  const hasTimeTrend = timeUsedPercent.some((value) => value !== null);

  const totalSeries: LineChartSeries[] = [
    {
      id: "total",
      label: "Total score",
      points: progression.map((p) => p.percentage),
    },
    ...(hasTimeTrend
      ? [
          {
            id: "time",
            label: "Time used",
            points: timeUsedPercent,
            formatPoint: (value: number, index: number) =>
              `${progression[index]?.timeTakenMinutes ?? 0} of ${progression[index]?.testDurationMinutes ?? 0} min (${Math.round(value)}%)`,
          },
        ]
      : []),
  ];

  const subjectName = (subjectId: number) =>
    progression.flatMap((p) => p.subjects).find((s) => s.subjectId === subjectId)?.name ??
    `Subject ${subjectId}`;

  // One line per subject across every mock that recorded it; a mock entered
  // without a subject split leaves a gap rather than a false zero.
  const subjectAccuracySeries: LineChartSeries[] = subjectOrder.map((subjectId) => ({
    id: String(subjectId),
    label: subjectName(subjectId),
    points: progression.map(
      (p) => p.subjects.find((s) => s.subjectId === subjectId)?.accuracy ?? null,
    ),
  }));
  const subjectTimeSeries: LineChartSeries[] = subjectOrder.map((subjectId) => ({
    id: `${subjectId}-time`,
    label: subjectName(subjectId),
    points: progression.map(
      (p) => p.subjects.find((s) => s.subjectId === subjectId)?.timeTakenMinutes ?? null,
    ),
  }));
  const hasSubjectTimeTrend = subjectTimeSeries.some((s) => s.points.some((value) => value !== null));
  const showSubjectTime = subjectMetric === "time" && hasSubjectTimeTrend;
  const subjectSeries = showSubjectTime ? subjectTimeSeries : subjectAccuracySeries;
  // Round the minutes axis up to a tidy step so grid labels stay whole numbers.
  const subjectTimeMax =
    Math.ceil(
      Math.max(
        20,
        ...subjectTimeSeries.flatMap((s) => s.points.filter((value): value is number => value !== null)),
      ) / 20,
    ) * 20;
  const mocksWithSubjectSplit = progression.filter((p) => p.subjects.length > 0).length;

  const subjectTestStrategy = mock.subjectAnalysis
    .filter((subject) => subject.timeTakenMinutes != null || subject.testDurationMinutes != null)
    .map((subject) => ({
      id: subject.id,
      label: subject.subject.name,
      timeTakenMinutes: subject.timeTakenMinutes,
      testDurationMinutes: subject.testDurationMinutes,
    }));
  const maxSubjectTime = Math.max(1, ...subjectTestStrategy.map((s) => s.timeTakenMinutes ?? 0));
  const hasMissingSubjectTime =
    mock.subjectAnalysis.length === 0 ||
    mock.subjectAnalysis.some((subject) => subject.timeTakenMinutes == null);

  const marksDelta = insights?.marksDelta ?? null;
  const guidance = insights?.guidance ?? [];
  const wins = insights?.wins ?? [];

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6 lg:p-8">
      {header}

      {!hasScore && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/10 bg-tint-strong px-6 py-4">
          <p className="text-sm text-ink">
            This mock hasn&apos;t been scored yet — add your score to see the full analysis.
          </p>
          <Button href={`/home/mock-analysis/upload-scorecard?id=${mock.id}`} variant="secondary" size="sm">
            Upload Score
          </Button>
        </div>
      )}

      {/* Mock summary card */}
      <div className="flex flex-col gap-6 rounded-[24px] border border-brand/10 bg-surface px-[24px] pt-[32px] pb-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)] sm:flex-row sm:items-center sm:justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EEF0F8] dark:bg-[#FAF7F2]/8 dark:border-[#FAF7F2] text-ink [&>svg]:h-6 [&>svg]:w-6"
          >
            <TargetIcon />
          </div>

          <div>
            <h2 className="text-[18px] font-bold leading-[28px] text-ink">{mock.mockName}</h2>
            <p className="text-[14px] font-medium leading-[20px] text-muted">
              {subtitle}
              {insights?.mockNumber != null && insights.totalMockCount > 1 && (
                <> · Mock {insights.mockNumber} of {insights.totalMockCount}</>
              )}
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-wrap gap-4 sm:gap-[64px]">
          {headerStats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <span
                className="text-[14px] font-medium leading-[20px] text-muted"
                style={isDark ? { color: "var(--ink)" } : undefined}
              >
                {stat.label}
              </span>
              <div className="mt-[4px] flex items-center gap-[6px]">
                <span
                  className="flex h-4 w-4 items-center justify-center text-ink [&>svg]:h-4 [&>svg]:w-4"
                  style={isDark ? { color: "var(--muted)" } : undefined}
                >
                  {stat.icon}
                </span>
                <span
                  className="text-[16px] font-bold leading-[24px] text-ink whitespace-nowrap"
                  style={isDark ? { color: "var(--muted)" } : undefined}
                >
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-2">
        {/* Total Score Card */}
        <div className="flex flex-col items-center rounded-[16px] border border-brand/10 bg-surface px-[32px] pt-[28px] pb-[24px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
          <p className="text-[18px] font-bold uppercase leading-[28px] tracking-[0.5px] text-muted">
            Total Score
          </p>

          <div className="mt-3 flex items-end justify-center">
            <span className="text-[68px] font-extrabold leading-none text-ink">
              {mock.totalScore ?? "—"}
            </span>
            <span className="mb-[5px] text-[40px] font-bold leading-none text-muted/50">
              /{mock.maxScore ?? "—"}
            </span>
          </div>

          {/* Real movement against the previous mock. marksDelta is only sent
              when both papers were out of the same total; otherwise the
              comparison falls back to percentage points, which is always
              comparable. */}
          {insights?.totalComparison && insights.previousMock ? (
            <div
              className={`mt-6 flex w-full items-center gap-4 rounded-[16px] px-5 py-3 ${
                insights.totalComparison.trend === "IMPROVED" ? "bg-brand/8" : "bg-tint-strong"
              }`}
            >
              {/* The icon flips for a decline, so direction is legible from the
                  shape before any shade is read. */}
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] ${
                  insights.totalComparison.trend === "IMPROVED" ? "bg-ink" : "bg-brand/15"
                }`}
              >
                <span
                  className={`[&>svg]:h-6 [&>svg]:w-6 ${
                    insights.totalComparison.trend === "IMPROVED"
                      ? "text-surface"
                      : insights.totalComparison.trend === "DECLINED"
                        ? "rotate-180 text-ink"
                        : "text-ink"
                  }`}
                >
                  <TrendingUpIcon />
                </span>
              </div>
              <div>
                <p className="text-[18px] font-bold leading-[24px] text-ink">
                  {marksDelta != null
                    ? `${marksDelta > 0 ? "↑" : marksDelta < 0 ? "↓" : "→"} ${Math.abs(marksDelta)} Marks`
                    : `${insights.totalComparison.deltaPoints > 0 ? "↑" : insights.totalComparison.deltaPoints < 0 ? "↓" : "→"} ${Math.abs(
                        insights.totalComparison.deltaPoints,
                      )} pts`}
                </p>
                <p className="text-[16px] leading-[20px] text-muted">
                  vs {insights.previousMock.mockName ?? "last mock"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-6 w-full rounded-[16px] bg-tint-strong px-5 py-3 text-center text-[14px] text-muted">
              First scored mock — this becomes your baseline.
            </p>
          )}
        </div>

        {/* Accuracy Card */}
        <div className="flex flex-col items-center rounded-[16px] border border-brand/10 bg-surface px-[32px] py-[28px] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
          <CircularProgress
            percent={accuracyPercent}
            size={140}
            trackColor="var(--tint-strong)"
            progressColor={isDark ? "var(--ink)" : undefined}
            progressGradient={
              isDark ? undefined : { from: "#1A1A4E", to: "#4C1D95" }
            }
          />
          {/* This ring plots marks scored as a share of marks available — that's
              accuracy, not a percentile (mocks carry no cohort data). */}
          <p className="mt-5 text-[16px] font-semibold leading-none text-muted">
            Accuracy
          </p>
          {insights?.totalComparison && (
            <div className="mt-3">
              <DeltaChip delta={insights.totalComparison} />
            </div>
          )}
        </div>
      </div>

      {/* What to do about it — every line is derived from the entered numbers,
          so it can't reference a topic the student never sat. */}
      {guidance.length > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-icon-chip-bg text-ink [&>svg]:h-5 [&>svg]:w-5 dark:bg-[#FAF7F2]/8">
              <SparkleIcon />
            </span>
            <p className="text-sm font-bold uppercase tracking-[0.4px] text-ink">
              What to do next
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {guidance.map((item, index) => {
              const styles = SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.INFO!;
              return (
                <div key={index} className={`rounded-xl border p-4 ${styles.wrap}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Severity carries a text label, never colour alone. */}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.5px] ${styles.badge}`}
                    >
                      {styles.label}
                    </span>
                    <p className="text-[15px] font-bold text-ink">{item.title}</p>
                  </div>
                  <p className="mt-1.5 text-[14px] leading-5 text-body-text">{item.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wins — improvements since the last mock, so progress is visible next
          to the things that need work. */}
      {wins.length > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-brand/20 bg-brand/5 p-6">
          <p className="text-sm font-bold uppercase tracking-[0.4px] text-ink">
            Wins since your last mock
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {wins.map((win) => (
              <div
                key={`${win.kind}-${win.key}`}
                className="rounded-xl border border-brand/15 bg-surface p-4"
              >
                <p className="text-[14px] font-bold text-ink">{win.name}</p>
                <p className="mt-1 text-[13px] text-muted">
                  {Math.round(win.from)}% →{" "}
                  <span className="font-bold text-ink">
                    {win.to != null ? Math.round(win.to) : "—"}%
                  </span>{" "}
                  <span className="font-semibold text-ink">
                    (↑ {Math.abs(win.deltaPoints)} pts)
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend charts — paired in one row, same as Subject Performance and
          Subject-wise Test Strategy below. Either can stand alone: a student
          with no subject splits yet still gets the progression card. */}
      {(progression.length > 1 || (subjectSeries.length > 0 && mocksWithSubjectSplit > 1)) && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Score progression across every mock entered */}
          {progression.length > 1 && (
            <div className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.4px] text-ink">
                  Score Progression
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  Total score as a percentage, across all {progression.length} mocks
                  you&apos;ve entered — oldest first.
                  {hasTimeTrend &&
                    " Time used is the share of the test's duration you took, set against the same mocks."}
                </p>
              </div>
              <LineChart
                labels={chartLabels}
                series={totalSeries}
                highlightIndex={currentIndex >= 0 ? currentIndex : undefined}
              />
            </div>
          )}

          {/* Subject split across mocks */}
          {subjectSeries.length > 0 && mocksWithSubjectSplit > 1 && (
            <div className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold uppercase tracking-[0.4px] text-ink">
                    Subject Split Across Mocks
                  </p>
                  <p className="mt-1 text-[12px] text-muted">
                    {showSubjectTime
                      ? "Minutes spent per subject. A gap means that mock has no time logged for the subject."
                      : "Accuracy per subject. A gap means that mock was entered without a subject breakdown."}
                  </p>
                </div>
                {hasSubjectTimeTrend && (
                  <div
                    role="tablist"
                    aria-label="Subject split metric"
                    className="flex shrink-0 rounded-full bg-tint-strong p-0.5"
                  >
                    {(["accuracy", "time"] as const).map((metric) => (
                      <button
                        key={metric}
                        type="button"
                        role="tab"
                        aria-selected={subjectMetric === metric}
                        onClick={() => setSubjectMetric(metric)}
                        className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                          subjectMetric === metric ? "bg-surface text-ink shadow-sm" : "text-muted"
                        }`}
                      >
                        {metric === "accuracy" ? "Accuracy" : "Time"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <LineChart
                key={showSubjectTime ? "time" : "accuracy"}
                labels={chartLabels}
                series={subjectSeries}
                max={showSubjectTime ? subjectTimeMax : 100}
                formatValue={showSubjectTime ? (v) => `${Math.round(v)} min` : undefined}
                highlightIndex={currentIndex >= 0 ? currentIndex : undefined}
              />
            </div>
          )}
        </div>
      )}

      {/* Subject Performance + Subject-wise Test Strategy */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Subject Performance */}
        {subjectSlices.length > 0 && (
          <div className="flex flex-col gap-6 rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.4px] text-ink">
                Subject Performance
              </p>
              <p className="mt-1 text-[12px] text-muted">
                Accuracy this mock, and how it moved across your last two.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              {subjectSlices.map((slice) => (
                <SubjectRow key={slice.key} slice={slice} />
              ))}
            </div>
          </div>
        )}

        {/* Subject-wise Test Strategy */}
        {subjectTestStrategy.length > 0 && (
          <div className="flex flex-col gap-6 rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
            <p className="text-sm font-bold uppercase tracking-[0.4px] text-ink">
              Subject-wise Test Strategy
            </p>

            <div className="flex flex-col gap-4">
              {subjectTestStrategy.map((subject, index) => {
                const percent =
                  subject.timeTakenMinutes != null
                    ? Math.round(
                      (subject.timeTakenMinutes / maxSubjectTime) * 100,
                    )
                    : 0;

                return (
                  <div
                    key={subject.id}
                    className="flex items-center gap-3"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-bold text-white dark:text-background"
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-ink">
                          {subject.label}
                        </span>

                        <span className="shrink-0 text-right leading-tight">
                          <span className="block text-xs font-bold text-ink">
                            {subject.timeTakenMinutes != null
                              ? `${subject.timeTakenMinutes} min`
                              : "—"}
                          </span>

                          {subject.testDurationMinutes != null && (
                            <span className="block text-[11px] text-muted">
                              of {subject.testDurationMinutes} min
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="mt-1 h-1.5 rounded-full bg-tint-strong">
                        <div
                          className="h-1.5 rounded-full bg-brand"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Strategy Note — derived from the per-subject minutes actually
                entered, so it only appears when those minutes say something. */}
            {insights?.timeNote && (
              <div
                className={`w-full rounded-lg border p-4 ${isDark
                  ? "border-brand/10 bg-[var(--sub)]"
                  : "border-brand/10 bg-tint-strong"
                  }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-[1.1px] text-ink">
                  Strategy Note
                </p>

                <p className="mt-2 leading-5 text-link">{insights.timeNote}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Update Score Details Button */}
      {hasMissingSubjectTime && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button href={`/home/mock-analysis/upload-scorecard?id=${mock.id}`} variant="primary">
            Update score details
          </Button>
        </div>
      )}

      {/* Footer Note */}
      <div className="rounded-sm bg-[#1A1A4E] py-3 text-center text-[16px] font-semibold leading-none text-white">
        Mock scores never visible to partner.
      </div>
    </div>
  );
}
