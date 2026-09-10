"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTheme } from "@/components/theme/ThemeProvider";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  CheckIcon,
  XIcon,
  CheckCircleIcon,
  BookIcon,
} from "@/components/ui/icons";
import { FlameIcon, ClockIcon, StarIcon, ShieldIcon, BoltIcon, BellIcon } from "@/assets/icons";
import {
  getStreakInfo,
  getStreakCalendar,
  monthLabel,
  type StreakInfo,
  type StreakCalendar,
  type StreakDayStatus,
} from "@/lib/api/streak";

function effortIcon(node: ReactNode): ReactNode {
  return (
    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full">
      {node}
    </span>
  );
}

const EFFORT_ICONS: Record<string, ReactNode> = {
  STUDY_TIME: effortIcon(<ClockIcon />),
  PRACTICE: effortIcon(<BoltIcon />),
  ACCURACY: effortIcon(<CheckCircleIcon />),
  REVISION: effortIcon(<BookIcon />),
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CALENDAR_LEGEND: { status: StreakDayStatus; label: string; caption: string }[] = [
  { status: "QUALIFIED", label: "Qualified", caption: "Criteria met" },
  { status: "FREEZE_USED", label: "Freeze Used", caption: "Streak held" },
  { status: "MISSED", label: "Missed", caption: "Below threshold" },
  { status: "NO_STUDY", label: "No-Study Day", caption: "Planned rest" },
];

function statusIcon(status: StreakDayStatus) {
  if (status === "QUALIFIED") return <CheckIcon />;
  if (status === "FREEZE_USED") return <ShieldIcon />;
  // `block` so the size applies — this one is a dot, not an svg.
  if (status === "NO_STUDY") return <span className="block h-2 w-2 rounded-full bg-brand" />;
  if (status === "MISSED") return <XIcon />;
  return null;
}

/** Pads the month so the 1st lands under its weekday, Monday-first. */
function toWeekRows(days: StreakCalendar["days"]): (StreakCalendar["days"][number] | null)[][] {
  if (days.length === 0) return [];
  // dayOfWeek is 0=Sunday; shift so Monday is column 0.
  const lead = (days[0].dayOfWeek + 6) % 7;
  const cells: (StreakCalendar["days"][number] | null)[] = [
    ...Array<null>(lead).fill(null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (StreakCalendar["days"][number] | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export default function StreakPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [info, setInfo] = useState<StreakInfo | null>(null);
  const [calendar, setCalendar] = useState<StreakCalendar | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState({ year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 });

  useEffect(() => {
    let cancelled = false;
    getStreakInfo()
      .then((result) => {
        if (!cancelled) setInfo(result);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your streak. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getStreakCalendar(view.year, view.month)
      .then((result) => {
        if (!cancelled) setCalendar(result);
      })
      .catch(() => {
        // Non-fatal — the rest of the page still renders.
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  const shiftMonth = useCallback((delta: number) => {
    setView((v) => {
      const next = new Date(Date.UTC(v.year, v.month - 1 + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
    });
  }, []);

  if (isLoading) return <PageLoader label="Loading your streak…" />;

  if (error || !info) {
    return (
      <div className="p-8">
        <p className="text-center text-sm font-medium text-muted">
          {error ?? "Couldn't load your streak."}
        </p>
      </div>
    );
  }

  const effort = info.effortScore;

  const statCards = [
    {
      icon: <FlameIcon />,
      iconClass: "bg-cta/10 text-cta",
      label: "Current Streak",
      value: String(info.currentStreak),
      unit: info.currentStreak === 1 ? "day in a row" : "days in a row",
      inline: false,
      caption: null as string | null,
    },
    {
      icon: <StarIcon />,
      iconClass: "bg-tint text-ink",
      label: "Longest Streak",
      value: String(info.longestStreak),
      unit: "days",
      inline: true,
      caption: info.longestStreak > info.currentStreak ? "Your personal best so far" : "Your best is right now",
    },
    {
      icon: <ShieldIcon />,
      iconClass: "bg-brand/10 text-ink",
      label: "Streak Freeze",
      value: info.streakFreezeAvailable ? "1" : "0",
      unit: "available",
      inline: true,
      // Never loss-framed (PRD 10.8) — states what it does, not what you'd lose.
      caption: info.streakFreezeAvailable
        ? "Covers one below-threshold day automatically"
        : `Used this week. A new one arrives ${info.streakFreezeResetsOn}`,
    },
    {
      icon: <BoltIcon />,
      iconClass: "bg-info-bg text-info",
      label: "Next Milestone",
      value: info.nextMilestone ? String(info.nextMilestone.days) : "—",
      unit: "days",
      inline: true,
      caption: info.nextMilestone
        ? `${info.daysToNextMilestone} more ${info.daysToNextMilestone === 1 ? "day" : "days"} to ${info.nextMilestone.label}`
        : "Every milestone reached",
    },
  ];

  const weekRows = calendar ? toWeekRows(calendar.days) : [];

  return (
    <div className="flex flex-col gap-5 p-4 sm:gap-6 sm:p-6 lg:p-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* <Link href="/home" aria-label="Back to Home" className="shrink-0 text-ink">
            <ArrowLeftIcon />
          </Link> */}
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

      {/* Milestone line — the exact locked copy, or a neutral line before the first */}
      <div className="flex w-full items-center gap-2">
        <span className="shrink-0 text-[20px] leading-none sm:text-[24px] lg:text-[28px]" aria-hidden="true">
          ⭐
        </span>
        <p className="whitespace-normal break-words text-[20px] font-bold leading-tight text-ink sm:text-[24px] sm:leading-none lg:text-[28px]">
          {info.milestone
            ? info.milestone.message
            : info.currentStreak > 0
              ? `${info.currentStreak} ${info.currentStreak === 1 ? "day" : "days"} so far.`
              : "Every streak starts with one day."}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex w-full flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4 shadow-[0px_1px_2px_0px_#0000000D] sm:gap-4 sm:p-5 md:p-6"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${card.iconClass} [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6`}
              >
                {card.icon}
              </span>
              <div className="flex min-w-0 flex-col justify-between">
                <p className="text-[12px] font-bold leading-[16px] text-ink">{card.label}</p>
                {card.inline ? (
                  <p className="flex flex-wrap items-baseline gap-x-1">
                    <span className="text-[26px] font-extrabold leading-[32px] text-ink sm:text-[30px] sm:leading-[36px]">
                      {card.value}
                    </span>
                    <span className="text-[13px] font-semibold text-muted sm:text-sm">{card.unit}</span>
                  </p>
                ) : (
                  <span className="text-[30px] font-extrabold leading-[36px] text-ink sm:text-[36px] sm:leading-[40px]">
                    {card.value}
                  </span>
                )}
              </div>
            </div>

            {card.inline ? (
              card.caption && (
                <p className="text-[12px] font-normal leading-[16px] text-muted">{card.caption}</p>
              )
            ) : (
              <p className="text-[10px] font-bold uppercase leading-[15px] tracking-[0.5px] text-muted">
                {card.unit}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Calendar + today's qualification */}
      <div className="grid w-full grid-cols-1 gap-5 sm:gap-8 lg:grid-cols-12">
        {/* Streak calendar */}
        <div className="flex flex-col gap-5 rounded-[20px] border border-brand/10 bg-surface p-4 shadow-[0px_1px_2px_0px_#0000000D] sm:gap-8 sm:rounded-[24px] sm:p-5 md:p-6 xl:p-8 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[16px] font-extrabold leading-[24px] text-ink sm:text-[18px] sm:leading-[28px]">
              Streak Calendar
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-1.5 text-muted hover:bg-tint-strong sm:h-9 sm:w-9 sm:p-2"
              >
                <ChevronDownIcon className="h-4 w-4 rotate-90" />
              </button>
              <span className="whitespace-nowrap text-[12px] font-bold leading-[20px] text-ink sm:text-[13px] md:text-[14px]">
                {monthLabel(view.year, view.month)}
              </span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p-1.5 text-muted hover:bg-tint-strong sm:h-9 sm:w-9 sm:p-2"
              >
                <ChevronDownIcon className="h-4 w-4 -rotate-90" />
              </button>
            </div>
          </div>

          {/* The legend only moves beside the calendar at `xl`. At `lg` the card
              is just 7/12 of the grid, so a 192px sidebar would leave the seven
              day columns about 16px each and the numbers would collide. */}
          <div className="flex flex-col gap-5 xl:flex-row xl:gap-8">
            <div className="min-w-0 flex-1">
              {/* No `min-w` and no `overflow-x-auto`: the month always fits the
                  viewport, so a phone never gets a horizontal scrollbar. */}
              <div className="w-full">
                <div className="w-full">
                  <div className="grid grid-cols-7 gap-0.5 text-center sm:gap-1 md:gap-2">
                    {WEEKDAYS.map((day) => (
                      <span
                        key={day}
                        className="truncate text-[9px] font-semibold leading-[14px] text-muted sm:text-[11px] sm:leading-[16px] md:text-[12px]"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1.5 flex flex-col gap-0.5 sm:mt-2 sm:gap-1">
                    {weekRows.map((row, rowIndex) => (
                      <div key={rowIndex} className="grid w-full grid-cols-7 gap-0.5 sm:gap-1 md:gap-2">
                        {row.map((cell, cellIndex) => (
                          <div
                            key={cellIndex}
                            className="flex h-[40px] flex-col items-center justify-center gap-0.5 rounded-lg sm:h-[50px] md:h-[56px]"
                            title={
                              cell
                                ? `${cell.date} — ${cell.status.toLowerCase().replace("_", " ")}`
                                : undefined
                            }
                          >
                            {cell && (
                              <>
                                <span
                                  className={`flex h-5 w-5 items-center justify-center rounded-full text-center text-[10px] font-bold leading-none sm:h-6 sm:w-6 sm:text-[13px] md:text-[14px] ${
                                    cell.isToday
                                      ? "bg-brand text-white"
                                      : cell.status === "UPCOMING"
                                        ? "text-muted/50"
                                        : "text-ink"
                                  }`}
                                >
                                  {Number(cell.date.slice(-2))}
                                </span>
                                {/* 24px circle, 14px inner box, glyph sized by
                                    its own viewBox inset — the same treatment
                                    the legend swatches use. */}
                                {!cell.isToday && statusIcon(cell.status) && (
                                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#EEF0F8] bg-[#EEF0F8] text-ink sm:h-5 sm:w-5 md:h-6 md:w-6 dark:border-[#FAF7F214] dark:bg-[#FAF7F214]">
                                    <span className="flex h-2.5 w-2.5 items-center justify-center [&>svg]:h-full [&>svg]:w-full sm:h-3 sm:w-3 md:h-3.5 md:w-3.5">
                                      {statusIcon(cell.status)}
                                    </span>
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="grid w-full grid-cols-2 gap-4 rounded-[16px] border border-[#F1F5F9] bg-[#F8FAFC80] p-4 sm:grid-cols-4 xl:flex xl:w-[192px] xl:shrink-0 xl:grid-cols-1 xl:flex-col xl:gap-5 xl:p-5 dark:border-[#FAF7F214] dark:bg-[#FAF7F20F]">
              {CALENDAR_LEGEND.map((item) => (
                <div key={item.label} className="flex items-center gap-2 sm:gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand/10 bg-surface text-ink [&>svg]:h-3.5 [&>svg]:w-3.5">
                    {statusIcon(item.status)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink">{item.label}</p>
                    <p className="truncate text-[10px] text-muted">{item.caption}</p>
                  </div>
                </div>
              ))}
              {calendar && (
                <p className="col-span-2 text-[10px] leading-4 text-muted sm:col-span-4 xl:col-span-1">
                  {calendar.summary.qualified} qualified · {calendar.summary.noStudy} rest ·{" "}
                  {calendar.summary.freezeUsed} frozen
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Effort Score (Today) */}
        <div className="flex flex-col gap-5 rounded-[20px] border border-brand/10 bg-surface p-4 shadow-[0px_1px_2px_0px_#0000000D] sm:gap-8 sm:rounded-[24px] sm:p-5 md:p-6 xl:p-8 lg:col-span-5">
          <p className="text-[16px] font-extrabold leading-[24px] text-ink sm:text-[18px] sm:leading-[28px]">
            Effort Score{" "}
            <span className="text-[13px] font-semibold text-muted sm:text-[14px]">(Today)</span>
          </p>

          <div className="flex flex-col gap-5 sm:flex-row sm:gap-10">
            {/* Score + band */}
            <div className="flex min-w-[64px] flex-row items-center justify-start gap-2 text-center sm:flex-col sm:justify-center sm:gap-1">
              <span className="text-[30px] font-extrabold leading-[36px] text-ink sm:text-[36px] sm:leading-[40px]">
                {effort.total}
              </span>
              <span className="px-1 text-[11px] font-semibold text-ink sm:text-[10px]">
                {effort.band}
              </span>
            </div>

            {/* Components */}
            <div className="flex flex-1 flex-col gap-3 sm:gap-4">
              {effort.components.map((c) => (
                <div key={c.key} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink">
                      {EFFORT_ICONS[c.key]}
                      <span className="truncate">{c.label}</span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-muted">
                      {c.earned} / {c.max}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-tint-strong">
                    <div
                      className={`h-1.5 rounded-full ${isDark ? "bg-white" : "bg-brand"}`}
                      style={{ width: `${c.max > 0 ? (c.earned / c.max) * 100 : 0}%` }}
                    />
                  </div>
                  {/* What the points were measured against, so the bar is
                      readable rather than an unexplained fraction. */}
                  <p className="text-[10px] leading-3 text-muted">
                    {c.target > 0
                      ? `${c.actual}${c.unit === "%" ? "%" : ` ${c.unit}`} of ${c.target}${c.unit === "%" ? "%" : ` ${c.unit}`}`
                      : `Nothing of this kind planned today`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-tint-strong p-3 text-xs leading-5 text-muted">
            {effort.hint}
          </div>
        </div>
      </div>
    </div>
  );
}
