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
