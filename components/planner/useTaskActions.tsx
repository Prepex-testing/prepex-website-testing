"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { GhostButton } from "@/components/ui/GhostButton";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { createBacklogItem } from "@/lib/api/backlogItems";
import { PracticeChoiceSheet } from "@/components/planner/PracticeChoiceSheet";
import { QuickLogSheet } from "@/components/planner/QuickLogSheet";
import { ApiError } from "@/lib/api/http";
import { completePlanTask, deletePlanTask, reschedulePlanTask, skipPlanTask, startPlanTask, type CompleteInput, type PlanTask } from "@/lib/api/plannerV2";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import { mockUrl, plannerFocusIntent } from "@/lib/planner/cta";
import { trackPlanner } from "@/lib/telemetry/planner";

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Everything a student can do to a task from a card: start it (each kind goes to its own screen with the task's details
 * filled in), mark it done (with the optional quick log), skip, move it to tomorrow, delete. The sheets that need to show
 * up for those are returned as `overlays`; render them once on the page.
 */
export function useTaskActions(onChanged: () => void | Promise<void>, notify: (message: string) => void) {
  const router = useRouter();
  const [practiceFor, setPracticeFor] = useState<PlanTask | null>(null);
  const [logFor, setLogFor] = useState<PlanTask | null>(null);
  const [deleteFor, setDeleteFor] = useState<PlanTask | null>(null);
  // a task the student just skipped: offered a place in the backlog
  const [backlogFor, setBacklogFor] = useState<PlanTask | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guarded = useCallback(
    async (work: () => Promise<void>, failure: string): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        await work();
        return true;
      } catch (err) {
        setError(messageOf(err, failure));
        notify(messageOf(err, failure));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [notify],
  );

  const start = useCallback(
    async (task: PlanTask) => {
      if (task.kind === "practice") {
        setPracticeFor(task); // the sheet decides: Prepex questions, own content, or the empty-bank fallback
        return;
      }
      trackPlanner("planner_task_start", { kind: task.kind, status: task.status });
      await guarded(async () => {
        await startPlanTask(task.id);
        if (task.kind === "mock") router.push(mockUrl(task));
        else startFocusSession(plannerFocusIntent(task));
      }, "Couldn't start that. Please try again.");
    },
    [guarded, router],
  );

  const finishManually = useCallback(
    async (task: PlanTask, log: Pick<CompleteInput, "actualMinutes" | "confidence" | "revision" | "practice" | "mock" | "log">) => {
      const ok = await guarded(async () => {
        await completePlanTask(task.id, { via: "manual", ...log });
        trackPlanner("planner_task_complete", { kind: task.kind, via: "manual", logged: Boolean(log.log) });
      }, "Couldn't mark that done. Please try again.");
      if (ok) {
        setLogFor(null);
        await onChanged();
      }
    },
    [guarded, onChanged],
  );

  const skip = useCallback(
    async (task: PlanTask) => {
      const ok = await guarded(async () => {
        await skipPlanTask(task.id);
        trackPlanner("planner_task_skip", { kind: task.kind });
      }, "Couldn't skip that.");
      if (ok) {
        await onChanged();
        if (task.subjectId !== null && task.chapterId && task.kind !== "mock") setBacklogFor(task);
      }
    },
    [guarded, onChanged],
  );

  const moveToBacklog = useCallback(async () => {
    const task = backlogFor;
    if (!task || task.subjectId === null || !task.chapterId) return;
    const ok = await guarded(async () => {
      await createBacklogItem({ subjectId: task.subjectId!, chapterId: task.chapterId!, ...(task.topic ? { topic: task.topic } : {}), estimatedMinutes: Math.min(480, Math.max(1, task.estimatedMinutes)), source: "skipped_task" });
      trackPlanner("planner_task_to_backlog", { kind: task.kind });
      notify("Moved to your backlog.");
    }, "Couldn't move that to your backlog.");
    if (ok) setBacklogFor(null);
  }, [backlogFor, guarded, notify]);

  const tomorrow = useCallback(
    async (task: PlanTask) => {
      const ok = await guarded(async () => {
        await reschedulePlanTask(task.id, {});
        notify("Moved to tomorrow.");
      }, "Couldn't move that.");
      if (ok) await onChanged();
    },
    [guarded, notify, onChanged],
  );

  const confirmDelete = useCallback(async () => {
    const task = deleteFor;
    if (!task) return;
    const ok = await guarded(async () => {
      await deletePlanTask(task.id);
      trackPlanner("planner_task_delete", { kind: task.kind });
    }, "Couldn't delete that.");
    if (ok) {
      setDeleteFor(null);
      await onChanged();
    }
  }, [deleteFor, guarded, onChanged]);

  const overlays: ReactNode = (
    <>
      <PracticeChoiceSheet task={practiceFor} onClose={() => setPracticeFor(null)} />
      {logFor && (
        <QuickLogSheet
          open
          task={logFor}
          origin="manual"
          busy={busy}
          error={error}
          onClose={() => {
            setLogFor(null);
            setError(null);
          }}
          onSubmit={(log) => void finishManually(logFor, log)}
        />
      )}
      <WhiteModal open={backlogFor !== null} onClose={() => setBacklogFor(null)} ariaLabel="Move to backlog?">
        <div className="mx-auto flex w-full max-w-[340px] flex-col gap-3 text-center" data-testid="skip-backlog-prompt">
          <h2 className="text-[20px] font-extrabold text-ink">Move to backlog?</h2>
          <p className="text-[14px] text-muted">{backlogFor ? `"${backlogFor.title}" is skipped for today. Keep it in your backlog so it does not get lost.` : ""}</p>
          {error && backlogFor && (
            <p role="alert" className="text-[13px] font-medium text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <GhostButton className="flex-1" disabled={busy} data-testid="skip-backlog-no" onClick={() => setBacklogFor(null)}>
              Not now
            </GhostButton>
            <GhostButton className="flex-1" disabled={busy} data-testid="skip-backlog-yes" onClick={() => void moveToBacklog()}>
              Move to backlog
            </GhostButton>
          </div>
        </div>
      </WhiteModal>
      <ConfirmModal
        open={deleteFor !== null}
        onClose={() => {
          setDeleteFor(null);
          setError(null);
        }}
        onConfirm={() => void confirmDelete()}
        title="Delete this task?"
        description={deleteFor ? `"${deleteFor.title}" will be removed from your plan.` : ""}
        confirmLabel="Delete"
        busy={busy}
        error={error}
      />
    </>
  );

  return {
    start,
    markDone: (task: PlanTask) => {
      setError(null);
      setLogFor(task);
    },
    skip,
    tomorrow,
    askDelete: (task: PlanTask) => {
      setError(null);
      setDeleteFor(task);
    },
    busy,
    overlays,
  };
}
