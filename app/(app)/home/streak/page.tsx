import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import {
  ArrowLeftIcon,
  BellIcon,
  StarIcon,
  FlameIcon,
  ShieldIcon,
  BoltIcon,
  ChevronDownIcon,
  CheckIcon,
  XIcon,
  ClockIcon,
  TargetIcon,
  CheckCircleIcon,
  RefreshIcon,
} from "@/components/ui/icons";

const STAT_CARDS = [
  {
    icon: <FlameIcon />,
    iconClass: "bg-cta/10 text-cta",
    label: "Current Streak",
    value: "27",
    unit: "days in a row",
  },
  {
    icon: <StarIcon />,
    iconClass: "bg-tint text-ink",
    label: "Longest Streak",
    value: "32",
    unit: "days",
    caption: "Achieved on 5 Apr 2024",
  },
  {
    icon: <ShieldIcon />,
    iconClass: "bg-brand/10 text-ink",
    label: "Streak Freeze",
    value: "1",
    unit: "available",
    caption: "Use a freeze to protect your streak if you miss a day",
    chevron: true,
  },
  {
    icon: <BoltIcon />,
    iconClass: "bg-info-bg text-info",
    label: "Next Milestone",
    value: "30",
    unit: "days",
    caption: "3 more days to unlock a new milestone",
    chevron: true,
  },
];

type DayStatus = "completed" | "freeze" | "missed" | "upcoming" | "outside";

type CalendarCell = { date: number; status: DayStatus; isToday: boolean };

function buildMayCalendar(): CalendarCell[][] {
  const daysInMonth = 31;
  const firstWeekdayOffset = 2; // May 1, 2024 is a Wednesday (Mon=0 ... Sun=6)
  const daysInPrevMonth = 30; // April

  const cells: CalendarCell[] = [];

  for (let i = firstWeekdayOffset - 1; i >= 0; i--) {
    cells.push({ date: daysInPrevMonth - i, status: "outside", isToday: false });
  }

  for (let date = 1; date <= daysInMonth; date++) {
    let status: DayStatus;
    if (date === 1) status = "missed";
    else if (date === 22) status = "freeze";
    else if (date <= 28) status = "completed";
    else status = "upcoming";
    cells.push({ date, status, isToday: date === 28 });
  }

  let nextMonthDate = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: nextMonthDate, status: "outside", isToday: false });
    nextMonthDate++;
  }

  const rows: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

const CALENDAR_ROWS = buildMayCalendar();
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CALENDAR_LEGEND = [
  { icon: <CheckIcon />, label: "Completed", caption: "Goal achieved" },
  { icon: <ShieldIcon />, label: "Freeze Used", caption: "Streak saved" },
  { icon: <XIcon />, label: "Missed", caption: "No activity" },
  { icon: null, label: "Today", caption: "Current day" },
];

const EFFORT_METRICS = [
  { icon: <ClockIcon />, label: "Study Time", value: 40, total: 60 },
  { icon: <TargetIcon />, label: "Practice", value: 25, total: 30 },
  { icon: <CheckCircleIcon />, label: "Accuracy", value: 8, total: 10 },
  { icon: <RefreshIcon />, label: "Revision", value: 5, total: 10 },
];

export default function StreakPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Back to Home" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Streak</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <p className="flex items-center gap-2 text-base font-bold text-ink">
        <StarIcon />
        7 days. Real consistency
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div key={card.label} className="rounded-2xl border border-brand/10 bg-surface p-4">
            <div className="flex items-start justify-between">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${card.iconClass}`}
              >
                {card.icon}
              </span>
              {card.chevron && (
                <ChevronDownIcon className="h-4 w-4 -rotate-90 text-muted" />
              )}
            </div>
            <p className="mt-2 text-xs text-muted">{card.label}</p>
            <p className="text-xl font-extrabold text-ink">
              {card.value} <span className="text-sm font-semibold text-muted">{card.unit}</span>
            </p>
            {card.caption && <p className="mt-1 text-[11px] text-muted">{card.caption}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-ink">Streak Calendar</p>
            <div className="flex items-center gap-2 text-xs text-muted">
              <button type="button" aria-label="Previous month">
                <ChevronDownIcon className="h-4 w-4 rotate-90" />
              </button>
              <span className="font-semibold text-ink">May 2024</span>
              <button type="button" aria-label="Next month">
                <ChevronDownIcon className="h-4 w-4 -rotate-90" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
            <div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS.map((day) => (
                  <span key={day} className="text-[10px] font-semibold text-muted">
                    {day}
                  </span>
                ))}
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {CALENDAR_ROWS.map((row, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-7 gap-1">
                    {row.map((cell, cellIndex) => (
                      <div
                        key={cellIndex}
                        className="flex flex-col items-center justify-center gap-0.5 rounded-lg py-1"
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                            cell.isToday
                              ? "bg-brand text-white"
                              : cell.status === "outside" || cell.status === "upcoming"
                                ? "text-muted/50"
                                : "text-ink"
                          }`}
                        >
                          {cell.date}
                        </span>
                        {cell.status === "completed" && !cell.isToday && (
                          <CheckIcon />
                        )}
                        {cell.status === "freeze" && <ShieldIcon />}
                        {cell.status === "missed" && (
                          <span className="text-muted/60">
                            <XIcon />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl bg-tint-strong p-3">
              {CALENDAR_LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
                    {item.icon ?? <span className="h-2 w-2 rounded-full bg-brand" />}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-ink">{item.label}</p>
                    <p className="text-[10px] text-muted">{item.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-sm font-bold text-ink">
            Effort Score <span className="font-normal text-muted">(Today)</span>
          </p>
          <p className="mt-1 text-3xl font-extrabold text-ink">78</p>
          <p className="text-xs text-muted">Good Effort</p>

          <div className="mt-4 flex flex-col gap-3">
            {EFFORT_METRICS.map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 font-semibold text-ink">
                    {metric.icon}
                    {metric.label}
                  </span>
                  <span className="text-muted">
                    {metric.value} / {metric.total}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-tint-strong">
                  <div
                    className="h-1.5 rounded-full bg-brand"
                    style={{ width: `${(metric.value / metric.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-tint-strong p-3 text-xs text-muted">
            Keep a balanced effort every day to maximize your score
          </div>
        </div>
      </div>
    </div>
  );
}
