"use client";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { useTheme } from "@/components/theme/ThemeProvider";
import { FlameIcon } from "@/assets/icons";
import {
  BellIcon,
  // FlameIcon,
  CheckCircleIcon,
  StarIcon,
  ChevronDownIcon,
  CheckIcon,
  RefreshIcon,
  BookIcon,
  MinusIcon,
  ClockIcon,
  CompleteIcon,
  MockIcon,
  RecoveryIcon,
  JournalIcon,
  NoStudyIcon,
  CheckInIcon,
  ChartBarIcon,
  ArrowLeftIcon,
} from "@/components/ui/icons";

const FILTERS = [
  {
    label: "Complete",
    icon: <CompleteIcon className="w-4 h-4 md:w-[18px] md:h-[18px] text-success" />,
  },
  {
    label: "Mock",
    icon: (
      <StarIcon
        className="w-4 h-4 text-[#4C1D95] dark:text-white md:w-[12px] md:h-[12px] lg:w-5 lg:h-5"
      />
    ),
  },
  {
    label: "Recovery",
    icon: <RecoveryIcon />,
  },
  {
    label: "Journal",
    icon: <JournalIcon />,
  },
  {
    label: "No Study",
    icon: <NoStudyIcon />,
  },
];

type DayType = "complete" | "mock" | "recovery" | "journal" | "no-study" | "analysis";

const DAY_TYPE_ICON: Record<DayType, ReactNode> = {
  complete: <CompleteIcon className="w-4 h-4 md:w-[18px] md:h-[18px] text-success" />,
  mock: <StarIcon className="w-4 h-4 md:w-[12px] md:h-[12px] lg:w-5 lg:h-5" />,
  recovery: <RefreshIcon />,
  journal: <JournalIcon />,
  "no-study": <MinusIcon />,
  analysis: <ChartBarIcon />,
};

const DAY_TYPE_STYLES: Record<DayType, { bg: string; text: string; icon: string }> = {
  complete: { bg: "bg-success/10", text: "text-ink", icon: "text-success" },
  mock: { bg: "bg-brand/10", text: "text-ink", icon: "text-brand" },
  recovery: { bg: "bg-surface", text: "text-ink", icon: "text-brand" },
  journal: { bg: "bg-surface", text: "text-ink", icon: "text-brand" },
  "no-study": { bg: "bg-surface", text: "text-muted", icon: "text-cta" },
  analysis: { bg: "bg-surface", text: "text-ink", icon: "text-brand" },
};

const DAY_TYPE_PATTERN: (DayType | null)[] = [
  "complete",
  "complete",
  "mock",
  "complete",
  "recovery",
  null,
  "journal",
];

// Marks scored on mock-test days — keyed by date-of-month.
const MOCK_MARKS: Record<number, number> = {
  2: 182,
  9: 195,
  16: 168,
  23: 201,
  30: 175,
};

// Dates that get a one-off "Mock Analysis" review day instead of the weekly pattern.
const ANALYSIS_DATES = new Set([25]);

function dayTypeForDate(date: number): DayType | null {
  return DAY_TYPE_PATTERN[date % DAY_TYPE_PATTERN.length];
}

type CalendarCell = { date: number; inMonth: boolean; type: DayType | null; isToday: boolean };

function buildMonthCalendar(year: number, monthIndex: number, todayDate: number): CalendarCell[][] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const cells: CalendarCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: daysInPrevMonth - i, inMonth: false, type: null, isToday: false });
  }

  for (let date = 1; date <= daysInMonth; date++) {
    cells.push({
      date,
      inMonth: true,
      type: ANALYSIS_DATES.has(date)
        ? "analysis"
        : date <= todayDate
          ? dayTypeForDate(date)
          : null,
      isToday: date === todayDate,
    });
  }

  let nextMonthDate = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: nextMonthDate, inMonth: false, type: null, isToday: false });
    nextMonthDate++;
  }

  const rows: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const TODAY_DATE = 15;

const PLAN_SUMMARY_TASKS = [
  { title: "Newton's Laws (Revision)", duration: "30m" },
  { title: "Electrochemistry (New)", duration: "60m" },
  { title: "Calculus Practice", duration: "45m" },
  { title: "Optics (New)", duration: "60m" },
  { title: "Organic Chemistry (Rev.)", duration: "45m" },
];

