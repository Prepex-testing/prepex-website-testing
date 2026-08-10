"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { Suspense, useEffect, useState, type DragEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { useTheme } from "@/components/theme/ThemeProvider";
import { TimeBlockSection } from "@/components/home/TimeBlockSection";
import { PlanTaskRow } from "@/components/home/PlanTaskRow";
import type { PlanTask } from "@/components/home/PlanTaskRow";
import type { TaskType } from "@/components/home/TaskRow";
import { withResumeLabel } from "@/components/home/taskTypes";
import { RegeneratePlanModal } from "@/components/home/RegeneratePlanModal";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import { TodaysPracticeModal } from "@/components/practice/TodaysPracticeModal";
import { getTodayPlan, reorderPlannerTask, type PlannerTask, type TodayPlanResponse } from "@/lib/api/planner";
import { CheckIcon, ClockIcon, ListIcon, CalendarIcon,BellIcon ,ArrowLeftIcon} from "@/assets/icons";
import {
  // ArrowLeftIcon,
  // BellIcon,
  // CheckIcon,
  // ClockIcon,
  // ListIcon,
  // CalendarIcon,
  CloudSunIcon,
  SunIcon,
  CloudMoonIcon,
  MoonIcon,
  PlusIcon,
  RefreshIcon,
} from "@/components/ui/icons";

const TASK_TYPE_STYLE: Record<string, TaskType> = {
  PRACTICE: "practice",
  REVISION: "revision",
  LEARNING: "new-learning",
  WELLNESS: "new-learning",
};

const TASK_ACTION_LABEL: Record<string, string> = {
  PRACTICE: "Start Practice",
  REVISION: "Start Revision",
  LEARNING: "Start Session",
  WELLNESS: "Start Session",
};

