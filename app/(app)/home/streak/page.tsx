"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  ArrowLeftIcon,
  // BellIcon,
  ChevronDownIcon,
  CheckIcon,
  XIcon,
  CheckCircleIcon,
  RefreshIcon,
} from "@/components/ui/icons";
import { FlameIcon, ClockIcon, StarIcon, ShieldIcon, BoltIcon, QuickIcon ,BellIcon} from "@/assets/icons";
const STAT_CARDS = [
  {
    icon: <FlameIcon />,
    iconClass: "bg-cta/10 text-cta",
    label: "Current Streak",
    value: "27",
    unit: "days in a row",
    unitVariant: "caption" as const,
    pb: "pb-5 sm:pb-[50px]",
  },
  {
    icon: <StarIcon />,
    iconClass: "bg-tint text-ink",
    label: "Longest Streak",
    value: "32",
    unit: "days",
    unitVariant: "inline" as const, // unit sits inline next to the number
    caption: "Achieved on 5 Apr 2024",
    pb: "pb-5 sm:pb-[53px]",
  },
  {
    icon: <ShieldIcon />,
    iconClass: "bg-brand/10 text-ink",
    label: "Streak Freeze",
    value: "1",
    unit: "available",
    unitVariant: "inline" as const,
    caption: "Use a freeze to protect your streak if you miss a day",
    chevron: true,
    pb: "pb-5 sm:pb-[50px]",
  },
  {
    icon: <BoltIcon />,
    iconClass: "bg-info-bg text-info",
    label: "Next Milestone",
    value: "30",
    unit: "days",
    unitVariant: "inline" as const,
    caption: "3 more days to unlock a new milestone",
    chevron: true,
    pb: "pb-5 sm:pb-[50px]",
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
  {
    icon: <ClockIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />,
    label: "Study Time",
    value: 40,
    total: 60,
  },
  {
    icon: <BoltIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />,
    label: "Practice",
    value: 25,
    total: 30,
  },
  {
    icon: <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />,
    label: "Accuracy",
    value: 8,
    total: 10,
  },
  {
    icon: <QuickIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />,
    label: "Revision",
    value: 5,
    total: 10,
  },
];

export default function StreakPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col gap-5 p-4 sm:gap-6 sm:p-6 lg:p-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link href="/home" aria-label="Back to Home" className="shrink-0 text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="truncate text-[22px] font-extrabold leading-tight text-ink sm:text-h1 sm:leading-normal">
            Streak
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      {/* Tagline */}
      <div className="flex w-full items-center gap-2">
        <span className="shrink-0 text-[20px] leading-none sm:text-[24px] lg:text-[28px]" aria-hidden="true">
          ⭐
        </span>

        <p className="whitespace-normal break-words text-[20px] font-bold leading-tight text-ink sm:whitespace-nowrap sm:text-[24px] sm:leading-none lg:text-[28px]">
          7 days. Real consistency
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-[24px]">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className={`flex w-full flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-5 shadow-[0px_1px_2px_0px_#0000000D] sm:gap-4 sm:pl-[24px] sm:pr-[24px] sm:pt-[24px] ${card.pb}`}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${card.iconClass} [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6`}
              >
                {card.icon}
              </span>
              <div className="flex min-w-0 flex-col justify-between">
                <p className="text-[12px] font-bold leading-[16px] text-ink">{card.label}</p>
                {card.unitVariant === "inline" ? (
                  <p className="flex flex-wrap items-baseline gap-x-1">
                    <span className="text-[26px] font-extrabold leading-[32px] text-ink sm:text-[30px] sm:leading-[36px]">
                      {card.value}
                    </span>
                    <span className="text-[13px] font-semibold text-muted sm:text-sm">
                      {card.unit}
                    </span>
                  </p>
                ) : (
                  <span className="text-[30px] font-extrabold leading-[36px] text-ink sm:text-[36px] sm:leading-[40px]">
                    {card.value}
                  </span>
                )}
              </div>
              {card.chevron && (
                <ChevronDownIcon className="ml-auto h-4 w-4 shrink-0 -rotate-90 self-start text-muted" />
              )}
            </div>

            {card.unitVariant === "caption" ? (
              <p className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-muted">
                {card.unit}
              </p>
            ) : (
              card.caption && (
                <p className="text-[12px] font-normal leading-[16px] text-muted">{card.caption}</p>
              )
            )}
          </div>
        ))}
      </div>

      {/* Calendar + Effort score row */}
      <div className="grid w-full grid-cols-1 gap-5 sm:gap-8 lg:grid-cols-12">
        {/* Streak Calendar */}
        <div className="flex flex-col gap-5 rounded-[20px] border border-brand/10 bg-surface p-5 shadow-[0px_1px_2px_0px_#0000000D] sm:gap-8 sm:rounded-[24px] sm:pb-[73px] sm:pl-[32px] sm:pr-[32px] sm:pt-[32px] lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:h-[36px]">
            <p className="text-[16px] font-extrabold leading-[24px] text-ink sm:text-[18px] sm:leading-[28px]">
              Streak Calendar
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous month"
                className="flex h-9 w-9 items-center justify-center rounded-lg p-2 text-muted hover:bg-tint-strong"
              >
                <ChevronDownIcon className="h-4 w-4 rotate-90" />
              </button>
              <span className="text-[14px] font-bold leading-[20px] text-ink">May 2024</span>
              <button
                type="button"
                aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-lg p-2 text-muted hover:bg-tint-strong"
              >
                <ChevronDownIcon className="h-4 w-4 -rotate-90" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-5 sm:flex-row sm:gap-8">
            <div className="min-w-0 flex-1">
              <div className="overflow-x-auto pb-2 sm:overflow-visible sm:pb-0">
                <div className="min-w-[320px] sm:min-w-0">
                  <div className="grid grid-cols-7 gap-1 text-center sm:gap-2">
                    {WEEKDAYS.map((day) => (
                      <span
                        key={day}
                        className="text-[11px] font-semibold leading-[16px] text-muted sm:text-[12px]"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                    {CALENDAR_ROWS.map((row, rowIndex) => (
                      <div key={rowIndex} className="grid w-full grid-cols-7 gap-1 sm:gap-2">
                        {row.map((cell, cellIndex) => (
                          <div
                            key={cellIndex}
                            className="flex h-[42px] flex-col items-center justify-center gap-0.5 rounded-lg py-1 sm:h-[48px]"
                          >
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-center text-[13px] font-bold leading-[20px] sm:text-[14px] ${cell.isToday
                                  ? "bg-brand text-white"
                                  : cell.status === "outside" || cell.status === "upcoming"
                                    ? "text-muted/50"
                                    : "text-ink"
                                }`}
                            >
                              {cell.date}
                            </span>
                            {cell.status === "completed" && !cell.isToday && <CheckIcon />}
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
              </div>
            </div>

            {/* Legend panel */}
            <div className="grid w-full grid-cols-2 gap-4 rounded-[16px] border border-brand/10 bg-card-soft-bg p-4 sm:flex sm:w-[192px] sm:shrink-0 sm:flex-col sm:gap-[20px] sm:p-[20px]">
              {CALENDAR_LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-2 sm:gap-[12px]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand/10 bg-surface text-ink [&>svg]:h-3.5 [&>svg]:w-3.5">
                    {item.icon ?? <span className="h-2 w-2 rounded-full bg-brand" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink">{item.label}</p>
                    <p className="truncate text-[10px] text-muted">{item.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Effort Score */}
        <div className="flex flex-col gap-5 rounded-[20px] border border-brand/10 bg-surface p-5 shadow-[0px_1px_2px_0px_#0000000D] sm:gap-8 sm:rounded-[24px] sm:p-[32px] lg:col-span-5">
          <div className="sm:h-[28px]">
            <p className="text-[16px] font-extrabold leading-[24px] text-ink sm:text-[18px] sm:leading-[28px]">
              Effort Score{" "}
              <span className="text-[13px] font-semibold leading-[100%] text-muted sm:text-[14px]">
                (Today)
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-5 pb-[8px] sm:h-[188px] sm:flex-row sm:gap-[48px]">
            <div className="flex min-w-[58px] flex-row items-center justify-start gap-2 text-center sm:flex-col sm:justify-center sm:gap-1">
              <span className="text-[30px] font-extrabold leading-[36px] text-ink sm:text-[36px] sm:leading-[40px]">
                78
              </span>
              <span className="px-1 text-[11px] font-semibold text-muted sm:text-[10px]">
                Good Effort
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-3 sm:gap-4">
              {EFFORT_METRICS.map((metric) => (
                <div key={metric.label} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1 font-semibold text-ink">
                      {metric.icon}
                      <span className="truncate">{metric.label}</span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-muted">
                      {metric.value} / {metric.total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-tint-strong">
                    <div
                      className={`h-1.5 rounded-full ${isDark ? "bg-white" : "bg-brand"}`}
                      style={{ width: `${(metric.value / metric.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-tint-strong p-3 text-xs leading-5 text-muted">
            Keep a balanced effort every day to maximize your score
          </div>
        </div>
      </div>
    </div>
  );
}