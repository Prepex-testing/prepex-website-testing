import type { Goal, GoalType, NewGoal } from "@/lib/api/goals";
import type { GoalDefaults } from "@/lib/api/plannerV2";
import type { FocusSessionIntent, TaskType } from "@/lib/focus/intent";
import { formatDuration } from "@/lib/planner/format";

/**
 * Weekly goals, planner v2: the time maths and wording the goals screen needs. The server stores each goal's whole time
 * commitment (`totalMinutes`); a goal that is not saved yet has none, so it is worked out here the same way the server
 * does it: units x minutes per unit.
 */

export const PRACTICE_SOURCES = [
  { key: "coaching_dpp", label: "Coaching DPP" },
  { key: "hcv", label: "HCV" },
  { key: "dc_pandey", label: "DC Pandey" },
  { key: "allen_modules", label: "Allen modules" },
  { key: "pw_practice", label: "PW" },
  { key: "ncert", label: "NCERT" },
  { key: "pyq_mains", label: "PYQ Mains" },
  { key: "pyq_advanced", label: "PYQ Advanced" },
  { key: "own_notebook", label: "Own notebook" },
  { key: "other", label: "Other" },
] as const;

export const REVISION_TYPES = [
  { key: "notes", label: "Notes" },
  { key: "short_notes", label: "Short notes" },
  { key: "handwritten", label: "Handwritten notes" },
  { key: "formula_sheet", label: "Formula sheet" },
] as const;

export const MOCK_TYPES = [
  { key: "full_mock", label: "Full mock" },
  { key: "sectional", label: "Sectional test" },
  { key: "chapter_test", label: "Chapter test" },
  { key: "phase_test", label: "Phase test" },
  { key: "toppers_test", label: "Toppers test" },
] as const;

export const EXAM_PATTERNS = [
  { key: "jee_main", label: "JEE Main" },
  { key: "jee_advanced", label: "JEE Advanced" },
  { key: "neet", label: "NEET" },
] as const;

export const labelOf = (list: readonly { key: string; label: string }[], key: string | null | undefined): string | null =>
  key ? (list.find((i) => i.key === key)?.label ?? key) : null;

/** Fallbacks used until the server's per-student defaults arrive (same numbers the server uses). */
export const FALLBACK_DEFAULTS: GoalDefaults = {
  lectureMinutes: { value: 60, source: "default", samples: 0 },
  practiceSessionMinutes: { value: 60, source: "default", samples: 0 },
  revisionMinutes: { value: 30, source: "default", samples: 0 },
  minutesPerQuestion: { value: 2.5, source: "default", samples: 0 },
  selfStudyChunkMinutes: 45,
};

export const BACKLOG_ITEM_MINUTES = 45;

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

const MOCK_BY_TYPE: Record<string, number> = { sectional: 60, chapter_test: 45, phase_test: 180, toppers_test: 180 };
const MOCK_BY_PATTERN: Record<string, number> = { jee_main: 180, jee_advanced: 180, neet: 200 };

const toMin = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** How long one mock takes: its slot when both ends are given, else by type / exam pattern. */
export function mockMinutesFor(g: Pick<NewGoal, "mockType" | "examPattern" | "fixedStartTime" | "fixedEndTime">): number {
  if (g.fixedStartTime && g.fixedEndTime && g.fixedEndTime > g.fixedStartTime) return toMin(g.fixedEndTime) - toMin(g.fixedStartTime);
  if (g.mockType && g.mockType !== "full_mock" && MOCK_BY_TYPE[g.mockType]) return MOCK_BY_TYPE[g.mockType]!;
  if (g.examPattern && MOCK_BY_PATTERN[g.examPattern]) return MOCK_BY_PATTERN[g.examPattern]!;
  return 180;
}

/** The goal's whole time commitment this week, in minutes. */
export function goalMinutes(g: NewGoal | Goal, defaults: GoalDefaults = FALLBACK_DEFAULTS): number {
  if ("totalMinutes" in g && typeof g.totalMinutes === "number") return g.totalMinutes;
  switch (g.type) {
    case "LECTURES":
    case "REVISIONS":
    case "BACKLOG":
      return g.target * (g.minutesPerUnit ?? defaultUnitMinutes(g.type, defaults));
    case "QUESTIONS":
      return round5(g.target * defaults.minutesPerQuestion.value);
    case "HOURS":
      return g.unit === "HOURS" ? g.target * 60 : g.target;
    case "MOCKS":
      return g.target * mockMinutesFor(g);
  }
}

export function defaultUnitMinutes(type: GoalType, defaults: GoalDefaults = FALLBACK_DEFAULTS): number {
  switch (type) {
    case "LECTURES":
      return defaults.lectureMinutes.value;
    case "QUESTIONS":
      return defaults.practiceSessionMinutes.value;
    case "REVISIONS":
      return defaults.revisionMinutes.value;
    case "BACKLOG":
      return BACKLOG_ITEM_MINUTES;
    default:
      return 60;
  }
}

export type Fit = { state: "empty" | "under" | "perfect" | "over"; availableMinutes: number; allocatedMinutes: number; overMinutes: number; remainingMinutes: number; percent: number };

