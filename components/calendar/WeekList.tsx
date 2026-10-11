"use client";

import type { WeekView } from "@/lib/api/calendarView";
import { heatLevel } from "@/lib/insights/heatmap";
import { formatMinutes } from "@/lib/study/format";

type Props = { week: WeekView; todayKey: string; onSelect: (key: string) => void };

function shortDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** One ISO week as seven rows with a bar for the time studied. */
export function WeekList({ week, todayKey, onSelect }: Props) {
  const peak = Math.max(60, ...week.days.map((d) => d.totalStudiedMinutes));
  return (
    <div className="flex flex-col gap-3" data-testid="week-view" data-week={week.isoWeek}>
      <ul className="flex flex-col gap-1.5">
        {week.days.map((d) => (
          <li key={d.date}>
            <button
              type="button"
              data-testid={`week-day-${d.date}`}
              data-level={heatLevel(d.totalStudiedMinutes)}
              onClick={() => onSelect(d.date)}
              className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${d.date === todayKey ? "border-cta" : "border-brand/10"} bg-surface hover:bg-tint-strong`}
            >
              <span className="w-24 shrink-0 text-[13px] font-bold text-ink">{shortDay(d.date)}</span>
              <span className="relative h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-tint-strong" aria-hidden>
                <span className="absolute inset-y-0 left-0 rounded-full bg-[#6366F1]" style={{ width: `${Math.round((d.totalStudiedMinutes / peak) * 100)}%` }} />
              </span>
              <span className="w-16 shrink-0 text-right text-[13px] font-semibold text-body-text dark:text-ink">{d.totalStudiedMinutes > 0 ? formatMinutes(d.totalStudiedMinutes) : "—"}</span>
              {d.hasWeeklyDiagnosis && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cta text-[10px] font-extrabold text-white">W</span>}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-[14px] font-semibold text-body-text dark:text-ink" data-testid="week-totals">
        {formatMinutes(week.totals.studiedMinutes)} studied · {formatMinutes(week.totals.focusedMinutes)} focused · {week.totals.activeDays} active day{week.totals.activeDays === 1 ? "" : "s"}
      </p>
      {week.weeklyReview && (
        <p className="rounded-lg bg-tint-strong px-3 py-2 text-[14px] font-semibold text-ink" data-testid="week-review">
          Weekly review ready{week.weeklyReview.title ? `: ${week.weeklyReview.title}` : ""}.
        </p>
      )}
    </div>
  );
}
