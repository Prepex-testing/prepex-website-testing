"use client";

import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { Goal } from "@/lib/api/goals";
import { describeGoal, progressText } from "@/lib/goals/format";
import type { TaskType } from "@/lib/focus/intent";
import { startFocusSession } from "@/lib/focus/startFocusSession";

type Props = {
  goal: Goal;
  scope: string;
  busy: boolean;
  onWatched: (next: number) => void;
  onToggleDone: () => void;
  onDelete: () => void;
  /** Suggest: ask the assistant for hours on this goal's chapter (chapter goals only). */
  onSuggest?: () => void;
  /** The inline suggestion panel, shown under the goal while it is open. */
  suggestSlot?: ReactNode;
};

/** What kind of session works towards each kind of goal. */
const GOAL_TASK_TYPE: Record<Goal["type"], TaskType> = {
  LECTURES: "lecture",
  QUESTIONS: "practice",
  REVISIONS: "revision",
  MOCKS: "mock_review",
  HOURS: "self_study",
  BACKLOG: "self_study",
};

const BAR = {
  ACTIVE: "bg-cta",
  DONE: "bg-[var(--success)]",
  CARRIED_OVER: "bg-muted",
  ABANDONED: "bg-muted",
} as const;

/** One weekly goal with its progress; LECTURES goals get a − / + tracker, the rest count themselves. */
export function GoalCard({ goal, scope, busy, onWatched, onToggleDone, onDelete, onSuggest, suggestSlot }: Props) {
  const done = goal.status === "DONE";
  const percent = done ? 100 : goal.progress.percent;
  const isLectures = goal.type === "LECTURES";
  const fromPartner = goal.source === "PARTNER";
  const title = fromPartner ? (goal.topic ?? "Partner goal") : describeGoal(goal);

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4" data-testid="goal-card" data-goal-type={goal.type} data-status={goal.status}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-[16px] font-bold text-ink">{title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
            {!fromPartner && scope && <span>{scope}</span>}
            {fromPartner && <span className="rounded-full bg-tint-strong px-2 py-0.5 font-semibold text-ink dark:bg-[#FAF7F214]">From your partner</span>}
            {goal.carriedFromGoalId && <span className="rounded-full bg-tint-strong px-2 py-0.5 font-semibold text-ink dark:bg-[#FAF7F214]">Carried over</span>}
            {!isLectures && !fromPartner && <span>Counted automatically</span>}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Remove goal: ${title}`}
          disabled={busy}
          onClick={onDelete}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[20px] text-muted hover:bg-tint-strong disabled:opacity-50"
        >
          ×
        </button>
      </div>

      <div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-tint-strong dark:bg-[#FAF7F214]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${title} progress`}>
          <div className={`h-full rounded-full transition-[width] duration-500 ${BAR[goal.status]}`} style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1.5 text-[13px] font-semibold text-body-text dark:text-ink" data-testid="goal-progress-text">
          {fromPartner ? (done ? "Done" : "Not done yet") : progressText(goal)} · {percent}%
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isLectures && !fromPartner && (
          <div className="flex items-center gap-2" role="group" aria-label="Lectures watched">
            <button
              type="button"
              aria-label="One fewer lecture watched"
              disabled={busy || goal.progressSelfReport <= 0}
              onClick={() => onWatched(goal.progressSelfReport - 1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-brand/20 text-[20px] font-bold text-ink disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-8 text-center text-[16px] font-extrabold text-ink" data-testid="lectures-watched">
              {goal.progressSelfReport}
            </span>
            <button
              type="button"
              aria-label="One more lecture watched"
              data-testid="lecture-plus"
              disabled={busy}
              onClick={() => onWatched(goal.progressSelfReport + 1)}
              className="flex h-11 items-center justify-center gap-1.5 rounded-lg border border-brand/20 bg-tint-strong px-3 text-[14px] font-bold text-ink disabled:opacity-40 dark:bg-[#FAF7F214]"
            >
              + Watched one
            </button>
          </div>
        )}
        {(fromPartner || !isLectures) && (
          <button
            type="button"
            disabled={busy}
            onClick={onToggleDone}
            className="min-h-11 rounded-lg border border-brand/20 px-3 text-[13px] font-semibold text-ink hover:bg-tint-strong disabled:opacity-50"
          >
            {done ? "Mark as not done" : "Mark as done"}
          </button>
        )}
        {!fromPartner && goal.status === "ACTIVE" && (
          <button
            type="button"
            data-testid="goal-start-now"
            disabled={busy}
            onClick={() =>
              startFocusSession({
                originSource: "weekly_goals",
                originId: goal.id,
                subject: goal.subjectId !== null ? String(goal.subjectId) : undefined,
                chapter: goal.chapterId ?? undefined,
                topic: goal.topic ?? undefined,
                taskType: GOAL_TASK_TYPE[goal.type],
              })
            }
            className="min-h-11 rounded-full border border-primary-button-border bg-cta px-4 text-[13px] font-bold text-white hover:bg-[#E8623F] disabled:opacity-50"
          >
            Start now
          </button>
        )}
        {onSuggest && (
          <button
            type="button"
            data-testid="goal-suggest"
            disabled={busy}
            onClick={onSuggest}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-brand/20 px-3 text-[13px] font-semibold text-ink hover:bg-tint-strong disabled:opacity-50"
          >
            <Sparkles className="size-4 shrink-0" aria-hidden />
            Suggest
          </button>
        )}
      </div>
      {suggestSlot}
    </li>
  );
}
