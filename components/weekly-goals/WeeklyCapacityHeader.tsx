import type { ReactNode } from "react";
import { hoursText } from "@/lib/goals/v2";
import { formatDuration } from "@/lib/planner/format";

type Props = {
  /** "19 – 25 Oct" */
  weekRange: string;
  daysLeftLabel: string;
  /** "this week" or "that week" when planning ahead. */
  weekWord: string;
  /** The hours the week's timetable holds; null while unknown. */
  availableMinutes: number | null;
  /** The time every live goal asks for. */
  allocatedMinutes: number;
  done: number;
  total: number;
  percent: number;
  onJumpToIncomplete: () => void;
  /** The "Suggest this week's goals" button. */
  action: ReactNode;
};

const hours = (minutes: number) => `${Math.round((minutes / 60) * 10) / 10}h`;

/**
 * The strip at the top of the goals screen: how many hours the week holds, how much of that the goals use, and how
 * many goals are done. Single use: this screen.
 */
export function WeeklyCapacityHeader({ weekRange, daysLeftLabel, weekWord, availableMinutes, allocatedMinutes, done, total, percent, onJumpToIncomplete, action }: Props) {
  const known = availableMinutes !== null && availableMinutes > 0;
  const full = known ? Math.round((allocatedMinutes / availableMinutes) * 100) : 0;
  const over = known && allocatedMinutes > availableMinutes;
  const complete = total > 0 && percent === 100;

  return (
    <section aria-label="This week's hours" className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-elevated p-4 sm:p-5" data-testid="capacity-header">
      <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">
        <span className="rounded-full border border-border-subtle bg-surface-elevated-2 px-3 py-1.5" data-testid="week-range">
          {weekRange}
        </span>
        <span className="rounded-full border border-border-subtle bg-surface-elevated-2 px-3 py-1.5" data-testid="days-left">
          {daysLeftLabel}
        </span>
        {total > 0 && (
          <button
            type="button"
            data-testid="week-summary"
            onClick={onJumpToIncomplete}
            className={`rounded-full border bg-surface-elevated-2 px-3 py-1.5 transition-colors hover:bg-tint-strong ${complete ? "border-saffron text-saffron" : "border-border-subtle text-ink"}`}
          >
            {done}/{total} done · {percent}%
          </button>
        )}
        <div className="sm:ml-auto">{action}</div>
      </div>

      {known && (
        <div className="flex flex-col gap-2" data-testid="capacity">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-[14px] text-slate-500 dark:text-slate-400">
            <p data-testid="hours-available">You have {hoursText(availableMinutes)} available {weekWord}</p>
            <p data-testid="hours-per-day">~{hours(availableMinutes / 7)} per day</p>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded bg-black/[0.08] dark:bg-white/[0.08]"
            role="progressbar"
            aria-label="Hours allocated"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, full)}
            data-over={over}
          >
            <div
              data-testid="capacity-fill"
              className={`h-full rounded transition-[width] duration-500 ${over ? "bg-[#D97706]/70" : "bg-slate-700 dark:bg-white/[0.55]"}`}
              style={{ width: `${Math.min(100, full)}%` }}
            />
          </div>
          <p className={`text-[13px] ${over ? "font-semibold text-[#D97706]" : "text-slate-500 dark:text-slate-400"}`} data-testid="capacity-label">
            {over
              ? `Over-committed by ${formatDuration(allocatedMinutes - availableMinutes)}. Reduce or redistribute.`
              : `${formatDuration(allocatedMinutes)} of ${formatDuration(availableMinutes)} allocated · ${full}% full`}
          </p>
        </div>
      )}
    </section>
  );
}
