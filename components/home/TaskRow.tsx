"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ClockIcon, SunIcon, FileIcon, CalendarIcon } from "@/components/ui/icons";
import { TaskEditMenu } from "@/components/home/TaskEditMenu";
import { CompleteTaskCheckbox } from "@/components/home/CompleteTaskCheckbox";
import { TYPE_STYLES, TYPE_LABELS, COMPLETED_ACTION_LABELS, CUSTOM_BADGE_STYLE, mockTaskHref } from "@/components/home/taskTypes";
import type { TaskType } from "@/components/home/taskTypes";

export type { TaskType };
export { TYPE_STYLES, TYPE_LABELS, COMPLETED_ACTION_LABELS, CUSTOM_BADGE_STYLE };
import { Book, Time } from "@/assets/icons";
import { useState } from "react";
import { getChapterTitle } from "@/lib/utils/text";
import { getTaskQuestions } from "@/lib/api/practice";
export type Task = {
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
  /** Row doesn't render this — carried through for TodaysPracticeModal. */
  difficulty?: "easy" | "medium" | "high";
  secondsCompleted?: number;
  status?: string;
  timeSlot: string;
  scheduledRange?: string;
  hasResource: boolean;
  actionLabel: string;
  isCompleted?: boolean;
  isCustom?: boolean;
  isWellness?: boolean;
  /** MOCK tasks only — see mockTaskHref. */
  mockAnalysisId?: string | null;
  mockName?: string;
  mockDate?: string;
};

type TaskRowProps = {
  task: Task;
  onStartPractice?: (taskId: string) => void;
  onTaskChanged?: () => void;
  /** data-coach anchor for the action button — set on the first row only, so
   *  the Onboarding Coach's Focus Mode step has something to point at. */
  coachAnchor?: string;
};

export function TaskRow({
  task,
  onStartPractice,
  onTaskChanged,
  coachAnchor,
}: TaskRowProps) {
  const [done, setDone] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const router = useRouter();
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
  className="
    w-full
    rounded-md
    border
    border-[#EEF0F8]
    bg-white
    p-4
    shadow-[0px_2px_18px_0px_#1A1A4E0A]
    sm:p-6
    dark:border-[#242453]
    dark:bg-[#1A1A4E]
    dark:shadow-[0px_2px_6px_0px_#FFFFFF0A]
  "
>
  <div className="flex flex-wrap items-center justify-between gap-4 sm:gap-6">

    {/* LEFT */}
    <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-6">

      {/* Subject Icon */}
      <div
        className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-lg
          border
          border-[#D6E4FF]
          bg-subject-bg
          text-[16px]
          font-bold
          text-subject-text
          sm:h-12
          sm:w-12
          sm:text-[18px]
          dark:border-transparent
          dark:bg-[#FAF7F214]
        "
      >
        {task.subjectLabel}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">

        <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">

          <span className="text-[10px] font-bold uppercase tracking-wide text-ink">
            {task.subjectName}
          </span>

          <span
            className={`
              rounded-sm
              border
              px-1.5 py-0.5
              text-[9px]
              font-semibold
              uppercase
              tracking-[0.5px]
              leading-none
              whitespace-nowrap
              sm:px-2
              sm:text-[10px]
              md:text-xs
              ${TYPE_STYLES[task.type]}
            `}
          >
            {TYPE_LABELS[task.type]}
          </span>

          {task.isCustom && (
            <span
              className={`
                rounded-sm
                border-0
                px-1.5 py-0.5
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.5px]
                leading-none
                whitespace-nowrap
                sm:px-2
                sm:text-[10px]
                md:text-xs
                ${CUSTOM_BADGE_STYLE}
              `}
            >
              Custom
            </span>
          )}
        </div>

        {/* Chapter */}
        <h3 className="break-words text-base font-bold leading-5 text-ink sm:truncate sm:text-lg sm:leading-normal">
          {getChapterTitle(task.title)}
        </h3>

        <p className="mt-1 break-words text-[11px] font-normal leading-4 tracking-normal text-[#666666] sm:text-[12px] sm:leading-[16px] dark:text-[#8B8998]">
          {task.meta}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-[#8B8998] sm:gap-4 sm:text-xs">

          <span className="flex shrink-0 items-center gap-1">
            <ClockIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            {task.duration}
          </span>

          <span className="flex shrink-0 items-center gap-1 font-semibold text-[#FFAE1A]">
            <SunIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            {task.timeSlot}
          </span>

          {task.scheduledRange && (
            <span className="flex shrink-0 items-center gap-1">
              <Time className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              {task.scheduledRange}
            </span>
          )}

          {task.hasResource && (
            <span className="flex shrink-0 items-center gap-1">
              <Book className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              Resource
            </span>
          )}

        </div>
      </div>
    </div>

    {/* RIGHT */}
    <div
      className="
        flex
        w-full
        items-center
        justify-end
        gap-2
        sm:w-auto
        sm:gap-3
        sm:justify-end
      "
    >
      <Button
        data-coach={coachAnchor}
        variant={isPrimaryActionDisabled ? "secondary" : "outline"}
        size="sm"
        disabled={isPrimaryActionDisabled}
        className={
          isPrimaryActionDisabled
            ? `
              h-8!
              min-w-0!
              flex-1!
              justify-center
              px-2.5!
              text-[11px]!
              leading-none!
              font-semibold!
              whitespace-nowrap!
              cursor-not-allowed!
              opacity-60!
              hover:bg-transparent!
              hover:border-current!
              hover:text-current!
              hover:shadow-none!
              sm:h-9!
              sm:w-auto!
              sm:min-w-[138px]!
              sm:flex-none!
              sm:px-4!
              sm:text-[12px]!
            `
            : `
              h-8!
              min-w-0!
              flex-1!
              justify-center
              gap-1.5!
              px-2.5!
              text-[11px]!
              leading-none!
              font-semibold!
              whitespace-nowrap!
              sm:h-9!
              sm:w-auto!
              sm:min-w-[138px]!
              sm:flex-none!
              sm:gap-2.5!
              sm:px-4!
              sm:text-[14px]!
            `
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
            : isPrimaryActionDisabled || task.isCompleted
              ? undefined
              : isStartPractice
                ? () => onStartPractice?.(task.id)
                : undefined
        }
      >
        {displayLabel}
      </Button>

      <div className="shrink-0">
        <CompleteTaskCheckbox
          taskId={task.id}
          title={getChapterTitle(task.title)}
          secondsCompleted={task.secondsCompleted ?? 0}
          isCompleted={task.isCompleted}
          // A MOCK task only completes by uploading the score.
          disabled={isSkipped || (isMockTask && !isMockDone)}
          onCompleted={onTaskChanged}
        />
      </div>

      <div className="shrink-0">
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
            timeSlot: task.timeSlot,
          }}
          onTaskChanged={onTaskChanged}
          onReorder={() =>
            router.push(`/home/today-plan?reorderTaskId=${task.id}`)
          }
          disabled={isActionDisabled}
        />
      </div>
    </div>
  </div>
</div>
  );
}