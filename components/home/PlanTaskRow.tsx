"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ClockIcon, CalendarIcon, GripVerticalIcon } from "@/components/ui/icons";
import { TaskEditMenu } from "@/components/home/TaskEditMenu";
import { TYPE_STYLES, TYPE_LABELS } from "@/components/home/TaskRow";
import type { TaskType } from "@/components/home/TaskRow";

type Difficulty = "high" | "medium";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  high: "bg-danger-bg text-danger",
  medium: "bg-warning/10 text-warning",
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  high: "High",
  medium: "Medium",
};

export type PlanTask = {
  id: string;
  subjectLabel: string;
  subjectName: string;
  type: TaskType;
  title: string;
  meta: string;
  duration: string;
  timeRange: string;
  difficulty: Difficulty;
  actionLabel: string;
};

type PlanTaskRowProps = {
  task: PlanTask;
  onStartPractice?: () => void;
};

export function PlanTaskRow({ task, onStartPractice }: PlanTaskRowProps) {
  const [done, setDone] = useState(false);
  const isStartPractice = task.actionLabel.toLowerCase().includes("practice");

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-brand/10 bg-surface p-3">
      <span className="mt-1.5 shrink-0 cursor-grab text-muted" aria-hidden="true">
        <GripVerticalIcon />
      </span>

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
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <ClockIcon />
            {task.duration}
          </span>
          <span className="flex items-center gap-1">
            <CalendarIcon />
            {task.timeRange}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${DIFFICULTY_STYLES[task.difficulty]}`}
          >
            {DIFFICULTY_LABELS[task.difficulty]}
          </span>
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center gap-2 pl-19 sm:w-auto sm:pl-0">
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
          }}
        />
      </div>
    </div>
  );
}
