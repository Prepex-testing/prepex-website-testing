import { Fragment } from "react";
import {
  // ClockIcon,
  // FlameIcon,
  // CalendarIcon,
  ChartBarIcon,
  HomeIcon,
  SparkleIcon,
  CheckIcon,
  ChevronDownIcon,
  InfoIcon,
} from "@/components/ui/icons";
import { StatCard } from "@/components/stats/StatCard";
import { DistributionRow, MeterRow } from "@/components/stats/MeterRow";
import { SubjectDonut } from "@/components/stats/SubjectDonut";
import { ClockIcon, FlameIcon, Check, CalendarIcon, Chart } from "@/assets/icons";
type BarState = "past" | "today" | "recovery" | "future";

const BAR_COLORS: Record<BarState, string> = {
  past: "bg-ink",
  today: "bg-[#FF7F5C]",
  recovery: "bg-[#FB923C]",
  future: "bg-ink/15",
};

const WEEK_BARS: { day: string; hours: number; state: BarState }[] = [
  { day: "Mon", hours: 6.2, state: "past" },
  { day: "Tue", hours: 1.4, state: "recovery" },
  { day: "Wed", hours: 4.8, state: "past" },
  { day: "Thu", hours: 2.6, state: "past" },
  { day: "Fri", hours: 5.4, state: "today" },
  { day: "Sat", hours: 2.0, state: "future" },
  { day: "Sun", hours: 2.3, state: "future" },
];

const MAX_HOURS = 6.4;

const SESSION_LENGTHS = [
  { label: "15 – 25 min", count: 4, percent: 14, barClassName: "bg-ink/40" },
  { label: "25 – 45 min", count: 8, percent: 29, barClassName: "bg-[#6D28D9]" },
  { label: "45 – 90 min", count: 6, percent: 43, barClassName: "bg-ink" },
  { label: "90+ min", count: 2, percent: 14, barClassName: "bg-ink/25" },
];

type TimeSlot = {
  label: string;
  percent: number;
  colorClassName: string;
};

type TimePeriod = {
  category: string;
  slots: TimeSlot[];
};

const TIME_PERIODS: TimePeriod[] = [
  {
    category: "Morning",
    slots: [
      { label: "6-8 AM", percent: 5, colorClassName: "bg-ink" },
      { label: "8-10 AM", percent: 10, colorClassName: "bg-ink" },
    ],
  },
  {
    category: "Afternoon",
    slots: [
      { label: "10-12 PM", percent: 32, colorClassName: "bg-ink" },
      { label: "12-2 PM", percent: 65, colorClassName: "bg-ink" },
      { label: "2-4 PM", percent: 20, colorClassName: "bg-[#FF9E43]" },
    ],
  },
  {
    category: "Evening",
    slots: [
      { label: "4-6 PM", percent: 60, colorClassName: "bg-ink" },
      { label: "6-8 PM", percent: 95, colorClassName: "bg-[#FF7A59]" },
    ],
  },
  {
    category: "Night",
    slots: [
      { label: "8-10 PM", percent: 68, colorClassName: "bg-[#9CA3AF]" },
      { label: "10-12 AM", percent: 40, colorClassName: "bg-ink" },
      { label: "12-2 AM", percent: 25, colorClassName: "bg-ink" },
    ],
  },
];

const Y_AXIS_LABELS = [100, 80, 60, 40, 20, 0];

const SUBJECT_SPLIT = [
  { label: "Physics", value: 38, color: "var(--ink)" },
  { label: "Chemistry", value: 28, color: "#4C1D95" },
  { label: "Maths", value: 34, color: "var(--ink)" },
];

const INSIGHTS = [
  "You're 3h ahead of your weekly target. Great job!",
  "Longest focus block was 95 minutes on Thursday.",
  "You skipped 1 planned session on Tuesday morning.",
  "You studied consistently 6 of the last 7 days.",
  "Recovery day on Tuesday helped improve your weekend performance.",
];
type Bucket = 0 | 1 | 2 | 3 | "today";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CONSISTENCY_WEEKS: { range: string; days: Bucket[] }[] = [
  { range: "May 19 – May 25", days: [2, 1, 3, 3, "today", 1, 2] },
  { range: "May 12 – May 18", days: [1, 3, 3, 3, 1, 2, 1] },
  { range: "May 05 – May 11", days: [2, 2, 1, 2, 2, 1, 0] },
];