/** "perfect" is within 15 minutes of the week's hours (the server uses the same rule). */
export function fitFor(availableMinutes: number, allocatedMinutes: number): Fit {
  const over = Math.max(0, allocatedMinutes - availableMinutes);
  const remaining = Math.max(0, availableMinutes - allocatedMinutes);
  const state: Fit["state"] = allocatedMinutes <= 0 ? "empty" : over > 0 ? "over" : availableMinutes > 0 && remaining <= 15 ? "perfect" : "under";
  const percent = availableMinutes > 0 ? Math.min(100, Math.round((allocatedMinutes / availableMinutes) * 100)) : allocatedMinutes > 0 ? 100 : 0;
  return { state, availableMinutes, allocatedMinutes, overMinutes: over, remainingMinutes: remaining, percent };
}

/** "17 hours", "4.5 hours", "1 hour" for the capacity strip. */
export function hoursText(minutes: number): string {
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** The chip label: "{task} — {X} min". */
export function chipLabel(task: string, minutes: number): string {
  return `${task} — ${Math.round(minutes)} min`;
}

/** The short task names used on chips. */
export function taskName(g: Pick<NewGoal, "type" | "target" | "unit" | "practiceSource" | "revisionType" | "mockType" | "examPattern">): string {
  const n = g.target;
  switch (g.type) {
    case "LECTURES":
      return `${n} ${n === 1 ? "lecture" : "lectures"}`;
    case "QUESTIONS":
      return `${n} questions${g.practiceSource ? ` (${labelOf(PRACTICE_SOURCES, g.practiceSource)})` : ""}`;
    case "REVISIONS":
      return `${n} ${n === 1 ? "revision" : "revisions"}${g.revisionType ? ` (${labelOf(REVISION_TYPES, g.revisionType)})` : ""}`;
    case "HOURS":
      return `Study ${g.unit === "HOURS" ? `${n} ${n === 1 ? "hour" : "hours"}` : formatDuration(n)}`;
    case "BACKLOG":
      return "Clear backlog item";
    case "MOCKS":
      return `${n > 1 ? `${n} × ` : ""}${labelOf(MOCK_TYPES, g.mockType) ?? "Mock"}${g.examPattern ? ` (${labelOf(EXAM_PATTERNS, g.examPattern)})` : ""}`;
  }
}

/** Drops the keys the server does not accept on a create (nulls are fine; undefined is dropped by JSON). */
export function forSave(goal: NewGoal): NewGoal {
  const out: NewGoal = { type: goal.type, target: goal.target, unit: goal.unit, subjectId: goal.subjectId ?? null, chapterId: goal.chapterId ?? null };
  if (goal.topic) out.topic = goal.topic;
  if (goal.minutesPerUnit != null) out.minutesPerUnit = goal.minutesPerUnit;
  if (goal.type === "QUESTIONS" && goal.practiceSource) out.practiceSource = goal.practiceSource;
  if (goal.type === "REVISIONS") {
    if (goal.revisionType) out.revisionType = goal.revisionType;
    if (goal.targetAccuracy != null) out.targetAccuracy = goal.targetAccuracy;
  }
  if (goal.type === "MOCKS") {
    if (goal.mockType) out.mockType = goal.mockType;
    if (goal.examPattern) out.examPattern = goal.examPattern;
    if (goal.fixedDate) out.fixedDate = goal.fixedDate;
    if (goal.fixedStartTime) out.fixedStartTime = goal.fixedStartTime;
    if (goal.fixedEndTime) out.fixedEndTime = goal.fixedEndTime;
  }
  if (goal.type === "BACKLOG" && goal.backlogItemId) out.backlogItemId = goal.backlogItemId;
  return out;
}

/** Day names for the mock's day picker: the seven dates of the week being edited. */
export function weekDays(weekStart: string): { date: string; label: string }[] {
  const base = new Date(`${weekStart}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base.getTime() + i * 86_400_000);
    return {
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }),
    };
  });
}

const GOAL_TASK_TYPE: Record<Goal["type"], TaskType> = {
  LECTURES: "lecture",
  QUESTIONS: "practice",
  REVISIONS: "revision",
  MOCKS: "mock_review",
  HOURS: "self_study",
  BACKLOG: "self_study",
};

/** What "Start now" on a goal hands to the focus timer: the goal, its place in the syllabus and the kind of session. */
export function goalFocusIntent(goal: Goal): FocusSessionIntent {
  if (goal.type === "BACKLOG" && goal.backlogItemId) {
    return { originSource: "backlog_tab", originId: goal.backlogItemId, subject: goal.subjectId !== null ? String(goal.subjectId) : undefined, chapter: goal.chapterId ?? undefined };
  }
  return {
    originSource: "weekly_goals",
    originId: goal.id,
    subject: goal.subjectId !== null ? String(goal.subjectId) : undefined,
    chapter: goal.chapterId ?? undefined,
    topic: goal.topic ?? undefined,
    taskType: GOAL_TASK_TYPE[goal.type],
  };
}
