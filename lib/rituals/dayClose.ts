import type { DayCloseDecision, DayCloseReward, DaySummary, UnfinishedTask } from "@/lib/api/rituals";

export type Choice = DayCloseDecision["action"];

/** The mood scale of the evening check-in, 1 (drained) to 5 (strong); the server maps it onto the existing check-in moods. */
export const MOODS: { value: 1 | 2 | 3 | 4 | 5; face: string; label: string }[] = [
  { value: 1, face: "😩", label: "Drained" },
  { value: 2, face: "😕", label: "Heavy" },
  { value: 3, face: "😐", label: "Steady" },
  { value: 4, face: "🙂", label: "Good" },
  { value: 5, face: "😄", label: "Strong" },
];

/** Every unfinished task starts on "Tomorrow": the safest default is that nothing is lost and nothing is dropped. */
export function defaultChoices(tasks: UnfinishedTask[]): Record<string, Choice> {
  return Object.fromEntries(tasks.map((t) => [t.id, "tomorrow" as Choice]));
}

/** A task with no chapter cannot become a backlog item (a backlog item needs one), so that choice is not offered for it. */
export function canBacklog(task: UnfinishedTask): boolean {
  return task.subjectId !== null && task.chapterId !== null;
}

export function toDecisions(choices: Record<string, Choice>): DayCloseDecision[] {
  return Object.entries(choices).map(([taskId, action]) => ({ taskId, action }));
}

export function summaryLine(s: DaySummary): string {
  const h = Math.floor(s.minutes / 60);
  const m = s.minutes % 60;
  const time = h > 0 ? `${h}h ${m}m` : `${m}m`;
  const parts = [time, `${s.tasksDone} of ${s.tasksTotal} tasks`];
  if (s.questions > 0) parts.push(`${s.questions} questions`);
  if (s.revisions > 0) parts.push(`${s.revisions} ${s.revisions === 1 ? "revision" : "revisions"}`);
  return parts.join(" · ");
}

/** "38 XP behind #7", or null when there is nobody above (or the student has no XP yet). */
export function gapLine(rank: DayCloseReward["rankToday"]): string | null {
  if (rank.rank === null) return null;
  if (rank.rank === 1 || rank.gapToNext === null) return "You are first";
  return `${rank.gapToNext} XP behind #${rank.rank - 1}`;
}

export function movedLine(moved: DayCloseReward["moved"]): string | null {
  const parts: string[] = [];
  if (moved.tomorrow > 0) parts.push(`${moved.tomorrow} to tomorrow`);
  if (moved.backlog > 0) parts.push(`${moved.backlog} to your backlog`);
  if (moved.dropped > 0) parts.push(`${moved.dropped} dropped`);
  return parts.length > 0 ? parts.join(", ") : null;
}