function formatWindow(window: string | null | undefined) {
  if (!window) return "";
  const label = window.toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDuration(minutes: number) {
  const totalMinutes = Math.floor(minutes);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function toPlanTask(task: PlannerTask): PlanTask {
  return {
    id: task.id,
    subjectLabel: task.subject?.code?.[0] ?? "W",
    subjectName: task.subject?.name ?? "Wellness",
    type: TASK_TYPE_STYLE[task.taskType] ?? "new-learning",
    title: task.title,
    meta: task.description ?? task.chapter?.name ?? "",
    description: task.description ?? "",
    chapterName: task.chapter?.name ?? "",
    duration: `${task.estimatedMinutes} min`,
    estimatedMinutes: task.estimatedMinutes,
    secondsCompleted: task.secondsCompleted,
    taskOrder: task.taskOrder,
    status: task.status,
    timeRange: task.scheduledStart && task.scheduledEnd
      ? `${task.scheduledStart} - ${task.scheduledEnd}`
      : formatWindow(task.suggestedWindow),
    difficulty: "medium",
    actionLabel: task.taskType === "PRACTICE" && task.questionCount
      ? `Practice ${task.questionCount} Qs`
      : withResumeLabel(TASK_ACTION_LABEL[task.taskType] ?? "Start Session", task.status),
    isCompleted: task.status === "COMPLETED",
    isCustom: Boolean(task.isAnchor),
  };
}

function groupTasksByWindow(tasks: PlannerTask[]) {
  const morning = tasks.filter((task) => task.suggestedWindow === "MORNING");
  const afternoon = tasks.filter((task) => task.suggestedWindow === "MIDDAY");
  const evening = tasks.filter((task) => task.suggestedWindow === "EVENING");
  const night = tasks.filter((task) => task.suggestedWindow === "NIGHT");
  return { morning, afternoon, evening, night };
}

function sectionMeta(tasks: PlannerTask[]) {
  const totalMinutes = tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
  return `${tasks.length} Task${tasks.length === 1 ? "" : "s"} • ${formatDuration(totalMinutes)}`;
}

const STAT_TILES = [
  { label: "Completed", value: "2h 15m", icon: <CheckIcon className="h-4 w-4" /> },
  { label: "Remaining", value: "4h 15m", icon: <ClockIcon className="h-4 w-4" /> },
  { label: "Tasks Done", value: "3 / 7", icon: <ListIcon className="h-4 w-4" /> },
  { label: "Planned Study", value: "6h 30m", icon: <CalendarIcon className="h-4 w-4" /> },
];

const MORNING_TASKS: PlanTask[] = [
  {
    id: "newtons-laws",
    subjectLabel: "P",
    subjectName: "Physics",
    type: "revision",
    title: "Newton's Laws",
    meta: "NCERT Ch 4 • Concept Video",
    duration: "60 min",
    estimatedMinutes: 60,
    timeRange: "9:00 - 10:00 AM",
    difficulty: "high",
    actionLabel: "Start Revision",
  },
  {
    id: "electrochemistry",
    subjectLabel: "C",
    subjectName: "Chemistry",
    type: "new-learning",
    title: "Electrochemistry",
    meta: "PYQ Lecture",
    duration: "45 min",
    estimatedMinutes: 45,
    timeRange: "10:30 - 11:15 AM",
    difficulty: "medium",
    actionLabel: "Start Session",
  },
];

const AFTERNOON_TASKS: PlanTask[] = [
  {
    id: "calculus-practice",
    subjectLabel: "M",
    subjectName: "Maths",
    type: "practice",
    title: "Calculus Practice",
    meta: "NCERT Ch 7 • 15 Qs",
    duration: "75 min",
    estimatedMinutes: 75,
    timeRange: "12:00 - 1:15 PM",
    difficulty: "medium",
    actionLabel: "Practice 15 Qs",
  },
];

const EVENING_TASKS: PlanTask[] = [
  {
    id: "optics",
    subjectLabel: "P",
    subjectName: "Physics",
    type: "new-learning",
    title: "Optics",
    meta: "Ray Optics • PW Lecture",
    duration: "60 min",
    estimatedMinutes: 60,
    timeRange: "5:00 - 6:00 PM",
    difficulty: "high",
    actionLabel: "Start Session",
  },
  {
    id: "organic-chemistry-revision",
    subjectLabel: "C",
    subjectName: "Chemistry",
    type: "revision",
    title: "Organic Chemistry Revision",
    meta: "GOC Basics • Concept Video",
    duration: "60 min",
    estimatedMinutes: 60,
    timeRange: "6:30 - 7:30 PM",
    difficulty: "medium",
    actionLabel: "Start Revision",
  },
];

export default function TodayPlanPage() {
  return (
    <Suspense fallback={null}>
      <TodayPlanContent />
    </Suspense>
  );
}

function TodayPlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reorderTaskIdParam = searchParams.get("reorderTaskId");
  const [isRegenerateOpen, setRegenerateOpen] = useState(false);
  const [isPracticeModalOpen, setPracticeModalOpen] = useState(false);
  const [isAddTaskOpen, setAddTaskOpen] = useState(false);
  const [planData, setPlanData] = useState<TodayPlanResponse | null>(null);
  const [reorderTaskId, setReorderTaskId] = useState<string | null>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const refetchPlan = () => {
    getTodayPlan()
      .then(({ data }) => setPlanData(data))
      .catch(() => {
        // Best-effort — the page falls back to the placeholder plan below.
      });
  };

  useEffect(refetchPlan, []);

  const plan = planData?.plan;
  const summary = planData?.summary;
  const { morning, afternoon, evening, night } = groupTasksByWindow(plan?.tasks ?? []);
  const morningTasks = plan ? morning.map(toPlanTask) : MORNING_TASKS;
  const afternoonTasks = plan ? afternoon.map(toPlanTask) : AFTERNOON_TASKS;
  const eveningTasks = plan ? evening.map(toPlanTask) : EVENING_TASKS;
  const nightTasks = plan ? night.map(toPlanTask) : [];

  // Arms the task named by ?reorderTaskId= (e.g. routed here from /home's
  // Reorder menu item) once the plan has loaded and the task is found in it.
  useEffect(() => {
    if (!reorderTaskIdParam || !plan || reorderTaskId === reorderTaskIdParam) return;
    const allTasks = [...morningTasks, ...afternoonTasks, ...eveningTasks, ...nightTasks];
    if (allTasks.some((task) => task.id === reorderTaskIdParam)) setReorderTaskId(reorderTaskIdParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reorderTaskIdParam, plan]);

  const handleReorderSelect = (taskId: string) => {
    setReorderTaskId((current) => (current === taskId ? null : taskId));
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, taskId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", taskId);
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>, targetTask: PlanTask) => {
    event.preventDefault();
    const draggedTaskId = reorderTaskId;
    setReorderTaskId(null);
    if (!draggedTaskId || draggedTaskId === targetTask.id || targetTask.taskOrder == null) return;
    try {
      await reorderPlannerTask(draggedTaskId, targetTask.taskOrder);
    } catch {
      // Best-effort — the list still reflects the previous order until the user retries.
    } finally {
      refetchPlan();
    }
  };

  const renderTaskRow = (task: PlanTask) => (
    <PlanTaskRow
      key={task.id}
      task={task}
      onStartPractice={() => setPracticeModalOpen(true)}
      onTaskChanged={refetchPlan}
      onReorder={() => handleReorderSelect(task.id)}
      isDragArmed={reorderTaskId === task.id}
      isDropTarget={reorderTaskId !== null && reorderTaskId !== task.id}
      onDragStart={(event) => handleDragStart(event, task.id)}
      onDrop={(event) => handleDrop(event, task)}
    />
  );

  const completionPercent = summary?.completionPercentage ?? 35;
  const statTiles = summary
    ? [
        { label: "Completed", value: formatDuration(summary.totalTimeCompletedSeconds / 60), icon: <CheckIcon className="h-4 w-4" /> },
        {
          label: "Remaining",
          value: formatDuration(Math.max(summary.totalPlannedMinutes - summary.totalTimeCompletedSeconds / 60, 0)),
          icon: <ClockIcon className="h-4 w-4" />,
        },
        {
          label: "Tasks Done",
          value: `${summary.completedTaskCount} / ${summary.totalTaskCount}`,
          icon: <ListIcon className="h-4 w-4" />,
        },
        { label: "Planned Study", value: formatDuration(summary.totalPlannedMinutes), icon: <CalendarIcon className="h-4 w-4" /> },
      ]
    : STAT_TILES;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Back to Home" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <div>
            <h1 className="text-h1 text-ink">Today&apos;s Plan</h1>
            <p className="text-sm text-muted">Monday, 29 June</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Progress Card */}
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-brand/10 bg-surface p-6 text-center shadow-[0px_1px_2px_0px_#1A1A4E0F]">
          <CircularProgress
            percent={completionPercent}
            label="Overall"
            size={110}
            progressColor={isDark ? "#FAF7F2" : undefined}
            progressGradient={
              isDark ? undefined : { from: "#1A1A4E", to: "#4C1D95" }
            }
            valueClassName={isDark ? "text-[#FAF7F2]" : "text-[#171658]"}
          />

          <p className={`mt-6 text-xl font-semibold ${isDark ? "text-[#8B8998]" : "text-[#111827]"}`}>
            Daily Goal Progress
          </p>

          <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-[#DCFCE7] bg-white px-3 py-1 text-[10px] font-bold uppercase leading-[15px] text-[#16A34A] dark:border-[#166534] dark:bg-white dark:text-[#16A34A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
            ON TRACK
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {statTiles.map((tile) => (
            <div
              key={tile.label}
              className="flex min-h-[102px] flex-col justify-between rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0px_1px_2px_0px_#1A1A4E0F]"
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  {tile.label}
                </p>

                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-icon-chip-bg p-1.5 text-ink dark:bg-[#FAF7F2]/8">
                  {tile.icon}
                </span>
              </div>

              <p className={`mt-5 text-[32px] font-extrabold leading-none ${isDark ? "text-[#FAF7F2]" : "text-[#111827]"}`}>
                {tile.value}
              </p>
            </div>
          ))}
        </div>
      </div>


      {reorderTaskId && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-tint px-4 py-3 text-sm text-ink">
          <span>Drag the highlighted task and drop it on another task to move it there.</span>
          <button
            type="button"
            onClick={() => setReorderTaskId(null)}
            className="shrink-0 font-bold underline"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {morningTasks.length > 0 && (
          <TimeBlockSection
            icon={<CloudSunIcon />}
            title="Morning"
            meta={plan ? sectionMeta(morning) : "2 Tasks • 1h 45m"}
          >
            <div className="flex flex-col gap-3">
              {morningTasks.map((task) => renderTaskRow(task))}
            </div>
          </TimeBlockSection>
        )}
        {afternoonTasks.length > 0 && (
          <TimeBlockSection
            icon={<SunIcon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />}
            title="Afternoon"
            meta={plan ? sectionMeta(afternoon) : "1 Task • 1h 15m"}
          >
            <div className="flex flex-col gap-3">
              {afternoonTasks.map((task) => renderTaskRow(task))}
            </div>
          </TimeBlockSection>
        )}
        {eveningTasks.length > 0 && (
          <TimeBlockSection
            icon={<CloudMoonIcon />}
            title="Evening"
            meta={plan ? sectionMeta(evening) : "2 Tasks • 2h 00m"}
          >
            <div className="flex flex-col gap-3">
              {eveningTasks.map((task) => renderTaskRow(task))}
            </div>
          </TimeBlockSection>
        )}
        {nightTasks.length > 0 && (
          <TimeBlockSection
            icon={<MoonIcon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />}
            title="Night"
            meta={sectionMeta(night)}
          >
            <div className="flex flex-col gap-3">
              {nightTasks.map((task) => renderTaskRow(task))}
            </div>
          </TimeBlockSection>
        )}
      </div>


      <div className="py-6">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[7fr_8fr]">

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAddTaskOpen(true)}
            className="h-[50px] w-full text-[14px] font-bold"
          >
            <PlusIcon />
            Add Custom Task
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setRegenerateOpen(true)}
            className="h-[50px] w-full text-[14px] font-bold"
          >
           <RefreshIcon className="h-3.5 w-3.5 shrink-0 sm:h-3.5 sm:w-3.5 md:h-[13.33px] md:w-[13.33px]" />
            Regenerate Today&apos;s Plan
          </Button>

        </div>
      </div>
      <RegeneratePlanModal
        open={isRegenerateOpen}
        onClose={() => setRegenerateOpen(false)}
        onRegenerated={refetchPlan}
      />
      <AddCustomTaskModal
        open={isAddTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onTaskAdded={refetchPlan}
      />
      <TodaysPracticeModal
        open={isPracticeModalOpen}
        onClose={() => setPracticeModalOpen(false)}
        onStart={() => {
          setPracticeModalOpen(false);
          router.push("/practice");
        }}
      />
    </div>
  );
}
