import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/**
 * Weekly goals — core-service /api/goals/*. The student states what they want
 * done this week; the planner turns that into daily tasks. Progress for every
 * type except LECTURES is counted automatically from what the student does.
 */

export type GoalType = "LECTURES" | "QUESTIONS" | "REVISIONS" | "MOCKS" | "HOURS";
export type GoalUnit = "COUNT" | "MINUTES" | "HOURS";
export type GoalStatus = "ACTIVE" | "DONE" | "CARRIED_OVER" | "ABANDONED";
export type GoalSource = "STUDENT" | "PARTNER" | "AI_SUGGESTED";

export type GoalProgress = {
  current: number;
  target: number;
  unit: GoalUnit;
  percent: number;
  complete: boolean;
};

export type Goal = {
  id: string;
  weekStart: string;
  subjectId: number | null;
  chapterId: string | null;
  topic: string | null;
  type: GoalType;
  target: number;
  unit: GoalUnit;
  status: GoalStatus;
  source: GoalSource;
  progressSelfReport: number;
  carriedFromGoalId: string | null;
  progress: GoalProgress;
};

export type GoalsWeek = {
  weekStart: string;
  weekEnd: string;
  isCurrentWeek: boolean;
  goals: Goal[];
  summary: { total: number; done: number; percent: number };
};

export type CurrentGoals = GoalsWeek & {
  daysLeft: number;
  /** Last week's unfinished goals that have not been carried over yet. */
  carryOverCandidates: Goal[];
};

export type NewGoal = {
  type: GoalType;
  target: number;
  unit: GoalUnit;
  subjectId?: number | null;
  chapterId?: string | null;
  topic?: string | null;
};

function goalsRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/goals${path}`, options);
}

export function getCurrentGoals() {
  return goalsRequest<{ success: true; data: CurrentGoals }>("/current");
}

export function getGoalsForWeek(weekStart: string) {
  return goalsRequest<{ success: true; data: GoalsWeek }>(`/week/${weekStart}`);
}

export function createGoals(goals: NewGoal[], weekStart?: string) {
  return goalsRequest<{ success: true; data: { weekStart: string; goals: Goal[] } }>("/batch", {
    method: "POST",
    body: JSON.stringify({ ...(weekStart ? { weekStart } : {}), goals }),
  });
}

export function updateGoal(
  id: string,
  patch: Partial<NewGoal> & { status?: "ACTIVE" | "DONE" | "ABANDONED" },
) {
  return goalsRequest<{ success: true; data: Goal }>(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteGoal(id: string) {
  return goalsRequest<{ success: true; data: { deleted: true } }>(`/${id}`, { method: "DELETE" });
}

/** LECTURES only: "I watched 3 of 5". Absolute count, not a delta. */
export function reportGoalProgress(id: string, progressSelfReport: number) {
  return goalsRequest<{ success: true; data: Goal }>(`/${id}/progress`, {
    method: "POST",
    body: JSON.stringify({ progressSelfReport }),
  });
}

export function carryOverGoals(goalIds?: string[]) {
  return goalsRequest<{
    success: true;
    data: { fromWeekStart: string; toWeekStart: string; carried: Goal[]; alreadyDone: number };
  }>("/carry-over", {
    method: "POST",
    body: JSON.stringify(goalIds ? { goalIds } : {}),
  });
}
