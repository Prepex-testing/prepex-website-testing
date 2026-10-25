"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { PlanExplanation, usePlanExplanation } from "@/components/planner/PlanExplanation";
import { PlanHeaderActions } from "@/components/planner/PlanHeaderActions";
import { StudyTaskCard } from "@/components/planner/StudyTaskCard";
import { TimelineRail } from "@/components/planner/TimelineRail";
import { WeeklyProgressStrip } from "@/components/planner/WeeklyProgressStrip";
import type { usePlanDay } from "@/components/planner/usePlanDay";
import { useTaskActions } from "@/components/planner/useTaskActions";
import { Toast, useToast } from "@/components/ui/Toast";
import { nowMinutes } from "@/lib/planner/format";

type Plan = ReturnType<typeof usePlanDay>;

const OUTLINE = "flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-secondary-button-border bg-transparent px-5 py-2 text-[14px] font-medium text-ink transition-colors hover:bg-tint-strong disabled:opacity-60";

/**
 * "Plan for Today" on Home: no card around it. The why-this-plan note, then the day as a timeline (study tasks as full
 * cards, the slots between them as dim bands), a way to the full plan, and the week's progress.
 */
export function HomePlanSection({ plan, onChanged }: { plan: Plan; onChanged?: () => void }) {
  const toast = useToast();
  const [nowMin, setNowMin] = useState(() => nowMinutes());
  const [buildError, setBuildError] = useState<string | null>(null);
  const actions = useTaskActions(async () => {
    await plan.refresh();
    onChanged?.();
  }, toast.show);
  const explanation = usePlanExplanation(plan.day);
  const day = plan.day;

  useEffect(() => {
    const id = window.setInterval(() => setNowMin(nowMinutes()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const live = day ? day.tasks.filter((t) => t.status !== "rolled_over") : [];
  const firstOpen = live.filter((t) => t.status === "pending" || t.status === "in_progress").sort((a, b) => (a.startMin ?? 9999) - (b.startMin ?? 9999))[0];

  async function build() {
    setBuildError(null);
    const err = await plan.build("SCHEDULED");
    if (err) setBuildError(err);
  }

  return (
    <section aria-label="Plan for today" data-testid="home-plan" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 data-coach="page-header" className="text-[20px] font-bold leading-tight text-ink">
          Plan for Today
        </h3>
        <PlanHeaderActions plan={plan} notify={toast.show} />
      </div>

      {day && <PlanExplanation text={explanation.text} loading={explanation.loading} />}

      {plan.status === "loading" && (
        <div role="status" aria-label="Loading your plan" className="flex flex-col gap-3" data-testid="home-plan-loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-tint-strong dark:bg-[#FAF7F214]" />
          ))}
        </div>
      )}

      {plan.status === "error" && !day && (
        <div role="alert" data-testid="plan-error" className="flex flex-col items-center gap-3 rounded-2xl border border-brand/10 px-4 py-8 text-center">
          <p className="text-[14px] text-muted">Couldn&apos;t build your plan — tap retry.</p>
          <button type="button" data-testid="plan-retry" onClick={() => void plan.refresh()} className={OUTLINE}>
            <RefreshCw className="size-4" aria-hidden /> Retry
          </button>
        </div>
      )}

      {day && live.length === 0 && (
        <div data-testid="plan-empty" className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand/25 px-4 py-8 text-center">
          <p className="text-[14px] text-muted">{day.mode === "manual" ? "Nothing planned yet. Add the tasks you want to do today." : "No plan for today yet."}</p>
          {day.mode !== "manual" && (
            <button type="button" data-testid="plan-build" disabled={plan.building} onClick={() => void build()} className={OUTLINE}>
              {plan.building ? "Building…" : "Build today's plan"}
            </button>
          )}
          {buildError && (
            <p role="alert" className="text-[13px] font-medium text-danger">
              {buildError}
            </p>
          )}
        </div>
      )}

      {day && live.length > 0 && (
        <TimelineRail
          tasks={live}
          bands={day.bands}
          bandMode="between"
          nowMin={day.isToday ? nowMin : null}
          renderTask={(task) => (
            <StudyTaskCard
              task={task}
              {...(firstOpen?.id === task.id ? { coachAnchor: "start-session" } : {})}
              onStart={(t) => void actions.start(t)}
              onMarkDone={actions.markDone}
              onSkip={(t) => void actions.skip(t)}
              onTomorrow={(t) => void actions.tomorrow(t)}
              onDelete={actions.askDelete}
            />
          )}
        />
      )}

      {plan.status === "error" && day && (
        <p role="alert" className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-danger" data-testid="plan-stale">
          Couldn&apos;t refresh your plan.
          <button type="button" onClick={() => void plan.refresh()} className="min-h-9 rounded-lg px-2 underline">
            Retry
          </button>
        </p>
      )}

      {day && (
        <Link href="/planner" data-testid="see-full-plan" className="flex min-h-11 items-center gap-1.5 self-start text-[14px] font-semibold text-ink underline-offset-2 hover:underline">
          See today&apos;s full plan <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}

      <WeeklyProgressStrip />

      {actions.overlays}
      <Toast state={toast} />
    </section>
  );
}
