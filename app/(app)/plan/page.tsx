"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/PageLoader";
import { useTheme } from "@/components/theme/ThemeProvider";
import { BellIcon, FlameIcon } from "@/assets/icons";
import {
  // BellIcon,
  CheckCircleIcon,
  StarIcon,
  RefreshIcon,
  BookIcon,
  MinusIcon,
  ClockIcon,
  CompleteIcon,
  JournalIcon,
  NoStudyIcon,
  CheckInIcon,
  ArrowLeftIcon,
  PinIcon,
} from "@/components/ui/icons";
import {
  getMonthCalendar,
  getDayView,
  monthLabel,
  todayDateKey,
  type CalendarDay,
  type CalendarMonth,
  type DayView,
} from "@/lib/api/calendar";

// The calendar paints one glyph per day. `primaryType` decides it, except for
// an ordinary day that's already been lived — that falls back to how it went.
type VisualType =
  | "complete"
  | "partial"
  | "missed"
  | "mock"
  | "recovery"
  | "bad-day"
  | "journal"
  | "no-study"
  | "custom";

const VISUAL_ICON: Record<VisualType, ReactNode> = {
  complete: <CompleteIcon className="h-4 w-4 md:h-[18px] md:w-[18px]" />,
  partial: <ClockIcon />,
  missed: <MinusIcon />,
  mock: <StarIcon className="h-4 w-4 md:h-[12px] md:w-[12px] lg:h-5 lg:w-5" />,
  recovery: <RefreshIcon />,
  "bad-day": <RefreshIcon />,
  journal: <JournalIcon />,
  "no-study": <NoStudyIcon />,
  custom: <PinIcon />,
};

const VISUAL_STYLE: Record<VisualType, { bg: string; icon: string }> = {
  complete: { bg: "bg-success/10", icon: "text-success" },
  partial: { bg: "bg-warning-bg", icon: "text-warning" },
  missed: { bg: "bg-surface", icon: "text-muted" },
  mock: { bg: "bg-brand/10", icon: "text-brand" },
  recovery: { bg: "bg-surface", icon: "text-brand" },
  "bad-day": { bg: "bg-surface", icon: "text-brand" },
  journal: { bg: "bg-surface", icon: "text-brand" },
  "no-study": { bg: "bg-surface", icon: "text-cta" },
  custom: { bg: "bg-surface", icon: "text-brand" },
};

function visualTypeFor(day: CalendarDay): VisualType | null {
  switch (day.primaryType) {
    case "MOCK_DAY":
      return "mock";
    case "NO_STUDY":
      return "no-study";
    case "RECOVERY":
      return "recovery";
    case "BAD_DAY":
      return "bad-day";
    case "WIN_JOURNAL":
      return "journal";
    // CUSTOM is deliberately not handled here. The backend reports it whenever
    // a day has anchors and nothing else outranks them, which meant a finished
    // day with a coaching class on it painted a pin and lost its tick. The
    // anchor is now a separate corner marker, so the centre glyph is free to
    // say how the day actually went.
    default:
      break;
  }
  if (day.completionStatus === "COMPLETE") return "complete";
  if (day.completionStatus === "PARTIAL") return "partial";
  if (day.completionStatus === "MISSED") return "missed";
  return null;
}

/** A custom anchor is worth marking on any day, not only one where nothing
 *  else outranks it — so it rides alongside the primary glyph rather than
 *  replacing it. `primaryType` only reports CUSTOM when a day has anchors and
 *  no mock / no-study / recovery / journal, which hid it on most days. */
function hasCustomAnchor(day: CalendarDay): boolean {
  return day.anchorCount > 0;
}

/**
 * Every tag a day carries. Filtering works on this rather than the single
 * primary glyph, so "Custom" matches a completed day that also has an anchor
 * instead of only the handful where the anchor happens to win precedence.
 */
function visualTagsFor(day: CalendarDay): VisualType[] {
  const tags: VisualType[] = [];
  const primary = visualTypeFor(day);
  if (primary) tags.push(primary);
  if (hasCustomAnchor(day)) tags.push("custom");
  return tags;
}

