"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  HomeIcon,
  CheckIcon,
  ChevronDownIcon,
  InfoIcon,
  BoltIcons,
} from "@/components/ui/icons";
import { StatCard } from "@/components/stats/StatCard";
import { DistributionRow, MeterRow } from "@/components/stats/MeterRow";
import { SubjectDonut } from "@/components/stats/SubjectDonut";
import { PageLoader } from "@/components/ui/PageLoader";
import { ClockIcon, FlameIcon, Check, Chart, Coaching } from "@/assets/icons";
import { getEffortTab, type EffortTab, type ConsistencyDay } from "@/lib/api/productivity";

type BarState = "past" | "today" | "recovery" | "future";

const BAR_COLORS: Record<BarState, string> = {
  past: "bg-ink",
  today: "bg-[#FF7F5C]",
  recovery: "bg-[#FB923C]",
  future: "bg-ink/15",
};

const BUCKET_COLORS: Record<string, string> = {
  "0": "bg-[#F3F4F6] dark:border dark:border-[#F3F4F6] dark:bg-white",
  "1": "bg-[#E0E7FF]",
  "2": "bg-[#818CF8]",
  "3": "bg-[#2D2E6E] dark:bg-ink",
  today: "bg-[#FF7F5C]",
};

const LEGEND_ITEMS: { label: string; key: string }[] = [
  { label: "0h", key: "0" },
  { label: "< 2h", key: "1" },
  { label: "2 – 4h", key: "2" },
  { label: "> 4h", key: "3" },
  { label: "Today", key: "today" },
];

/** A day already studied reads as "today" in the grid only while it is today. */
function bucketKey(day: ConsistencyDay): string {
  return day.isToday ? "today" : String(day.bucket);
}

/** Distinct bar colours for the session-length rows, reused in order. */
const DISTRIBUTION_BARS = [
  "bg-[#1A1A4E] dark:bg-ink/40",
  "bg-[#1A1A4E] dark:bg-[#6D28D9]",
  "bg-ink",
  "bg-[#1A1A4E] dark:bg-ink/25",
  "bg-[#1A1A4E] dark:bg-[#4C1D95]",
];

/** Subject colours fall back to a rotating palette for any subject not themed. */
const SUBJECT_COLORS: Record<string, string> = {
  physics: "var(--subject-physics)",
  chemistry: "var(--subject-chemistry)",
  maths: "var(--subject-maths)",
  mathematics: "var(--subject-maths)",
};
const SUBJECT_FALLBACKS = ["#6366F1", "#F59E0B", "#14B8A6", "#EC4899", "#8B5CF6"];

function subjectColor(name: string, index: number): string {
  return SUBJECT_COLORS[name.trim().toLowerCase()] ?? SUBJECT_FALLBACKS[index % SUBJECT_FALLBACKS.length];
}

function dayState(day: EffortTab["dailyBreakdown"][number]): BarState {
  if (day.isFuture) return "future";
  if (day.isToday) return "today";
  if (day.isRecovery) return "recovery";
  return "past";
}

/** Whole-hour ticks for the weekly chart, scaled to the student's real peak. */
function axisTicks(maxHours: number): number[] {
  const top = Math.max(2, Math.ceil(maxHours));
  const step = top / 3;
  return [top, step * 2, step, 0].map((t) => Math.round(t * 10) / 10);
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center text-xs font-medium leading-5 text-muted">{children}</p>
  );
}

