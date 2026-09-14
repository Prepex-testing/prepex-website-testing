"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  HomeIcon,
  CheckIcon,
  ChevronDownIcon,
  InfoIcon,
  BoltIcons,
} from "@/components/ui/icons";
import { EmptyNote, StatCard } from "@/components/stats/StatCard";
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

/** "6–8 AM" → "6–8": on a mid-width card the period names already say which part of the day. */
function shortSlotLabel(label: string): string {
  return label.replace(/\s*(AM|PM)$/i, "");
}

/** Heatmap period names short enough for a 2-slot group on a narrow card. */
const SHORT_PERIOD_NAMES: Record<string, string> = {
  morning: "Morn",
  afternoon: "Aftn",
  evening: "Eve",
  night: "Night",
};

function shortPeriodName(category: string): string {
  return SHORT_PERIOD_NAMES[category.trim().toLowerCase()] ?? category;
}


function bucketKey(day: ConsistencyDay): string {
  return day.isToday ? "today" : String(day.bucket);
}

const DISTRIBUTION_BARS = [
  "bg-[#1A1A4E] dark:bg-ink/40",
  "bg-[#1A1A4E] dark:bg-[#6D28D9]",
  "bg-ink",
  "bg-[#1A1A4E] dark:bg-ink/25",
  "bg-[#1A1A4E] dark:bg-[#4C1D95]",
];


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

