export type TaskType = "revision" | "new-learning" | "practice";

export const TYPE_STYLES: Record<TaskType, string> = {
  revision: "bg-cta/10 text-cta",
  "new-learning": "bg-tint text-ink",
  practice: "text-ink",
};

export const TYPE_LABELS: Record<TaskType, string> = {
  revision: "Revision",
  "new-learning": "New Learning",
  practice: "Practice",
};
