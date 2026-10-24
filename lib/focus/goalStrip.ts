import type { Goal } from "@/lib/api/goals";

export type GoalStrip = {
  goalId: string;
  /** Minutes still to study this week for the goal. */
  leftMinutes: number;
  /** "7h left this week on Physics" */
  text: string;
};

function unitMinutes(goal: Goal): { current: number; target: number } {
  const factor = goal.unit === "HOURS" ? 60 : 1;
  return { current: goal.progress.current * factor, target: goal.target * factor };
}

/** "7h" / "1h 30m" / "45m". */
export function formatLeft(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

/**
 * The weekly hours goal that this session is working on: one for the chapter if there is one, else one for the subject,
 * else a goal that covers every subject. Only unfinished HOURS goals count. Null when there is nothing to count down.
 */
export function goalStripFor(goals: Goal[], subjectId: number | null, chapterId: string | null, subjectName: string | null): GoalStrip | null {
  if (subjectId === null) return null;
  const open = goals.filter((g) => g.type === "HOURS" && g.status === "ACTIVE" && !g.progress.complete);
  const pick =
    (chapterId ? open.find((g) => g.chapterId === chapterId) : undefined) ??
    open.find((g) => g.subjectId === subjectId && !g.chapterId) ??
    open.find((g) => g.subjectId === null);
  if (!pick) return null;
  const { current, target } = unitMinutes(pick);
  const left = Math.max(0, target - current);
  if (left <= 0) return null;
  const where = pick.subjectId === null ? "your study goal" : (subjectName ?? "this subject");
  return { goalId: pick.id, leftMinutes: left, text: `${formatLeft(left)} left this week on ${where}` };
}
