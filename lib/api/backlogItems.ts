import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import { query, type Page, type PlannerPlacement, type PlannerWindow } from "@/lib/api/logsCommon";

/**
 * The student's own backlog — core-service /api/backlog-items/*. Deadlines, priorities, a weekly sweep.
 * (The planner's skipped-task pile, with recovery mode, is a different thing: lib/api/backlog.ts, /api/backlog.)
 */

export type BacklogStatus = "open" | "scheduled" | "cleared" | "dropped";
export type BacklogSource = "auto_weekly_goal" | "auto_coaching_sync" | "manual";

export type BacklogItem = {
  id: string;
  subjectId: number;
  chapterId: string | null;
  topic: string | null;
  source: BacklogSource;
  estimatedMinutes: number | null;
  /** `YYYY-MM-DD` */
  deadline: string | null;
  /** 1 (urgent) .. 5 (whenever) */
  priority: number;
  status: BacklogStatus;
  clearedAt: string | null;
  scheduledFor: string | null;
  scheduledWindow: PlannerWindow | null;
  notes: string | null;
  ageDays: number;
  isOverdue: boolean;
  createdAt: string;
};

export type NewBacklogItem = {
  subjectId: number;
  chapterId: string;
  topic?: string | null;
  estimatedMinutes?: number | null;
  deadline?: string | null;
  priority?: number;
  notes?: string | null;
};

export type UpdateBacklogItem = Partial<NewBacklogItem> & { status?: "open" | "dropped" | "cleared" };

export type BacklogAnalytics = {
  totals: { total: number; open: number; scheduled: number; cleared: number; dropped: number };
  clearanceRate: number | null;
  avgDaysToClear: number | null;
  frequentChapters: { subjectId: number; chapterId: string | null; chapterName: string | null; subjectName: string | null; count: number }[];
  timeline: { weekStart: string; added: number; cleared: number }[];
  redFlags: { id: string; subjectId: number; subjectName: string | null; chapterId: string | null; chapterName: string | null; topic: string | null; status: string; priority: number; ageDays: number }[];
  redFlagAfterDays: number;
};

export type SuggestedSlot = {
  date: string;
  start: string;
  end: string;
  slotMinutes: number;
  window: PlannerWindow;
  subjectMatch: boolean;
};

export type Suggestions = { itemId: string; estimatedMinutes: number; usedTimetable: boolean; suggestions: SuggestedSlot[] };

export type SweepResult = { sweptWeek: string; created: number; skipped: number; fromGoals: number; fromCoaching: number; items: BacklogItem[] };

export type BacklogTaskType = "NEW_LEARNING" | "REVISION" | "PRACTICE" | "CUSTOM";

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/backlog-items${path}`, options);
}

export function listBacklogItems(q: { status?: BacklogStatus | "all"; subjectId?: number | null; cursor?: string | null; limit?: number } = {}) {
  return request<{ success: true; data: Page<BacklogItem> }>(query(q));
}

export function createBacklogItem(input: NewBacklogItem) {
  return request<{ success: true; data: BacklogItem }>("", { method: "POST", body: JSON.stringify(input) });
}

export function updateBacklogItem(id: string, patch: UpdateBacklogItem) {
  return request<{ success: true; data: BacklogItem }>(`/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function clearBacklogItem(id: string) {
  return request<{ success: true; data: BacklogItem }>(`/${id}/clear`, { method: "POST", body: "{}" });
}

export function deleteBacklogItem(id: string) {
  return request<{ success: true; data: { deleted: true } }>(`/${id}`, { method: "DELETE" });
}

export function scheduleBacklogItem(id: string, input: { date: string; timeSlot: PlannerWindow; estimatedMinutes?: number; taskType?: BacklogTaskType }) {
  return request<{ success: true; data: { item: BacklogItem; planner: PlannerPlacement } }>(`/${id}/add-to-planner`, { method: "POST", body: JSON.stringify(input) });
}

export function getBacklogAnalytics() {
  return request<{ success: true; data: BacklogAnalytics }>("/analytics");
}

export function getBacklogSuggestions(itemId: string, days = 3) {
  return request<{ success: true; data: Suggestions }>(`/suggestions${query({ itemId, days })}`);
}

export function sweepBacklog() {
  return request<{ success: true; data: SweepResult }>("/auto-sweep", { method: "POST", body: "{}" });
}
