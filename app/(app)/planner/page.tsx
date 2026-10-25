"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EndOfDay, isEndOfDay } from "@/components/planner/EndOfDay";
import { ModeToggle } from "@/components/planner/ModeToggle";
import { PlanExplanation, usePlanExplanation } from "@/components/planner/PlanExplanation";
import { PlanHeaderActions } from "@/components/planner/PlanHeaderActions";
import { PlanSidePanel, useIsDesktop } from "@/components/planner/PlanSidePanel";
import { StudyTaskCard } from "@/components/planner/StudyTaskCard";
import { TimelineRail } from "@/components/planner/TimelineRail";
import { usePlanDay } from "@/components/planner/usePlanDay";
import { useTaskActions } from "@/components/planner/useTaskActions";
import { PageLoader } from "@/components/ui/PageLoader";
import { Toast, useToast } from "@/components/ui/Toast";
import { ApiError } from "@/lib/api/http";
import { addPlanTask } from "@/lib/api/plannerV2";
import { dateKey, daySummaryText, nowMinutes, shiftDate } from "@/lib/planner/format";
import { trackPlanner } from "@/lib/telemetry/planner";

const OUTLINE = "flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-secondary-button-border bg-transparent px-5 py-2 text-[14px] font-medium text-ink transition-colors hover:bg-tint-strong disabled:opacity-60";

/** "Today's Plan", or the weekday when a link opened another day. */
function titleFor(date: string, today: string): string {
  if (date === today) return "Today's Plan";
  if (date === shiftDate(today, 1)) return "Tomorrow's Plan";
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return `${new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "long" })}'s Plan`;
}

function PlannerScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const today = dateKey();
  const requested = params.get("day");
  // The day tabs are gone; a link can still open another day (the end-of-day screen does for tomorrow).
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;

  const plan = usePlanDay(date);
  const toast = useToast();
  const desktop = useIsDesktop();
  const [highlight, setHighlight] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [nowMin, setNowMin] = useState(() => nowMinutes());
  const viewed = useRef<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMin(nowMinutes()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const refresh = plan.refresh;
  const actions = useTaskActions(refresh, toast.show);
  const day = plan.day;
  const explanation = usePlanExplanation(day);

  useEffect(() => {
    if (!day || viewed.current === `${day.date}:${day.tasks.length}`) return;
    viewed.current = `${day.date}:${day.tasks.length}`;
    trackPlanner("planner_view", { tab: day.date === today ? "today" : "other", tasks: day.tasks.length, mode: day.mode });
  }, [day, today]);

  async function addSuggestion(input: Parameters<typeof addPlanTask>[0]) {
    try {
      const res = await addPlanTask({ ...input, date });
      trackPlanner("planner_add_task", { kind: input.kind, via: "suggestion", origin: input.origin });
      toast.show("Added to your plan.");
      setHighlight(res.data.task.id);
      await refresh();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Couldn't add that.");
    }
  }

  async function build() {
    setBuildError(null);
    const err = await plan.build("SCHEDULED");
    if (err) setBuildError(err);
  }

  if (plan.status === "loading") return <PageLoader label="Building your day…" />;
  if (!day) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center" data-testid="planner-error">
        <p role="alert" className="text-[16px] font-bold text-ink">
          {plan.error ?? "Couldn't build your plan — tap retry."}
        </p>
        <button type="button" onClick={() => void plan.refresh()} className={OUTLINE}>
          Retry
        </button>
      </div>
    );
  }

  const manual = day.mode === "manual";
  const visible = day.tasks.filter((t) => t.status !== "rolled_over");
  const rolling = day.tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
  const ended = isEndOfDay({ isToday: day.isToday, nowMin, tasks: day.tasks, studyBlocks: day.studyBlocks });
  const warnings = day.plan?.warnings ?? [];
  const notes = day.plan?.polishNotes ?? [];
  const dateLabel = new Date(`${day.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 p-4 pb-24 sm:p-6 lg:p-8 min-[1440px]:max-w-[1400px]" data-testid="planner-page" data-layout={desktop ? "two-column" : "single-column"}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-extrabold leading-tight text-ink" data-testid="plan-title">
            {titleFor(day.date, today)}
          </h1>
          <p className="mt-1 text-[14px] text-muted" data-testid="day-summary">
            {dateLabel} · {daySummaryText(day.summary.plannedMinutes, day.summary.doneMinutes).replace(" • ", " · ")}
          </p>
          {day.date !== today && (
            <Link href="/planner" className="mt-1 inline-flex min-h-9 items-center text-[13px] font-semibold text-ink underline">
              Back to today
            </Link>
          )}
        </div>
        <div className="flex flex-col items-end gap-3">
          <PlanHeaderActions
            plan={plan}
            date={date}
            notify={toast.show}
            onAdded={(task) => {
              setHighlight(task.id);
              window.setTimeout(() => document.querySelector(`[data-task-id="${task.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
              window.setTimeout(() => setHighlight(null), 2200);
            }}
          />
          <ModeToggle
            mode={day.mode}
            onChanged={async (mode) => {
              toast.show(mode === "manual" ? "Manual mode is on." : "Auto mode is on.");
              await plan.refresh();
            }}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          {!desktop && <PlanExplanation text={explanation.text} loading={explanation.loading} />}

          {plan.status === "error" && (
            <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-danger-bg px-4 py-3 text-[13px] font-semibold text-danger">
              {plan.error}
              <button type="button" onClick={() => void plan.refresh()} className="underline">
                Retry
              </button>
            </p>
          )}

          {warnings.length > 0 && (
            <ul className="flex flex-col gap-2" data-testid="plan-warnings">
              {warnings.map((w) => (
                <li key={`${w.code}-${w.message}`} className="rounded-xl bg-warning-bg px-4 py-3 text-[13px] font-semibold leading-snug text-ink">
                  {w.message}
                </li>
              ))}
            </ul>
          )}
          {notes.length > 0 && (
            <ul className="flex flex-col gap-2" data-testid="plan-notes">
              {notes.map((n) => (
                <li key={`${n.kind}-${n.message}`} className="rounded-xl border border-brand/10 bg-surface px-4 py-3 text-[13px] leading-snug text-body-text dark:text-ink">
                  <span className="mr-2 rounded-full bg-tint-strong px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink dark:bg-[#FAF7F214]">{n.kind === "insight" ? "Insight" : "AI tweak"}</span>
                  {n.message}
                </li>
              ))}
            </ul>
          )}

          {ended && <EndOfDay percent={day.summary.percent} rolling={rolling} onOpenTomorrow={() => router.replace(`/planner?day=${shiftDate(today, 1)}`)} />}

          {visible.length === 0 ? (
            <section className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-brand/25 p-8 text-center" data-testid="planner-empty">
              <p className="text-[16px] font-bold leading-snug text-ink">
                {manual ? "You're in manual mode. Add tasks yourself with Add task." : "No plan yet for this day. Build it from your weekly goals."}
              </p>
              {!manual && (
                <button type="button" data-testid="build-plan" disabled={plan.building} onClick={() => void build()} className={OUTLINE}>
                  {plan.building ? "Building…" : "Build today's plan"}
                </button>
              )}
              {buildError && (
                <p role="alert" className="text-[13px] font-medium text-danger">
                  {buildError}
                </p>
              )}
            </section>
          ) : (
            <TimelineRail
              tasks={visible}
              bands={day.bands}
              bandMode="all"
              nowMin={day.isToday ? nowMin : null}
              highlightId={highlight}
              renderTask={(task) => (
                <StudyTaskCard
                  task={task}
                  onStart={(t) => void actions.start(t)}
                  onMarkDone={actions.markDone}
                  onSkip={(t) => void actions.skip(t)}
                  onTomorrow={(t) => void actions.tomorrow(t)}
                  onDelete={actions.askDelete}
                />
              )}
            />
          )}

          {day.slotSource === "default" && (
            <p className="rounded-xl bg-tint-strong px-4 py-3 text-[13px] text-body-text dark:bg-[#FAF7F214] dark:text-ink">
              You have not built a timetable yet, so this uses a starter week.{" "}
              <Link href="/timetable" className="font-bold underline">
                Build my timetable
              </Link>
            </p>
          )}

          {!desktop && <PlanSidePanel day={day} explanation={explanation} onAdd={(input) => void addSuggestion(input)} />}
        </div>

        {desktop && <PlanSidePanel day={day} explanation={explanation} onAdd={(input) => void addSuggestion(input)} />}
      </div>

      {actions.overlays}
      <Toast state={toast} />
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<PageLoader label="Building your day…" />}>
      <PlannerScreen />
    </Suspense>
  );
}
