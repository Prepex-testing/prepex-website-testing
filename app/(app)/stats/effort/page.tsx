import { Fragment } from "react";
import {
  ClockIcon,
  FlameIcon,
  CalendarIcon,
  ChartBarIcon,
  HomeIcon,
  SparkleIcon,
  CheckIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import { StatCard } from "@/components/stats/StatCard";
import { MeterRow } from "@/components/stats/MeterRow";
import { SubjectDonut } from "@/components/stats/SubjectDonut";

type BarState = "past" | "today" | "recovery" | "future";

const BAR_COLORS: Record<BarState, string> = {
  past: "bg-brand",
  today: "bg-cta",
  recovery: "bg-chart-recovery",
  future: "bg-brand/15",
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

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Bucket = 0 | 1 | 2 | 3 | "today";

const BUCKET_COLORS: Record<Bucket, string> = {
  0: "bg-brand/10",
  1: "bg-brand/30",
  2: "bg-brand/60",
  3: "bg-brand",
  today: "bg-cta",
};

const CONSISTENCY_WEEKS: { range: string; days: Bucket[] }[] = [
  { range: "May 19 - May 25", days: [2, 1, 3, 3, "today", 1, 2] },
  { range: "May 12 - May 18", days: [1, 3, 3, 3, 1, 2, 1] },
  { range: "May 05 - May 11", days: [2, 2, 1, 2, 2, 1, 0] },
];

const SESSION_LENGTHS = [
  { label: "15 - 25 min", count: 6, percent: 20 },
  { label: "25 - 45 min", count: 8, percent: 27 },
  { label: "45 - 90 min", count: 12, percent: 40 },
  { label: "90+ min", count: 4, percent: 13 },
];

const TIME_OF_DAY = [
  { label: "Morning", hours: 3.2, peak: false },
  { label: "Afternoon", hours: 4.5, peak: false },
  { label: "Evening", hours: 6.1, peak: true },
  { label: "Night", hours: 1.8, peak: false },
];

const SUBJECT_SPLIT = [
  { label: "Physics", value: 38, color: "var(--chart-1)" },
  { label: "Chemistry", value: 28, color: "var(--chart-2)" },
  { label: "Maths", value: 34, color: "var(--chart-3)" },
];

const INSIGHTS = [
  "You're 3h ahead of your weekly target. Great job!",
  "Longest focus block was 95 minutes on Thursday.",
  "You skipped 1 planned session on Tuesday morning.",
  "You studied consistently 6 of the last 7 days.",
  "Recovery day on Tuesday helped improve your weekend performance.",
];

export default function EffortStatsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Card 1 */}
        <StatCard className="min-h-[126px]">
          <div className="flex items-center gap-5">

            <div className="flex h-16 w-[60px] shrink-0 items-center justify-center rounded-[14px] bg-[#E1DFFF66] dark:bg-tint">
              <ClockIcon  />
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
              <CalendarIcon />
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard className="sm:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ink">This Week</p>
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-brand" /> Focus Time
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-cta" /> Today
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-chart-recovery" /> Recovery
                </span>
              </div>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full border border-brand/10 px-3 py-1.5 text-xs font-semibold text-ink"
            >
              Weekly View
              <ChevronDownIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5 flex items-stretch gap-3 pl-8">
            <div className="flex h-36 flex-col justify-between text-[10px] text-muted">
              <span>6h</span>
              <span>4h</span>
              <span>2h</span>
              <span>0h</span>
            </div>
            <div className="flex flex-1 items-end justify-between gap-3">
              {WEEK_BARS.map((bar) => (
                <div key={bar.day} className="flex flex-1 flex-col items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold ${bar.state === "today"
                        ? "text-cta"
                        : bar.state === "recovery"
                          ? "text-chart-recovery"
                          : "text-transparent"
                      }`}
                  >
                    {bar.state === "today" ? "Today" : bar.state === "recovery" ? "Recovery" : "-"}
                  </span>
                  <div className="flex h-36 w-full items-end justify-center">
                    <div
                      className={`w-6 rounded-t-md ${BAR_COLORS[bar.state]}`}
                      style={{ height: `${(bar.hours / MAX_HOURS) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-ink">{bar.day}</span>
                  <span className="text-[10px] text-muted">{bar.hours}h</span>
                </div>
              ))}
            </div>
          </div>
        </StatCard>

        <StatCard>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-tint-strong text-ink">
                <ChartBarIcon />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Weekly Performance</p>
                <p className="text-[10px] uppercase tracking-wide text-muted">
                  Summary Statistics
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-base font-extrabold text-ink">84%</p>
              <p className="text-[9px] uppercase tracking-wide text-muted">
                Completion Rate
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <MeterRow label="Tasks Done" value="27/32" percent={84} />
            <MeterRow label="Plans Honored" value="6/7" percent={86} />
            <MeterRow label="Recovery Days" value="1/1" percent={100} />
          </div>
        </StatCard>
      </div>

      <StatCard>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-ink">12 Week Study Consistency</p>
          <span className="text-muted">
            <ChevronDownIcon className="h-3.5 w-3.5 rotate-[315deg]" />
          </span>
        </div>

        <div className="mt-4 grid grid-cols-[60px_repeat(7,1fr)] items-center gap-y-3 sm:grid-cols-[110px_repeat(7,1fr)]">
          <span />
          {DAY_LABELS.map((label) => (
            <span
              key={label}
              className="text-center text-[10px] font-semibold text-muted"
            >
              {label}
            </span>
          ))}

          {CONSISTENCY_WEEKS.map((week) => (
            <Fragment key={week.range}>
              <span className="truncate text-[10px] text-muted">{week.range}</span>
              {week.days.map((bucket, index) => (
                <div
                  key={`${week.range}-${index}`}
                  className="mx-auto flex h-6 w-6 items-center justify-center"
                >
                  <div className={`h-5 w-5 rounded ${BUCKET_COLORS[bucket]}`} />
                </div>
              ))}
            </Fragment>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 text-[10px] text-muted">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-brand/10" /> 0h
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-brand/30" /> &lt;2h
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-brand/60" /> 2-4h
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-brand" /> 4h+
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-cta" /> Today
          </span>
        </div>
      </StatCard>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <StatCard title="Session Length Distribution">
          <div className="flex flex-col gap-4">
            {SESSION_LENGTHS.map((row) => (
              <MeterRow
                key={row.label}
                label={row.label}
                value={`${row.count} (${row.percent}%)`}
                percent={row.percent}
              />
            ))}
          </div>
        </StatCard>

        <StatCard
          title="Time of Day Heatmap"
          right={
            <span className="rounded-full bg-tint-strong px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-ink">
              Efficiency Peaks
            </span>
          }
        >
          <div className="flex h-36 items-end justify-between gap-4">
            {TIME_OF_DAY.map((slot) => (
              <div key={slot.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-28 w-full items-end justify-center">
                  <div
                    className={`w-8 rounded-t-md ${slot.peak ? "bg-cta" : "bg-brand"}`}
                    style={{ height: `${(slot.hours / 6.5) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-ink">{slot.label}</span>
              </div>
            ))}
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
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta">
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
