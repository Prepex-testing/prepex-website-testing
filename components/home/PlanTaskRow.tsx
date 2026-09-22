"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ClockIcon, CalendarIcon, GripVerticalIcon } from "@/components/ui/icons";
import { TaskEditMenu } from "@/components/home/TaskEditMenu";
import { CompleteTaskCheckbox } from "@/components/home/CompleteTaskCheckbox";
import { TYPE_STYLES, TYPE_LABELS, COMPLETED_ACTION_LABELS, CUSTOM_BADGE_STYLE } from "@/components/home/TaskRow";
import type { TaskType } from "@/components/home/TaskRow";
import { customBadgeLabel, mockTaskHref } from "@/components/home/taskTypes";
import { Book, Time } from "@/assets/icons";
import { getChapterTitle } from "@/lib/utils/text";
import { getTaskQuestions } from "@/lib/api/practice";

type Difficulty = "easy" | "medium" | "high";

const DIFFICULTY_CHIP =
  " bg-[#EEF0F8] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: DIFFICULTY_CHIP,
  medium: DIFFICULTY_CHIP,
  high: DIFFICULTY_CHIP,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  high: "High",
};

/** Maps chapter metadata difficulty (EASY/MEDIUM/HARD) to the row's scale. */
export function toRowDifficulty(d: string | null | undefined): Difficulty {
  const v = (d ?? "").toUpperCase();
  if (v === "EASY") return "easy";
  if (v === "HARD" || v === "VERY_HARD") return "high";
  return "medium";
}

export type PlanTask = {
  id: string;
  subjectLabel: string;
  subjectName: string;
  type: TaskType;
  title: string;
  meta: string;
  description?: string;
  chapterName?: string;
  duration: string;
  estimatedMinutes: number;
  secondsCompleted?: number;
  taskOrder?: number;
  status?: string;
  timeRange: string;
  difficulty: Difficulty;
  actionLabel: string;
  isCompleted?: boolean;
  isCustom?: boolean;
  isWellness?: boolean;
  /** Chapter page in the Resource Library — absent for wellness/mock rows. */
  resourceHref?: string;
  /** MOCK tasks only — see mockTaskHref. */
  mockAnalysisId?: string | null;
  mockName?: string;
  mockDate?: string;
};

type PlanTaskRowProps = {
  task: PlanTask;
  onStartPractice?: (taskId: string) => void;
  onTaskChanged?: () => void;
  /** Called when "Reorder" is clicked — arms this task for drag-and-drop. */
  onReorder?: () => void;
  /** True while this task is the one armed for dragging. */
  isDragArmed?: boolean;
  /** True while another task in this list is armed — this row accepts drops. */
  isDropTarget?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
  /** Leaves out the difficulty chip (e.g. on the Practice Sessions list). */
  hideDifficulty?: boolean;
};

