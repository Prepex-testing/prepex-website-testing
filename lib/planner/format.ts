import type { PlanTask, TaskKind } from "@/lib/api/plannerV2";

/** Wording, colours and small maths shared by the planner, the home screen and the weekly goals screen. English only. */

export function formatClock(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
}

/** "4h 30m", "45m", "2h". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "4.5 hours", "1 hour", "45 min". */
export function formatHoursLong(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export const SUBJECT_STYLE: Record<string, { label: string; color: string }> = {
  physics: { label: "Physics", color: "#6366F1" },
  chemistry: { label: "Chemistry", color: "#10B981" },
  maths: { label: "Maths", color: "#F59E0B" },
  biology: { label: "Biology", color: "#EC4899" },
};
const OTHER_SUBJECT = { label: "General", color: "#8B5CF6" };

export function subjectStyle(subject: string | null | undefined) {
  return (subject && SUBJECT_STYLE[subject]) || OTHER_SUBJECT;
}

export type KindMeta = { label: string; cta: string; short: string };

export const KIND_META: Record<TaskKind, KindMeta> = {
  lecture: { label: "Lecture", cta: "Start Session", short: "LEC" },
  self_study: { label: "Study", cta: "Start Session", short: "STU" },
  practice: { label: "Practice", cta: "Start Practice", short: "PRA" },
  revision: { label: "Revision", cta: "Start Revision", short: "REV" },
  mock: { label: "Mock", cta: "Start Mock", short: "MOCK" },
  backlog: { label: "Backlog", cta: "Start Session", short: "BKL" },
  other: { label: "Task", cta: "Start Session", short: "TSK" },
};

export const ADD_KINDS: { kind: TaskKind; label: string }[] = [
  { kind: "lecture", label: "Lecture" },
  { kind: "practice", label: "Practice" },
  { kind: "revision", label: "Revision" },
  { kind: "mock", label: "Mock" },
  { kind: "backlog", label: "Backlog" },
  { kind: "other", label: "Other" },
];

export const STATUS_LABEL: Record<PlanTask["status"], string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
  skipped: "Skipped",
  rolled_over: "Moved",
};

/** The warm-up copy for the day chip: "4h 30m planned • 2h done". */
export function daySummaryText(plannedMinutes: number, doneMinutes: number): string {
  return `${formatDuration(plannedMinutes)} planned • ${formatDuration(doneMinutes)} done`;
}

/** Tasks the student can still act on, in time order. */
export function openTasks(tasks: PlanTask[]): PlanTask[] {
  return tasks
    .filter((t) => t.status === "pending" || t.status === "in_progress")
    .sort((a, b) => (a.startMin ?? 9999) - (b.startMin ?? 9999) || a.estimatedMinutes - b.estimatedMinutes);
}

/** The few tasks worth showing on the home card: the one in progress first, then the next ones by time. */
export function upcomingTasks(tasks: PlanTask[], limit = 3): PlanTask[] {
  const open = openTasks(tasks);
  const running = open.filter((t) => t.status === "in_progress");
  return [...running, ...open.filter((t) => t.status !== "in_progress")].slice(0, limit);
}

export function meta(task: Pick<PlanTask, "kind">): KindMeta {
  return KIND_META[task.kind] ?? KIND_META.other;
}

/** The small grey line under a task title: topic and where the content comes from. */
export function taskSubline(task: Pick<PlanTask, "topic" | "contentSourceLabel" | "description" | "questionCount">): string {
  const parts: string[] = [];
  if (task.topic) parts.push(task.topic);
  if (task.contentSourceLabel) parts.push(task.contentSourceLabel);
  if (parts.length === 0 && task.description) parts.push(task.description);
  return parts.join(" · ");
}

/** Local calendar date as YYYY-MM-DD (the student's own day, not UTC). */
export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function shiftDate(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return dateKey(new Date(y, m - 1, d + days));
}

export function dayTabLabel(key: string, today: string): string {
  if (key === today) return "Today";
  if (key === shiftDate(today, 1)) return "Tomorrow";
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
}

/** Minutes since local midnight, now. */
export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export const PRACTICE_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "coaching_dpp", label: "Coaching DPP" },
  { value: "hcv", label: "HCV" },
  { value: "dc_pandey", label: "DC Pandey" },
  { value: "allen_modules", label: "Allen modules" },
  { value: "pw_practice", label: "PW" },
  { value: "ncert", label: "NCERT" },
  { value: "pyq_mains", label: "PYQ Mains" },
  { value: "pyq_advanced", label: "PYQ Advanced" },
  { value: "own_notebook", label: "Own notebook" },
  { value: "other", label: "Other" },
];

export const REVISION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "notes", label: "Notes" },
  { value: "short_notes", label: "Short notes" },
  { value: "handwritten", label: "Handwritten" },
  { value: "formula_sheet", label: "Formula sheet" },
];

export const MOCK_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "full_mock", label: "Full mock" },
  { value: "sectional", label: "Sectional" },
  { value: "chapter_test", label: "Chapter test" },
  { value: "phase_test", label: "Phase test" },
  { value: "toppers_test", label: "Toppers' test" },
];

export const EXAM_PATTERN_OPTIONS: { value: string; label: string; maxMarks: number }[] = [
  { value: "jee_main", label: "JEE Main", maxMarks: 300 },
  { value: "jee_advanced", label: "JEE Advanced", maxMarks: 360 },
  { value: "neet", label: "NEET", maxMarks: 720 },
];
