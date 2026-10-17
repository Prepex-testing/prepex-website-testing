import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/** Daily AI insight (Prepex Brain, via core-service /api/insights). The browser never talks to the Brain. */

export type Insight = {
  id: string;
  /** The IST day it is about, `YYYY-MM-DD`. */
  date: string;
  insight: string;
  nudge: string;
  feedback: "up" | "down" | null;
  createdAt: string;
};

export type DailyOverview = {
  /** The newest unread, undismissed insight from today or yesterday. */
  insight: Insight | null;
  /** Today's run failed because the Brain could not be reached. */
  resting: boolean;
};

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/insights${path}`, options);
}

export function getDailyInsight() {
  return request<{ success: true; data: DailyOverview }>("/daily");
}

export type InsightUpdate = { read?: true; dismissed?: true; feedback?: "up" | "down" | null };

export function updateDailyInsight(id: string, update: InsightUpdate) {
  return request<{ success: true; data: { insight: Insight } }>(`/daily/${id}`, { method: "PATCH", body: JSON.stringify(update) });
}
