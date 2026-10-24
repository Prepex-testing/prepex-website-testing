"use client";

import Link from "next/link";
import { BackIcon } from "@/assets/icons";
import type { StudyConsistency, StudyConsistencyDay } from "@/lib/api/planner";

const CONSISTENCY_THEME = {
  light: ["#eef0f8", "#c7cbe8", "#9aa0d1", "#5b62a8", "#1a1a4e"],
  dark: ["#1c1c4a", "#2c2c66", "#4141a0", "#6d6dc4", "#a5a5e8"],
};

const CONSISTENCY_WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Buckets a 0-100 daily completion percentage into the calendar's 5 activity levels. */
function toActivityLevel(percentage: number): number {
  if (percentage <= 0) return 0;
  if (percentage < 25) return 1;
  if (percentage < 50) return 2;
  if (percentage < 75) return 3;
  return 4;
}

/**
 * Chunks days into Monday-start week rows, padding the first/last week with
 * nulls so each date lands under the correct weekday column.
 */
function groupConsistencyByWeek(days: StudyConsistencyDay[]): (StudyConsistencyDay | null)[][] {
  if (days.length === 0) return [];

  const [firstYear, firstMonth, firstDate] = days[0].date.split("-").map(Number);
  const firstWeekday = (new Date(firstYear, firstMonth - 1, firstDate).getDay() + 6) % 7; // Mon=0..Sun=6

  const cells: (StudyConsistencyDay | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (StudyConsistencyDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}


/** The month-at-a-glance heat map of how much of each day's plan was completed. Moved out of the home page unchanged. */
export function StudyConsistencyCard({ consistency, isDark }: { consistency: StudyConsistency | null; isDark: boolean }) {
  const consistencyWeeks = groupConsistencyByWeek(consistency?.days ?? []);
  const consistencyMonthName = consistency ? MONTH_NAMES[consistency.month - 1] ?? "" : "";
  const consistencyColors = CONSISTENCY_THEME[isDark ? "dark" : "light"];

  return (
  <div className="rounded-3xl border border-brand/10 bg-surface p-4 sm:p-5 md:p-6 lg:p-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <h3 className="text-base font-bold text-(--oc-heading1) sm:text-lg">
        Study Consistency
      </h3>

      {/* The chevron itself is ~6x10px — far too small to tap — so the
          link carries a 32px hit area. The negative margin keeps the
          glyph aligned to the card's right edge as before. */}
      <Link
        href="/home/streak"
        aria-label="View streak details"
        className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-tint"
      >
        <BackIcon
          className="h-[10px] w-[6px] shrink-0 text-secondary sm:h-[12px] sm:w-[7.4px]"
        />
      </Link>
    </div>

    {consistency ? (
      <div className="starting:opacity-0 transition-opacity duration-300">
        {/* Weekday labels */}
        <div
          className="
  mx-auto
  mt-4
  grid
  w-full
  max-w-[300px]
  grid-cols-7
  sm:max-w-[340px]
  md:max-w-[420px]
  lg:max-w-[460px]
          "
        >
          {CONSISTENCY_WEEKDAY_LABELS.map((day, index) => (
            <span
              key={index}
              className="
      flex
      items-center
      justify-center
      text-[10px]
      font-medium
      leading-[15px]
      text-[#94A3B8]
      sm:text-xs
    "
            >
              {day}
            </span>
          ))}
        </div>

        {/* Consistency boxes */}
        <div
          className="
  mx-auto
  mt-2
  flex
  w-full
  max-w-[300px]
  flex-col
  gap-y-1
  sm:max-w-[340px]
  sm:gap-y-1.5
  md:max-w-[420px]
  md:gap-y-2
  lg:max-w-[460px]
  lg:gap-y-2.5
          "
        >
          {consistencyWeeks.map((week, weekIndex) => (
            <div
              key={weekIndex}
              className="grid w-full grid-cols-7"
            >
              {week.map((day, dayIndex) => (
                <span
                  key={dayIndex}
                  className="flex items-center justify-center"
                >
                  <span
                    title={
                      day
                        ? `${day.dayCompletionPercentage}% completed on ${day.date}`
                        : undefined
                    }
                    className="
            aspect-square
            w-[14px]
            rounded-[3px]
            sm:w-4
            md:w-[18px]
            md:rounded-[4px]
            lg:w-5
            lg:rounded-[4px]
          "
                    style={{
                      backgroundColor: day
                        ? consistencyColors[
                        toActivityLevel(day.dayCompletionPercentage)
                        ]
                        : "transparent",
                    }}
                  />
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div
          className="
  mt-4
  flex
  items-center
  justify-between
  gap-3
  text-[10px]
  leading-[15px]
  text-muted
  sm:mt-5
  sm:text-xs
  md:mt-6
          "
        >
          <span className="shrink-0">
            {consistencyMonthName}
          </span>

          <span className="flex shrink-0 items-center gap-1">
            <span>Missed</span>

            <span className="flex items-center gap-1">
              {consistencyColors.map((color, index) => (
                <span
                  key={index}
                  className="
          h-2
          w-2
          shrink-0
          rounded-[2px]
          sm:h-2.5
          sm:w-2.5
          sm:rounded-sm
        "
                  style={{
                    backgroundColor: color,
                  }}
                />
              ))}
            </span>

            <span>Completed</span>
          </span>
        </div>
      </div>
    ) : (
      <div className="mt-4 flex h-32 items-center justify-center text-xs text-muted">
        Loading...
      </div>
    )}
  </div>
  );
}
