import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import type { StudyLogRow } from "@/lib/api/focus";

/** Study log — core-service /api/study-sessions/*. Manual entries plus rows Focus Mode wrote. */

export type StudyPeriod = "day" | "week" | "month";

export type StudySummary = {
  period: StudyPeriod;
  from: string;
  to: string;
  totalMinutes: number;
  sessionCount: number;
  bySubject: { subjectId: number; minutes: number }[];
  /** One entry per IST day in the period (zero-filled). */
  byDay: { date: string; minutes: number; bySubject: Record<string, number> }[];
};

export type NewStudySession = {
  subjectId: number;
  chapterId?: string | null;
  topic?: string | null;
  durationMinutes: number;
  /** ISO instant; omit for "now". */
  loggedAt?: string;
  notes?: string | null;
};

export type StudyPage = { items: StudyLogRow[]; nextCursor: string | null };

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/study-sessions${path}`, options);
}

export function listStudySessions(query: { subjectId?: number; cursor?: string | null; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (query.subjectId) params.set("subjectId", String(query.subjectId));
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return request<{ success: true; data: StudyPage }>(qs ? `?${qs}` : "");
}

export function getStudySummary(period: StudyPeriod) {
  return request<{ success: true; data: StudySummary }>(`/summary?period=${period}`);
}

export function createStudySession(input: NewStudySession) {
  return request<{ success: true; data: StudyLogRow }>("", { method: "POST", body: JSON.stringify(input) });
}

export function updateStudySession(id: string, patch: Partial<NewStudySession>) {
  return request<{ success: true; data: StudyLogRow }>(`/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function deleteStudySession(id: string) {
  return request<{ success: true; data: { deleted: true } }>(`/${id}`, { method: "DELETE" });
}
