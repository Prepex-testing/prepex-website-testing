"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ClockIcon, SunIcon, FileIcon } from "@/components/ui/icons";
import { TaskEditMenu } from "@/components/home/TaskEditMenu";
import { TYPE_STYLES, TYPE_LABELS } from "@/components/home/taskTypes";
import type { TaskType } from "@/components/home/taskTypes";

export type { TaskType };
export { TYPE_STYLES, TYPE_LABELS };

export type Task = {
  id: string;
  subjectLabel: string;
  subjectName: string;
  type: TaskType;
  title: string;
  meta: string;
  duration: string;
  timeSlot: string;
  hasResource: boolean;
  actionLabel: string;
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

  const isStartPractice =
    task.actionLabel === "Start Practice";

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
    leading-none
    whitespace-nowrap
    ${TYPE_STYLES[task.type]}
  `}
              >
                {TYPE_LABELS[task.type]}
              </span>
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

              <span className="flex items-center gap-1">
                <SunIcon />
                {task.timeSlot}
              </span>

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
            variant="task"
            size="sm"
            href={
              task.actionLabel === "Start Session"
                ? "/home/session"
                : task.actionLabel === "Start Revision"
                  ? "/revision-session"
                  : undefined
            }
            onClick={
              isStartPractice
                ? onStartPractice
                : undefined
            }
          >
            {task.actionLabel}
          </Button>
          <input
            type="checkbox"
            checked={done}
            onChange={() => setDone(!done)}
            aria-label={`Mark ${task.title} complete`}
            className="h-5 w-5 appearance-none rounded border border-[#333333] dark:border-[#8B8998] bg-transparent checked:border-brand checked:bg-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />

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