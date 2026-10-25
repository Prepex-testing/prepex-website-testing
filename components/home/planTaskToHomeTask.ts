import type { Task, TaskType } from "@/components/home/TaskRow";
import { withPracticeProgressLabel, withResumeLabel } from "@/components/home/taskTypes";
import type { PlanTask, TaskKind } from "@/lib/api/plannerV2";
import { chapterResourcesHref } from "@/lib/revision/resourceLinks";
import { STATUS_LABEL, SUBJECT_STYLE, formatClock, formatDuration } from "@/lib/planner/format";

/**
 * The Home task card (components/home/TaskRow) was built for the old plan payload. This turns a planner v2 task into the
 * card's own shape, so the card looks exactly as it did and shows what the new plan knows: the subject, the chapter, the
 * topic, where the content comes from, how long it takes, and where the task stands.
 */

const TYPE_OF_KIND: Record<TaskKind, TaskType> = {
  lecture: "new-learning",
  self_study: "new-learning",
  backlog: "new-learning",
  other: "new-learning",
  practice: "practice",
  revision: "revision",
  mock: "mock",
};

const ACTION_OF_TYPE: Record<TaskType, string> = {
  "new-learning": "Start Session",
  practice: "Start Practice",
  revision: "Start Revision",
  mock: "Upload Score",
  wellness: "Wellness",
};

/** Matches the status words the old card and its helpers read. */
const LEGACY_STATUS: Record<PlanTask["status"], string> = {
  pending: "PENDING",
  in_progress: "IN_PROGRESS",
  done: "COMPLETED",
  skipped: "SKIPPED",
  rolled_over: "ROLLED_OVER",
};

export function windowLabel(startMin: number | null): string {
  if (startMin === null) return "Anytime";
  if (startMin < 12 * 60) return "Morning";
  if (startMin < 17 * 60) return "Afternoon";
  return "Evening";
}

/** The grey line under the chapter: topic and where the content comes from ("Projectile motion · HCV"). */
export function taskMeta(task: Pick<PlanTask, "topic" | "contentSourceLabel" | "questionCount" | "description">): string {
  const parts = [task.topic, task.contentSourceLabel, task.questionCount ? `${task.questionCount} questions` : null].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(" · ") : (task.description ?? "");
}

export function planTaskToHomeTask(task: PlanTask): Task {
  const type = TYPE_OF_KIND[task.kind];
  const status = LEGACY_STATUS[task.status];
  const subjectName = task.subject ? (SUBJECT_STYLE[task.subject]?.label ?? task.subject) : "General";
  const done = task.status === "done";
  const baseLabel = ACTION_OF_TYPE[type];
  const actionLabel = type === "practice" ? withPracticeProgressLabel(baseLabel, task.secondsCompleted, status) : withResumeLabel(baseLabel, status);
  const resourceHref = type === "mock" || !task.chapterName || !task.subject ? undefined : chapterResourcesHref(subjectName, task.chapterName);

  return {
    id: task.id,
    subjectLabel: subjectName.charAt(0).toUpperCase(),
    subjectName,
    type,
    // "<Subject> · <Chapter>": the card strips the subject and leads with the chapter, as it always did.
    title: `${subjectName} · ${task.chapterName ?? task.title}`,
    meta: taskMeta(task),
    description: task.description ?? "",
    chapterName: task.chapterName ?? "",
    chapterId: task.chapterId,
    topic: task.topic,
    duration: formatDuration(task.estimatedMinutes),
    estimatedMinutes: task.estimatedMinutes,
    secondsCompleted: task.secondsCompleted,
    status,
    statusLabel: STATUS_LABEL[task.status],
    timeSlot: windowLabel(task.startMin),
    scheduledRange: task.startMin !== null && task.endMin !== null ? `${formatClock(task.startMin)} - ${formatClock(task.endMin)}` : undefined,
    hasResource: Boolean(resourceHref),
    resourceHref,
    actionLabel,
    isCompleted: done,
    isCustom: task.origin === "manual",
    isWellness: false,
    // A planned mock is logged on the planner's own mock screen, which also completes the task.
    mockHref: type === "mock" && !done ? `/planner/mock?taskId=${task.id}` : undefined,
    mockName: type === "mock" ? task.title : undefined,
  };
}

/** Plan order: by time, tasks without a slot last. */
export function inPlanOrder(tasks: PlanTask[]): PlanTask[] {
  return [...tasks].filter((t) => t.status !== "rolled_over").sort((a, b) => (a.startMin ?? 9999) - (b.startMin ?? 9999) || a.estimatedMinutes - b.estimatedMinutes);
}
