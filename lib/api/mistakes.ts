import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/**
 * Mistake Notebook (manual entries) — core-service /api/mistakes/*. Mistakes the student types in
 * from outside Prepex. Mistakes made inside Prepex practice are a separate notebook
 * (lib/api/practice.ts, /home/mistake-notebook).
 */

export type Mistake = {
  id: string;
  subjectId: number;
  chapterId: string | null;
  topic: string | null;
  questionText: string;
  correctAnswer: string;
  studentAnswer: string;
  explanation: string | null;
  imageUrl: string | null;
  tags: string[];
  /** 1 (easy) .. 5 (hard) */
  difficulty: number;
  reviewCount: number;
  lastReviewedAt: string | null;
  /** null once mastered. */
  nextReviewAt: string | null;
  masteredAt: string | null;
  isMastered: boolean;
  createdAt: string;
};

export type NewMistake = {
  subjectId: number;
  chapterId?: string | null;
  topic?: string | null;
  questionText: string;
  correctAnswer: string;
  studentAnswer: string;
  explanation?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  difficulty?: number;
};

export type MistakePage = { items: Mistake[]; nextCursor: string | null };
export type MistakeQueue = { items: Mistake[]; totalDue: number };
export type MistakeStatusFilter = "all" | "active" | "mastered";

export type MistakeStats = {
  total: number;
  active: number;
  mastered: number;
  masteredPercent: number;
  dueNow: number;
  dueNext7Days: number;
  reviewedToday: number;
  reviewStreak: number;
  longestReviewStreak: number;
  bySubject: { subjectId: number; total: number; mastered: number }[];
};

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/mistakes${path}`, options);
}

export function getMistakeQueue() {
  return request<{ success: true; data: MistakeQueue }>("/queue");
}

export function getMistakeStats() {
  return request<{ success: true; data: MistakeStats }>("/stats");
}

export function listMistakes(
  query: { subjectId?: number; tag?: string; status?: MistakeStatusFilter; q?: string; cursor?: string | null; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (query.subjectId) params.set("subjectId", String(query.subjectId));
  if (query.tag) params.set("tag", query.tag);
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return request<{ success: true; data: MistakePage }>(qs ? `?${qs}` : "");
}

export function createMistake(input: NewMistake) {
  return request<{ success: true; data: Mistake }>("", { method: "POST", body: JSON.stringify(input) });
}

export function updateMistake(id: string, patch: Partial<NewMistake>) {
  return request<{ success: true; data: Mistake }>(`/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function deleteMistake(id: string) {
  return request<{ success: true; data: { deleted: true } }>(`/${id}`, { method: "DELETE" });
}

export function reviewMistake(id: string, input: { difficulty: number; remembered: boolean }) {
  return request<{ success: true; data: Mistake }>(`/${id}/review`, { method: "POST", body: JSON.stringify(input) });
}

export function masterMistake(id: string) {
  return request<{ success: true; data: Mistake }>(`/${id}/master`, { method: "POST", body: "{}" });
}

export function reopenMistake(id: string) {
  return request<{ success: true; data: Mistake }>(`/${id}/reopen`, { method: "POST", body: "{}" });
}
