import type { ActivityType } from "@/lib/api/timetable";

/** Display metadata for each activity: label and the colour its blocks are drawn in. */
export const ACTIVITY_META: Record<ActivityType, { label: string; color: string; hint: string }> = {
  SCHOOL: { label: "School", color: "#6366F1", hint: "Classes at school" },
  COACHING: { label: "Coaching", color: "#8B5CF6", hint: "Coaching classes / online batch" },
  SELF_STUDY: { label: "Self-study", color: "#FF7A59", hint: "Prepex plans your tasks here" },
  PRACTICE: { label: "Practice", color: "#F59E0B", hint: "Question practice time" },
  REVISION: { label: "Revision", color: "#10B981", hint: "Revision time" },
  SLEEP: { label: "Sleep", color: "#64748B", hint: "Sleep" },
  MEAL: { label: "Meal", color: "#CA8A04", hint: "Meals" },
  BREAK: { label: "Break", color: "#94A3B8", hint: "Travel, rest, free time" },
  EXERCISE: { label: "Exercise", color: "#14B8A6", hint: "Workout, walk, sport" },
  PRAYER: { label: "Prayer", color: "#EC4899", hint: "Prayer / meditation" },
  FAMILY: { label: "Family", color: "#3B82F6", hint: "Family time" },
};

/** Order of the palette: study blocks first — they are what Prepex plans into. */
export const ACTIVITY_ORDER: ActivityType[] = [
  "SELF_STUDY",
  "PRACTICE",
  "REVISION",
  "SCHOOL",
  "COACHING",
  "SLEEP",
  "MEAL",
  "BREAK",
  "EXERCISE",
  "PRAYER",
  "FAMILY",
];

/** Study blocks may carry a subject; the rest are just time. */
export const SUBJECT_ACTIVITIES: ActivityType[] = ["SELF_STUDY", "PRACTICE", "REVISION"];
