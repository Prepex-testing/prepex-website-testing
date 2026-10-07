import type { Goal, GoalType, GoalUnit, NewGoal } from "@/lib/api/goals";

/** Plain-English wording for a goal, shared by the composer, the cards and the plan banner. */

export const GOAL_TYPES: { type: GoalType; label: string; help: string; auto: boolean }[] = [
  { type: "LECTURES", label: "Lectures", help: "Videos or classes you'll watch", auto: false },
  { type: "QUESTIONS", label: "Questions", help: "Problems you'll solve", auto: true },
  { type: "REVISIONS", label: "Revisions", help: "Chapters you'll revise", auto: true },
  { type: "MOCKS", label: "Mocks", help: "Full-length tests", auto: true },
  { type: "HOURS", label: "Study hours", help: "Focused study time", auto: true },
];

const NOUN: Record<GoalType, [string, string]> = {
  LECTURES: ["lecture", "lectures"],
  QUESTIONS: ["question", "questions"],
  REVISIONS: ["revision", "revisions"],
  MOCKS: ["mock", "mocks"],
  HOURS: ["hour", "hours"],
};

export function typeLabel(type: GoalType): string {
  return GOAL_TYPES.find((t) => t.type === type)?.label ?? type;
}

/** "5 lectures", "1 mock", "20 hours", "300 min". */
export function quantity(type: GoalType, target: number, unit: GoalUnit): string {
  if (type === "HOURS") {
    if (unit === "MINUTES") return `${target} min`;
    return `${target} ${target === 1 ? "hour" : "hours"}`;
  }
  const [one, many] = NOUN[type];
  return `${target} ${target === 1 ? one : many}`;
}

const VERB: Record<GoalType, string> = {
  LECTURES: "Watch",
  QUESTIONS: "Solve",
  REVISIONS: "Do",
  MOCKS: "Take",
  HOURS: "Study",
};

/** "Watch 5 lectures", "Solve 100 questions", "Study 20 hours". */
export function describeGoal(goal: Pick<NewGoal, "type" | "target" | "unit">): string {
  return `${VERB[goal.type]} ${quantity(goal.type, goal.target, goal.unit)}`;
}

/** Scope text — "Physics · Kinematics", or the goal's own topic. Empty when unscoped. */
export function scopeText(
  goal: Pick<Goal, "subjectId" | "chapterId" | "topic">,
  subjectNames: Map<number, string>,
  chapterNames: Map<string, string>,
): string {
  const parts: string[] = [];
  if (goal.subjectId !== null) parts.push(subjectNames.get(goal.subjectId) ?? "");
  if (goal.chapterId) parts.push(chapterNames.get(goal.chapterId) ?? "");
  if (goal.topic) parts.push(goal.topic);
  return parts.filter(Boolean).join(" · ");
}

/** "3 of 5 watched", "42 of 100 solved", "6.5 of 20 hours". */
export function progressText(goal: Goal): string {
  const { current, target } = goal.progress;
  const done: Record<GoalType, string> = {
    LECTURES: "watched",
    QUESTIONS: "solved",
    REVISIONS: "done",
    MOCKS: "taken",
    HOURS: "",
  };
  if (goal.type === "HOURS") {
    const unit = goal.unit === "MINUTES" ? "min" : "hours";
    return `${current} of ${target} ${unit}`;
  }
  return `${current} of ${target} ${done[goal.type]}`.trim();
}

/** Sensible starting target and bounds for each type. */
export const TARGET_RULES: Record<GoalType, { start: number; min: number; max: number; step: number }> = {
  LECTURES: { start: 5, min: 1, max: 100, step: 1 },
  QUESTIONS: { start: 100, min: 5, max: 2000, step: 10 },
  REVISIONS: { start: 3, min: 1, max: 50, step: 1 },
  MOCKS: { start: 1, min: 1, max: 7, step: 1 },
  HOURS: { start: 20, min: 1, max: 100, step: 1 },
};

export function defaultUnit(type: GoalType): GoalUnit {
  return type === "HOURS" ? "HOURS" : "COUNT";
}

export function clampTarget(type: GoalType, unit: GoalUnit, value: number): number {
  const rules = TARGET_RULES[type];
  const max = type === "HOURS" && unit === "MINUTES" ? 6000 : rules.max;
  return Math.min(max, Math.max(rules.min, Math.round(value)));
}

/** Monday–Sunday range for display: "5 – 11 Oct". */
export function formatWeekRange(weekStart: string, weekEnd: string): string {
  const fmt = (iso: string, withMonth: boolean) => {
    const d = new Date(`${iso}T00:00:00Z`);
    return d.toLocaleDateString("en-IN", { day: "numeric", ...(withMonth ? { month: "short" } : {}), timeZone: "UTC" });
  };
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(`${weekEnd}T00:00:00Z`);
  return start.getUTCMonth() === end.getUTCMonth() ? `${fmt(weekStart, false)} – ${fmt(weekEnd, true)}` : `${fmt(weekStart, true)} – ${fmt(weekEnd, true)}`;
}

export function daysLeftText(daysLeft: number): string {
  if (daysLeft <= 0) return "Last day";
  return `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`;
}
