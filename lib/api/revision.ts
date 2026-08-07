import { CORE_API_BASE_URL } from "@/lib/api/config";
import { apiRequest, ApiError } from "@/lib/api/http";
import { refreshAccessToken } from "@/lib/api/auth";
import { getAccessToken, getRefreshToken, saveTokens, clearSession } from "@/lib/auth/session";
import type { PlannerSubject, TaskStatus } from "@/lib/api/planner";

async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${CORE_API_BASE_URL}/api/revision${path}`;
  const accessToken = getAccessToken();

  try {
    return await apiRequest<T>(url, {
      ...options,
      headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
    });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearSession();
      throw err;
    }

    const { data: newTokens } = await refreshAccessToken(refreshToken);
    saveTokens(newTokens);

    return apiRequest<T>(url, {
      ...options,
      headers: { Authorization: `Bearer ${newTokens.accessToken}`, ...options.headers },
    });
  }
}

export type RevisionChapterMetadata = {
  category: string;
  difficulty: string;
  recommendedWindow: string;
  averageLearningMinutes: number;
  averageRevisionMinutes: number;
  averagePracticeQuestions: number;
};

export type RevisionChapter = {
  id: string;
  name: string;
  subject: PlannerSubject;
  chapterMetadata?: RevisionChapterMetadata | null;
};

export type RevisionTask = {
  id: string;
  subjectId: number;
  taskType: string;
  title: string;
  description: string | null;
  estimatedMinutes: number;
  minutesCompleted: number;
  scheduledStart: string;
  scheduledEnd: string;
  suggestedWindow: string;
  status: TaskStatus | string;
  questionCount: number | null;
  chapter: RevisionChapter | null;
  isAnchor?: boolean;
};

export type RevisionChapterProgress = {
  id: string;
  chapterId: string;
  status: string;
  minutesCompleted: number;
  revisionPhase: string;
  revisionCount: number;
  nextRevisionAt: string | null;
  lastRevisionAt: string | null;
  currentIntervalDays: number | null;
  chapter: RevisionChapter;
};

export type RevisionOverview = {
  todaysRevisionTasks: { count: number; tasks: RevisionTask[] };
  upcomingRevisions: { count: number; chapters: RevisionChapterProgress[] };
  masteredChapters: { count: number; chapters: RevisionChapterProgress[] };
};

export function getRevisionOverview(filters: { subjectId?: number; status?: TaskStatus } = {}) {
  const params = new URLSearchParams();
  if (filters.subjectId !== undefined) params.set("subjectId", String(filters.subjectId));
  if (filters.status) params.set("status", filters.status);

  const query = params.toString();
  return authRequest<{ success: true; data: RevisionOverview }>(query ? `?${query}` : "");
}

export function updateRevisionProgress(revisionId: string) {
  return authRequest<{ success: true; data: unknown }>(`/${revisionId}/progress`, {
    method: "PATCH",
  });
}

export function markRevisionDone(revisionId: string, minutesCompleted: number) {
  return authRequest<{ success: true; data: unknown }>(`/${revisionId}/mark-done`, {
    method: "POST",
    body: JSON.stringify({ minutesCompleted }),
  });
}

export function startRevisionSession(revisionId: string) {
  return authRequest<{ success: true; data: unknown }>(`/${revisionId}/session/start`, {
    method: "POST",
  });
}

export function heartbeatRevisionSession(revisionId: string) {
  return authRequest<{ success: true; data: unknown }>(`/${revisionId}/session/heartbeat`, {
    method: "POST",
  });
}

export function exitRevisionSession(revisionId: string, minutesCompleted: number) {
  return authRequest<{ success: true; data: unknown }>(`/${revisionId}/session/exit`, {
    method: "POST",
    body: JSON.stringify({ minutesCompleted }),
  });
}
