"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { AddTaskSheet } from "@/components/planner/AddTaskSheet";
import { EndOfDay, isEndOfDay } from "@/components/planner/EndOfDay";
import { ModeToggle } from "@/components/planner/ModeToggle";
import { PlanTimeline } from "@/components/planner/PlanTimeline";
import { TaskDetailSheet } from "@/components/planner/TaskDetailSheet";
import { usePlanDay } from "@/components/planner/usePlanDay";
import { useTaskActions } from "@/components/planner/useTaskActions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PageLoader } from "@/components/ui/PageLoader";
import { Toast, useToast } from "@/components/ui/Toast";
import { addPlanTask, type PlanTask } from "@/lib/api/plannerV2";
import { ApiError } from "@/lib/api/http";
import { dateKey, dayTabLabel, daySummaryText, formatDuration, nowMinutes, shiftDate, subjectStyle } from "@/lib/planner/format";
import { trackPlanner } from "@/lib/telemetry/planner";

const DAY_COUNT = 8; // today + the next 7 days

function PlannerScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const today = dateKey();
  const requested = params.get("day");
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today;

  const plan = usePlanDay(date);
  const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [detail, setDetail] = useState<PlanTask | null>(null);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [nowMin, setNowMin] = useState(() => nowMinutes());
  const viewed = useRef<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMin(nowMinutes()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const refresh = plan.refresh;
  const actions = useTaskActions(refresh, toast.show);

  const day = plan.day;
  useEffect(() => {
    if (!day || viewed.current === `${day.date}:${day.tasks.length}`) return;
    viewed.current = `${day.date}:${day.tasks.length}`;
    trackPlanner("planner_view", { tab: day.date === today ? "today" : "other", tasks: day.tasks.length, mode: day.mode });
  }, [day, today]);

  const goToDay = useCallback(
    (key: string) => {
      router.replace(key === today ? "/planner" : `/planner?day=${key}`);
    },
    [router, today],
  );

  const tabs = useMemo(() => Array.from({ length: DAY_COUNT }, (_, i) => shiftDate(today, i)), [today]);

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

  async function regenerate() {
    setRegenError(null);
    trackPlanner("planner_regenerate", { had_plan: Boolean(day?.plan) });
    const err = await plan.build(day?.plan ? "REGENERATE" : "SCHEDULED");
    if (err) setRegenError(err);
    else setRegenOpen(false);
  }

  if (plan.status === "loading") return <PageLoader label="Building your day…" />;
  if (!day) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center" data-testid="planner-error">
        <p role="alert" className="text-[16px] font-bold text-ink">
          {plan.error ?? "Couldn't build your plan — tap retry."}
        </p>
        <button type="button" onClick={() => void plan.refresh()} className="min-h-12 rounded-lg border border-primary-button-border bg-cta px-6 text-[15px] font-semibold text-white hover:bg-[#E8623F]">
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
  const regen = day.regenerate;

  return (
    <div className="flex flex-col gap-4 p-4 pb-40 sm:p-6 lg:mx-auto lg:max-w-2xl lg:p-8" data-testid="planner-page">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[24px] font-extrabold leading-tight text-ink">{new Date(`${day.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</h1>
            <p className="mt-1 inline-flex rounded-full bg-tint-strong px-3 py-1 text-[12px] font-bold text-ink dark:bg-[#FAF7F214]" data-testid="day-summary">
              {daySummaryText(day.summary.plannedMinutes, day.summary.doneMinutes)}
            </p>
          </div>
          <ModeToggle
            mode={day.mode}
            onChanged={async (mode) => {
              toast.show(mode === "manual" ? "Manual mode is on." : "Auto mode is on.");
              await plan.refresh();
            }}
          />
        </div>
        <nav aria-label="Choose a day" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {tabs.map((key) => (
            <button
              key={key}
              type="button"
              data-testid={`day-tab-${key === today ? "today" : key === shiftDate(today, 1) ? "tomorrow" : key}`}
              aria-current={key === date ? "date" : undefined}
              onClick={() => goToDay(key)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-[14px] font-semibold ${key === date ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
            >
              {dayTabLabel(key, today)}
            </button>
          ))}
        </nav>
      </header>

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

      {ended && <EndOfDay percent={day.summary.percent} rolling={rolling} onOpenTomorrow={() => goToDay(shiftDate(today, 1))} />}

      {manual && day.suggestions && (day.suggestions.revisions.length > 0 || day.suggestions.backlog.length > 0) && (
        <section aria-label="Suggested for you" data-testid="suggestions" className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4">
          <h2 className="text-[15px] font-extrabold text-ink">Suggested revisions and backlog</h2>
          <ul className="flex flex-col gap-2">
            {day.suggestions.revisions.map((r) => (
              <li key={r.queueId} className="flex items-center gap-3">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: subjectStyle(r.subject).color }} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">Revise {r.chapterName}</span>
                <span className="text-[12px] text-muted">{formatDuration(r.minutes)}</span>
                <button
                  type="button"
                  data-testid="add-suggested-revision"
                  disabled={r.subjectId === null}
                  onClick={() => r.subjectId !== null && void addSuggestion({ kind: "revision", subjectId: r.subjectId, chapterId: r.chapterId, minutes: r.minutes, origin: "sr", slot: "next_free" })}
                  className="min-h-9 rounded-full border border-cta px-3 text-[13px] font-bold text-cta disabled:opacity-50"
                >
                  Add
                </button>
              </li>
            ))}
            {day.suggestions.backlog.map((b) => (
              <li key={b.id} className="flex items-center gap-3">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: subjectStyle(b.subject).color }} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">Clear backlog · {b.chapterName ?? b.topic ?? "item"}</span>
                <span className="text-[12px] text-muted">{formatDuration(b.minutes)}</span>
                <button
                  type="button"
                  data-testid="add-suggested-backlog"
                  disabled={b.subjectId === null}
                  onClick={() => b.subjectId !== null && void addSuggestion({ kind: "backlog", subjectId: b.subjectId, ...(b.chapterId ? { chapterId: b.chapterId } : {}), minutes: b.minutes, origin: "backlog", backlogItemId: b.id, slot: "next_free" })}
                  className="min-h-9 rounded-full border border-cta px-3 text-[13px] font-bold text-cta disabled:opacity-50"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {visible.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-brand/25 p-8 text-center" data-testid="planner-empty">
          <p className="text-[16px] font-bold leading-snug text-ink">
            {manual ? "You're in manual mode. Add tasks yourself using the + button." : "No plan yet for today — tap Regenerate to let Prepex build it from your weekly goals"}
          </p>
          {!manual && (
            <button type="button" data-testid="build-plan" disabled={plan.building} onClick={() => void regenerate()} className="min-h-14 w-full max-w-xs rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F] disabled:opacity-60">
              {plan.building ? "Building…" : "Build today's plan"}
            </button>
          )}
          {regenError && (
            <p role="alert" className="text-[13px] font-medium text-danger">
              {regenError}
            </p>
          )}
        </section>
      ) : (
        <PlanTimeline
          tasks={visible}
          bands={day.bands}
          nowMin={day.isToday ? nowMin : null}
          highlightId={highlight}
          onStart={(t) => void actions.start(t)}
          onOpen={setDetail}
          onMarkDone={actions.markDone}
          onSkip={(t) => void actions.skip(t)}
          onTomorrow={(t) => void actions.tomorrow(t)}
          onDelete={actions.askDelete}
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

      {/* floating actions: Regenerate (left, icon only, with the counter) and Add task (right) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 flex items-end justify-between px-4 lg:bottom-6 lg:left-56 lg:px-8">
        {!manual ? (
          <div className="pointer-events-auto flex flex-col items-center gap-1">
            <button
              type="button"
              data-testid="regenerate"
              aria-label={`Regenerate plan, ${regen.remaining} of ${regen.limit} left today`}
              disabled={plan.building || regen.remaining === 0}
              onClick={() => setRegenOpen(true)}
              className="flex size-14 items-center justify-center rounded-full border border-brand/15 bg-surface text-ink shadow-modal hover:bg-tint-strong disabled:opacity-50"
            >
              <RefreshCw className={`size-6 ${plan.building ? "animate-spin" : ""}`} aria-hidden />
            </button>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-muted shadow-hover" data-testid="regen-counter">
              {regen.remaining}/{regen.limit} left
            </span>
          </div>
        ) : (
          <span />
        )}
        <button type="button" data-testid="add-task" onClick={() => setAddOpen(true)} className="pointer-events-auto flex min-h-14 items-center gap-2 rounded-full border border-primary-button-border bg-cta px-5 text-[15px] font-bold text-white shadow-modal hover:bg-[#E8623F]">
          <Plus className="size-5" aria-hidden /> Add task
        </button>
      </div>

      <AddTaskSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        date={date}
        onAdded={(task, warning) => {
          setHighlight(task.id);
          toast.show(warning ?? "Added to your plan.");
          void refresh().then(() => {
            window.setTimeout(() => document.querySelector(`[data-task-id="${task.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
            window.setTimeout(() => setHighlight(null), 1800);
          });
        }}
      />
      <TaskDetailSheet
        task={detail}
        onClose={() => setDetail(null)}
        onStart={(t) => void actions.start(t)}
        onMarkDone={actions.markDone}
        onSkip={(t) => void actions.skip(t)}
        onTomorrow={(t) => void actions.tomorrow(t)}
        onDelete={actions.askDelete}
      />
      <ConfirmModal
        open={regenOpen}
        onClose={() => setRegenOpen(false)}
        onConfirm={() => void regenerate()}
        title="Rebuild today's plan?"
        description="Prepex will build it again from your weekly goals. Tasks you have finished, started or added yourself stay."
        confirmLabel="Regenerate"
        busy={plan.building}
        error={regenError}
      />
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
