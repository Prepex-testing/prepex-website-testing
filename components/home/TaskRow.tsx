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

export function TaskRow({ task, onStartPractice }: TaskRowProps) {
  const [done, setDone] = useState(false);
  const isStartPractice = task.actionLabel === "Start Practice";

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-brand/10 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
        {task.subjectLabel}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
            {task.subjectName}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_STYLES[task.type]}`}
          >
            {TYPE_LABELS[task.type]}
          </span>
        </div>
        <p className="text-sm font-bold text-ink">{task.title}</p>
        <p className="text-xs text-muted">{task.meta}</p>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted">
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

      <div className="flex w-full shrink-0 items-center gap-2 pl-12 sm:w-auto sm:pl-0">
        <Button
          variant="task"
          size="sm"
          href={task.actionLabel === "Start Session" ? "/home/session" : undefined}
          onClick={isStartPractice ? onStartPractice : undefined}
        >
          {task.actionLabel}
        </Button>
        <input
          type="checkbox"
          checked={done}
          onChange={() => setDone((value) => !value)}
          aria-label={`Mark "${task.title}" complete`}
          className="h-4 w-4 rounded border-brand/25"
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
  );
}
