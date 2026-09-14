export type TaskType = "revision" | "new-learning" | "practice" | "wellness" | "mock";

export const TYPE_STYLES: Record<TaskType, string> = {
  revision:
    "border-[#1A1A4E] bg-[#EEF0F8] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white",

  "new-learning":
    "border-[#1A1A4E] bg-[#EEF0F8] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white",

  practice:
    "border-[#1A1A4E] bg-[#EEF0F8] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white",

  wellness:
    "border-[#1A1A4E] bg-[#EEF0F8] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white",

  mock:
    "border-[#1A1A4E] bg-[#EEF0F8] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white",
};

export const TYPE_LABELS: Record<TaskType, string> = {
  revision: "Revision",
  "new-learning": "New Learning",
  practice: "Practice",
  wellness: "Wellness",
  mock: "Mock Test",
};

export const CUSTOM_BADGE_STYLE = "bg-cta/10 text-cta";

export const COMPLETED_ACTION_LABELS: Record<TaskType, string> = {
  revision: "Revision Completed",
  "new-learning": "Session Completed",
  practice: "Practice Completed",
  wellness: "Wellness Completed",
  mock: "View Analysis",
};

/**
 * Where a MOCK task's action goes: the scorecard form until the score is in
 * (prefilled from the scheduled mock when there is one), then the analysis.
 */
export function mockTaskHref(
  task: { mockAnalysisId?: string | null; isCompleted?: boolean; mockName?: string; mockDate?: string },
): string {
  if (task.isCompleted && task.mockAnalysisId) {
    return `/home/mock-analysis/view-analytics?id=${task.mockAnalysisId}`;
  }
  if (task.mockAnalysisId) {
    return `/home/mock-analysis/upload-scorecard?id=${task.mockAnalysisId}`;
  }
  const params = new URLSearchParams();
  if (task.mockName) params.set("mockName", task.mockName);
  if (task.mockDate) params.set("date", task.mockDate);
  const query = params.toString();
  return `/home/mock-analysis/upload-scorecard${query ? `?${query}` : ""}`;
}

/** Swaps a "Start X" action label for "Resume X" when the task is already in progress. */
export function withResumeLabel(label: string, status: string): string {
  return status === "IN_PROGRESS" ? label.replace(/^Start /, "Resume ") : label;
}

/**
 * "Start Practice" → "Continue Practice" once any time is banked against the
 * task.
 *
 * Checked on seconds rather than status alone: a practice task only leaves
 * PENDING when the player checkpoints its timer, and a session resumed from
 * another device may have banked seconds before this client sees the status
 * change.
 */
export function withPracticeProgressLabel(
  label: string,
  secondsCompleted: number | undefined,
  status: string | undefined,
): string {
  const started = (secondsCompleted ?? 0) > 0 || status === "IN_PROGRESS";
  return started ? label.replace(/^Start /, "Continue ") : label;
}
