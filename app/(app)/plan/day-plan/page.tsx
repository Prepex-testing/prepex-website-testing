"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  ArrowLeftIcon,
  // BellIcon,
  CheckIcon,
  BoltIcons,
  BatteryIcon,
} from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  getDayView,
  formatDayLabel,
  todayDateKey,
  shiftDateKey,
  type DayView,
} from "@/lib/api/calendar";

const MOOD_LABEL: Record<string, string> = {
  DRAINED: "Drained",
  HEAVY: "Heavy",
  STEADY: "Steady",
  GOOD: "Good",
  STRONG: "Strong",
};

/** Bar heights for the 7-day energy strip. A day with no check-in gets a stub. */
const MOOD_HEIGHT: Record<string, number> = {
  DRAINED: 25,
  HEAVY: 40,
  STEADY: 55,
  GOOD: 75,
  STRONG: 100,
};

function formatDuration(seconds: number): string {
  const total = Math.round(seconds / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** The badge next to the date — what kind of day this was. */
function dayBadge(view: DayView): string | null {
  if (view.noStudyDay) return "NO-STUDY DAY";
  if (view.mockDay) return "MOCK DAY";
  if (view.summary?.isRecoveryWeek) return "RECOVERY DAY";
  if (view.summary?.isBadDayPlan) return "BAD DAY PROTOCOL";
  if (view.isToday) return "TODAY";
  return null;
}

function dayNarrative(view: DayView): string | null {
  if (view.noStudyDay) {
    return "You marked this as a No-Study Day. No plan was generated, and your streak stayed protected.";
  }
  if (view.summary?.isBadDayPlan) {
    return "Bad Day Protocol was active. The plan shrank to the smallest thing worth finishing.";
  }
  if (view.summary?.isRecoveryWeek) {
    return "Plan was lighter today. Energy was heavy, so recovery activated automatically.";
  }
  if (view.mockDay) {
    return "Mock day. The plan stayed light so the test had your full attention.";
  }
  return view.plan?.aiSummary ?? null;
}

function DayPlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const today = useMemo(() => todayDateKey(), []);
  const date = searchParams.get("date") ?? today;

  const [view, setView] = useState<DayView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data } = await getDayView(date);
        if (cancelled) return;
        // A future date has no history to show — send it to planning instead
        // of rendering an empty history page.
        if (data.isFuture) {
          router.replace(`/plan/plan-day?date=${date}`);
          return;
        }
        setView(data);
      } catch {
        if (!cancelled) setView(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date, router]);

  const step = (delta: number) => {
    router.replace(`/plan/day-plan?date=${shiftDateKey(date, delta)}`);
  };

  if (loading) return <PageLoader label="Loading this day…" />;

  const summary = view?.summary;
  const badge = view ? dayBadge(view) : null;
  const narrative = view ? dayNarrative(view) : null;
  const tasks = view?.plan?.tasks ?? [];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <Link href="/plan" aria-label="Back to Plan" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Day Plan</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3">
        <h2 className="w-full font-['Plus_Jakarta_Sans'] text-[15px] font-bold leading-5 text-ink sm:w-auto sm:text-[16px] sm:leading-[21px] md:text-[18px] md:leading-[23px]">
          {formatDayLabel(date)}
        </h2>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <button
            type="button"
            onClick={() => step(-1)}
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-sm border border-brand/10 bg-surface text-ink transition-colors hover:bg-tint-strong"
            aria-label="Previous day"
          >
            <ArrowLeftIcon />
          </button>

          <button
            type="button"
            onClick={() => step(1)}
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-sm border border-brand/10 bg-surface text-ink transition-colors hover:bg-tint-strong"
            aria-label="Next day"
          >
            <span className="rotate-180">
              <ArrowLeftIcon />
            </span>
          </button>

          {badge && (
            <span
              className={`shrink-0 rounded-full px-3 py-1 font-['Plus_Jakarta_Sans'] text-[10px] font-bold uppercase tracking-[0.5px] sm:text-[11px] sm:tracking-[0.6px] md:text-[12px] ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"
                }`}
            >
              {badge}
            </span>
          )}
        </div>
      </div>

      {!view || (!view.plan && !view.checkin && !view.noStudyDay) ? (
        <div className="rounded-2xl border border-brand/10 bg-surface p-10 text-center">
          <p className="text-lg font-semibold text-ink">Nothing recorded for this day</p>
          <p className="mt-2 text-sm text-muted">
            No plan was generated and no check-in was logged.
          </p>
        </div>
      ) : (
        <>
          {narrative && (
            <div className="flex w-full items-start gap-3 rounded-2xl border border-brand/10 bg-surface p-4 sm:items-center sm:gap-4 sm:p-5 md:p-6">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 ${isDark ? "bg-white" : "bg-tint-strong"
                  }`}
              >
                <div className="flex h-5 w-5 items-center justify-center sm:h-6 sm:w-6">
                  <BoltIcons
                    className={`h-4 w-4 sm:h-4.5 sm:w-4 ${isDark ? "text-[#1A1A4E]" : "text-ink"
                      }`}
                  />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="break-words font-[Plus_Jakarta_Sans] text-[14px] font-medium leading-5 tracking-normal text-ink sm:text-[16px] sm:leading-6 md:text-[18px] md:leading-[29.25px]">
                  {narrative}
                </p>
              </div>
            </div>
          )}

          <div className="grid w-full grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
            {/* Tasks completed */}
            <div className="flex h-[247px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-brand/10 bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <div className="flex h-[132px] w-[132px] items-center justify-center">
                <CircularProgress
                  percent={summary?.completionRate ?? 0}
                  displayValue={`${summary?.tasksDone ?? 0}/${summary?.tasksTotal ?? 0}`}
                  suffix=""
                  size={132}
                  progressColor="#28B485"
                />
              </div>

              <p className="font-['Plus_Jakarta_Sans'] text-[12px] font-bold uppercase leading-4 tracking-[1.2px] text-muted">
                TASKS COMPLETED
              </p>

              <p className="font-['Plus_Jakarta_Sans'] text-[30px] font-bold leading-9 text-ink">
                {summary?.tasksDone ?? 0} of {summary?.tasksTotal ?? 0}
              </p>
            </div>

            {/* Focus time */}
            <div className="flex h-[247px] w-full flex-col rounded-2xl border border-brand/10 bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <div className="flex flex-col items-center">
                <p
                  className={`font-['Plus_Jakarta_Sans'] text-[12px] font-bold uppercase leading-4 tracking-[1.2px] ${isDark ? "text-white" : "text-muted"}`}
                >
                  FOCUS TIME
                </p>

                <h2 className="mt-3 font-['Plus_Jakarta_Sans'] text-[30px] font-bold leading-[36px] text-ink">
                  {formatDuration(summary?.focusSeconds ?? 0)}
                </h2>

                <p className="mt-3 text-[12px] leading-4 text-muted">
                  of {formatMinutes(summary?.plannedMinutes ?? 0)} planned
                </p>
              </div>

              <div className="flex-1" />
              <div className="mx-2 border-t border-brand/10" />

              <div className="mx-2 mt-4 flex max-h-[92px] flex-col gap-3 overflow-y-auto">
                {(summary?.focusBySubject ?? []).length > 0 ? (
                  summary!.focusBySubject.map((item) => (
                    <div key={item.subject} className="flex items-center justify-between">
                      <span className={`text-[12px] leading-4 ${isDark ? "text-white" : "text-muted"}`}>
                        {item.subject}
                      </span>
                      <span className="text-[12px] font-semibold leading-4 text-ink">
                        {formatDuration(item.seconds)} / {formatMinutes(item.plannedMinutes)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] leading-4 text-muted">No focus time logged.</p>
                )}
              </div>
            </div>

            {/* Daily energy */}
            <div className="flex h-[247px] w-full flex-col items-center rounded-2xl border border-brand/10 bg-surface px-5 pb-7 pt-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <p
                className={`font-['Plus_Jakarta_Sans'] text-[12px] font-bold uppercase leading-4 tracking-[1.2px] ${isDark ? "text-white" : "text-muted"}`}
              >
                DAILY ENERGY
              </p>

              <div className="mt-3 flex items-center justify-center gap-2">
                <BatteryIcon className="text-cta" />
                <span className="font-['Plus_Jakarta_Sans'] text-[20px] font-bold uppercase leading-7 text-cta">
                  {view.checkin ? (MOOD_LABEL[view.checkin.mood] ?? view.checkin.mood) : "NO CHECK-IN"}
                </span>
              </div>

              <div className="mt-10 flex flex-col items-center">
                <div className="flex h-10 items-end gap-1">
                  {view.energyTrend.map((point) => (
                    <div
                      key={point.date}
                      title={`${point.date}: ${point.mood ? (MOOD_LABEL[point.mood] ?? point.mood) : "no check-in"}`}
                      className={`w-[8px] rounded-sm ${point.isSelected ? "bg-brand" : "bg-tint-strong"}`}
                      style={{ height: `${point.mood ? (MOOD_HEIGHT[point.mood] ?? 40) : 10}%` }}
                    />
                  ))}
                </div>

                <p className="mt-3 font-['Plus_Jakarta_Sans'] text-[12px] font-bold uppercase tracking-[1.2px] text-muted">
                  7-DAY TREND
                </p>
              </div>
            </div>
          </div>

          {/* Task log */}
          <div className="w-full rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
            <div className="flex h-[45px] items-start border-b border-brand/10 pb-4">
              <h2 className="font-['Plus_Jakarta_Sans'] text-[18px] font-bold uppercase leading-7 tracking-[-0.45px] text-ink">
                TASK LOG
              </h2>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted">No tasks were planned for this day.</p>
              ) : (
                tasks.map((task) => {
                  const done = task.status === "COMPLETED";
                  const skipped = task.status === "SKIPPED";
                  return (
                    <div
                      key={task.id}
                      className="flex min-h-[70px] items-center justify-between rounded-lg border border-brand/10 px-3 py-3"
                    >
                      <div className="flex flex-1 items-center gap-4 overflow-hidden">
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                          {done ? (
                            <div className="flex h-4 w-4 items-center justify-center rounded bg-success">
                              <CheckIcon />
                            </div>
                          ) : (
                            <div className="flex h-4 w-4 items-center justify-center rounded bg-muted/30">
                              <div className="h-2 w-2 rounded-full bg-surface" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 font-['Plus_Jakarta_Sans'] text-[16px] font-semibold leading-6 text-ink">
                            <span className="truncate">{task.subject?.name ?? "Study"}</span>
                            {task.isAnchor && (
                              <span className="shrink-0 rounded-sm bg-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
                                Custom
                              </span>
                            )}
                          </p>
                          <p className="truncate font-['Plus_Jakarta_Sans'] text-[14px] font-normal leading-5 text-muted">
                            {task.title}
                          </p>
                        </div>
                      </div>

                      <div className="ml-4 shrink-0">
                        {done ? (
                          <span className="rounded-sm bg-success/10 px-3 py-1 font-['Plus_Jakarta_Sans'] text-[12px] font-semibold uppercase leading-4 text-success">
                            DONE
                          </span>
                        ) : (
                          <span className="rounded-sm bg-tint px-3 py-1 font-['Plus_Jakarta_Sans'] text-[12px] font-semibold leading-4 text-ink">
                            {skipped ? "Skipped" : "Pending"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Streak status */}
          <div className="rounded-2xl border border-brand/10 bg-surface p-5">
            <p
              className={`text-xs font-bold uppercase tracking-wide ${isDark ? "text-white" : "text-muted"}`}
            >
              Streak Status
            </p>
            <p className="mt-1 text-lg font-bold text-ink">
              {summary?.streakStatus === "PROTECTED"
                ? "Protected"
                : summary?.streakStatus === "MAINTAINED"
                  ? "Maintained"
                  : summary?.streakStatus === "BROKEN"
                    ? "Reset"
                    : summary?.streakStatus === "PENDING"
                      ? "In progress"
                      : "—"}
            </p>
            <p className="text-xs text-muted">
              {summary?.streakStatus === "PROTECTED"
                ? "You marked this a No-Study Day ahead of time, so it bridged your streak without spending a Streak Freeze."
                : summary?.streakStatus === "MAINTAINED"
                  ? `${view.streakCount ?? 0} days and counting. You showed up.`
                  : summary?.streakStatus === "BROKEN"
                    ? "The streak reset here. It starts again the next day you check in."
                    : summary?.streakStatus === "PENDING"
                      ? `${view.streakCount ?? 0} days and counting. Today still counts once you meet any one of the three criteria.`
                      : "No check-in was logged for this day."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function DayPlanPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading this day…" />}>
      <DayPlanContent />
    </Suspense>
  );
}
