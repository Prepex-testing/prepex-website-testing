"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  BoltIcons,
  Clock,
  ClockIcon,
  ClockIconss,
  CloudMoonIcon,
  CloudSunIcon,
  DiceIcon,
  LightbulbIcon,
  MoonIcon,
  SunIcon,
} from "@/components/ui/icons";
import { EmptyNote, StatCard } from "@/components/stats/StatCard";
import { MeterRow } from "@/components/stats/MeterRow";
import { RankedList } from "@/components/stats/RankedList";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { ChapterRankedList } from "@/components/stats/ChapterRankedList";
import { PageLoader } from "@/components/ui/PageLoader";
import { LeftIconcon } from "@/assets/icons";
import {
  formatShortDate,
  formatDelta,
  getAccuracyTab,
  subjectInitial,
  type AccuracyTab,
  type ChapterAccuracyRow,
} from "@/lib/api/productivity";

const MISTAKE_ICONS: Record<string, ReactNode> = {
  SILLY_ERROR: <AlertCircleIcon className="h-5 w-5" />,
  CONCEPTUAL_GAP: <LightbulbIcon className="h-5 w-5" />,
  TIME_PRESSURE: <ClockIconss className="h-5 w-5" />,
  WILD_GUESS: <DiceIcon className="h-5 w-5" />,
};

const TIME_OF_DAY_ICONS: Record<string, ReactNode> = {
  MORNING: <SunIcon className="h-3.5 w-3.5 sm:h-[15px] sm:w-[15px]" />,
  AFTERNOON: <CloudSunIcon />,
  EVENING: <CloudMoonIcon />,
  NIGHT: <MoonIcon className="h-3.5 w-3.5 sm:h-[15px] sm:w-[15px]" />,
};

const SUBJECT_BARS = [
  "bg-[#1A1A4E] dark:bg-[rgba(250,247,242,0.25)]",
  "bg-[#1A1A4E] dark:bg-[#4C1D95]",
  "bg-[#1A1A4E] dark:bg-[#8B8998]",
];

const DIFFICULTY_BARS = ["bg-brand dark:bg-ink", "bg-brand dark:bg-[#4C1D95]", "bg-brand dark:bg-ink"];

/** PRD 8.8 bans red for low metrics — trend arrows stay neutral in colour. */
const TREND_GLYPH: Record<string, string> = { UP: "↗", DOWN: "↘", FLAT: "→" };


function toChapterItems(rows: ChapterAccuracyRow[]) {
  return rows.map((row) => ({
    id: row.chapterId,
    rank: row.rank,
    title: row.chapterName,
    value: `${row.accuracy}%`,
    percent: row.accuracy,
  }));
}

