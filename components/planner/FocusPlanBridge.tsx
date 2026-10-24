"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QuickLogSheet } from "@/components/planner/QuickLogSheet";
import type { FocusResult } from "@/components/focus/useFocusSession";
import { ApiError } from "@/lib/api/http";
import { completePlanTask, getPlanDay, recordTaskProgress, type CompleteInput, type PlanTask } from "@/lib/api/plannerV2";
import type { FocusHandoff } from "@/lib/planner/cta";
import { formatDuration } from "@/lib/planner/format";
import { trackPlanner } from "@/lib/telemetry/planner";

type Props = {
  handoff: FocusHandoff;
  result: FocusResult;
};

type Phase = "working" | "logging" | "done" | "paused" | "error";

/** What the quick-log sheet needs when the plan task cannot be fetched: built from what the hand-off carried. */
function stand_in(handoff: FocusHandoff): Pick<PlanTask, "kind" | "title" | "estimatedMinutes" | "contentSource" | "questionCount" | "chapterId"> {
  return {
    kind: handoff.mode === "revision" ? "revision" : handoff.mode === "practice" ? "practice" : "lecture",
    title: handoff.topic ?? "Your task",
    estimatedMinutes: handoff.minutes,
    contentSource: null,
    questionCount: null,
    chapterId: handoff.chapterId,
  };
}

/**
 * The focus timer ended for a planner task.
 *   finished the session  -> the task is done (and the study log is linked); a revision first asks how confident the
 *                            student feels (it sets the next interval); own-content practice asks for the quick log
 *   ended early           -> the minutes are banked and the task stays in progress, so it can be resumed
 */
export function FocusPlanBridge({ handoff, result }: Props) {
  const [phase, setPhase] = useState<Phase>("working");
  const [task, setTask] = useState<PlanTask | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  const session = result.focusSession;
  const completed = session.wasCompleted;
  const needsLog = completed && (handoff.mode === "revision" || handoff.mode === "practice");

  async function complete(extra: Pick<CompleteInput, "confidence" | "revision" | "practice" | "log" | "actualMinutes">) {
    setBusy(true);
    setError(null);
    try {
      await completePlanTask(handoff.planTaskId, { via: "focus", focusSessionId: session.id, ...extra });
      trackPlanner("planner_task_complete", { kind: handoff.mode, via: "focus", minutes: session.actualMinutes ?? 0 });
      setMessage("Task marked done. Nice work.");
      setPhase("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update your plan. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    getPlanDay()
      .then((res) => setTask(res.data.tasks.find((t) => t.id === handoff.planTaskId) ?? null))
      .catch(() => setTask(null))
      .finally(async () => {
        if (completed && !needsLog) {
          await complete({});
        } else if (completed) {
          setPhase("logging");
        } else {
          try {
            await recordTaskProgress(handoff.planTaskId, { focusSessionId: session.id });
            setMessage("Saved. This task stays in progress, so you can pick it up from your plan.");
            setPhase("paused");
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Couldn't save your progress.");
            setPhase("error");
          }
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once for the session that just ended
  }, []);

  return (
    <section aria-label="Your plan" data-testid="focus-plan-bridge" className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-5 text-center">
      {phase === "working" && <p className="text-[14px] text-muted">Updating your plan…</p>}
      {(phase === "done" || phase === "paused") && (
        <p role="status" className="text-[15px] font-bold text-ink" data-testid="bridge-message">
          {message}
        </p>
      )}
      {session.actualMinutes ? <p className="text-[13px] text-muted">{formatDuration(session.actualMinutes)} focused.</p> : null}
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
      <Link href="/planner" data-testid="back-to-plan" className="flex min-h-12 items-center justify-center rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
        Back to my plan
      </Link>
      {phase === "logging" && (
        <QuickLogSheet
          open
          task={task ?? stand_in(handoff)}
          origin="timer"
          knownMinutes={session.actualMinutes ?? handoff.minutes}
          busy={busy}
          error={error}
          onClose={() => void complete({})}
          onSubmit={(log) => void complete(log)}
        />
      )}
    </section>
  );
}