export function EffortStats() {
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

  // Time-of-day heatmap: every slot, flattened, with one grid column each.
  const heatmapSlots = data.timeOfDayHeatmap.periods.flatMap((period) => period.slots);
  const heatmapColumns = {
    gridTemplateColumns: `repeat(${heatmapSlots.length}, minmax(0, 1fr))`,
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {data.explainer && (
        <div className="rounded-2xl border border-brand/10 bg-tint px-4 py-3 text-xs font-semibold text-body-text sm:text-sm">
          {data.explainer}
        </div>
      )}

      {data.recoveryNote && (
        <div className="rounded-2xl border border-chart-recovery/30 bg-chart-recovery/10 px-4 py-3 text-xs font-semibold text-body-text sm:text-sm dark:border-transparent dark:bg-card">
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

        {/* Card 2 — streak. The whole card links to the streak page; `h-full`
            keeps it the same height as its neighbour in the grid, and the
            border darkens on hover so it reads as clickable. */}
        <Link
          href="/home/streak"
          aria-label={`${data.streakDays} day streak — view streak details`}
          className="group block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <StatCard className="h-full min-h-[100px] transition-colors group-hover:border-brand/30 sm:min-h-[126px]">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFF3F0] dark:bg-tint sm:h-16 sm:w-[60px] sm:rounded-[14px]">
                <FlameIcon className="h-5.625 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold leading-none text-ink sm:text-2xl md:text-[26px]">
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
        </Link>

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
          className="@container h-auto rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.13),0_1px_2px_rgba(0,0,0,0.05)] sm:h-[291px]"
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
          </div>

      
          <div className="mt-5 grid flex-1 grid-cols-[auto_1fr] grid-rows-[auto_minmax(95px,1fr)_auto_auto] gap-x-2 sm:mt-6 @sm:gap-x-3">
         
            <span aria-hidden="true" />
            <div className="grid grid-cols-7">
              {data.dailyBreakdown.map((bar) => {
                const state = dayState(bar);
                return (
                  <span
                    key={bar.date}
                    className={`mb-1.5 truncate text-center text-[8px] font-bold leading-none sm:mb-2 @sm:text-[10px] ${state === "today"
                        ? "text-cta"
                        : state === "recovery"
                          ? "text-chart-recovery"
                          : "text-transparent"
                      }`}
                  >
                    {state === "recovery" ? (
                      <>
                        <span className="@sm:hidden">Rec</span>
                        <span className="hidden @sm:inline">Recovery</span>
                      </>
                    ) : state === "today" ? (
                      "Today"
                    ) : (
                      "."
                    )}
                  </span>
                );
              })}
            </div>

            {/* Row 2 — axis and bars, same height */}
            <div className="flex flex-col justify-between text-[9px] leading-none text-weekly-label @sm:text-[10px]">
              {ticks.map((tick) => (
                <span key={tick}>{tick}h</span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {data.dailyBreakdown.map((bar) => {
                const state = dayState(bar);
                return (
                  <div key={bar.date} className="flex items-end justify-center">
                    <div
                      className={`w-3/5 max-w-6 rounded-t-lg @sm:max-w-10 ${BAR_COLORS[state]}`}
                      style={{ height: `${Math.min(100, (bar.hours / axisTop) * 100)}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Row 3 — day labels */}
            <span aria-hidden="true" />
            <div className="grid grid-cols-7">
              {data.dailyBreakdown.map((bar) => (
                <span
                  key={bar.date}
                  className="mt-1.5 text-center text-[9px] font-bold leading-none text-weekly-label sm:mt-2 @sm:text-[10px]"
                >
                  {bar.dayLabel}
                </span>
              ))}
            </div>

            {/* Row 4 — hours, with one unbroken rule across the chart */}
            <span aria-hidden="true" />
            <div className="mt-1.5 grid h-5 grid-cols-7 border-t border-[#F3F4F6] pt-1 dark:border-[#FAF7F240] sm:mt-2">
              {data.dailyBreakdown.map((bar) => (
                <span
                  key={bar.date}
                  className="text-center text-[9px] leading-[15px] text-weekly-label @sm:text-[10px]"
                >
                  {bar.hours}h
                </span>
              ))}
            </div>
          </div>
        </StatCard>

        {/* Weekly performance */}
        <StatCard className="@container flex h-auto w-full flex-col rounded-2xl p-4 sm:h-[291px] sm:p-6">
    
          <div className="flex items-start justify-between gap-3 @sm:h-12 @sm:gap-4">
            <div className="flex min-w-0 items-center gap-2.5 @sm:gap-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint-strong text-ink dark:bg-ink/8 @sm:h-12 @sm:w-12">
                <Chart />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-6 text-ink @sm:text-[16px]">
                  Weekly Performance
                </p>
                <p className="truncate text-[9px] font-bold uppercase leading-[15px] tracking-[1px] text-[#46465099] dark:text-muted @sm:text-[10px]">
                  Summary Statistics
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-[3.5px] text-right">
              <p className="text-sm font-extrabold leading-4 text-ink @sm:text-[16px]">
                {data.completion.completionRate}%
              </p>
              <p className="max-w-16 text-[9px] font-bold uppercase leading-[13px] text-[#46465099] dark:text-muted @sm:max-w-none @sm:text-[11px] @sm:leading-[16.5px]">
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
          {/* Boxes per day follow the grid's own width (container queries),
              not the screen's — beside the legend at 1024px it's narrower
              than at 768px. 1 box < 380px, 2 from 380px, 3 from 560px and the
              full 5 from 840px, each only once seven days of it fit, so one
              day's boxes never run into the next. */}
          <div className="@container min-w-0 flex-1 overflow-x-auto">
            <div className="grid grid-cols-[minmax(44px,64px)_repeat(7,minmax(0,1fr))] items-center gap-x-1 gap-y-2 sm:grid-cols-[minmax(80px,120px)_repeat(7,minmax(0,1fr))] sm:gap-y-4 @[380px]:gap-x-2">
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
                        className={`h-4 w-4 rounded-[3px] @[380px]:hidden ${day.isFuture ? "bg-transparent" : BUCKET_COLORS[bucketKey(day)]
                          }`}
                        title={`${day.date} — ${day.hours}h`}
                      />
                      <div className="hidden items-center justify-center gap-[7.43px] @[380px]:flex">
                        {Array.from({ length: 5 }).map((_, boxIndex) => (
                          <div
                            key={boxIndex}
                            className={`h-[14.86px] w-[12.38px] rounded-[2.48px] ${boxIndex === 2
                                ? "hidden @[560px]:block"
                                : boxIndex > 2
                                  ? "hidden @[840px]:block"
                                  : ""
                              } ${day.isFuture ? "bg-transparent" : BUCKET_COLORS[bucketKey(day)]
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

      {/* Side by side from `xl` only: at sm–lg a half-width card is ~240–310px,
          too narrow for the heatmap's 12 time slots and their labels. */}
      <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-5 xl:grid-cols-2">
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
            <p className="font-[Plus_Jakarta_Sans] text-[15px] font-bold leading-6 tracking-normal text-ink sm:text-[16px]">
              Time of Day Heatmap
            </p>
            <span className="shrink-0 font-[Plus_Jakarta_Sans] text-[9px] font-extrabold uppercase leading-[15px] tracking-[1px] text-muteds sm:text-[10px]">
              Efficiency Peaks
            </span>
          </div>

          {data.timeOfDayHeatmap.hasData ? (
         
            <div className="@container mt-5 flex flex-1 flex-col sm:mt-6">
              {/* Bars top out at 145px (the spec), growing only if the card is
                  stretched taller by its row neighbour. The axis overhangs the
                  bar area by half a label (-my-[5.47px], half of the 10.93px
                  line) so each label's centre sits on its value: 100% level
                  with a full bar's top, 0% with the baseline. */}
              <div className="flex min-h-[145px] flex-1">
                <div className="-my-[5.47px] flex w-7 shrink-0 flex-col justify-between pr-[8.33px]">
                  {[100, 80, 60, 40, 20, 0].map((value) => (
                    <span
                      key={value}
                      className="text-right text-[7.29px] font-normal leading-[10.93px] tracking-normal text-muteds"
                    >
                      {value}%
                    </span>
                  ))}
                </div>

                <div className="grid flex-1 gap-[3px] @[400px]:gap-1 @[620px]:gap-2" style={heatmapColumns}>
                  {heatmapSlots.map((slot) => (
                    <div
                      key={slot.startHour}
                      className="flex items-end justify-center"
                      title={`${slot.label} — ${slot.minutes} min`}
                    >
                      {/* 25px wide, 4px top corners; height is this slot's
                          share of the day's peak. */}
                      <div
                        className={`w-full max-w-[25px] rounded-t-[4px] ${slot.isPeak ? "bg-[#FF7A59]" : "bg-ink"}`}
                        style={{ height: `${Math.min(100, Math.max(0, slot.percentOfPeak))}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex">
                <div className="w-7 shrink-0" />
                <div className="grid flex-1 gap-x-[3px] gap-y-1.5 @[400px]:gap-x-1 @[620px]:gap-x-2" style={heatmapColumns}>
                  {heatmapSlots.map((slot) => (
                    <span
                      key={slot.startHour}
                      className="hidden truncate text-center text-[8px] font-medium leading-3 text-muted @[400px]:block @[620px]:text-[9px]"
                    >
                      <span className="@[620px]:hidden">{shortSlotLabel(slot.label)}</span>
                      <span className="hidden @[620px]:inline">{slot.label}</span>
                    </span>
                  ))}

                  {data.timeOfDayHeatmap.periods.map((period) => (
                    <div
                      key={period.category}
                      className="flex min-w-0 flex-col items-center gap-[4.17px]"
                      style={{ gridColumn: `span ${period.slots.length}` }}
                    >
                    
                      <span className="mx-[4.16px] h-[4.16px] self-stretch rounded-t-sm border-x border-t border-muted/40" />
                 
                      <span className="whitespace-nowrap text-[8px] font-extrabold uppercase leading-[13.5px] tracking-normal text-muteds @[400px]:text-[9px]">
                        <span className="@[400px]:hidden">{shortPeriodName(period.category)}</span>
                        <span className="hidden @[400px]:inline">{period.category}</span>
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

        <StatCard
          title="Weekend vs Weekday"
          titleClassName="text-[14px] leading-6 sm:text-[16px]"
          className="h-full"
          bodyClassName="mt-8"
        >
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
              <BoltIcons className="h-[15px] w-[13.33px] text-[#6366F1] dark:text-[var(--text-primary,#FAF7F2)] [&_path]:stroke-2" />
            </span>
            <p className="font-[Plus_Jakarta_Sans] text-[14px] font-bold leading-6 tracking-normal text-ink sm:text-[16px]">
              Insights
            </p>
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
