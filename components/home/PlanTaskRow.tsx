"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ClockIcon, CalendarIcon, GripVerticalIcon, CheckIcon } from "@/components/ui/icons";
import { TaskEditMenu } from "@/components/home/TaskEditMenu";
import { TYPE_STYLES, TYPE_LABELS, COMPLETED_ACTION_LABELS } from "@/components/home/TaskRow";
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
  isCompleted?: boolean;
};

type PlanTaskRowProps = {
  task: PlanTask;
  onStartPractice?: () => void;
};

export function PlanTaskRow({ task, onStartPractice }: PlanTaskRowProps) {
  const [done, setDone] = useState(false);
  const isStartPractice = task.type === "practice";
  const displayLabel = task.isCompleted ? COMPLETED_ACTION_LABELS[task.type] : task.actionLabel;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand/10 bg-surface p-4 sm:gap-4">
      {/* Drag handle — 18x18 per spec */}
      <span className="shrink-0 cursor-grab text-muted" aria-hidden="true">
        <GripVerticalIcon />
      </span>

      {/* Avatar — 56x56, rounded-lg (8px), #EEF2FF fill, 24px bold #1A1A4E */}
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-plan-avatar-bg text-2xl font-bold leading-8 text-subject-text">
        {task.subjectLabel}
      </span>

      {/* Content column */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-muted">
            {task.subjectName}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold leading-[15px] ${TYPE_STYLES[task.type]}`}
          >
            {TYPE_LABELS[task.type]}
          </span>
        </div>

        <p className="mt-0.5 text-base font-bold leading-6 text-ink">
          {task.title}
        </p>

        <p className="text-xs font-normal leading-4 text-[#9CA3AF]">{task.meta}</p>

        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-medium leading-4 text-[#6B7280]">
          <span className="flex items-center gap-1">
            <ClockIcon />
            {task.duration}
          </span>
          <span className="flex items-center gap-1">
            <CalendarIcon />
            {task.timeRange}
          </span>
          <span
            className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold ${DIFFICULTY_STYLES[task.difficulty]}`}
          >
            {DIFFICULTY_LABELS[task.difficulty]}
          </span>
        </div>
      </div>

      {/* Actions — 16px gap between button and checkbox/menu group */}
      <div className="flex w-full shrink-0 items-center gap-4 sm:w-auto">
        <Button
          variant="task"
          size="sm"
          disabled={task.isCompleted}
          className={
            task.isCompleted
              ? "h-[38px] rounded-lg border-transparent! bg-[#E7F9F3]! px-3 sm:px-5 py-2 text-xs sm:text-sm font-bold leading-5 text-[#10B981]! cursor-default whitespace-nowrap"
              : "h-[38px] rounded-lg border border-[#1A1A4E] px-3 sm:px-5 py-2 text-xs sm:text-sm font-bold leading-5 text-[#1A1A4E] whitespace-nowrap"
          }
          href={
            task.isCompleted
              ? undefined
              : task.type === "new-learning"
                ? `/home/session?taskId=${task.id}`
                : task.type === "revision"
                  ? `/revision-session?taskId=${task.id}`
                  : undefined
          }
          onClick={!task.isCompleted && isStartPractice ? onStartPractice : undefined}
        >
          {displayLabel}
        </Button>

        <div className="flex items-center gap-2">
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
              onChange={() => setDone((value) => !value)}
              aria-label={`Mark "${task.title}" complete`}
              className="h-5 w-5 rounded border border-[#333333] dark:border-[#8B8998]"
            />
          )}
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
    </div>
  );
}