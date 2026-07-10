"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import {
  BellIcon,
  FlameIcon,
  CheckCircleIcon,
  StarIcon,
  UploadIcon,
  ChevronDownIcon,
  CheckIcon,
  RefreshIcon,
  BookIcon,
  MinusIcon,
  ClockIcon,
} from "@/components/ui/icons";

const FILTERS = ["All", "Complete", "Mock", "Recovery", "Journal", "No Study"];

type DayType = "complete" | "mock" | "recovery" | "journal" | "no-study";

const DAY_TYPE_ICON: Record<DayType, ReactNode> = {
  complete: <CheckIcon />,
  mock: <StarIcon />,
  recovery: <RefreshIcon />,
  journal: <BookIcon />,
  "no-study": <MinusIcon />,
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
      type: date <= todayDate ? dayTypeForDate(date) : null,
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TODAY_DATE = 15;

const PLAN_SUMMARY_TASKS = [
  { title: "Newton's Laws (Revision)", duration: "40 min" },
  { title: "Electrochemistry (New)", duration: "60 min" },
  { title: "Calculus Practice", duration: "60 min" },
  { title: "Optics", duration: "60 min" },
];

export default function PlanPage() {
  const [filter, setFilter] = useState("All");
  const calendarRows = useMemo(() => buildMonthCalendar(2026, 4, TODAY_DATE), []);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-brand/10 bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-lg font-bold text-ink">
                  May 2026
                  <span className="flex items-center gap-0.5 text-muted">
                    <button type="button" aria-label="Previous month">
                      <ChevronDownIcon className="h-4 w-4 rotate-90" />
                    </button>
                    <button type="button" aria-label="Next month">
                      <ChevronDownIcon className="h-4 w-4 -rotate-90" />
                    </button>
                  </span>
                </p>
                <p className="text-xs text-muted">
                  Strategic Revision &amp; Mock Test Phase
                </p>
              </div>
              
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1 font-semibold text-ink">
                <span className="text-cta">
                  <FlameIcon />
                </span>
                12 Day Streak
              </span>
              <span className="flex items-center gap-1 font-semibold text-ink">
                <CheckCircleIcon />
                86% Completion
              </span>
              <span className="flex items-center gap-1 font-semibold text-ink">
                <StarIcon />4 Mock Tests
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <Chip key={item} selected={filter === item} onClick={() => setFilter(item)}>
                  {item}
                </Chip>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((day) => (
                <span key={day} className="text-[10px] font-semibold text-muted">
                  {day}
                </span>
              ))}
            </div>
            <div className="mt-1 flex flex-col gap-1">
              {calendarRows.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-7 gap-1">
                  {row.map((cell, cellIndex) => {
                    const cellContent = (
                      <div
                        className={`flex h-12 flex-col items-center justify-center gap-1 rounded-lg border sm:h-16 ${
                          cell.isToday
                            ? "border-brand bg-tint-strong"
                            : cell.inMonth
                              ? "border-brand/10 bg-surface hover:border-brand/30"
                              : "border-transparent"
                        }`}
                      >
                        <span
                          className={`text-xs font-semibold ${
                            cell.inMonth ? "text-ink" : "text-muted/40"
                          }`}
                        >
                          {cell.date}
                        </span>
                        {cell.type && <span className="text-ink">{DAY_TYPE_ICON[cell.type]}</span>}
                      </div>
                    );

                    if (!cell.inMonth) {
                      return <div key={cellIndex}>{cellContent}</div>;
                    }

                    const href = cell.date <= TODAY_DATE ? "/plan/day-plan" : "/plan/plan-day";
                    return (
                      <Link key={cellIndex} href={href}>
                        {cellContent}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted">
            Tip: Click on any day to see details and your plan summary.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-bold text-ink">May 15, 2026</p>
            <span className="flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Completed
            </span>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-1 text-muted">
                <ClockIcon />
                Study Time
              </span>
              <span className="font-semibold text-ink">4h 32m</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-1 text-muted">
                <CheckIcon />
                Tasks Completed
              </span>
              <span className="font-semibold text-ink">5 / 5</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-1 text-muted">
                <CheckCircleIcon />
                Check-in
              </span>
              <span className="font-semibold text-success">Good</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-1 text-muted">
                <BookIcon />
                Win Journal
              </span>
              <span className="font-semibold text-ink">Added</span>
            </div>
          </div>

          <div className="border-t border-brand/10 pt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">
              Plan Summary
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {PLAN_SUMMARY_TASKS.map((task) => (
                <div key={task.title} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-ink">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success text-white">
                      <CheckIcon />
                    </span>
                    {task.title}
                  </span>
                  <span className="shrink-0 text-muted">{task.duration}</span>
                </div>
              ))}
            </div>
          </div>

          <Button href="/plan/day-plan" variant="primary" size="sm">
            View Day Plan
          </Button>
        </div>
      </div>
    </div>
  );
}
