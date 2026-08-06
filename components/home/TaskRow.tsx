"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ClockIcon, SunIcon, FileIcon, CalendarIcon, CheckIcon } from "@/components/ui/icons";
import { TaskEditMenu } from "@/components/home/TaskEditMenu";
import { TYPE_STYLES, TYPE_LABELS, COMPLETED_ACTION_LABELS, CUSTOM_BADGE_STYLE } from "@/components/home/taskTypes";
import type { TaskType } from "@/components/home/taskTypes";

export type { TaskType };
export { TYPE_STYLES, TYPE_LABELS, COMPLETED_ACTION_LABELS, CUSTOM_BADGE_STYLE };

export type Task = {
  id: string;
  subjectLabel: string;
  subjectName: string;
  type: TaskType;
  title: string;
  meta: string;
  duration: string;
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

  const isStartPractice = task.type === "practice";
  const displayLabel = task.isCompleted ? COMPLETED_ACTION_LABELS[task.type] : task.actionLabel;

  return (
    <div
      className="
        w-full
        rounded-2xl
        border
        border-brand/10
        bg-surface
        px-3
        py-4
      "
    >
      <div className="flex flex-wrap items-center justify-between gap-4">

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

              <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
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

            <p className="mt-1 text-sm text-muted">
              {task.meta}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">

              <span className="flex items-center gap-1">
                <ClockIcon />
                {task.duration}
              </span>

              <span className="flex items-center gap-1 font-semibold text-warning">
                <SunIcon />
                {task.timeSlot}
              </span>

              {task.scheduledRange && (
                <span className="flex items-center gap-1">
                  <CalendarIcon />
                  {task.scheduledRange}
                </span>
              )}

              {task.hasResource && (
                <span className="flex items-center gap-1">
                  <FileIcon />
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
            variant={task.isCompleted ? "secondary" : "task"}
            size="sm"
            disabled={task.isCompleted}
            className={task.isCompleted ? "border-transparent! bg-[#E7F9F3]! text-[#10B981]! cursor-default" : ""}
            href={
              task.isCompleted
                ? undefined
                : task.type === "new-learning"
                  ? `/home/session?taskId=${task.id}`
                  : task.type === "revision"
                    ? `/revision-session?taskId=${task.id}`
                    : undefined
            }
            onClick={
              !task.isCompleted && isStartPractice
                ? onStartPractice
                : undefined
            }
          >
            {displayLabel}
          </Button>
          {task.isCompleted ? (
            <span
              aria-label={`${task.title} completed`}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#E7F9F3] text-[#10B981] dark:bg-white"
            >
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
          ) : (
            <input
              type="checkbox"
              checked={done}
              onChange={() => setDone(!done)}
              aria-label={`Mark ${task.title} complete`}
              className="h-5 w-5 appearance-none rounded border border-[#333333] dark:border-[#8B8998] bg-transparent checked:border-brand checked:bg-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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