"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/planner/Sheet";
import { getPracticeOptions, startPlanTask, type PlanTask } from "@/lib/api/plannerV2";
import { ApiError } from "@/lib/api/http";
import { NO_QUESTIONS_NOTICE, ownContentIntent } from "@/lib/focus/intent";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import { practiceUrl } from "@/lib/planner/cta";
import { trackPlanner } from "@/lib/telemetry/planner";

type Props = {
  task: PlanTask | null;
  onClose: () => void;
};

/**
 * The Practice CTA. Two ways in: the Prepex question bank (the default when the chapter has questions) or the
 * student's own content (the focus timer, then a quick log). If the bank has nothing for the chapter the sheet says so
 * and carries on to the timer by itself, so the student is never stuck on an empty screen.
 */
export function PracticeChoiceSheet({ task, onClose }: Props) {
  const router = useRouter();
  const [available, setAvailable] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset for each task that opens the sheet
    setAvailable(null);
    setNotice(null);
    setError(null);
    getPracticeOptions(task.id)
      .then((res) => alive && setAvailable(res.data.available))
      .catch(() => alive && setAvailable(0));
    return () => {
      alive = false;
    };
  }, [task]);

  if (!task) return null;
  const current = task;

  async function go(choice: "prepex" | "own") {
    setBusy(true);
    setError(null);
    try {
      await startPlanTask(current.id);
      if (choice === "prepex" && (available ?? 0) > 0) {
        trackPlanner("planner_task_start", { kind: "practice", via: "prepex_questions" });
        router.push(practiceUrl(current));
        return;
      }
      if (choice === "prepex") {
        setNotice(NO_QUESTIONS_NOTICE);
        trackPlanner("planner_task_start", { kind: "practice", via: "fallback_timer" });
        window.setTimeout(() => startFocusSession(ownContentIntent(current.id, current.estimatedMinutes, true)), 1600);
        return;
      }
      trackPlanner("planner_task_start", { kind: "practice", via: "own_content" });
      startFocusSession(ownContentIntent(current.id, current.estimatedMinutes, false));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start that. Please try again.");
      setBusy(false);
    }
  }

  const bankText = available === null ? "Checking the question bank…" : available > 0 ? `${current.questionCount ?? Math.min(available, 10)} questions picked for ${current.chapterName ?? "this chapter"}` : "No questions for this chapter yet";

  return (
    <Sheet open onClose={onClose} title="How do you want to practise?" description={current.title} data-testid="practice-choice">
      <div className="flex flex-col gap-3 pt-1">
        <button
          type="button"
          data-autofocus
          data-testid="practice-prepex"
          disabled={busy || available === null}
          onClick={() => void go("prepex")}
          className="flex min-h-20 flex-col items-start justify-center gap-0.5 rounded-2xl border-[1.5px] border-cta bg-surface px-4 py-3 text-left disabled:opacity-60"
        >
          <span className="text-[16px] font-extrabold text-ink">Practice Prepex questions</span>
          <span className="text-[13px] text-muted" data-testid="practice-bank-text">
            {bankText}
          </span>
        </button>
        <button
          type="button"
          data-testid="practice-own"
          disabled={busy}
          onClick={() => void go("own")}
          className="flex min-h-20 flex-col items-start justify-center gap-0.5 rounded-2xl border border-brand/15 bg-surface px-4 py-3 text-left disabled:opacity-60"
        >
          <span className="text-[16px] font-extrabold text-ink">Use my own content</span>
          <span className="text-[13px] text-muted">Start the focus timer, then log how it went.</span>
        </button>
        {notice && (
          <p role="status" data-testid="practice-notice" className="rounded-lg bg-warning-bg px-3 py-2 text-[13px] font-semibold text-ink">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