const FILTERS: { label: string; visual: VisualType; icon: ReactNode }[] = [
  {
    label: "Complete",
    visual: "complete",
    icon: <CompleteIcon className="h-4 w-4 text-success md:h-[18px] md:w-[18px]" />,
  },
  {
    label: "Partial",
    visual: "partial",
    icon: (
      <span className="flex h-4 w-4 items-center justify-center text-warning [&>svg]:h-full [&>svg]:w-full">
        <ClockIcon />
      </span>
    ),
  },
  {
    label: "Mock",
    visual: "mock",
    icon: <StarIcon className="h-4 w-4 text-[#4C1D95] dark:text-white md:h-[12px] md:w-[12px] lg:h-5 lg:w-5" />,
  },
  {
    label: "Recovery",
    visual: "recovery",
    // Sized and coloured to match the glyph this chip stands for in the grid.
    icon: <RefreshIcon className="h-4 w-4 text-brand" />,
  },
  { label: "Journal", visual: "journal", icon: <JournalIcon /> },
  { label: "No Study", visual: "no-study", icon: <NoStudyIcon /> },
  {
    label: "Custom",
    visual: "custom",
    icon: (
      <span className="flex h-4 w-4 items-center justify-center text-brand [&>svg]:h-full [&>svg]:w-full">
        <PinIcon />
      </span>
    ),
  },
];

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type Cell = { day: CalendarDay | null; date: number };

