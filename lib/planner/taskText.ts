import type { PlanDay, PlanTask, TaskKind } from "@/lib/api/plannerV2";
import { formatDuration } from "@/lib/planner/format";

/** The words on a study task card: what kind of task it is, what exactly to do, and when in the day it falls. */

export const TYPE_CHIP: Record<TaskKind, string> = {
  lecture: "New Learning",
  self_study: "New Learning",
  practice: "Practice",
  revision: "Revision",
  mock: "Mock",
  backlog: "Backlog",
  other: "Task",
};

export type Energy = "Morning" | "Afternoon" | "Evening" | "Night";

/** Morning to noon, afternoon to 5 PM, evening to 9 PM, then night. A task with no slot has none. */
export function energyOf(startMin: number | null): Energy | null {
  if (startMin === null) return null;
  if (startMin < 12 * 60) return "Morning";
  if (startMin < 17 * 60) return "Afternoon";
  if (startMin < 21 * 60) return "Evening";
  return "Night";
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The line under the chapter: exactly what the student has to do. Built only from what the plan knows, so nothing is
 * made up: the number of lectures and how long each takes, the number of questions and their source, the revision
 * type and slot length, the kind of mock.
 * TODO(planner): lecture numbers and the lecture source (coaching batch, YouTube) are not stored on the plan task yet;
 * once the backend carries them, add them here ("Allen Lecture 1-2").
 */
export function taskInstruction(task: Pick<PlanTask, "kind" | "title" | "topic" | "description" | "plannedUnits" | "estimatedMinutes" | "questionCount" | "contentSourceLabel">): string {
  const topic = task.topic ? ` · ${task.topic}` : "";
  const units = task.plannedUnits ?? 0;
  switch (task.kind) {
    case "lecture": {
      if (units > 1) return `Watch ${units} lectures, about ${Math.round(task.estimatedMinutes / units)} min each${topic}`;
      return `Watch the lecture, about ${formatDuration(task.estimatedMinutes)}${topic}`;
    }
    case "self_study":
      return `Study and make notes for ${formatDuration(task.estimatedMinutes)}${topic}`;
    case "practice": {
      const count = task.questionCount ? `Solve ${plural(task.questionCount, "question", "questions")}` : `Practice for ${formatDuration(task.estimatedMinutes)}`;
      const source = task.contentSourceLabel ? ` · ${task.contentSourceLabel}` : "";
      return `${count}${source}${topic}`;
    }
    case "revision": {
      const type = task.contentSourceLabel && task.contentSourceLabel !== "Spaced revision" ? `${task.contentSourceLabel} revision` : "Revision";
      const slot = units > 1 ? `${units} × ${Math.round(task.estimatedMinutes / units)}-min slots` : `${Math.round(task.estimatedMinutes)}-min slot`;
      return `${type} · ${slot}${topic}`;
    }
    case "mock":
      return `${task.title} · ${formatDuration(task.estimatedMinutes)}`;
    case "backlog":
      return `Clear this backlog item${topic}`;
    default:
      return task.description ?? task.title;
  }
}

export type ExplainInputs = {
  /** The student's mood label from today's check-in ("Drained", "Good"), when there is one. */
  energyLabel?: string | null;
  /** The chapter in this plan with the weakest practice accuracy, when known. */
  weakChapter?: string | null;
};

/**
 * A short, honest "why this plan today" for when the backend's explain endpoint is not there. It only states what the plan
 * itself shows: carry-overs, spaced revisions, backlog, the student's energy and the weakest chapter in the plan.
 * TODO(planner): wire /api/planner/today/explain once the backend window exposes it.
 */
export function explainPlan(day: Pick<PlanDay, "tasks" | "plan">, inputs: ExplainInputs = {}): string {
  const live = day.tasks.filter((t) => t.status !== "skipped" && t.status !== "rolled_over");
  if (live.length === 0) return "Nothing is planned yet. Build the plan and Prepex picks the work from your weekly goals and your free hours.";
  const carry = live.filter((t) => t.origin === "rollover").length;
  const sr = live.filter((t) => t.origin === "sr").length;
  const backlog = live.filter((t) => t.origin === "backlog" || t.kind === "backlog").length;

  const parts: string[] = [];
  if (carry > 0) parts.push(`${plural(carry, "carry-over", "carry-overs")} from yesterday`);
  if (sr > 0) parts.push(`${plural(sr, "spaced revision", "spaced revisions")} due today`);
  const first = parts.length > 0 ? `Clearing ${parts.join(" and ")}.` : "Built from your weekly goals and your free hours today.";

  let second: string;
  if (inputs.weakChapter) second = `${inputs.weakChapter} gets a block: your practice accuracy there is below average.`;
  else if (inputs.energyLabel && ["Drained", "Heavy"].includes(inputs.energyLabel)) second = "The load is lighter because you checked in with low energy.";
  else if (backlog > 0) second = `${plural(backlog, "backlog item", "backlog items")} fit in around your timetable.`;
  else second = "Subjects are spread to match your timetable and your best study hours.";
  return `${first} ${second}`;
}
