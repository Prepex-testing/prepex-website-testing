"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanTaskRow, toRowDifficulty } from "@/components/home/PlanTaskRow";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { withPracticeProgressLabel } from "@/components/home/taskTypes";
import type { PlanTask } from "@/components/home/PlanTaskRow";
import { TodaysPracticeModal } from "@/components/practice/TodaysPracticeModal";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import { Button } from "@/components/ui/Button";
import {PlusIcon } from "@/components/ui/icons";
import { PageLoader } from "@/components/ui/PageLoader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { getTodayPlan, type PlannerTask } from "@/lib/api/planner";
import { prettyDifficulty } from "@/lib/api/practice";

function toPracticeRow(task: PlannerTask): PlanTask {
  return {
    id: task.id,
    subjectLabel: task.subject?.code?.[0] ?? "P",
    subjectName: task.subject?.name ?? "Practice",
    type: "practice",
    title: task.title,
    meta: task.description ?? task.chapter?.name ?? "",
    description: task.description ?? "",
    chapterName: task.chapter?.name ?? "",
    duration: `${task.estimatedMinutes} min`,
    estimatedMinutes: task.estimatedMinutes,
    secondsCompleted: task.secondsCompleted,
    status: task.status,
    timeRange:
      task.scheduledStart && task.scheduledEnd
        ? `${task.scheduledStart} - ${task.scheduledEnd}`
        : "",
    difficulty: toRowDifficulty(task.chapter?.chapterMetadata?.difficulty),
    actionLabel: withPracticeProgressLabel("Start Practice", task.secondsCompleted, task.status),
    isCompleted: task.status === "COMPLETED",
  };
}

export default function PracticeSessionsPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<PlanTask[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPracticeModalOpen, setPracticeModalOpen] = useState(false);
  const [practiceTaskId, setPracticeTaskId] = useState<string | null>(null);
  const [practiceTaskStats, setPracticeTaskStats] = useState<{
    estimatedMinutes: number;
    difficultyLabel: string;
  } | null>(null);
  const [isAddTaskOpen, setAddTaskOpen] = useState(false);

  const refetch = useCallback(() => {
    getTodayPlan()
      .then(({ data }) => {
        const practice = (data.plan?.tasks ?? []).filter((t) => t.taskType === "PRACTICE");
        setTasks(practice.map(toPracticeRow));
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Could not load practice sessions.");
      });
  }, []);

  useEffect(refetch, [refetch]);

  if (!tasks && !loadError) return <PageLoader label="Loading practice sessions…" />;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Practice Sessions</h1>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {loadError ? (
        <p className="text-sm text-muted">{loadError}</p>
      ) : !tasks ? (
        <p className="text-sm text-muted">Loading practice sessions…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted">No practice tasks scheduled for today.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <PlanTaskRow
              key={task.id}
              task={task}
              onTaskChanged={refetch}
              onStartPractice={(taskId) => {
                setPracticeTaskId(taskId);
                setPracticeTaskStats({
                  estimatedMinutes: task.estimatedMinutes,
                  difficultyLabel: prettyDifficulty(task.difficulty),
                });
                setPracticeModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <div className="flex justify-center">
        <Button
          variant="primary"
          onClick={() => setAddTaskOpen(true)}
          className="h-[60px]! w-[323px]! rounded-[12px] px-8 py-4 font-['Plus_Jakarta_Sans'] text-[18px] font-bold leading-7 transition-all duration-300 ease-out"
        >
          <PlusIcon />
          Add Task
        </Button>
      </div>

      <TodaysPracticeModal
        open={isPracticeModalOpen}
        onClose={() => setPracticeModalOpen(false)}
        taskId={practiceTaskId}
        estimatedMinutes={practiceTaskStats?.estimatedMinutes}
        taskDifficultyLabel={practiceTaskStats?.difficultyLabel}
        onStart={() => {
          setPracticeModalOpen(false);
          router.push(
            practiceTaskId ? `/practice?taskId=${practiceTaskId}` : "/practice",
          );
        }}
      />

      <AddCustomTaskModal
        open={isAddTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onTaskAdded={refetch}
        lockedTaskType="Practice"
        title="Add Custom Practice Task"
      />
    </div>
  );
}