/** Lays the month's days into Monday-first weeks, padded with blanks. */
function buildGrid(month: CalendarMonth): Cell[][] {
  const cells: Cell[] = [];
  const first = month.days[0];
  if (!first) return [];

  // dayOfWeek is 0=Sunday; the grid starts on Monday.
  const lead = (first.dayOfWeek + 6) % 7;
  for (let i = 0; i < lead; i++) cells.push({ day: null, date: 0 });

  month.days.forEach((day, i) => cells.push({ day, date: i + 1 }));
  while (cells.length % 7 !== 0) cells.push({ day: null, date: 0 });

  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

const MOOD_LABEL: Record<string, string> = {
  DRAINED: "Drained",
  HEAVY: "Heavy",
  STEADY: "Steady",
  GOOD: "Good",
  STRONG: "Strong",
};

function formatFocus(seconds: number): string {
  const total = Math.round(seconds / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function PlanPage() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const today = useMemo(() => todayDateKey(), []);
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)));

  const [calendar, setCalendar] = useState<CalendarMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<VisualType[]>([]);

  // The sidebar always previews *today*. Clicking a day is a navigation, not a
  // selection — past days open their history, future days open planning.
  const selectedDate = today;
  const [dayView, setDayView] = useState<DayView | null>(null);
  const [dayLoading, setDayLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data } = await getMonthCalendar(year, month);
        if (!cancelled) setCalendar(data);
      } catch {
        if (!cancelled) setCalendar(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setDayLoading(true);
      try {
        const { data } = await getDayView(selectedDate);
        if (!cancelled) setDayView(data);
      } catch {
        if (!cancelled) setDayView(null);
      } finally {
        if (!cancelled) setDayLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const stepMonth = useCallback((delta: number) => {
    setMonth((prev) => {
      const next = prev + delta;
      if (next < 1) {
        setYear((y) => y - 1);
        return 12;
      }
      if (next > 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return next;
    });
  }, []);

  const toggleFilter = useCallback((visual: VisualType) => {
    setActiveFilters((prev) =>
      prev.includes(visual) ? prev.filter((v) => v !== visual) : [...prev, visual],
    );
  }, []);

  // A day is opened for *history* or for *planning* depending on which side of
  // today it falls on — the single decision this page exists to make.
  const openDay = useCallback(
    (day: CalendarDay) => {
      router.push(
        day.isFuture ? `/plan/plan-day?date=${day.date}` : `/plan/day-plan?date=${day.date}`,
      );
    },
    [router],
  );

  const rows = useMemo(() => (calendar ? buildGrid(calendar) : []), [calendar]);

  if (loading && !calendar) return <PageLoader label="Loading your calendar…" />;

  const summary = calendar?.summary;
  const selectedDay = calendar?.days.find((d) => d.date === selectedDate) ?? null;

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Plan</h1>
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

      <div className="mx-auto w-full">
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="flex flex-col gap-3">
            {/* Month header */}
            <div className="w-full rounded-2xl bg-surface p-4 shadow-sm sm:p-5 md:p-6">
              <div className="flex w-full flex-col gap-3">
                <div className="flex w-full flex-col">
                  <div className="flex w-full items-center gap-2 sm:gap-3">
                    <h2 className="min-w-0 flex-1 font-[Plus_Jakarta_Sans] text-[20px] font-bold leading-6 tracking-normal text-ink sm:text-[24px] sm:leading-7 md:flex-none md:text-[28px] md:leading-none">
                      {monthLabel(year, month)}
                    </h2>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => stepMonth(-1)}
                        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-sm border border-brand/10 bg-surface text-ink transition-colors hover:bg-tint-strong"
                        aria-label="Previous month"
                      >
                        <ArrowLeftIcon />
                      </button>

                      <button
                        type="button"
                        onClick={() => stepMonth(1)}
                        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-sm border border-brand/10 bg-surface text-ink transition-colors hover:bg-tint-strong"
                        aria-label="Next month"
                      >
                        <span className="rotate-180">
                          <ArrowLeftIcon />
                        </span>
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 font-[Plus_Jakarta_Sans] text-[13px] font-medium leading-5 tracking-normal text-muted sm:text-[14px] sm:leading-5 md:text-body-lg md:leading-none">
                    Past, present and what you&apos;ve planned ahead
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full rounded-2xl bg-surface p-6 shadow-sm">
              {/* Month stats */}
              <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-cta">
                    <FlameIcon className="h-4 w-4 md:h-[20px] md:w-[14px]" />
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {summary?.currentStreak ?? 0} Day Streak
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-success">
                    <CheckCircleIcon className="h-4 w-4 md:h-[20px] md:w-[16px]" />
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {summary?.completionRate ?? 0}% Completion
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-brand">
                    <StarIcon className="h-4 w-4 md:h-[12px] md:w-[12px] lg:h-5 lg:w-5" />
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {summary?.mockCount ?? 0} Mock Tests
                  </span>
                </div>

                {summary && summary.noStudyUsed > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-cta">
                      <NoStudyIcon />
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {summary.noStudyUsed} of {summary.noStudyLimit} No-Study
                    </span>
                  </div>
                )}
              </div>

              {/* Legend doubles as a filter */}
              <div className="mt-6 flex flex-wrap gap-2">
                {FILTERS.map((item) => {
                  const active = activeFilters.includes(item.visual);
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => toggleFilter(item.visual)}
                      aria-pressed={active}
                      className={`inline-flex h-[34px] items-center justify-center gap-2 rounded-full border px-4 py-[6px] text-[14px] font-medium leading-5 transition-colors ${active
                        ? "border-brand bg-tint-strong text-ink"
                        : `border-brand/15 bg-surface ${isDark ? "text-white" : "text-muted"} hover:bg-tint-strong`
                        }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Calendar grid */}
              <div className="mt-4 overflow-x-auto pb-1 sm:mt-6">
                <div className="sm:min-w-[500px]">
                  <div className="mb-2 grid grid-cols-7 gap-1 text-center sm:mb-3 sm:gap-2 md:gap-3">
                    {WEEKDAYS.map((day) => (
                      <span
                        key={day}
                        className="truncate text-[9px] font-semibold uppercase tracking-wide text-muted sm:text-[10px] md:text-[11px]"
                      >
                        {day}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 sm:gap-2 md:gap-3">
                    {rows.map((row, rowIndex) =>
                      row.map((cell, cellIndex) => {
                        const key = `${rowIndex}-${cellIndex}`;

                        if (!cell.day) {
                          return (
                            <div
                              key={key}
                              className="min-h-[46px] w-full rounded-lg border border-transparent sm:min-h-[68px] sm:rounded-xl md:min-h-[92px] xl:min-h-[104px]"
                            />
                          );
                        }

                        const day = cell.day;
                        const anchored = hasCustomAnchor(day);
                        // An anchored day with no status of its own (a future
                        // one, typically) puts the pin front and centre; a day
                        // that has a status keeps it and wears the pin in the
                        // corner.
                        const primary = visualTypeFor(day);
                        const visual = primary ?? (anchored ? "custom" : null);
                        const tags = visualTagsFor(day);
                        const showCustomMark = anchored && visual !== "custom";
                        // Filters dim rather than hide: the month should keep
                        // its shape so a student can still see where they are.
                        const dimmed =
                          activeFilters.length > 0 && !tags.some((t) => activeFilters.includes(t));
                        const style = visual ? VISUAL_STYLE[visual] : null;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => openDay(day)}
                            aria-label={`${day.isFuture ? "Plan" : "View"} ${day.date}`}
                            className={`block w-full text-left transition-opacity ${dimmed ? "opacity-30" : ""}`}
                          >
                            <div
                              className={`relative min-h-[46px] w-full rounded-lg border p-1.5 transition-colors sm:min-h-[68px] sm:rounded-xl sm:p-2 md:min-h-[92px] md:p-3 xl:min-h-[104px] ${day.isToday
                                ? "border-brand bg-tint-strong ring-1 ring-brand"
                                : `border-brand/10 ${style?.bg ?? "bg-surface"} hover:border-brand/40`
                                }`}
                            >
                              <span className="absolute left-1.5 top-1.5 text-[10px] font-semibold leading-none text-ink sm:left-2 sm:top-2 sm:text-[11px] md:left-3 md:top-3 md:text-xs">
                                {cell.date}
                              </span>

                              {/* The custom pin, not an anonymous dot — a day
                                  with an anchor now reads as Custom against the
                                  legend even when a mock or completion glyph
                                  owns the centre of the cell. */}
                              {showCustomMark && (
                                <span
                                  className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 items-center justify-center text-brand [&>svg]:h-full [&>svg]:w-full sm:right-2 sm:top-2 sm:h-3 sm:w-3 md:right-3 md:top-3 md:h-3.5 md:w-3.5"
                                  title={`${day.anchorCount} custom anchor task${day.anchorCount === 1 ? "" : "s"}`}
                                >
                                  <PinIcon />
                                </span>
                              )}

                              {visual && (
                                <div className="flex h-full flex-col items-center pt-3 sm:pt-3.5 md:pt-4">
                                  {/* Sized on the wrapper: most of these icon
                                      components take no props, so their own
                                      dimensions can't be overridden directly. */}
                                  <span
                                    className={`mb-0.5 flex h-3.5 w-3.5 items-center justify-center [&>svg]:h-full [&>svg]:w-full sm:mb-1 sm:h-4 sm:w-4 md:h-[18px] md:w-[18px] ${style?.icon ?? "text-ink"}`}
                                  >
                                    {VISUAL_ICON[visual]}
                                  </span>

                                  {day.mock?.hasResult && (
                                    <>
                                      <span className="text-[11px] font-extrabold leading-none text-ink sm:text-[14px] md:text-[18px]">
                                        {day.mock.totalScore}
                                      </span>
                                      <span className="mt-0.5 hidden text-[8px] font-medium uppercase tracking-[0.08em] text-muted sm:inline sm:text-[9px] md:text-[10px]">
                                        MARKS
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      }),
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full rounded-xl border border-brand/10 bg-surface p-4">
              <p className="text-[14px] leading-5">
                <span className={`font-bold ${isDark ? "text-white/70" : "text-[#475569]"}`}>
                  Tip:
                </span>{" "}
                <span className={`font-normal ${isDark ? "text-white/70" : "text-[#475569]"}`}>
                  Tap a day to preview it. Past days open their history; future days open
                  planning.
                </span>
              </p>
            </div>
          </div>

          {/* Selected-day sidebar */}
          <div className="w-full lg:w-[320px]">
            <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-surface shadow-sm lg:min-h-195">
              <div className="border-b border-brand/10 p-6">
                <h2 className="text-[20px] font-bold leading-7 tracking-normal text-ink">
                  {new Date(`${selectedDate}T00:00:00.000Z`).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </h2>

                <DayStatusPill day={selectedDay} view={dayView} />
              </div>

              {dayLoading ? (
                <div className="flex-1 p-6 text-sm text-muted">Loading…</div>
              ) : dayView?.isFuture ? (
                <FuturePanel view={dayView} isDark={isDark} />
              ) : (
                <PastPanel view={dayView} isDark={isDark} />
              )}

              <div className="border-t border-brand/10 p-5">
                <Button
                  href={
                    dayView?.isFuture
                      ? `/plan/plan-day?date=${selectedDate}`
                      : `/plan/day-plan?date=${selectedDate}`
                  }
                  variant="primary"
                  className="h-12 w-full rounded-xl text-base font-semibold"
                >
                  {dayView?.isFuture ? "Plan This Day" : "View Day Plan"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayStatusPill({ day, view }: { day: CalendarDay | null; view: DayView | null }) {
  const label = (() => {
    if (view?.noStudyDay) return { text: "No-Study Day", tone: "cta" };
    if (view?.isFuture && view.scheduledMock) return { text: "Mock Scheduled", tone: "brand" };
    if (day?.hasMock) return { text: "Mock Day", tone: "brand" };
    if (view?.isFuture) return { text: "Planned", tone: "brand" };
    switch (day?.completionStatus) {
      case "COMPLETE":
        return { text: "Completed", tone: "success" };
      case "PARTIAL":
        return { text: "Partial", tone: "warning" };
      case "MISSED":
        return { text: "Missed", tone: "cta" };
      default:
        return { text: "No plan", tone: "muted" };
    }
  })();

  const tones: Record<string, string> = {
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    brand: "bg-tint text-ink",
    cta: "bg-tint text-cta",
    muted: "bg-tint text-muted",
  };

  return (
    <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 ${tones[label.tone]}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      <span className="text-xs font-semibold">{label.text}</span>
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
  valueClass = "text-ink",
  isDark,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClass?: string;
  isDark: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <span
          className={`text-[14px] font-medium leading-5 ${isDark ? "text-white/70" : "text-[#475569]"}`}
        >
          {label}
        </span>
      </div>
      <span className={`text-[14px] font-bold leading-5 ${valueClass}`}>{value}</span>
    </div>
  );
}

function PastPanel({ view, isDark }: { view: DayView | null; isDark: boolean }) {
  if (!view || !view.summary) {
    return <div className="flex-1 p-6 text-sm text-muted">No plan was generated for this day.</div>;
  }

  const { summary } = view;

  return (
    <>
      <div className="border-b border-brand/10 p-6">
        <div className="flex flex-col gap-5">
          <StatRow
            icon={<ClockIcon />}
            label="Study Time"
            value={formatFocus(summary.focusSeconds)}
            isDark={isDark}
          />
          <StatRow
            icon={<CompleteIcon className="h-4 w-4 md:h-[18px] md:w-[18px]" />}
            label="Tasks Completed"
            value={`${summary.tasksDone} / ${summary.tasksTotal}`}
            isDark={isDark}
          />
          <StatRow
            icon={<CheckInIcon />}
            label="Check-in"
            value={view.checkin ? (MOOD_LABEL[view.checkin.mood] ?? view.checkin.mood) : "—"}
            valueClass={view.checkin ? "text-success" : "text-muted"}
            isDark={isDark}
          />
          <StatRow
            icon={<BookIcon />}
            label="Streak"
            value={
              summary.streakStatus === "PROTECTED"
                ? "Protected"
                : summary.streakStatus === "MAINTAINED"
                  ? "Maintained"
                  : summary.streakStatus === "BROKEN"
                    ? "Reset"
                    : summary.streakStatus === "PENDING"
                      ? "In progress"
                      : "—"
            }
            isDark={isDark}
          />
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <h3 className="mb-6 text-[14px] font-bold leading-5 text-ink">Plan Summary</h3>

        {view.plan && view.plan.tasks.length > 0 ? (
          <div className="flex flex-col gap-4">
            {view.plan.tasks.slice(0, 6).map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CompleteIcon
                    className={`h-4 w-4 shrink-0 md:h-[18px] md:w-[18px] ${task.status === "COMPLETED" ? "text-success" : "text-muted/40"
                      }`}
                  />
                  <span
                    className={`truncate text-[13px] font-medium leading-5 ${isDark ? "text-white/70" : "text-[#475569]"}`}
                  >
                    {task.title}
                  </span>
                </div>
                <span
                  className={`shrink-0 text-[13px] font-medium leading-5 ${isDark ? "text-white/70" : "text-[#475569]"}`}
                >
                  {task.estimatedMinutes}m
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No tasks were planned for this day.</p>
        )}
      </div>
    </>
  );
}

function FuturePanel({ view, isDark }: { view: DayView; isDark: boolean }) {
  return (
    <div className="flex-1 px-6 py-6">
      <h3 className="mb-4 text-[14px] font-bold leading-5 text-ink">What&apos;s set for this day</h3>

      <div className="flex flex-col gap-4">
        {view.noStudyDay ? (
          <div className="rounded-xl border border-brand/10 p-4">
            <p className="text-sm font-semibold text-ink">No-Study Day</p>
            <p className="mt-1 text-xs text-muted">
              No plan will generate. Your streak stays protected, and this doesn&apos;t use your
              Streak Freeze.
            </p>
          </div>
        ) : (
          <p className={`text-sm ${isDark ? "text-white/70" : "text-[#475569]"}`}>
            A standard plan will generate for this day.
          </p>
        )}

        {view.scheduledMock && (
          <div className="rounded-xl border border-brand/10 p-4">
            <p className="text-sm font-semibold text-ink">
              {view.scheduledMock.mockName ?? "Mock Test"}
            </p>
            <p className="mt-1 text-xs text-muted">
              Plan will be light morning revision only.
            </p>
          </div>
        )}

        {view.anchorTasks.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-muted">
              <PinIcon />
              {view.anchorTasks.length} anchor task{view.anchorTasks.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-col gap-2">
              {view.anchorTasks.map((anchor) => (
                <div
                  key={anchor.id}
                  className="flex items-center justify-between rounded-lg bg-tint-strong px-3 py-2 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-1 text-ink">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span className="truncate">{anchor.title}</span>
                  </span>
                  <span className="shrink-0 text-muted">{anchor.durationMinutes}m</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view.anchorLoad?.exceedsTarget && (
          <p className="rounded-lg bg-warning-bg p-3 text-xs font-medium text-warning">
            Your anchors run past this day&apos;s target. Open the day to adjust.
          </p>
        )}
      </div>
    </div>
  );
}
