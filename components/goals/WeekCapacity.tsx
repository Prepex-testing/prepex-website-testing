"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { WeekSummary } from "@/lib/api/plannerV2";
import { fitFor, hoursText } from "@/lib/goals/v2";

type Props = {
  summary: WeekSummary | null;
  /** Minutes the goals (saved and not yet saved) add up to, so the bar moves as the student adds tasks. */
  allocatedMinutes: number;
  unsavedMinutes: number;
};

const BAR = { empty: "bg-brand/30", under: "bg-cta", perfect: "bg-[var(--success)]", over: "bg-[var(--warning)]" } as const;

/** The strip at the top of the weekly goals screen: hours available, hours per day, and a live bar of what is allocated. */
export function WeekCapacity({ summary, allocatedMinutes, unsavedMinutes }: Props) {
  if (!summary) {
    return <div className="h-32 animate-pulse rounded-2xl bg-tint-strong dark:bg-[#FAF7F214]" aria-hidden data-testid="capacity-loading" />;
  }
  const fit = fitFor(summary.availableMinutes, allocatedMinutes);
  const perDay = summary.perStudyDayMinutes;
  const percent = fit.percent;

  return (
    <section
      aria-label="Hours this week"
      data-testid="week-capacity"
      data-fit={fit.state}
      className={`flex flex-col gap-3 rounded-2xl border p-4 ${fit.state === "over" ? "border-[var(--warning)]/50 bg-[var(--warning-bg)]" : "border-brand/10 bg-surface"}`}
    >
      <div>
        <p className="text-[18px] font-extrabold leading-snug text-ink" data-testid="capacity-available">
          You have {hoursText(summary.availableMinutes)} available this week
        </p>
        <p className="mt-0.5 text-[13px] text-muted" data-testid="capacity-per-day">
          Roughly {hoursText(perDay)} per day
        </p>
      </div>

      <div>
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-tint-strong dark:bg-[#FAF7F214]"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${hoursText(allocatedMinutes)} of ${hoursText(summary.availableMinutes)} allocated`}
        >
          <div className={`h-full rounded-full transition-[width] duration-300 ${BAR[fit.state]}`} style={{ width: `${percent}%` }} data-testid="capacity-bar" />
        </div>
        <p className="mt-1.5 text-[13px] font-semibold text-body-text dark:text-ink" data-testid="capacity-allocated">
          {hoursText(allocatedMinutes)} of {hoursText(summary.availableMinutes)} allocated
          {unsavedMinutes > 0 && <span className="font-normal text-muted"> · {hoursText(unsavedMinutes)} not saved yet</span>}
        </p>
      </div>

      {fit.state === "over" && (
        <p role="status" className="text-[14px] font-bold leading-snug text-ink" data-testid="capacity-over">
          You&apos;ve over-committed by {hoursText(fit.overMinutes)}. Reduce or redistribute.
        </p>
      )}
      {fit.state === "perfect" && (
        <p role="status" className="flex items-center gap-1.5 text-[14px] font-bold text-[var(--success)]" data-testid="capacity-perfect">
          <Check className="size-4" strokeWidth={3} aria-hidden /> Perfect fit
        </p>
      )}
      {fit.state === "under" && fit.remainingMinutes >= 60 && (
        <p className="text-[13px] text-muted" data-testid="capacity-room">
          Room for {hoursText(fit.remainingMinutes)} more.
        </p>
      )}

      {summary.defaultTimetable && (
        <p className="text-[12px] text-muted" data-testid="capacity-default-timetable">
          These hours come from a standard day because you have no timetable yet.{" "}
          <Link href="/timetable" className="font-semibold text-ink underline underline-offset-2">
            Add yours
          </Link>{" "}
          for exact numbers.
        </p>
      )}
    </section>
  );
}
