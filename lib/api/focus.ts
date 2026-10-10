import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/**
 * Focus Mode — core-service /api/focus-sessions/*. One timed block at a time. The SERVER clock is
 * the truth: `elapsedSeconds` is measured at `serverTime`, so a wrong phone clock cannot skew it.
 */

export type FocusStatus = "ACTIVE" | "PAUSED" | "ENDED";

export type FocusSession = {
  id: string;
  subjectId: number;
  chapterId: string | null;
  topic: string | null;
  plannedMinutes: number;
  startedAt: string;
  pausedAt: string | null;
  pausedSeconds: number;
  endedAt: string | null;
  actualMinutes: number | null;
  wasCompleted: boolean;
  interruptionCount: number;
  deepFocusMode: boolean;
  notes: string | null;
  status: FocusStatus;
  /** Focused (non-paused) seconds so far, as of the response. */
  elapsedSeconds: number;
};

export type StartFocusInput = {
  subjectId: number;
  chapterId?: string | null;
  topic?: string | null;
  plannedMinutes: number;
  deepFocusMode?: boolean;
};

export type FocusStats = {
  todayMinutes: number;
  weekMinutes: number;
  allTimeMinutes: number;
  totalSessions: number;
  completedSessions: number;
  currentStreak: number;
  longestStreak: number;
};

export type StudyLogRow = {
  id: string;
  subjectId: number;
  chapterId: string | null;
  topic: string | null;
  durationMinutes: number;
  loggedAt: string;
  notes: string | null;
  source: "manual" | "focus_mode";
  focusSessionId: string | null;
  createdAt: string;
};

function focusRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/focus-sessions${path}`, options);
}

export function startFocusSession(input: StartFocusInput) {
  return focusRequest<{ success: true; data: FocusSession }>("", { method: "POST", body: JSON.stringify(input) });
}

export function getActiveFocusSession() {
  return focusRequest<{ success: true; data: { session: FocusSession | null; serverTime: string } }>("/active");
}

export function getFocusStats() {
  return focusRequest<{ success: true; data: FocusStats }>("/stats");
}

export function recordFocusInterruption(id: string) {
  return focusRequest<{ success: true; data: FocusSession }>(`/${id}/interrupt`, { method: "PATCH", body: "{}" });
}

export function pauseFocusSession(id: string) {
  return focusRequest<{ success: true; data: FocusSession }>(`/${id}/pause`, { method: "PATCH", body: "{}" });
}

export function resumeFocusSession(id: string) {
  return focusRequest<{ success: true; data: FocusSession }>(`/${id}/resume`, { method: "PATCH", body: "{}" });
}

export function stopFocusSession(id: string, input: { wasCompleted: boolean; notes?: string | null }) {
  return focusRequest<{ success: true; data: { focusSession: FocusSession; studySession: StudyLogRow | null } }>(
    `/${id}/stop`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}