export default function PlanPage() {
  const [filter, setFilter] = useState("All");
  const calendarRows = useMemo(() => buildMonthCalendar(2026, 4, TODAY_DATE), []);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="w-full flex flex-col gap-6 px-4 py-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Plan</h1>
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

      {/* Main content: centered container with grid layout */}
      <div className="mx-auto w-full ">
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          {/* Left column */}
          <div className="flex flex-col gap-3">
            {/* Calendar header card — 737 x 107 */}
            <div className="w-full rounded-2xl bg-surface p-6 shadow-sm">
              <div className="flex w-full flex-col flex-wrap gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Left Content */}
                <div className="flex flex-col justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2
                      className="
                        text-2xl
                        sm:text-[28px]
                        font-bold
                        leading-none
                        tracking-normal
                        text-ink
                      "
                    >
                      May 2026
                    </h2>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-sm border border-brand/10 bg-surface text-ink"
                        aria-label="Previous day"
                      >
                        <ArrowLeftIcon />
                      </button>

                      <button
                        type="button"
                        className="flex h-[30px] w-[30px] items-center justify-center rounded-sm border border-brand/10 bg-surface text-ink"
                        aria-label="Next day"
                      >
                        <span className="rotate-180">
                          <ArrowLeftIcon />
                        </span>
                      </button>
                    </div>
                  </div>
                  <p
                    className="
    mt-2
    text-body-lg
    font-medium
    leading-none
    tracking-normal
    text-muted
  "
                  >
                    Strategic Revision &amp; Mock Test Phase
                  </p>
                </div>
              </div>
            </div>


            <div className="w-full rounded-2xl bg-surface p-6 shadow-sm">
              {/* ================= Stats ================= */}
              <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-cta">
                    <FlameIcon className="w-4 h-4 md:w-[14px] md:h-[20px]" />
                  </span>

                  <span className="text-sm font-semibold text-ink">
                    12 Day Streak
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-success">
                    <CheckCircleIcon className="w-4 h-4 md:w-[16px] md:h-[20px]" />
                  </span>

                  <span className="text-sm font-semibold text-ink">
                    86% Completion
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-brand">
                    <StarIcon className="w-4 h-4 md:w-[12px] md:h-[12px] lg:w-5 lg:h-5" />
                  </span>

                  <span className="text-sm font-semibold text-ink">
                    4 Mock Tests
                  </span>
                </div>
              </div>


              <div className="mt-6 flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                  <Chip
                    key={item.label}
                    className={isDark && filter !== item.label ? "text-white!" : ""}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon}
                      {item.label}
                    </span>
                  </Chip>
                ))}
              </div>
              {/* ================= Calendar ================= */}
              <div className="mt-6 overflow-x-auto pb-1">
                <div className="min-w-[500px]">
                  {/* Week Names */}
                  <div className="mb-3 grid grid-cols-7 gap-3 text-center">
                    {WEEKDAYS.map((day) => (
                      <span
                        key={day}
                        className="text-[11px] font-semibold uppercase tracking-wide text-muted"
                      >
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-3">
                    {calendarRows.map((row, rowIndex) =>
                      row.map((cell, cellIndex) => {
                        const key = `${rowIndex}-${cellIndex}`;
                        const style = cell.type
                          ? DAY_TYPE_STYLES[cell.type]
                          : null;
                        const marks =
                          cell.type === "mock" ? MOCK_MARKS[cell.date] : undefined;

                        const cellContent = (
                          <div
                            className={`
      relative min-h-[92px] w-full rounded-xl border px-3 py-3
      ${cell.isToday
                                ? "border-brand bg-tint-strong ring-1 ring-brand"
                                : cell.inMonth
                                  ? `border-brand/10 ${style?.bg ?? "bg-surface"}`
                                  : "border-transparent bg-transparent"
                              }
    `}
                          >
                            {/* Date */}
                            <span
                              className={`
        absolute left-3 top-3
        text-xs font-semibold leading-none
        ${cell.inMonth
                                  ? style?.text ?? "text-ink"
                                  : "text-muted/30"
                                }
      `}
                            >
                              {cell.date}
                            </span>

                            {/* Mock / Icon Content */}
                            {cell.type && (
                              <div className="flex h-full flex-col items-center pt-4">
                                <span className={`mb-1 ${style?.icon ?? "text-ink"}`}>
                                  {DAY_TYPE_ICON[cell.type]}
                                </span>

                                {marks !== undefined && (
                                  <>
                                    <span className="text-[18px] font-extrabold leading-none text-ink">
                                      {marks}
                                    </span>

                                    <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                                      MARKS
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );

                        if (!cell.inMonth) {
                          return <div key={key}>{cellContent}</div>;
                        }

                        const href =
                          cell.date <= TODAY_DATE
                            ? "/plan/day-plan"
                            : "/plan/plan-day";

                        return (
                          <Link
                            key={key}
                            href={href}
                            className="block"
                          >
                            {cellContent}
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tip footer — 737 x 54, radius 12px, border 1px, padding 16px, gap 12px */}
            <div className="w-full rounded-xl border border-brand/10 bg-surface p-4">
              <p className="text-[14px] leading-5">
                <span className={`font-bold ${isDark ? "text-white/70" : "text-[#475569]"}`}>
                  Tip:
                </span>{" "}
                <span className={`font-normal ${isDark ? "text-white/70" : "text-[#475569]"}`}>
                  Click on any day to see details and your plan summary.
                </span>
              </p>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-full lg:w-[320px]">
            <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-surface shadow-sm lg:min-h-195">
              {/* ================= Header ================= */}
              <div className="border-b border-brand/10 p-6">
                <div className="flex flex-col justify-between">
                  <div>
                    <h2
                      className="
    text-[20px]
    font-bold
    leading-7
    tracking-normal
    text-ink
  "
                    >
                      May 15, 2026
                    </h2>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success-bg px-3 py-1">
                      <span className="h-2 w-2 rounded-full bg-success" />

                      <span className="text-xs font-semibold text-success">
                        Completed
                      </span>
                    </div>
                  </div>
                </div>
              </div>


              {/* ================= Statistics ================= */}
              <div className="border-b border-brand/10 p-6">
                <div className="flex flex-col gap-5">
                  {/* Study Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ClockIcon />

                      <span
                        className={`text-[14px] font-medium leading-5 ${isDark ? "text-white/70" : "text-[#475569]"}`}
                      >
                        Study Time
                      </span>
                    </div>

                    <span className="text-[14px] font-bold leading-5 text-ink">
                      4h 32m
                    </span>
                  </div>

                  {/* Tasks Completed */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CompleteIcon className="w-4 h-4 md:w-[18px] md:h-[18px]" />

                      <span
                        className={`text-[14px] font-medium leading-5 ${isDark ? "text-white/70" : "text-[#475569]"}`}
                      >
                        Tasks Completed
                      </span>
                    </div>

                    <span className="text-[14px] font-bold leading-5 text-ink">
                      5 / 5
                    </span>
                  </div>

                  {/* Check-in */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckInIcon />

                      <span
                        className={`text-[14px] font-medium leading-5 ${isDark ? "text-white/70" : "text-[#475569]"}`}
                      >
                        Check-in
                      </span>
                    </div>

                    <span className="text-[14px] font-bold leading-5 text-success">
                      Good
                    </span>
                  </div>

                  {/* Win Journal */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookIcon />

                      <span
                        className={`text-[14px] font-medium leading-5 ${isDark ? "text-white/70" : "text-[#475569]"}`}
                      >
                        Win Journal
                      </span>
                    </div>

                    <span className="text-[14px] font-bold leading-5 text-ink">
                      Added
                    </span>
                  </div>
                </div>
              </div>

              {/* ================= Plan Summary ================= */}

              <div className="flex-1 px-6 py-6">
                <h3 className="mb-6 text-[14px] font-bold leading-5 text-ink">
                  Plan Summary
                </h3>

                <div className="flex flex-col gap-4">
                  {PLAN_SUMMARY_TASKS.map((task) => (
                    <div
                      key={task.title}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <CompleteIcon className="w-4 h-4 text-success md:w-[18px] md:h-[18px]" />

                        <span
                          className={`text-[13px] font-medium leading-5 ${isDark ? "text-white/70" : "text-[#475569]"
                            }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      <span className={`text-[13px] font-medium leading-5 ${isDark ? "text-white/70" : "text-[#475569]"}`}>
                        {task.duration}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ================= Bottom Button ================= */}
              <div className="border-t border-brand/10 p-5">
                <Button
                  href="/plan/day-plan"
                  variant="primary"
                  className="h-12 w-full rounded-xl text-base font-semibold"
                >
                  View Day Plan
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}