export function AccuracyStats() {
  const [data, setData] = useState<AccuracyTab | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getAccuracyTab()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your accuracy stats. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Mocks arrive newest-first; the chart reads oldest→newest left to right.
  const mockChart = useMemo(() => {
    const mocks = [...(data?.mockTrend.mocks ?? [])].reverse();
    if (mocks.length === 0) return null;

    const chartWidth = 250;
    const chartHeight = 160;
    const left = 34;
    const bottom = 125;
    const top = 25;
    const right = 18;
    const usableWidth = chartWidth - left - right;
    const usableHeight = bottom - top;
    // Scale to the biggest paper in the set, so mocks out of different totals
    // still plot honestly against each other.
    const maxScore = Math.max(...mocks.map((m) => m.maxScore), 1);

    const points = mocks.map((mock, index) => ({
      x: left + (mocks.length === 1 ? usableWidth / 2 : (index / (mocks.length - 1)) * usableWidth),
      y: bottom - (mock.score / maxScore) * usableHeight,
      value: mock.score,
      id: mock.id,
    }));

    const line = points.reduce((path, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      const prev = points[i - 1];
      const cx = (prev.x + point.x) / 2;
      return `${path} C ${cx} ${prev.y}, ${cx} ${point.y}, ${point.x} ${point.y}`;
    }, "");

    const ticks = [maxScore, maxScore * 0.75, maxScore * 0.5, maxScore * 0.25, 0].map((t) =>
      Math.round(t),
    );

    return { chartWidth, chartHeight, bottom, usableHeight, maxScore, points, line, ticks };
  }, [data]);

  if (isLoading) return <PageLoader label="Loading your accuracy stats…" />;

  if (error || !data) {
    return (
      <StatCard>
        <p className="py-8 text-center text-sm font-medium text-muted">
          {error ?? "Couldn't load your accuracy stats."}
        </p>
      </StatCard>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {data.explainer && (
        <div className="rounded-2xl border border-brand/10 bg-tint px-4 py-3 text-xs font-semibold text-body-text sm:text-sm">
          {data.explainer}
        </div>
      )}

      {data.gentleInquiry.show && data.gentleInquiry.message && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/10 bg-tint px-4 py-3">
          <p className="text-xs font-semibold text-body-text sm:text-sm">
            {data.gentleInquiry.message}
          </p>
          <Link
            href="/plan"
            className="text-xs font-bold text-ink underline underline-offset-4"
          >
            Adjust my plan
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
        {/* Overall accuracy */}
        <StatCard
          title="Overall Accuracy"
          subtitle="Practice this week"
          titleClassName="text-[14px] leading-6 sm:text-[16px]"
          padding="p-4 sm:p-6"
        >
          {data.practice.hasData ? (
            <div className="flex flex-col items-center gap-4">
              <CircularProgress
                percent={data.practice.accuracy}
                label="Accuracy"
                size={132}
                progressGradient={{ from: "var(--score-ring-from)", to: "var(--score-ring-to)" }}
                labelClassName="text-[#777681] dark:text-muted"
              />
              <div className="w-full border-t border-brand/10 pt-4">
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <p className="font-sans text-[10px] font-medium uppercase leading-3 tracking-[0.5px] align-middle text-[#777681] dark:text-muted sm:text-[11px] sm:leading-[13.2px] sm:tracking-[0.55px]">
                      Attempted
                    </p>
                    <p className="text-sm font-bold text-ink">
                      {data.practice.questionsAttempted} Qns
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-sans text-[10px] font-medium uppercase leading-3 tracking-[0.5px] align-middle text-[#777681] dark:text-muted sm:text-[11px] sm:leading-[13.2px] sm:tracking-[0.55px]">
                      Correct
                    </p>
                    <p className="text-sm font-bold text-ink">
                      {data.practice.questionsCorrect} Qns
                    </p>
                  </div>
                </div>
              </div>
              <p className="flex items-center gap-1 font-sans text-xs font-medium leading-[18px] tracking-normal align-middle text-[#777681] dark:text-muted sm:text-sm sm:leading-[21px]">
                <Clock className="h-4 w-4 shrink-0 text-[#1A1A4E] dark:text-(--text-primary,#FAF7F2) sm:h-5 sm:w-5" />
                Average time: {data.practice.avgTimeMinutes} min/question
              </p>
            </div>
          ) : (
            <EmptyNote>{data.practice.emptyMessage}</EmptyNote>
          )}
        </StatCard>

        {/* Accuracy by subject */}
        <StatCard
          padding="p-4 sm:p-6"
          title="Accuracy by Subject"
          right={
            <Link
              href="/home/mistake-notebook"
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink"
            >
              Detailed view
              <LeftIconcon className="h-2.5 w-2.5" />
            </Link>
          }
        >
          {data.bySubject.hasData ? (
            <div className="flex flex-col gap-5">
              {data.bySubject.subjects.map((subject, index) => (
                <div key={subject.subjectId} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-sm font-bold text-ink">
                    {subjectInitial(subject.subjectName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-[#374151] dark:text-ink">
                        {subject.subjectName}
                      </span>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-bold text-[#111827] dark:text-ink">
                          {subject.accuracy}%
                        </span>
                        <span className="text-xs text-[#9CA3AF] dark:text-muted">
                          {subject.correct}/{subject.attempted}
                        </span>
                      </div>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-tint">
                      <div
                        className={`h-full rounded-full ${SUBJECT_BARS[index % SUBJECT_BARS.length]}`}
                        style={{ width: `${subject.accuracy}%` }}
                      />
                    </div>

                    {subject.trend && (
                      <p className="mt-1 text-[10px] font-medium text-muted">
                        {TREND_GLYPH[subject.trend]} {formatDelta(subject.change)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote>Practice a few questions to unlock your subject breakdown.</EmptyNote>
          )}
        </StatCard>

        {/* Mock trend */}
        {/* Spans both columns at sm–lg so it isn't left alone at half width. */}
        <StatCard
          className="sm:col-span-2 xl:col-span-1"
          padding="p-4 sm:p-6"
          title="Mock Trend"
          subtitle={
            data.mockTrend.avgGainPerMock !== null
              ? `Average gain: ${data.mockTrend.avgGainPerMock > 0 ? "+" : ""}${data.mockTrend.avgGainPerMock} marks/mock`
              : "Last 5 mocks"
          }
          subtitleClassName="text-[#9CA3AF] dark:text-muted"
          right={
            <Link
              href="/home/mock-analysis"
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink"
            >
              Detailed view
              <LeftIconcon className="h-2.5 w-2.5" />
            </Link>
          }
        >
          {mockChart ? (
            <>
              <svg viewBox={`0 0 ${mockChart.chartWidth} ${mockChart.chartHeight}`} className="w-full">
                <defs>
                  <linearGradient id="mockTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5A47FF" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#5A47FF" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {mockChart.ticks.map((tick) => (
                  <text
                    key={tick}
                    x="2"
                    y={mockChart.bottom - (tick / mockChart.maxScore) * mockChart.usableHeight + 4}
                    fontSize="9"
                    className="fill-[#9CA3AF] dark:fill-muted"
                  >
                    {tick}
                  </text>
                ))}

                {mockChart.points.length > 1 && (
                  <path
                    d={`${mockChart.line} L ${mockChart.points[mockChart.points.length - 1].x} ${mockChart.bottom} L ${mockChart.points[0].x} ${mockChart.bottom} Z`}
                    fill="url(#mockTrendFill)"
                  />
                )}

                <path d={mockChart.line} fill="none" stroke="#5B4BFF" strokeWidth="2.5" strokeLinecap="round" />

                {mockChart.points.map((point) => (
                  <g key={point.id}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="3.5"
                      fill="var(--ink)"
                      stroke="var(--surface)"
                      strokeWidth="1.8"
                    />
                    <text
                      x={point.x}
                      y={point.y - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--ink)"
                      fontWeight="700"
                    >
                      {point.value}
                    </text>
                  </g>
                ))}
              </svg>

              <ul className="mt-2 flex flex-col gap-1">
                {data.mockTrend.mocks.map((mock) => (
                  <li key={mock.id} className="flex items-center justify-between text-[11px]">
                    <span className="truncate text-muted">
                      {mock.name ?? formatShortDate(mock.date)}
                    </span>
                    <span className="shrink-0 font-bold text-ink">
                      {mock.score} / {mock.maxScore}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyNote>{data.mockTrend.emptyMessage}</EmptyNote>
          )}
        </StatCard>
      </div>

      {/* Side by side only from xl: at lg (beside the sidebar) the two cards
          were ~338 / 374px, too narrow for the mistake rows and the two
          chapter lists. */}
      <div className="mx-auto grid w-full grid-cols-1 items-stretch gap-4 sm:gap-6 xl:grid-cols-[506fr_560fr]">
        {/* Mistake patterns */}
        <StatCard
          className="flex h-full w-full min-w-0 flex-col"
          padding="p-4 sm:p-6"
          title="Mistake Patterns"
          subtitle={
            data.mistakePatterns.hasData
              ? `${data.mistakePatterns.totalMistakes} logged · tap to review`
              : undefined
          }
          subtitleClassName="text-[#9CA3AF] dark:text-muted"
        >
          {data.mistakePatterns.hasData ? (
            <>
              <RankedList
                items={data.mistakePatterns.byTag.map((pattern) => ({
                  id: pattern.tag,
                  title: pattern.label,
                  subtitle: pattern.subtitle,
                  value: String(pattern.count),
                  icon: MISTAKE_ICONS[pattern.tag],
                  titleClassName: "text-[#1D1D4B] dark:text-ink",
                  subtitleClassName: "text-[#9CA3AF]",
                  valueClassName: "text-[#F59E0B]",
                }))}
              />
              {data.mistakePatterns.topFix && (
                <p className="mt-4 text-xs font-semibold text-body-text">
                  Top fix: conceptual gaps in {data.mistakePatterns.topFix}
                </p>
              )}
            </>
          ) : (
            <EmptyNote>{data.mistakePatterns.emptyMessage}</EmptyNote>
          )}
        </StatCard>

        {/* Accuracy by chapter */}
        <StatCard
          className="flex h-full w-full min-w-0 flex-col"
          padding="p-4 sm:p-6"
          title="Accuracy by Chapter"
          right={
            <Link href="/home/mistake-notebook" className="flex items-center gap-1 text-xs font-semibold text-ink">
              View all
              <LeftIconcon className="h-2.5 w-2.5" />
            </Link>
          }
        >
          {data.byChapter.hasData ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ChapterRankedList
                title="TOP 5 WEAKEST"
                titleColor="#F59E0B"
                rankBg="bg-[#F59E0B]/15 text-[#F59E0B]"
                valueColor="var(--ink)"
                items={toChapterItems(data.byChapter.weakest)}
              />
              <ChapterRankedList
                title="TOP 5 STRONGEST"
                titleColor="#1E8449"
                rankBg="bg-[#1E8449]/15 text-[#1E8449]"
                valueColor="var(--ink)"
                items={toChapterItems(data.byChapter.strongest)}
              />
            </div>
          ) : (
            <EmptyNote>{data.byChapter.emptyMessage}</EmptyNote>
          )}
        </StatCard>
      </div>

      {/* 2 columns from sm, 4 equal from xl (~230px each), Figma's 176:111
          ratio only from 2xl. Four columns at lg were ~166px — too narrow. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:grid-cols-[176fr_111fr_111fr_111fr]">
        <StatCard title="Difficulty Accuracy" padding="p-4 sm:p-5">
          {data.byDifficulty.hasData ? (
            <div className="flex flex-col gap-5">
              {data.byDifficulty.levels.map((row, index) => (
                <MeterRow
                  key={row.difficulty}
                  label={row.label}
                  value={`${row.accuracy}%`}
                  percent={row.accuracy}
                  barClassName={DIFFICULTY_BARS[index % DIFFICULTY_BARS.length]}
                  trackClassName="bg-muted/25"
                  trackHeightClassName="h-1.5"
                  labelClassName="text-[#6B7280]"
                />
              ))}
            </div>
          ) : (
            <EmptyNote>No practice in the last {data.windowDays} days.</EmptyNote>
          )}
        </StatCard>

        <StatCard title="Time Per Question" padding="p-4 sm:p-5">
          {data.byDifficulty.hasData ? (
            <div className="flex flex-col gap-4">
              {data.byDifficulty.levels.map((row) => (
                <div key={row.difficulty} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-[#4B5563] dark:text-muted">
                    <ClockIcon />
                    {row.label}
                  </span>
                  <span className="whitespace-nowrap font-bold text-ink">
                    {row.avgTimeMinutes} min
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote>No timing data yet.</EmptyNote>
          )}
        </StatCard>

        <StatCard title="Accuracy by Time of Day" padding="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            {data.byTimeOfDay.buckets.map((row) => (
              <div key={row.key} className="flex flex-col items-center gap-0.75">
                <span className="text-muted">{TIME_OF_DAY_ICONS[row.key]}</span>
                <span className="text-center text-[10px] font-bold leading-3 text-muted sm:text-[8px]">
                  {row.label}
                </span>
                {/* A dash where there aren't enough attempts to claim a rate. */}
                <span className="text-xs font-bold text-ink">
                  {row.accuracy === null ? "—" : `${row.accuracy}%`}
                </span>
              </div>
            ))}
          </div>
          {data.byTimeOfDay.insight && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-tint px-2 py-2">
              <LightbulbIcon className="mt-0.5 h-3 w-3 shrink-0 text-cta" />
              <p className="text-[11px] font-medium leading-4 text-body-text sm:text-[9px] sm:leading-[13.5px]">
                Insight: {data.byTimeOfDay.insight}
              </p>
            </div>
          )}
        </StatCard>

        <StatCard title="Projected Next Mock" padding="p-4 sm:p-6">
          {data.mockTrend.projection ? (
            <>
              <div className="flex flex-col items-center">
                <p className="text-center text-[28px] font-extrabold leading-none text-ink sm:text-[32px]">
                  {data.mockTrend.projection.projectedScore}{" "}
                  <span>± {data.mockTrend.projection.marginOfError}</span>
                </p>
                <p className="mt-2 text-center text-sm font-bold text-ink">Marks</p>
                <div className="mt-3 flex items-center justify-center gap-1 rounded-full bg-tint-strong px-3 py-1.5 text-[10px] font-bold text-ink">
                  From {data.mockTrend.projection.basedOnMocks} mocks
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand/10 bg-tint px-3 py-3">
                <BoltIcons className="mt-0.5 h-4.5 w-4 shrink-0 text-cta" />
                <p className="text-[11px] leading-4 text-body-text sm:text-[9px] sm:leading-[11.25px]">
                  Your recent scores carried forward — a range, not a promise.
                </p>
              </div>
            </>
          ) : (
            <EmptyNote>
              A projection needs at least 3 mocks. Add mocks as you attempt them.
            </EmptyNote>
          )}
        </StatCard>
      </div>
    </div>
  );
}
