import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/**
 * The Goal Assistant — core-service /api/goal-assistant. The week's goals suggested from real capacity, each with the reason
 * for it. Deterministic: no AI, nothing here costs the student a quota.
 */

export type SuggestionType = "LECTURES" | "QUESTIONS" | "MOCKS" | "BACKLOG";
export type Meter = "green" | "amber" | "red";

export type Suggestion = {
  id: string;
  type: SuggestionType;
  subjectId: number | null;
  subjectName: string | null;
  chapterId: string | null;
  backlogItemId: string | null;
  label: string;
  target: number;
  unit: "COUNT";
  minutesPerUnit: number;
  /** target x minutesPerUnit. */
  totalMinutes: number;
  /** The least the student can trim it to (a backlog item and a mock are all or nothing). */
  minTarget: number;
  reason: string;
};

export type Trim = { suggestionId: string; label: string; newTarget: number; savesMinutes: number };

export type Assistant = {
  weekStart: string;
  hasGoals: boolean;
  phase: { id: string; label: string };
  daysToExam: number;
  capacity: { usableMinutes: number; rawSlotMinutes: number; factor: number; revisionMinutes: number };
  /** Minutes a week the student has actually been completing (last 4 weeks); null with too little history. */
  demonstratedMinutes: number | null;
  suggestions: Suggestion[];
  revisionAuto: { chaptersDue: number; minutes: number };
  requiredMinutes: number;
  meter: Meter;
  trims: Trim[];
  push: boolean;
};

export type GoalState = { weekStart: string; hasGoals: boolean; nextWeekStart: string };

function req<T>(path: string, options: RequestInit = {}): Promise<{ success: true; data: T }> {
  return authenticatedRequest<{ success: true; data: T }>(`${CORE_API_BASE_URL}/api/goal-assistant${path}`, options);
}

export function getGoalAssistant(week?: string, push = false) {
  const q = new URLSearchParams();
  if (week) q.set("week", week);
  if (push) q.set("push", "1");
  const s = q.toString();
  return req<Assistant>(s ? `?${s}` : "");
}

/** Whether the week has any goals: drives the "Set this week's goals" prompt on the planner and on Home. */
export function getGoalState(week?: string) {
  return req<GoalState>(`/state${week ? `?week=${encodeURIComponent(week)}` : ""}`);
}

/** A pushed week pays 100 XP when every goal in it is done. */
export function setPushWeek(weekStart: string, on: boolean) {
  return req<{ weekStart: string; on: boolean }>("/push", { method: "POST", body: JSON.stringify({ weekStart, on }) });
}