export function PlanTaskRow({
  task,
  onStartPractice,
  onTaskChanged,
  onReorder,
  isDragArmed,
  isDropTarget,
  onDragStart,
  onDrop,
  hideDifficulty = false,
}: PlanTaskRowProps) {
  const router = useRouter();
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const isStartPractice = task.type === "practice";
  const isStartRevision = task.type === "revision";
  const isSkipped = task.status === "SKIPPED";
  const isWellnessTask = task.isWellness;
  // A finished practice task swaps its (disabled) "Practice Completed" chip for
  // an active "View Analysis" button that opens the session breakdown.
  const isPracticeDone = task.type === "practice" && Boolean(task.isCompleted) && !isSkipped;
  // A MOCK task stays actionable in both states: "Upload Score" until the score
  // is in (which completes the task server-side), then "View Analysis".
  const isMockTask = task.type === "mock";
  const isMockDone = isMockTask && Boolean(task.isCompleted);
  const isActionDisabled = task.isCompleted || isSkipped;
  const isPrimaryActionDisabled = isPracticeDone || isMockTask ? false : isActionDisabled || isWellnessTask;
  const displayLabel = isPracticeDone
    ? loadingAnalysis
      ? "Loading…"
      : "View Analysis"
    : isMockTask
      ? isMockDone
        ? "View Analysis"
        : "Upload Score"
    : task.isCompleted
      ? COMPLETED_ACTION_LABELS[task.type]
      : isSkipped
        ? "Skipped"
        : isWellnessTask
          ? "Wellness"
          : task.actionLabel;

  const handleViewAnalysis = async () => {
    if (loadingAnalysis) return;
    setLoadingAnalysis(true);
    try {
      const res = await getTaskQuestions(task.id);
      router.push(`/practice/complete?sessionId=${res.data.sessionId}`);
    } catch {
      setLoadingAnalysis(false);
    }
  };

  return (
    <div
      draggable={isDragArmed}
      onDragStart={isDragArmed ? onDragStart : undefined}
      onDragOver={isDropTarget ? (event) => event.preventDefault() : undefined}
      onDrop={isDropTarget ? onDrop : undefined}
      className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 sm:gap-4 ${
        isDragArmed
          ? "cursor-grabbing border-brand bg-surface ring-2 ring-brand"
          : isDropTarget
            ? "border-dashed border-brand/40 bg-surface"
            : "border-brand/10 bg-surface"
      }`}
    >
      {/* Drag handle — 18x18 per spec */}
      <span
        className={`shrink-0 text-muted ${isDragArmed ? "cursor-grabbing text-ink" : "cursor-grab"}`}
        aria-hidden="true"
      >
        <GripVerticalIcon />
      </span>

      {/* Avatar — 56x56, rounded-lg (8px), #EEF2FF fill, 24px bold #1A1A4E */}
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-plan-avatar-bg text-2xl font-bold leading-8 text-subject-text">
        {task.subjectLabel}
      </span>

      {/* Content column */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-ink">
            {task.subjectName}
          </span>
          <span
            className={`rounded-sm px-2 py-0.5 text-[10px] font-bold leading-[15px] ${TYPE_STYLES[task.type]}`}
          >
            {TYPE_LABELS[task.type]}
          </span>
          {task.isCustom && (
            <span
              className={`rounded-sm px-2 py-0.5 text-[10px] font-bold leading-[15px] ${CUSTOM_BADGE_STYLE}`}
            >
              {customBadgeLabel(task.title)}
            </span>
          )}
        </div>

        <p className="mt-0.5 text-base font-bold leading-6 text-ink">
          {getChapterTitle(task.title)}
        </p>

        <p className="text-xs font-normal leading-4 text-[#9CA3AF]">{task.meta}</p>

        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-medium leading-4 text-[#6B7280]">
          <span className="flex items-center gap-1">
           <ClockIcon className="h-4 w-4 shrink-0" />
            {task.duration}
          </span>
          <span className="flex items-center gap-1">
            <Time className="h-4 w-4 shrink-0" />
            {task.timeRange}
          </span>
          {task.resourceHref && (
            <Link
              href={task.resourceHref}
              className="flex items-center gap-1 hover:text-ink hover:underline"
            >
              <Book className="h-4 w-4 shrink-0" />
              Resource
            </Link>
          )}
          {!hideDifficulty && (
            <span
              className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold ${DIFFICULTY_STYLES[task.difficulty]}`}
            >
              {DIFFICULTY_LABELS[task.difficulty]}
            </span>
          )}
        </div>
      </div>

      {/* Actions — 16px gap between button and checkbox/menu group */}
      <div className="flex w-full shrink-0 items-center gap-4 sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          disabled={isPrimaryActionDisabled}
          className={
            isPrimaryActionDisabled
              ? "h-[38px]! w-auto! min-w-[138px]! justify-center px-5! text-[12px]! leading-none! font-semibold! whitespace-nowrap! cursor-not-allowed! opacity-60! hover:bg-transparent! hover:border-current! hover:text-current! hover:shadow-none!"
              : "h-[38px]! w-auto! min-w-[138px]! justify-center gap-2.5! px-5! text-[14px]! leading-none! font-semibold! whitespace-nowrap!"
          }
          href={
            isMockTask
              ? mockTaskHref(task)
              : isPrimaryActionDisabled
              ? undefined
              : isStartRevision
                ? `/revision-session?taskId=${task.id}`
                : task.type === "new-learning"
                  ? `/home/session?taskId=${task.id}`
                  : undefined
          }
          onClick={
            isPracticeDone
              ? handleViewAnalysis
              : isPrimaryActionDisabled
                ? undefined
                : isStartPractice
                  ? () => onStartPractice?.(task.id)
                  : undefined
          }
        >
          {displayLabel}
        </Button>

        <div className="flex items-center gap-2">
          <CompleteTaskCheckbox
            taskId={task.id}
            title={getChapterTitle(task.title)}
            secondsCompleted={task.secondsCompleted ?? 0}
            isCompleted={task.isCompleted}
            // A MOCK task only completes by uploading the score.
            disabled={isSkipped || (isMockTask && !isMockDone)}
            onCompleted={onTaskChanged}
          />

          <TaskEditMenu
            task={{
              id: task.id,
              title: task.title,
              description: task.description,
              subjectName: task.subjectName,
              chapterName: task.chapterName,
              type: task.type,
              status: task.status,
              duration: task.duration,
            }}
            onTaskChanged={onTaskChanged}
            onReorder={onReorder}
            disabled={isActionDisabled}
          />
        </div>
      </div>
    </div>
  );
}