"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useBeginPageTransition } from "@/components/layout/PageTransition";
import { ClockIcon, SunIcon, FileIcon, CalendarIcon, CheckIcon } from "@/components/ui/icons";
import { TaskEditMenu } from "@/components/home/TaskEditMenu";
import { TYPE_STYLES, TYPE_LABELS, COMPLETED_ACTION_LABELS, CUSTOM_BADGE_STYLE } from "@/components/home/taskTypes";
import type { TaskType } from "@/components/home/taskTypes";

export type { TaskType };
export { TYPE_STYLES, TYPE_LABELS, COMPLETED_ACTION_LABELS, CUSTOM_BADGE_STYLE };
import { Book, Time } from "@/assets/icons";
export type Task = {
  id: string;
  subjectLabel: string;
  subjectName: string;
  type: TaskType;
  title: string;
  meta: string;
  duration: string;
  estimatedMinutes: number;
  timeSlot: string;
  scheduledRange?: string;
  hasResource: boolean;
  actionLabel: string;
  isCompleted?: boolean;
  isCustom?: boolean;
};

type TaskRowProps = {
  task: Task;
  onStartPractice?: () => void;
};

export function TaskRow({
  task,
  onStartPractice,
}: TaskRowProps) {
  const [done, setDone] = useState(false);
  const beginExit = useBeginPageTransition();

  const isStartPractice = task.type === "practice";
  const isStartRevision = task.type === "revision";
  const displayLabel = task.isCompleted ? COMPLETED_ACTION_LABELS[task.type] : task.actionLabel;

  return (
    <div
      className="
        w-full
        rounded-md
        border
        border-[#EEF0F8]
        bg-white
        p-6
        shadow-[0px_2px_18px_0px_#1A1A4E0A]
        dark:border-[#242453]
        dark:bg-[#1A1A4E]
        dark:shadow-[0px_2px_6px_0px_#FFFFFF0A]
      "
    >
      <div className="flex flex-wrap items-center justify-between gap-6">

        {/* LEFT */}
        <div className="flex min-w-0 flex-1 items-center gap-6">

          {/* Subject Icon */}
          <div
            className="
  flex
  h-12
  w-12
  shrink-0
  items-center
  justify-center
  rounded-lg
  border
  border-[#D6E4FF]
  dark:border-transparent
  bg-subject-bg
  dark:bg-[#FAF7F214]
  text-[18px]
  font-bold
  text-subject-text
"
          >
            {task.subjectLabel}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">

            <div className="mb-1 flex items-center gap-2">

              <span className="text-[10px] font-bold uppercase tracking-wide text-ink">
                {task.subjectName}
              </span>

              <span
                className={`
    rounded-sm
    border
    px-1.5 py-0.5
    sm:px-2
    text-[9px]
    sm:text-[10px]
    md:text-xs
    font-semibold
    uppercase
    tracking-[0.5px]
    leading-none
    whitespace-nowrap
    ${TYPE_STYLES[task.type]}
  `}
              >
                {TYPE_LABELS[task.type]}
              </span>

              {task.isCustom && (
                <span
                  className={`rounded-sm border-0 px-1.5 py-0.5 sm:px-2 text-[9px] sm:text-[10px] md:text-xs font-semibold uppercase tracking-[0.5px] leading-none whitespace-nowrap ${CUSTOM_BADGE_STYLE}`}
                >
                  Custom
                </span>
              )}
            </div>

            <h3 className="truncate text-lg font-bold text-ink">
              {task.title}
            </h3>

            <p className="mt-1 text-[12px] font-normal leading-[16px] tracking-normal text-[#666666] dark:text-[#8B8998]">
              {task.meta}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#8B8998]">

              <span className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4 shrink-0" />
                {task.duration}
              </span>

              <span className="flex items-center gap-1 font-semibold text-[#FFAE1A]">
                <SunIcon className="h-4 w-4 shrink-0" />
                {task.timeSlot}
              </span>

              {task.scheduledRange && (
                <span className="flex items-center gap-1">
                  <Time className="h-4 w-4 shrink-0" />
                  {task.scheduledRange}
                </span>
              )}

              {task.hasResource && (
                <span className="flex items-center gap-1">
                  <Book className="h-4 w-4 shrink-0" />
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
            gap-3
            sm:w-auto
            sm:justify-end
          "
        >
          <Button
            variant={task.isCompleted ? "secondary" : "outline"}
            size="sm"
            disabled={task.isCompleted}
            className={
              task.isCompleted
                ? "h-9! w-auto! min-w-[138px]! justify-center px-4! text-[12px]! leading-none! font-semibold! whitespace-nowrap! cursor-not-allowed! opacity-60! hover:bg-transparent! hover:border-current! hover:text-current! hover:shadow-none!"
                : "h-9! w-auto! min-w-[138px]! justify-center gap-2.5! px-4! text-[14px]! leading-none! font-semibold! whitespace-nowrap!"
            }
            href={
              task.isCompleted
                ? undefined
                : isStartRevision
                  ? `/revision-session?taskId=${task.id}`
                  : task.type === "new-learning"
                    ? `/home/session?taskId=${task.id}`
                    : undefined
            }
            onClick={
              task.isCompleted
                ? undefined
                : isStartPractice
                  ? onStartPractice
                  : beginExit
            }
          >
            {displayLabel}
          </Button>

          {task.isCompleted ? (
            <span
              aria-label={`${task.title} completed`}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#EAF2FF] text-[#1A1A4E] dark:bg-[#FFFFFF14] dark:text-white"
            >
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
          ) : (
            <input
              type="checkbox"
              checked={false}
              disabled
              readOnly
              aria-label={`${task.title} not yet complete`}
              className="h-5 w-5 shrink-0 cursor-not-allowed appearance-none rounded border border-[#333333] dark:border-[#8B8998] bg-transparent"
            />
          )}

          <TaskEditMenu
            task={{
              title: task.title,
              subjectName: task.subjectName,
              type: task.type,
              duration: task.duration,
              timeSlot: task.timeSlot,
            }}
          />

        </div>

      </div>
    </div>
  );
}