"use client";

import Link from "next/link";
import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { PlanTaskCard } from "@/components/planner/PlanTaskCard";
import { useTaskActions } from "@/components/planner/useTaskActions";
import type { usePlanDay } from "@/components/planner/usePlanDay";
import { Toast, useToast } from "@/components/ui/Toast";
import { daySummaryText, openTasks } from "@/lib/planner/format";

type Plan = ReturnType<typeof usePlanDay>;

const SHOWN = 3;

/**
 * 3. Today's Plan: the next three things to do, each with its own Start button, and a way into the whole plan.
 * A planner failure shows a calm retry here and nowhere else: the rest of Home keeps working.
 */
export function TodayPlanCard({ plan, onChanged }: { plan: Plan; onChanged?: () => void }) {
  const toast = useToast();
  const [buildError, setBuildError] = useState<string | null>(null);
  const actions = useTaskActions(async () => {
    await plan.refresh();
    onChanged?.();
  }, toast.show);

  const day = plan.day;
  const upcoming = day ? openTasks(day.tasks) : [];
  const shown = upcoming.slice(0, SHOWN);
  const extra = Math.max(0, upcoming.length - shown.length);
  const hasTasks = (day?.tasks.length ?? 0) > 0;
  const allDone = hasTasks && upcoming.length === 0;

  async function buildToday() {
    setBuildError(null);
    const err = await plan.build("SCHEDULED");
    if (err) setBuildError(err);
  }

  return (
    <section aria-label="Today's plan" data-testid="today-plan-card" className="overflow-hidden rounded-3xl border border-brand/10 bg-surface shadow-hover">
      <div className="flex items-start justify-between gap-3 border-b border-brand/10 px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6366F1] dark:bg-[#FAF7F2] dark:text-[#111145]">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 data-coach="page-header" className="w-fit text-[18px] font-extrabold leading-tight text-ink">
              Today&apos;s Plan
            </h2>
            <p className="mt-0.5 text-[12px] text-muted" data-testid="today-plan-summary">
              {day && hasTasks ? daySummaryText(day.summary.plannedMinutes, day.summary.doneMinutes) : "Your next steps, in order"}
            </p>
          </div>
        </div>
        {day && hasTasks && (
          <span className="shrink-0 rounded-full bg-tint-strong px-3 py-1 text-[12px] font-bold text-ink dark:bg-[#FAF7F214]" data-testid="today-plan-percent">
            {day.summary.percent}%
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4 sm:p-5">
        {plan.status === "loading" && (
          <div role="status" aria-label="Loading your plan" className="flex flex-col gap-3" data-testid="today-plan-loading">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-tint-strong dark:bg-[#FAF7F214]" />
            ))}
          </div>
        )}

        {plan.status === "error" && !day && (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl bg-danger-bg p-4" data-testid="today-plan-error">
            <p className="text-[14px] font-semibold text-danger">Couldn&apos;t build your plan — tap retry.</p>
            <button type="button" data-testid="today-plan-retry" onClick={() => void plan.refresh()} className="flex min-h-11 items-center gap-2 rounded-lg border border-danger/40 px-4 text-[14px] font-semibold text-danger hover:bg-surface">
              <RefreshCw className="size-4" aria-hidden /> Retry
            </button>
          </div>
        )}

        {plan.status !== "loading" && day && !hasTasks && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand/25 px-4 py-6 text-center" data-testid="today-plan-empty">
            <p className="text-[16px] font-bold text-ink">{day.mode === "manual" ? "Nothing planned yet" : "No plan for today yet"}</p>
            <p className="text-[13px] text-muted">
              {day.mode === "manual" ? "You are in manual mode. Add the tasks you want to do today." : "Prepex builds it from your weekly goals, your timetable and what is due for revision."}
            </p>
            {day.mode === "manual" ? (
              <Link href="/planner" data-testid="today-plan-add" className="flex min-h-12 w-full items-center justify-center rounded-lg border border-primary-button-border bg-cta px-4 text-[15px] font-semibold text-white hover:bg-[#E8623F]">
                Add a task
              </Link>
            ) : (
              <button type="button" data-testid="today-plan-build" disabled={plan.building} onClick={() => void buildToday()} className="min-h-12 w-full rounded-lg border border-primary-button-border bg-cta px-4 text-[15px] font-semibold text-white hover:bg-[#E8623F] disabled:opacity-60">
                {plan.building ? "Building…" : "Build today's plan"}
              </button>
            )}
            {buildError && (
              <p role="alert" className="text-[13px] font-semibold text-danger" data-testid="today-plan-build-error">
                {buildError}
              </p>
            )}
          </div>
        )}

        {shown.length > 0 && (
          <ul className="flex flex-col gap-3" data-testid="today-plan-tasks">
            {shown.map((task) => (
              <li key={task.id}>
                <PlanTaskCard
                  task={task}
                  compact
                  onStart={(t) => void actions.start(t)}
                  onOpen={() => undefined}
                  onMarkDone={actions.markDone}
                  onSkip={(t) => void actions.skip(t)}
                  onTomorrow={(t) => void actions.tomorrow(t)}
                  onDelete={actions.askDelete}
                />
              </li>
            ))}
          </ul>
        )}

        {allDone && (
          <p className="rounded-2xl bg-[var(--success-bg)] px-4 py-3 text-center text-[14px] font-bold text-[var(--success)]" data-testid="today-plan-alldone">
            Everything on today&apos;s plan is done. Nice work.
          </p>
        )}

        {plan.status === "error" && day && (
          <p role="alert" className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-danger" data-testid="today-plan-stale">
            Couldn&apos;t refresh your plan.
            <button type="button" onClick={() => void plan.refresh()} className="min-h-9 rounded-lg px-2 underline">
              Retry
            </button>
          </p>
        )}

        {day && (
          <Link href="/planner" data-testid="see-full-plan" className="flex min-h-12 items-center justify-center rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[14px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
            See full plan{extra > 0 ? ` (${extra} more)` : ""}
          </Link>
        )}
      </div>
      {actions.overlays}
      <Toast state={toast} />
    </section>
  );
}
