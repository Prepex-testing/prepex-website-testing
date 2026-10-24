import type { PlanTask } from "@/lib/api/plannerV2";

/**
 * Where each planner call-to-action lands, with the task's details carried along so the next screen opens filled in.
 * `planTaskId` is passed through every hop: it is how finishing the work marks the planner task done.
 */

export type FocusMode = "session" | "revision" | "practice";

export type FocusHandoff = {
  planTaskId: string;
  mode: FocusMode;
  subjectId: number | null;
  chapterId: string | null;
  topic: string | null;
  minutes: number;
  /** Shown above the timer when the student was sent here because Prepex had no questions for the chapter. */
  notice: string | null;
};

export const NO_QUESTIONS_NOTICE = "No Prepex questions for this chapter yet — starting focus timer so you can practice from your own source";

export function focusUrl(task: Pick<PlanTask, "id" | "subjectId" | "chapterId" | "topic" | "chapterName" | "title" | "estimatedMinutes">, mode: FocusMode, opts: { notice?: boolean } = {}): string {
  const q = new URLSearchParams({ planTaskId: task.id, mode, minutes: String(Math.max(5, Math.min(480, task.estimatedMinutes))) });
  if (task.subjectId !== null) q.set("subjectId", String(task.subjectId));
  if (task.chapterId) q.set("chapterId", task.chapterId);
  const topic = task.topic ?? task.chapterName ?? task.title;
  if (topic) q.set("topic", topic.slice(0, 200));
  if (opts.notice) q.set("notice", "no_questions");
  return `/focus?${q.toString()}`;
}

export const practiceUrl = (task: Pick<PlanTask, "id">): string => `/practice?taskId=${task.id}`;
export const mockUrl = (task: Pick<PlanTask, "id">): string => `/planner/mock?taskId=${task.id}`;

/** Reads the hand-off back on the focus screen. Returns null when the page was opened normally. */
export function parseFocusHandoff(params: { get(name: string): string | null }): FocusHandoff | null {
  const planTaskId = params.get("planTaskId");
  if (!planTaskId || !/^[0-9a-f-]{36}$/i.test(planTaskId)) return null;
  const mode = params.get("mode");
  const minutes = Number(params.get("minutes"));
  const subjectId = Number(params.get("subjectId"));
  return {
    planTaskId,
    mode: mode === "revision" || mode === "practice" ? mode : "session",
    subjectId: Number.isInteger(subjectId) && subjectId > 0 ? subjectId : null,
    chapterId: params.get("chapterId"),
    topic: params.get("topic"),
    minutes: Number.isFinite(minutes) && minutes >= 1 ? Math.min(480, Math.round(minutes)) : 25,
    notice: params.get("notice") === "no_questions" ? NO_QUESTIONS_NOTICE : null,
  };
}

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
