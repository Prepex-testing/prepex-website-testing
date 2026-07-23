"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  ArrowLeftIcon,
  BellIcon,
  // StarIcon,
  // FlameIcon,
  // ShieldIcon,
  // BoltIcon,
  ChevronDownIcon,
  CheckIcon,
  XIcon,
  // ClockIcon,
  // TargetIcon,
  CheckCircleIcon,
  RefreshIcon,
} from "@/components/ui/icons";
import { FlameIcon,ClockIcon,StarIcon,ShieldIcon,BoltIcon,QuickIcon} from "@/assets/icons";
/**
 * Sizing / spacing / typography below is mapped 1:1 to the provided Figma spec.
 * Colors intentionally stay on the existing semantic design tokens
 * (text-ink, text-muted, bg-surface, border-brand/10, bg-tint-strong, etc.)
 * instead of hardcoded hex values, so light/dark mode continues to work.
 * Where Figma gave a literal hex that has no token yet (e.g. the flame
 * gradient), it's applied directly since it's a fixed accent, not a
 * surface/text color that needs to invert.
 */

const STAT_CARDS = [
  {
    icon: <FlameIcon />,
    iconClass: "bg-cta/10 text-cta",
    label: "Current Streak",
    value: "27",
    unit: "days in a row",
    unitVariant: "caption" as const, // uppercase caption style, no separate caption line
    pb: "pb-[50px]",
  },
  {
    icon: <StarIcon />,
    iconClass: "bg-tint text-ink",
    label: "Longest Streak",
    value: "32",
    unit: "days",
    unitVariant: "inline" as const, // unit sits inline next to the number
    caption: "Achieved on 5 Apr 2024",
    pb: "pb-[53px]",
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
    pb: "pb-[50px]",
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
    pb: "pb-[50px]",
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
  { icon: <BoltIcon />, label: "Practice", value: 25, total: 30 },
  { icon: <CheckCircleIcon />, label: "Accuracy", value: 8, total: 10 },
  { icon: <QuickIcon />, label: "Revision", value: 5, total: 10 },
];

export default function StreakPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Top bar */}
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

      {/* Tagline: 380x40, gap-8, 40x40 gradient icon + 332x35 heading */}
      <div className="flex w-full items-center gap-2">
        <span
          className="shrink-0 text-[28px] leading-none"
          aria-hidden="true"
        >
          ⭐
        </span>

        <p className="whitespace-nowrap text-[28px] font-bold leading-none text-ink">
          7 days. Real consistency
        </p>
      </div>

      {/* Stat cards: fills full width, ratios/padding from Figma preserved */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 w-full lg:gap-[24px]">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className={`flex w-full flex-col gap-4 rounded-2xl border border-brand/10 bg-surface pt-[24px] pr-[24px] pl-[24px] ${card.pb} shadow-[0px_1px_2px_0px_#0000000D]`}
          >
            <div className="flex items-center gap-4">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${card.iconClass} [&>svg]:h-6 [&>svg]:w-6`}
              >
                {card.icon}
              </span>
              <div className="flex flex-col justify-between">
                <p className="text-[12px] font-bold leading-[16px] text-ink">
                  {card.label}
                </p>
                {card.unitVariant === "inline" ? (
                  <p className="flex items-baseline gap-1">
                    <span className="text-[30px] font-extrabold leading-[36px] text-ink">
                      {card.value}
                    </span>
                    <span className="text-sm font-semibold text-muted">
                      {card.unit}
                    </span>
                  </p>
                ) : (
                  <span className="text-[36px] font-extrabold leading-[40px] text-ink">
                    {card.value}
                  </span>
                )}
              </div>
              {card.chevron && (
                <ChevronDownIcon className="ml-auto h-4 w-4 -rotate-90 text-muted self-start" />
              )}
            </div>

            {card.unitVariant === "caption" ? (
              <p className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-muted">
                {card.unit}
              </p>
            ) : (
              card.caption && (
                <p className="text-[12px] font-normal leading-[16px] text-muted">
                  {card.caption}
                </p>
              )
            )}
          </div>
        ))}
      </div>

      {/* Calendar + Effort score row: fills full width, 7/5 column ratio from Figma preserved */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 w-full">
        {/* Streak Calendar: col-span-7, rounded-24, padding 32/32/73/32 */}
        <div className="lg:col-span-7 flex flex-col gap-8 rounded-[24px] border border-brand/10 bg-surface pt-[32px] pr-[32px] pb-[73px] pl-[32px] shadow-[0px_1px_2px_0px_#0000000D]">
          <div className="flex flex-wrap items-center justify-between gap-3 h-[36px]">
            <p className="text-[18px] font-extrabold leading-[28px] text-ink">
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
              <span className="text-[14px] font-bold leading-[20px] text-ink">
                May 2024
              </span>
              <button
                type="button"
                aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-lg p-2 text-muted hover:bg-tint-strong"
              >
                <ChevronDownIcon className="h-4 w-4 -rotate-90" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-8 sm:flex-row">
            <div className="flex-1">
              <div className="grid grid-cols-7 gap-2 text-center">
                {WEEKDAYS.map((day) => (
                  <span
                    key={day}
                    className="text-[12px] font-semibold leading-[16px] text-muted"
                  >
                    {day}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex flex-col gap-1 overflow-x-auto pb-2 sm:overflow-visible">
                {CALENDAR_ROWS.map((row, rowIndex) => (
                  <div key={rowIndex} className="grid min-w-[380px] w-full grid-cols-7 gap-2">
                    {row.map((cell, cellIndex) => (
                      <div
                        key={cellIndex}
                        className="flex h-[48px] flex-col items-center justify-center gap-0.5 rounded-lg py-1"
                      >
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[14px] font-bold leading-[20px] text-center ${cell.isToday
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
                        {cell.status === "freeze" && (
                          <ShieldIcon />
                        )}
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

            {/* Legend panel: 192x227, rounded-16, padding-20, gap-20 */}
            <div className="flex w-full flex-col gap-[20px] rounded-[16px] border border-brand/10 bg-tint-strong p-[20px] sm:w-[192px]">
              {CALENDAR_LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-[12px]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand/10 bg-surface text-ink [&>svg]:h-3.5 [&>svg]:w-3.5">
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

        {/* Effort Score: col-span-5, rounded-24, padding-32, gap-32 */}
        <div className="lg:col-span-5 flex flex-col gap-8 rounded-[24px] border border-brand/10 bg-surface p-[32px] shadow-[0px_1px_2px_0px_#0000000D]">
          <div className="h-[28px]">
            <p className="text-[18px] font-extrabold leading-[28px] text-ink">
              Effort Score{" "}
              <span className="text-[14px] font-semibold leading-[100%] text-muted">
                (Today)
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-[24px] pb-[8px] sm:flex-row sm:h-[188px] sm:gap-[48px]">
            <div className="flex min-w-[58px] flex-col items-center justify-center gap-1 text-center">
              <span className="text-[36px] font-extrabold leading-[40px] text-ink">
                78
              </span>
              <span className="text-[10px] font-semibold text-muted px-1">
                Good Effort
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-4">
              {EFFORT_METRICS.map((metric) => (
                <div key={metric.label} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-semibold text-ink">
                      {metric.icon}
                      {metric.label}
                    </span>
                    <span className="text-muted">
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

          <div className="rounded-xl bg-tint-strong p-3 text-xs text-muted">
            Keep a balanced effort every day to maximize your score
          </div>
        </div>
      </div>
    </div>
  );
}