export default function EffortStatsPage() {
  const [data, setData] = useState<EffortTab | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getEffortTab()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your effort stats. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The chart scales to the student's own peak, with a floor so a light week
  // doesn't render as a wall of full-height bars.
  const chartMax = useMemo(() => Math.max(data?.maxHours ?? 0, 1), [data]);
  const ticks = useMemo(() => axisTicks(chartMax), [chartMax]);

  if (isLoading) return <PageLoader label="Loading your effort stats…" />;

  if (error || !data) {
    return (
      <StatCard>
        <p className="py-8 text-center text-sm font-medium text-muted">
          {error ?? "Couldn't load your effort stats."}
        </p>
      </StatCard>
    );
  }

  const axisTop = ticks[0] ?? 1;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {data.explainer && (
        <div className="rounded-2xl border border-brand/10 bg-tint px-4 py-3 text-xs font-semibold text-body-text sm:text-sm">
          {data.explainer}
        </div>
      )}

      {data.recoveryNote && (
        <div className="rounded-2xl border border-chart-recovery/30 bg-chart-recovery/10 px-4 py-3 text-xs font-semibold text-body-text sm:text-sm">
          {data.recoveryNote}
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Card 1 — focus hours */}
        <StatCard className="flex h-full min-h-[100px] w-full min-w-0 flex-col justify-center sm:min-h-[126px]">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink dark:bg-ink/8 sm:h-16 sm:w-[60px] sm:rounded-[14px]">
              <ClockIcon className="h-6.25 w-6.25" />
            </div>
            <div>
              <h3 className="text-xl font-bold leading-none text-ink sm:text-2xl md:text-[28px]">
                {data.focusHoursThisWeek}
              </h3>
              <p className="mt-1 text-xs font-semibold text-muted sm:mt-2 sm:text-sm">
                Focus hours this week
              </p>
            </div>
          </div>
        </StatCard>

        {/* Card 2 — streak */}
        <StatCard className="min-h-[100px] sm:min-h-[126px]">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFF3F0] dark:bg-tint sm:h-16 sm:w-[60px] sm:rounded-[14px]">
              <FlameIcon className="h-5.625 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold leading-none text-ink sm:text-2xl md:text-[28px]">
                {data.streakDays} Day Streak
              </h3>
              <p className="mt-1 text-xs font-semibold text-muted sm:mt-2 sm:text-sm">
                {data.longestStreak > data.streakDays
                  ? `Longest: ${data.longestStreak} days`
                  : "Keep going"}
              </p>
            </div>
          </div>
        </StatCard>

        {/* Card 3 — days active */}
        <StatCard className="min-h-[100px] sm:min-h-[126px]">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink dark:bg-ink/8 sm:h-16 sm:w-[60px] sm:rounded-[14px]">
              <Check className="h-6.25 w-5.625" />
            </div>
            <div>
              <h3 className="text-xl font-bold leading-none text-ink sm:text-2xl md:text-[28px]">
                {data.daysActive}/{data.totalDaysInWeek}
              </h3>
              <p className="mt-1 text-xs font-semibold text-muted sm:mt-2 sm:text-sm">
                Days active this week
              </p>
            </div>
          </div>
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        {/* Weekly focus chart */}
        <StatCard
          className="h-auto rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.13),0_1px_2px_rgba(0,0,0,0.05)] sm:h-[291px]"
          padding="pt-3 pb-3 px-4 sm:px-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 sm:h-[26px] sm:flex-nowrap">
            <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-6">
              <h2 className="text-sm font-bold leading-6 text-weekly-title sm:text-base">
                This Week
              </h2>

              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-4">
                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.5px] text-weekly-label sm:text-[10px]">
                  <span className="h-2 w-2 rounded-full bg-brand sm:h-2.5 sm:w-2.5" />
                  Focus Time
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.5px] text-weekly-label sm:text-[10px]">
                  <span className="h-2 w-2 rounded-full bg-cta sm:h-2.5 sm:w-2.5" />
                  Today
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.5px] text-weekly-label sm:text-[10px]">
                  <span className="h-2 w-2 rounded-full bg-chart-recovery sm:h-2.5 sm:w-2.5" />
                  Recovery
                </span>
              </div>
            </div>

            <span className="flex h-6 w-auto min-w-[90px] shrink-0 items-center justify-between gap-1 rounded-lg border border-input-border bg-surface px-2 text-[10px] font-bold text-body-text shadow-input sm:h-[26px] sm:min-w-[117px] sm:px-3 sm:text-[12px]">
              <span className="whitespace-nowrap">Weekly View</span>
              <ChevronDownIcon className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" />
            </span>
          </div>

          <div className="mt-5 flex h-[180px] sm:mt-6 sm:h-[205px]">
            <div className="mr-2 flex h-[135px] flex-col justify-between text-[9px] text-weekly-label sm:mr-3 sm:h-[160px] sm:text-[10px]">
              {ticks.map((tick) => (
                <span key={tick}>{tick}h</span>
              ))}
            </div>

            <div className="flex flex-1 items-end justify-between">
              {data.dailyBreakdown.map((bar) => {
                const state = dayState(bar);
                return (
                  <div key={bar.date} className="flex w-8 flex-col items-center sm:w-[48px]">
                    <span
                      className={`mb-1.5 text-[9px] font-bold sm:mb-2 sm:text-[10px] ${
                        state === "today"
                          ? "text-cta"
                          : state === "recovery"
                            ? "text-chart-recovery"
                            : "text-transparent"
                      }`}
                    >
                      {state === "today" ? "Today" : state === "recovery" ? "Recovery" : "."}
                    </span>

                    <div className="flex h-[95px] items-end sm:h-[110px]">
                      <div
                        className={`w-6 rounded-t-lg sm:w-10 ${BAR_COLORS[state]}`}
                        style={{ height: `${Math.min(100, (bar.hours / axisTop) * 100)}%` }}
                      />
                    </div>

                    <span className="mt-1.5 text-[9px] font-bold text-weekly-label sm:mt-2 sm:text-[10px]">
                      {bar.dayLabel}
                    </span>
                    <span className="text-[9px] text-weekly-label sm:text-[10px]">
                      {bar.hours}h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </StatCard>

        {/* Weekly performance */}
        <StatCard className="flex h-auto w-full flex-col rounded-2xl p-4 sm:h-[291px] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 sm:h-12 sm:flex-nowrap sm:gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint-strong text-ink dark:bg-ink/8 sm:h-12 sm:w-12">
                <Chart />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-[24px] text-ink sm:text-[16px]">
                  Weekly Performance
                </p>
                <p className="text-[9px] font-bold uppercase leading-[15px] tracking-[1px] text-[#46465099] dark:text-muted sm:text-[10px]">
                  Summary Statistics
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-[3.5px] text-right">
              <p className="text-sm font-extrabold leading-[16px] text-ink sm:text-[16px]">
                {data.completion.completionRate}%
              </p>
              <p className="text-[10px] font-bold uppercase leading-[16.5px] text-[#46465099] dark:text-muted sm:text-[11px]">
                Completion Rate
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-1 flex-col justify-between gap-5 pb-3 sm:mt-6 sm:gap-6">
            <MeterRow
              label="Tasks Done"
              value={`${data.completion.tasksDone}/${data.completion.tasksTotal}`}
              percent={data.completion.completionRate}
              barClassName="bg-[linear-gradient(90.08deg,#1A1A4E_0.48%,#4C1D95_99.05%)] dark:bg-none dark:bg-[rgba(250,247,242,0.25)]"
              trackClassName="bg-tint"
              labelClassName="text-[#6B7280] dark:text-muted"
            />

            <MeterRow
              label="Plans Honored"
              value={`${data.completion.plansHonored}/${data.completion.plannedDays}`}
              percent={
                data.completion.plannedDays > 0
                  ? Math.round((data.completion.plansHonored / data.completion.plannedDays) * 100)
                  : 0
              }
              caption="DAYS"
              barClassName="bg-[linear-gradient(90.08deg,#1A1A4E_0.48%,#4C1D95_99.05%)] dark:bg-none dark:bg-[#4C1D95]"
              trackClassName="bg-tint"
              labelClassName="text-[#6B7280] dark:text-muted"
            />

            <MeterRow
              label="Recovery Days"
              value={`${data.completion.recoveryDays}`}
              percent={Math.min(100, (data.completion.recoveryDays / 7) * 100)}
              caption="DAYS"
              barClassName="bg-[linear-gradient(90.08deg,#1A1A4E_0.48%,#4C1D95_99.05%)] dark:bg-none dark:bg-[#FAF7F2]"
              trackClassName="bg-tint"
              labelClassName="text-[#6B7280] dark:text-muted"
            />
          </div>
        </StatCard>
      </div>

      {/* Study consistency */}
      <StatCard className="w-full rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold leading-[24px] text-ink sm:text-[16px]">
            {data.consistency.weeksTracked} Week Study Consistency
          </p>
          <span className="text-muted">
            <InfoIcon />
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-6 sm:mt-6 sm:gap-8 lg:flex-row lg:items-start lg:gap-[79px]">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="grid grid-cols-[minmax(44px,64px)_repeat(7,minmax(0,1fr))] items-center gap-x-1 gap-y-2 sm:min-w-140 sm:grid-cols-[minmax(80px,120px)_repeat(7,1fr)] sm:gap-x-0 sm:gap-y-4">
              <span />
              {(data.consistency.weeks[0]?.days ?? []).map((day) => (
                <span
                  key={day.dayLabel}
                  className="truncate text-center text-[9px] font-bold leading-[18.57px] text-[#9CA3AF] dark:text-muted sm:text-[12.38px]"
                >
                  {day.dayLabel}
                </span>
              ))}

              {data.consistency.weeks.map((week) => (
                <Fragment key={week.weekStart}>
                  <span className="truncate text-[9px] font-semibold leading-[18.57px] text-[#9CA3AF] dark:text-muted sm:text-[12.38px]">
                    {week.rangeLabel}
                  </span>
                  {week.days.map((day) => (
                    <div key={day.date} className="mx-auto flex items-center justify-center">
                      {/* Mobile: one solid cell per day — the 5-segment strip is
                          always a single colour, so nothing is lost. */}
                      <div
                        className={`h-4 w-4 rounded-[3px] sm:hidden ${
                          day.isFuture ? "bg-transparent" : BUCKET_COLORS[bucketKey(day)]
                        }`}
                        title={`${day.date} — ${day.hours}h`}
                      />
                      <div className="hidden items-center justify-center gap-[7.43px] sm:flex">
                        {Array.from({ length: 5 }).map((_, boxIndex) => (
                          <div
                            key={boxIndex}
                            className={`h-[14.86px] w-[12.38px] rounded-[2.48px] ${
                              day.isFuture ? "bg-transparent" : BUCKET_COLORS[bucketKey(day)]
                            }`}
                            title={`${day.date} — ${day.hours}h`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:gap-4 lg:w-[110px]">
            <p className="text-[11px] font-extrabold leading-[16px] text-[#2D2E6E] dark:text-ink sm:text-[12px]">
              Hours Studied
            </p>
            <div className="flex flex-col gap-2">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span
                    className={`h-3.5 w-3.5 rounded-[2px] border border-ink/10 sm:h-4 sm:w-4 ${BUCKET_COLORS[item.key]}`}
                  />
                  <span className="text-[11px] font-semibold leading-[16px] text-[#6B7280] dark:text-muted sm:text-[12px]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </StatCard>

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5">
        {/* Session length distribution */}
        <StatCard className="flex w-full flex-col rounded-2xl p-4 shadow-[0px_1px_2px_0px_#00000005,0px_1px_3px_0px_#0000000D] sm:p-6">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold leading-[24px] text-ink sm:text-[16px]">
              Session Length Distribution
            </p>
            <span className="text-muted">
              <InfoIcon />
            </span>
          </div>

          {data.sessionLengths.hasData ? (
            <div className="mt-6 flex flex-1 flex-col justify-center gap-6 sm:mt-8 sm:gap-8">
              {data.sessionLengths.buckets.map((row, index) => (
                <DistributionRow
                  key={row.label}
                  label={row.label}
                  value={`${row.count} (${row.percent}%)`}
                  percent={row.percent}
                  barClassName={DISTRIBUTION_BARS[index % DISTRIBUTION_BARS.length]}
                />
              ))}
            </div>
          ) : (
            <EmptyNote>
              Focus sessions shape this chart. Start a session to see how long you actually sit.
            </EmptyNote>
          )}
        </StatCard>

        {/* Time of day heatmap */}
        <StatCard className="flex w-full flex-col rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold leading-[24px] text-ink sm:text-[16px]">
              Time of Day Heatmap
            </p>
            <span className="shrink-0 text-[9px] font-extrabold uppercase leading-[15px] tracking-[1px] text-muted sm:text-[10px]">
              Efficiency Peaks
            </span>
          </div>

          {data.timeOfDayHeatmap.hasData ? (
            <div className="mt-5 flex flex-1 flex-col sm:mt-6">
              <div className="flex gap-2 sm:gap-3">
                <div className="flex h-[80px] w-6 shrink-0 flex-col justify-between pr-1 sm:h-[100px] sm:w-7">
                  {[100, 80, 60, 40, 20, 0].map((value) => (
                    <span
                      key={value}
                      className="text-right text-[7px] leading-none text-muted sm:text-[8px]"
                    >
                      {value}%
                    </span>
                  ))}
                </div>

                <div className="relative flex h-[80px] flex-1 items-end justify-between gap-2 sm:h-[100px] sm:gap-3">
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                    {[100, 80, 60, 40, 20, 0].map((value) => (
                      <div key={value} className="h-px w-full bg-ink/5" />
                    ))}
                  </div>

                  {data.timeOfDayHeatmap.periods.map((period) => (
                    <div
                      key={period.category}
                      className="flex h-full flex-1 items-end justify-center gap-1 sm:gap-1.5"
                    >
                      {period.slots.map((slot) => (
                        <div
                          key={slot.label}
                          className="flex h-full flex-1 items-end justify-center"
                          title={`${slot.label} — ${slot.minutes} min`}
                        >
                          <div
                            className={`w-full max-w-[18px] rounded-t-lg sm:max-w-[25px] ${
                              slot.isPeak ? "bg-[#FF7A59]" : "bg-ink"
                            }`}
                            style={{ height: `${Math.min(100, Math.max(0, slot.percentOfPeak))}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-1.5 flex gap-2 sm:gap-3">
                <div className="w-6 shrink-0 sm:w-7" />
                <div className="flex flex-1 justify-between gap-2 sm:gap-3">
                  {data.timeOfDayHeatmap.periods.map((period) => (
                    <div
                      key={period.category}
                      className="flex flex-1 flex-col items-center gap-1.5 sm:gap-2"
                    >
                      <div className="flex w-full justify-center gap-1 sm:gap-1.5">
                        {period.slots.map((slot) => (
                          <span
                            key={slot.label}
                            className="flex-1 whitespace-nowrap text-center text-[6px] font-medium text-muted sm:text-[7px]"
                          >
                            {slot.label}
                          </span>
                        ))}
                      </div>
                      <span className="text-[8px] font-extrabold uppercase leading-[13.5px] tracking-wide text-muted sm:text-[9px]">
                        {period.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyNote>No focus sessions logged yet — this fills in as you study.</EmptyNote>
          )}
        </StatCard>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-[290fr_290fr_464fr]">
        <StatCard title="Subject Focus Split" className="h-full" bodyClassName="mt-8">
          {data.subjectSplit.hasData ? (
            <div className="flex flex-col items-center gap-4">
              <SubjectDonut
                segments={data.subjectSplit.subjects.map((s, i) => ({
                  label: s.subjectName,
                  value: s.percent,
                  color: subjectColor(s.subjectName, i),
                }))}
              />
              <div className="flex w-full flex-col gap-2">
                {data.subjectSplit.subjects.map((subject, i) => (
                  <div
                    key={subject.subjectId}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2 font-semibold text-[#4B5563] dark:text-muted">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: subjectColor(subject.subjectName, i) }}
                      />
                      {subject.subjectName}
                    </span>
                    <span className="font-bold text-ink">{subject.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyNote>Study a subject-linked task to see where your hours go.</EmptyNote>
          )}
        </StatCard>

        <StatCard title="Weekend vs Weekday" className="h-full" bodyClassName="mt-8">
          {data.weekendVsWeekday.hasData ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint-strong p-3 text-ink">
                  <Coaching className="h-6 w-6" />
                </span>
                <div className="flex flex-col">
                  <p className="text-[10px] font-bold leading-[15px] text-[#9CA3AF] dark:text-[#8B8998]">
                    Weekdays (Mon - Fri)
                  </p>
                  <span className="text-2xl font-extrabold leading-8 text-ink">
                    {data.weekendVsWeekday.weekdayAvgHours}h
                  </span>
                  <p className="text-[10px] font-bold leading-[15px] text-[#9CA3AF] dark:text-[#8B8998]">
                    Average per day
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint-strong p-3 text-ink">
                  <HomeIcon className="h-6 w-6" />
                </span>
                <div className="flex flex-col">
                  <p className="text-[10px] font-bold leading-[15px] text-[#9CA3AF] dark:text-[#8B8998]">
                    Weekends (Sat - Sun)
                  </p>
                  <span className="text-2xl font-extrabold leading-8 text-ink">
                    {data.weekendVsWeekday.weekendAvgHours}h
                  </span>
                  <p className="text-[10px] font-bold leading-[15px] text-[#9CA3AF] dark:text-[#8B8998]">
                    Average per day
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted">
                Averaged over the last {data.weekendVsWeekday.windowDays} days.
              </p>
            </div>
          ) : (
            <EmptyNote>Not enough logged focus time yet to compare your days.</EmptyNote>
          )}
        </StatCard>

        <StatCard className="h-full">
          <div className="flex h-6 w-full items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              <BoltIcons className="h-[15px] w-[13.33px] text-[#6366F1] dark:text-[var(--text-primary,#FAF7F2)]" />
            </span>
            <p className="text-sm font-bold text-ink">Insights</p>
            <span className="text-muted">
              <InfoIcon />
            </span>
          </div>

          {data.insights.length > 0 ? (
            <ul className="mt-6 flex flex-col gap-5">
              {data.insights.map((insight) => (
                <li key={insight} className="flex items-start gap-2.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center pt-[3px]">
                    <CheckIcon className="h-[13px] w-4 text-[#6366F1] dark:text-[var(--text-primary,#FAF7F2)]" />
                  </span>
                  <span className="text-xs font-semibold leading-5 text-[#4B5563] dark:text-[var(--text-secondary,#8B8998)]">
                    {insight}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>Insights appear once there is a week of activity to read.</EmptyNote>
          )}
        </StatCard>
      </div>
    </div>
  );
}
