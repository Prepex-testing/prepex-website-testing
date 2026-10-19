import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import type { Goal } from "@/lib/api/goals";

/** The AI weekly goal assistant (Prepex Brain, via core-service /api/goal-suggestions). The browser never talks to the Brain. */

export type SuggestionStatus = "generated" | "accepted" | "modified" | "dismissed";

export type GoalSuggestion = {
  id: string;
  /** The Monday the goal is for, `YYYY-MM-DD`. */
  weekStartDate: string;
  chapterId: string | null;
  chapterName: string;
  /** 1 to 15, in half-hour steps. */
  suggestedHours: number;
  /** 3 to 5. */
  suggestedSubTopics: string[];
  /** 2015 to 2026, or null. */
  suggestedPyqYear: number | null;
  why: string;
  status: SuggestionStatus;
  acceptedGoalId: string | null;
  createdAt: string;
  respondedAt: string | null;
};

export type SuggestionLimit = { used: number; limit: number; retryAfterSeconds: number };

export type NewSuggestion = {
  chapterId: string;
  /** Monday of the week the goal is for; leave out for this week. */
  weekStartDate?: string;
  targetRank?: number;
  userClass?: number;
};

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/goal-suggestions${path}`, options);
}

export function createGoalSuggestion(input: NewSuggestion) {
  return request<{ success: true; data: { suggestion: GoalSuggestion; limit: SuggestionLimit } }>("", { method: "POST", body: JSON.stringify(input) });
}

export type SuggestionResponse = { status: "accepted" | "dismissed" } | { status: "modified"; modifiedPayload: { hours: number } };

export function respondToGoalSuggestion(id: string, response: SuggestionResponse) {
  return request<{ success: true; data: { suggestion: GoalSuggestion; goal: Goal | null } }>(`/${id}`, { method: "PATCH", body: JSON.stringify(response) });
}

export function listGoalSuggestions(weekStartDate?: string) {
  const query = weekStartDate ? `?weekStartDate=${encodeURIComponent(weekStartDate)}` : "";
  return request<{ success: true; data: { suggestions: GoalSuggestion[]; limit: SuggestionLimit } }>(query);
}
