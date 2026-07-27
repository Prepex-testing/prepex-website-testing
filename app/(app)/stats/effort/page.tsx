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
import { ClockIcon,FlameIcon,Check,CalendarIcon,Chart} from "@/assets/icons";
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
  { label: "15 – 25 min", count: 4, percent: 14, barClassName: "bg-white/40" },
  { label: "25 – 45 min", count: 8, percent: 29, barClassName: "bg-[#6D28D9]" },
  { label: "45 – 90 min", count: 6, percent: 43, barClassName: "bg-[#FAF7F2]" },
  { label: "90+ min", count: 2, percent: 14, barClassName: "bg-white/25" },
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
      { label: "6-8 AM", percent: 5, colorClassName: "bg-[#FAF7F2]" },
      { label: "8-10 AM", percent: 10, colorClassName: "bg-[#FAF7F2]" },
    ],
  },
  {
    category: "Afternoon",
    slots: [
      { label: "10-12 PM", percent: 32, colorClassName: "bg-[#FAF7F2]" },
      { label: "12-2 PM", percent: 65, colorClassName: "bg-[#FAF7F2]" },
      { label: "2-4 PM", percent: 20, colorClassName: "bg-[#FF9E43]" },
    ],
  },
  {
    category: "Evening",
    slots: [
      { label: "4-6 PM", percent: 60, colorClassName: "bg-[#FAF7F2]" },
      { label: "6-8 PM", percent: 95, colorClassName: "bg-[#FF7A59]" },
    ],
  },
  {
    category: "Night",
    slots: [
      { label: "8-10 PM", percent: 68, colorClassName: "bg-[#9CA3AF]" },
      { label: "10-12 AM", percent: 40, colorClassName: "bg-[#FAF7F2]" },
      { label: "12-2 AM", percent: 25, colorClassName: "bg-[#FAF7F2]" },
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
  0: "bg-white",
  1: "bg-[#C7D2FE]",
  2: "bg-[#818CF8]",
  3: "bg-[#FAF7F2]",
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
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Card 1 */}
        <StatCard className="min-h-[126px]">
          <div className="flex items-center gap-5">

            <div className="flex h-16 w-[60px] shrink-0 items-center justify-center rounded-[14px] bg-[#E1DFFF66] dark:bg-tint">
              <ClockIcon />
            </div>

            <div>
              <h3 className="text-[28px] font-bold leading-none text-ink">
                19.5
              </h3>

              <p className="mt-2 text-sm font-semibold text-muted">
                Focus hours this week
              </p>
            </div>

          </div>
        </StatCard>

        {/* Card 2 */}
        <StatCard className="min-h-[126px]">
          <div className="flex items-center gap-5">

            <div className="flex h-16 w-[60px] shrink-0 items-center justify-center rounded-[14px] bg-[#FFF3F0] dark:bg-tint">
              <FlameIcon />
            </div>

            <div>
              <h3 className="text-[28px] font-bold leading-none text-ink">
                14 Day Streak
              </h3>

              <p className="mt-2 text-sm font-semibold text-muted">
                Keep going
              </p>
            </div>

          </div>
        </StatCard>

        {/* Card 3 */}
        <StatCard className="min-h-[126px]">
          <div className="flex items-center gap-5">

            <div className="flex h-16 w-[60px] shrink-0 items-center justify-center rounded-[14px] bg-[#E1DFFF66] dark:bg-tint">
              <Check />
            </div>

            <div>
              <h3 className="text-[28px] font-bold leading-none text-ink">
                6/7
              </h3>

              <p className="mt-2 text-sm font-semibold text-muted">
                Days active this week
              </p>
            </div>

          </div>
        </StatCard>

      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* LEFT CARD */}
        <StatCard
          className="
      h-[291px]
      rounded-2xl
      border border-white/10
      bg-[#111145]
      shadow-[0_1px_3px_rgba(0,0,0,0.13),0_1px_2px_rgba(0,0,0,0.05)]
    "
          padding="pt-3 pb-3 px-6"
        >
          {/* Header */}
          <div className="flex h-[26px] items-center justify-between">
            <div className="flex items-center gap-6">
              <h2 className="text-[16px] font-bold leading-6 text-[#FAF7F2]">
                This Week
              </h2>

              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.5px] text-[#FAF7F2]">
                  <span className="h-[10px] w-[10px] rounded-full bg-[#FAF7F2]" />
                  Focus Time
                </span>

                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.5px] text-[#FAF7F2]">
                  <span className="h-[10px] w-[10px] rounded-full bg-[#FF7A59]" />
                  Today
                </span>

                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.5px] text-[#FAF7F2]">
                  <span className="h-[10px] w-[10px] rounded-full bg-[#FB923C]" />
                  Recovery
                </span>
              </div>
            </div>

            <button className="flex h-[26px] w-[117px] items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2 text-[12px] font-bold text-[#1E293B]">
              <span>Weekly View</span>
              <ChevronDownIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Chart */}
          <div className="mt-6 flex h-[205px]">
            <div className="mr-3 flex h-[160px] flex-col justify-between text-[10px] text-[#A0A0B0]">
              <span>6h</span>
              <span>4h</span>
              <span>2h</span>
              <span>0h</span>
            </div>

            <div className="flex flex-1 items-end justify-between">
              {WEEK_BARS.map((bar) => (
                <div
                  key={bar.day}
                  className="flex w-[48px] flex-col items-center"
                >
                  <span
                    className={`mb-2 text-[10px] font-bold ${bar.state === "today"
                      ? "text-[#FF7A59]"
                      : bar.state === "recovery"
                        ? "text-[#FB923C]"
                        : "text-transparent"
                      }`}
                  >
                    {bar.state === "today"
                      ? "Today"
                      : bar.state === "recovery"
                        ? "Recovery"
                        : "."}
                  </span>

                  <div className="flex h-[110px] items-end">
                    <div
                      className={`w-10 rounded-t-lg ${BAR_COLORS[bar.state]}`}
                      style={{
                        height: `${(bar.hours / MAX_HOURS) * 100}%`,
                      }}
                    />
                  </div>

                  <span className="mt-2 text-[10px] font-bold text-[#FAF7F2]">
                    {bar.day}
                  </span>

                  <span className="text-[10px] text-[#A0A0B0]">
                    {bar.hours}h
                  </span>
                </div>
              ))}
            </div>
          </div>
        </StatCard>

        {/* RIGHT CARD */}
        <StatCard
          className="flex h-[291px] w-full flex-col rounded-2xl border border-[#FAF7F214] bg-[#111145] p-6"
        >
          <div className="flex h-12 items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[#FAF7F2]">
                <Chart />
              </span>

              <div className="min-w-0">
                <p className="truncate text-[16px] font-bold leading-[24px] text-[#FAF7F2]">
                  Weekly Performance
                </p>
                <p className="text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-[#8B8998]">
                  Summary Statistics
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-[3.5px] text-right">
              <p className="text-[16px] font-extrabold leading-[16px] text-[#FAF7F2]">
                84%
              </p>
              <p className="text-[11px] font-bold uppercase leading-[16.5px] text-[#8B8998]">
                Completion Rate
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-1 flex-col justify-between gap-6 pb-3">
            <MeterRow
              label="Tasks Done"
              value="27/32"
              percent={84}
              barClassName="bg-white/70"
              trackClassName="bg-[#FAF7F240]"
            />

            <MeterRow
              label="Plans Honored"
              value="6/7"
              percent={86}
              caption="DAYS"
              barClassName="bg-[#4C1D95]"
              trackClassName="bg-[#FAF7F240]"
            />

            <MeterRow
              label="Recovery Days"
              value="1/1"
              percent={100}
              barClassName="bg-[#FAF7F2]"
              trackClassName="bg-[#FAF7F240]"
            />
          </div>
        </StatCard>
      </div>

      <StatCard className="w-full rounded-2xl border border-[#FAF7F214] bg-[#111145] p-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <p className="text-[16px] font-bold leading-[24px] text-[#FAF7F2]">
            12 Week Study Consistency
          </p>
          <span className="text-[#8B8998]">
            <InfoIcon />
          </span>
        </div>

        {/* Body: calendar + legend, side by side */}
        <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-[79px]">
          {/* Calendar grid */}
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="grid min-w-[560px] grid-cols-[minmax(90px,120px)_repeat(7,1fr)] items-center gap-y-4">
              <span />
              {DAY_LABELS.map((label) => (
                <span
                  key={label}
                  className="text-center text-[12.38px] font-bold leading-[18.57px] text-[#8B8998]"
                >
                  {label}
                </span>
              ))}

              {CONSISTENCY_WEEKS.map((week) => (
                <Fragment key={week.range}>
                  <span className="truncate text-[12.38px] font-semibold leading-[18.57px] text-[#8B8998]">
                    {week.range}
                  </span>
                  {week.days.map((bucket, index) => (
                    <div
                      key={`${week.range}-${index}`}
                      className="mx-auto flex items-center justify-center gap-[7.43px]"
                    >
                      {Array.from({ length: 5 }).map((_, boxIndex) => (
                        <div
                          key={boxIndex}
                          className={`h-[14.86px] w-[12.38px] rounded-[2.48px] ${BUCKET_COLORS[bucket]}`}
                        />
                      ))}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>

          {/* Legend sidebar */}
          <div className="flex shrink-0 flex-col gap-4 lg:w-[110px]">
            <p className="text-[12px] font-extrabold leading-[16px] text-[#FAF7F2]">
              Hours Studied
            </p>
            <div className="flex flex-col gap-2">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span
                    className={`h-4 w-4 rounded-[2px] border border-white/10 ${BUCKET_COLORS[item.bucket]}`}
                  />
                  <span className="text-[12px] font-semibold leading-[16px] text-[#8B8998]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </StatCard>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StatCard className="flex w-full flex-col rounded-2xl border border-[#FAF7F214] bg-[#111145] p-6 pb-[26px] shadow-[0px_1px_2px_0px_#00000005,0px_1px_3px_0px_#0000000D]">
          <div className="flex items-center gap-2">
            <p className="text-[16px] font-bold leading-[24px] text-[#FAF7F2]">
              Session Length Distribution
            </p>
            <span className="text-[#8B8998]">
              <InfoIcon />
            </span>
          </div>

          <div className="mt-8 flex flex-col gap-8">
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

        <StatCard className="w-full max-w-[533px] rounded-2xl border border-[#252554] bg-[#111145] p-[16.66px]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-[16px] font-bold leading-[24px] text-[#FAF7F2]">
              Time of Day Heatmap
            </p>
            <span className="text-[10px] font-extrabold uppercase leading-[15px] tracking-[1px] text-[#8B8998]">
              Efficiency Peaks
            </span>
          </div>

          {/* Body */}
          <div className="mt-4 flex gap-[8.33px]">
            {/* Y-axis */}
            <div className="flex h-[156.15px] flex-col justify-between pr-[8.33px]">
              {Y_AXIS_LABELS.map((value) => (
                <span
                  key={value}
                  className="text-right text-[7.29px] leading-[10.93px] text-[#8B8998]"
                >
                  {value}%
                </span>
              ))}
            </div>

            {/* Bars */}
            <div className="relative flex flex-1 items-end justify-between gap-4">
              {/* Gridlines */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                {Y_AXIS_LABELS.map((value) => (
                  <div key={value} className="h-px w-full bg-white/5" />
                ))}
              </div>

              {TIME_PERIODS.map((period) => (
                <div
                  key={period.category}
                  className="relative flex flex-1 flex-col items-center gap-2"
                >
                  <div className="flex h-[101.5px] w-full items-end justify-center gap-1.5">
                    {period.slots.map((slot) => (
                      <div
                        key={slot.label}
                        className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                      >
                        <div className="flex h-full w-full items-end justify-center">
                          <div
                            className={`w-full max-w-[24.98px] rounded-t-lg ${slot.colorClassName}`}
                            style={{ height: `${Math.min(100, Math.max(0, slot.percent))}%` }}
                          />
                        </div>
                        <span className="whitespace-nowrap text-[7px] font-medium text-[#8B8998]">
                          {slot.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="text-[9px] font-extrabold uppercase leading-[13.5px] tracking-wide text-[#D1D5DB]">
                    {period.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
                <CalendarIcon />
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-body-text">Weekdays (Mon - Fri)</p>
                <p className="text-[10px] text-muted">Average per day</p>
              </div>
              <span className="text-lg font-extrabold text-ink">3.2h</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint-strong text-ink">
                <HomeIcon />
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-body-text">Weekends (Sat - Sun)</p>
                <p className="text-[10px] text-muted">Average per day</p>
              </div>
              <span className="text-lg font-extrabold text-ink">5.8h</span>
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
