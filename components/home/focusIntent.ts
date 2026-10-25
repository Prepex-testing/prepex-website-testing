import type { FocusSessionIntent } from "@/lib/focus/intent";

type PlannerRowTask = {
  id: string;
  type: string;
  estimatedMinutes: number;
  subjectName?: string;
  chapterId?: string | null;
  topic?: string | null;
};

/**
 * What a planner task card hands to the focus timer. The server reads the task itself (subject, chapter, topic,
 * length), so this carries the id plus the one thing the button decides: revision tasks are revision sessions. A new-learning
 * task leaves the type open, and the timer picks lecture or self-study from the task.
 */
export function plannerTaskIntent(task: PlannerRowTask): FocusSessionIntent {
  return {
    originSource: "planner",
    originId: task.id,
    subject: task.subjectName || undefined,
    chapter: task.chapterId || undefined,
    topic: task.topic || undefined,
    taskType: task.type === "revision" ? "revision" : undefined,
    targetMinutes: task.estimatedMinutes > 0 ? task.estimatedMinutes : undefined,
  };
}