const BUCKET_COLORS: Record<Bucket, string> = {
  0: "bg-ink/10",
  1: "bg-[#C7D2FE]",
  2: "bg-[#818CF8]",
  3: "bg-ink",
  today: "bg-[#F97066]",
};

const LEGEND_ITEMS: { label: string; bucket: Bucket }[] = [
  { label: "0h", bucket: 0 },
  { label: "< 2h", bucket: 1 },
  { label: "2 – 4h", bucket: 2 },
  { label: "> 4h", bucket: 3 },
  { label: "Today", bucket: "today" },
];

export default function EffortStatsPage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-3">

        {/* Card 1 */}
        <StatCard className="flex h-full min-h-[100px] w-full min-w-0 flex-col justify-center sm:min-h-[126px]">
          <div className="flex items-center gap-3 sm:gap-5">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl  bg-tint-strong text-ink dark:bg-ink/8 sm:h-16 sm:w-[60px] sm:rounded-[14px]">
              <ClockIcon className="h-5 w-5 sm:h-6.25 sm:w-6.25" />
            </div>

            <div>
              <h3 className="text-xl font-bold leading-none text-ink sm:text-2xl md:text-[28px]">
                19.5
              </h3>

              <p className="mt-1 text-xs font-semibold text-muted sm:mt-2 sm:text-sm">
                Focus hours this week
              </p>
            </div>

          </div>
        </StatCard>

        {/* Card 2 */}
        <StatCard className="min-h-[100px] sm:min-h-[126px]">
          <div className="flex items-center gap-3 sm:gap-5">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FFF3F0] dark:bg-tint sm:h-16 sm:w-[60px] sm:rounded-[14px]">
              <FlameIcon />
            </div>

            <div>
              <h3 className="text-xl font-bold leading-none text-ink sm:text-2xl md:text-[28px]">
                14 Day Streak
              </h3>

              <p className="mt-1 text-xs font-semibold text-muted sm:mt-2 sm:text-sm">
                Keep going
              </p>
            </div>

          </div>
        </StatCard>

        {/* Card 3 */}
        <StatCard className="min-h-[100px] sm:min-h-[126px]">
          <div className="flex items-center gap-3 sm:gap-5">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink dark:bg-ink/8 sm:h-16 sm:w-[60px] sm:rounded-[14px]">
              <Check className="h-5 w-5 sm:h-6.25 sm:w-6.25" />
            </div>

            <div>
              <h3 className="text-xl font-bold leading-none text-ink sm:text-2xl md:text-[28px]">
                6/7
              </h3>

              <p className="mt-1 text-xs font-semibold text-muted sm:mt-2 sm:text-sm">
                Days active this week
              </p>
            </div>

          </div>
        </StatCard>

      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        {/* LEFT CARD */}
        <StatCard className="h-auto rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.13),0_1px_2px_rgba(0,0,0,0.05)] sm:h-[291px]" padding="pt-3 pb-3 px-4 sm:px-6"
        >
          {/* Header */}
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

            <button className="flex h-6 w-[100px] shrink-0 items-center justify-between rounded-lg border border-input-border bg-surface px-2 text-[11px] font-bold text-body-text shadow-input sm:h-[26px] sm:w-[117px] sm:text-[12px]"
            >
              <span>Weekly View</span>
              <ChevronDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>

          {/* Chart */}
          <div className="mt-5 flex h-[180px] sm:mt-6 sm:h-[205px]">
            {/* Y Axis */}
            <div className="mr-2 flex h-[135px] flex-col justify-between text-[9px] text-weekly-label sm:mr-3 sm:h-[160px] sm:text-[10px]">
              <span>6h</span>
              <span>4h</span>
              <span>2h</span>
              <span>0h</span>
            </div>

            {/* Bars */}
            <div className="flex flex-1 items-end justify-between">
              {WEEK_BARS.map((bar) => (
                <div
                  key={bar.day}
                  className="flex w-8 flex-col items-center sm:w-[48px]"
                >
                  {/* Today / Recovery */}
                  <span
                    className={`mb-1.5 text-[9px] font-bold sm:mb-2 sm:text-[10px] ${bar.state === "today"
                        ? "text-cta"
                        : bar.state === "recovery"
                          ? "text-chart-recovery"
                          : "text-transparent"
                      }`}
                  >
                    {bar.state === "today"
                      ? "Today"
                      : bar.state === "recovery"
                        ? "Recovery"
                        : "."}
                  </span>

                  {/* Bar */}
                  <div className="flex h-[95px] items-end sm:h-[110px]">
                    <div
                      className={`w-6 rounded-t-lg sm:w-10 ${BAR_COLORS[bar.state]}`}
                      style={{
                        height: `${(bar.hours / MAX_HOURS) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Day */}
                  <span className="mt-1.5 text-[9px] font-bold text-weekly-label sm:mt-2 sm:text-[10px]">
                    {bar.day}
                  </span>

                  {/* Hours */}
                  <span className="text-[9px] text-weekly-label sm:text-[10px]">
                    {bar.hours}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        </StatCard>

        {/* RIGHT CARD */}
        <StatCard
          className="flex h-auto w-full flex-col rounded-2xl p-4 sm:h-[291px] sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 sm:h-12 sm:flex-nowrap sm:gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg  bg-tint-strong text-ink dark:bg-ink/8 sm:h-12 sm:w-12">
                <Chart />
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold leading-[24px] text-ink sm:text-[16px]">
                  Weekly Performance
                </p>
                <p className="text-[9px] font-bold uppercase leading-[15px] tracking-[1px] text-muted sm:text-[10px]">
                  Summary Statistics
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-[3.5px] text-right">
              <p className="text-sm font-extrabold leading-[16px] text-ink sm:text-[16px]">
                84%
              </p>
              <p className="text-[10px] font-bold uppercase leading-[16.5px] text-muted sm:text-[11px]">
                Completion Rate
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-1 flex-col justify-between gap-5 pb-3 sm:mt-6 sm:gap-6">
            <MeterRow
              label="Tasks Done"
              value="27/32"
              percent={84}
              barClassName="bg-ink/70"
              trackClassName="bg-tint"
            />

            <MeterRow
              label="Plans Honored"
              value="6/7"
              percent={86}
              caption="DAYS"
              barClassName="bg-[#4C1D95]"
              trackClassName="bg-tint"
            />

            <MeterRow
              label="Recovery Days"
              value="1/1"
              percent={100}
              barClassName="bg-ink"
              trackClassName="bg-tint"
            />
          </div>
        </StatCard>
      </div>

      <StatCard className="w-full rounded-2xl p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold leading-[24px] text-ink sm:text-[16px]">
            12 Week Study Consistency
          </p>
          <span className="text-muted">
            <InfoIcon />
          </span>
        </div>

        {/* Body: calendar + legend, side by side */}
        <div className="mt-5 flex flex-col gap-6 sm:mt-6 sm:gap-8 lg:flex-row lg:items-start lg:gap-[79px]">
          {/* Calendar grid */}
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="grid grid-cols-[minmax(48px,80px)_repeat(7,minmax(0,1fr))] items-center gap-y-2 sm:min-w-140 sm:grid-cols-[minmax(80px,120px)_repeat(7,1fr)] sm:gap-y-4">
              <span />
              {DAY_LABELS.map((label) => (
                <span
                  key={label}
                  className="truncate text-center text-[9px] font-bold leading-[18.57px] text-muted sm:text-[12.38px]"
                >
                  {label}
                </span>
              ))}

              {CONSISTENCY_WEEKS.map((week) => (
                <Fragment key={week.range}>
                  <span className="truncate text-[9px] font-semibold leading-[18.57px] text-muted sm:text-[12.38px]">
                    {week.range}
                  </span>
                  {week.days.map((bucket, index) => (
                    <div
                      key={`${week.range}-${index}`}
                      className="mx-auto flex items-center justify-center gap-0.5 sm:gap-[7.43px]"
                    >
                      {Array.from({ length: 5 }).map((_, boxIndex) => (
                        <div
                          key={boxIndex}
                          className={`h-2 w-1.5 rounded-[1px] sm:h-[14.86px] sm:w-[12.38px] sm:rounded-[2.48px] ${BUCKET_COLORS[bucket]}`}
                        />
                      ))}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>

          {/* Legend sidebar */}
          <div className="flex shrink-0 flex-col gap-3 sm:gap-4 lg:w-[110px]">
            <p className="text-[11px] font-extrabold leading-[16px] text-ink sm:text-[12px]">
              Hours Studied
            </p>
            <div className="flex flex-col gap-2">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span
                    className={`h-3.5 w-3.5 rounded-[2px] border border-ink/10 sm:h-4 sm:w-4 ${BUCKET_COLORS[item.bucket]}`}
                  />
                  <span className="text-[11px] font-semibold leading-[16px] text-muted sm:text-[12px]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </StatCard>

      {/* items-stretch keeps both cards equal height; grid-cols already give equal width */}
      <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-5 sm:grid-cols-2">
        {/* LEFT CARD */}
        <StatCard className="flex w-full flex-col rounded-2xl p-4 shadow-[0px_1px_2px_0px_#00000005,0px_1px_3px_0px_#0000000D] sm:p-6">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold leading-[24px] text-ink sm:text-[16px]">
              Session Length Distribution
            </p>
            <span className="text-muted">
              <InfoIcon />
            </span>
          </div>

          <div className="mt-6 flex flex-1 flex-col justify-center gap-6 sm:mt-8 sm:gap-8">
            {SESSION_LENGTHS.map((row) => (
              <DistributionRow
                key={row.label}
                label={row.label}
                value={`${row.count} (${row.percent}%)`}
                percent={row.percent}
                barClassName={row.barClassName}
              />
            ))}
          </div>
        </StatCard>

        {/* RIGHT CARD */}
        <StatCard className="flex w-full flex-col rounded-2xl p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold leading-[24px] text-ink sm:text-[16px]">
              Time of Day Heatmap
            </p>
            <span className="shrink-0 text-[9px] font-extrabold uppercase leading-[15px] tracking-[1px] text-muted sm:text-[10px]">
              Efficiency Peaks
            </span>
          </div>

          {/* Body */}
          <div className="mt-5 flex flex-1 gap-2 sm:mt-6">
            {/* Y-axis */}
            <div className="flex flex-col justify-between pr-1">
              {Y_AXIS_LABELS.map((value) => (
                <span
                  key={value}
                  className="text-right text-[7px] leading-none text-muted sm:text-[8px]"
                >
                  {value}%
                </span>
              ))}
            </div>

            {/* Bars */}
            <div className="relative flex flex-1 flex-col">
              <div className="relative flex flex-1 items-end justify-between gap-2 sm:gap-3">
                {/* Gridlines */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                  {Y_AXIS_LABELS.map((value) => (
                    <div key={value} className="h-px w-full bg-ink/5" />
                  ))}
                </div>

                {TIME_PERIODS.map((period) => (
                  <div
                    key={period.category}
                    className="relative flex flex-1 flex-col items-center gap-1.5 sm:gap-2"
                  >
                    <div className="flex h-[80px] w-full items-end justify-center gap-1 sm:h-[100px] sm:gap-1.5">
                      {period.slots.map((slot) => (
                        <div
                          key={slot.label}
                          className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                        >
                          <div className="flex h-full w-full items-end justify-center">
                            <div
                              className={`w-full max-w-[18px] rounded-t-lg sm:max-w-[25px] ${slot.colorClassName}`}
                              style={{
                                height: `${Math.min(100, Math.max(0, slot.percent))}%`,
                              }}
                            />
                          </div>
                          <span className="whitespace-nowrap text-[6px] font-medium text-muted sm:text-[7px]">
                            {slot.label}
                          </span>
                        </div>
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
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-3">
        <StatCard title="Subject Focus Split">
          <div className="flex flex-col items-center gap-4">
            <SubjectDonut segments={SUBJECT_SPLIT} />
            <div className="flex w-full flex-col gap-2">
              {SUBJECT_SPLIT.map((subject) => (
                <div key={subject.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-semibold text-body-text">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    {subject.label}
                  </span>
                  <span className="font-bold text-ink">{subject.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </StatCard>

        <StatCard title="Weekend vs Weekday">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink sm:h-10 sm:w-10">
                <CalendarIcon />
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-body-text">Weekdays (Mon - Fri)</p>
                <p className="text-[10px] text-muted">Average per day</p>
              </div>
              <span className="text-base font-extrabold text-ink sm:text-lg">3.2h</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink sm:h-10 sm:w-10">
                <HomeIcon />
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-body-text">Weekends (Sat - Sun)</p>
                <p className="text-[10px] text-muted">Average per day</p>
              </div>
              <span className="text-base font-extrabold text-ink sm:text-lg">5.8h</span>
            </div>
          </div>
        </StatCard>

        <StatCard>
          <div className="flex items-center gap-2">
            <span className="text-cta">
              <SparkleIcon />
            </span>
            <p className="text-sm font-bold text-ink">Insights</p>
          </div>
          <ul className="mt-3 flex flex-col gap-2.5">
            {INSIGHTS.map((insight) => (
              <li key={insight} className="flex items-start gap-2 text-xs text-body-text">
                <span className="mt-0.5 shrink-0 text-success">
                  <CheckIcon />
                </span>
                {insight}
              </li>
            ))}
          </ul>
        </StatCard>
      </div>
    </div>
  );
}
