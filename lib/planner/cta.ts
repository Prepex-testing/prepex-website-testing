import type { PlanTask } from "@/lib/api/plannerV2";
import { plannerTaskIntent } from "@/components/home/focusIntent";
import type { FocusSessionIntent } from "@/lib/focus/intent";

/**
 * Where each planner call-to-action lands. Anything that runs the focus timer goes through `startFocusSession` with an
 * intent (lib/focus): the timer opens pre-filled from the plan task, and when the session ends the server completes the
 * task, writes the study / revision / practice log and updates the chapter. Practice with Prepex questions opens the
 * attempt screen and a mock opens the mock log screen, both with the task id.
 */

/** What the timer needs from a plan task. The server reads the task itself, so this is the id plus the button's choice. */
export function plannerFocusIntent(task: Pick<PlanTask, "id" | "kind" | "estimatedMinutes" | "subject">): FocusSessionIntent {
  return plannerTaskIntent({ id: task.id, type: task.kind, estimatedMinutes: task.estimatedMinutes, subjectName: task.subject ?? undefined });
}

export const practiceUrl = (task: Pick<PlanTask, "id">): string => `/practice?taskId=${task.id}`;
export const mockUrl = (task: Pick<PlanTask, "id">): string => `/planner/mock?taskId=${task.id}`;

/** Revision confidence (1-5) as the words the student sees. */
export const CONFIDENCE_LABELS: Record<number, string> = {
  1: "Not at all",
  2: "Shaky",
  3: "Okay",
  4: "Good",
  5: "Rock solid",
};

/**
 * The mock type and exam pattern a mock task was planned with, read back from its title ("Full mock (JEE Main)").
 * TODO(planner-v2): owner = planner window. The task payload should carry mockType / examPattern itself so this does
 * not depend on the title wording.
 */
export function inferMock(title: string): { testType: string; examPattern: string } {
  const t = title.toLowerCase();
  const examPattern = t.includes("advanced") ? "jee_advanced" : t.includes("neet") ? "neet" : "jee_main";
  const testType = t.includes("sectional") ? "sectional" : t.includes("chapter") ? "chapter_test" : t.includes("phase") ? "phase_test" : t.includes("topper") ? "toppers_test" : "full_mock";
  return { testType, examPattern };
}
