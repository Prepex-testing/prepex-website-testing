export type TaskType = "revision" | "new-learning" | "practice";

export const TYPE_STYLES: Record<TaskType, string> = {
  revision:
    "border-[#1A1A4E] bg-[#EEF0F8] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white",

  "new-learning":
    "border-[#1A1A4E] bg-[#EEF0F8] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white",

  practice:
    "border-[#1A1A4E] bg-[#EEF0F8] text-[#1A1A4E] dark:border-transparent dark:bg-[#242453] dark:text-white",
};

export const TYPE_LABELS: Record<TaskType, string> = {
  revision: "Revision",
  "new-learning": "New Learning",
  practice: "Practice",
};

export const CUSTOM_BADGE_STYLE = "bg-cta/10 text-cta";

export const COMPLETED_ACTION_LABELS: Record<TaskType, string> = {
  revision: "Revision Completed",
  "new-learning": "Session Completed",
  practice: "Practice Completed",
};

/** Swaps a "Start X" action label for "Resume X" when the task is already in progress. */
export function withResumeLabel(label: string, status: string): string {
  return status === "IN_PROGRESS" ? label.replace(/^Start /, "Resume ") : label;
}
