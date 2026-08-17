import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import type { SuggestedWindow } from "@/lib/api/planner";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/backlog${path}`, options);
}

export type BacklogHealthTier =
  | "HEALTHY"
  | "BUILDING"
  | "HEAVY"
  | "TIME TO RECOVER"
  | string;

export type BacklogHealth = {
  tier: BacklogHealthTier;
  message: string;
  taskCount: number;
  activeTaskCount: number;
  recoveryRequired: boolean;
  averageAgeDays: number;
  maxDaysOverdue: number;
};

export type BacklogSubject = { id: number; code: string; name: string };

export type BacklogChapterMetadata = {
  category?: string;
  difficulty?: string;
  recommendedWindow?: string;
  averageLearningMinutes?: number;
  averageRevisionMinutes?: number;
  averagePracticeQuestions?: number;
};

export type BacklogChapter = {
  id: string;
  subjectId: number;
  name: string;
  sequenceOrder: number;
  exam: string | null;
  class: number;
  isActive: boolean;
  subject: BacklogSubject;
  chapterMetadata?: BacklogChapterMetadata | null;
} | null;

export type BacklogStatus = "ACTIVE" | "HELD" | "RESOLVED" | string;

export type BacklogTask = {
  id: string;
  userId: string;
  planTaskId: string | null;
  chapterId: string | null;
  title: string;
  taskType: "WELLNESS" | "PRACTICE" | "REVISION" | "NEW_LEARNING" | string;
  source: string;
  priority: string;
  status: BacklogStatus;
  heldUntil: string | null;
  addedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  chapter: BacklogChapter;
  daysOverdue: number;
  priorityWeight: number;
};

export type BacklogResponse = {
  health: BacklogHealth;
  tasks: BacklogTask[];
  heldTasks: BacklogTask[];
};

export function getBacklog() {
  return authRequest<{ success: true; data: BacklogResponse }>("");
}

export function holdBacklogTask(taskId: string) {
  return authRequest<{ success: true; data: unknown }>(`/${taskId}/hold`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });
}

export function reviveBacklogTask(taskId: string) {
  return authRequest<{ success: true; data: unknown }>(`/${taskId}/revive`, {
    method: "PATCH",
  });
}

export function skipBacklogTask(taskId: string) {
  return authRequest<{ success: true; data: unknown }>(`/${taskId}/skip`, {
    method: "PATCH",
  });
}

export type BacklogTaskTypeInput = "REVISION" | "NEW_LEARNING" | "PRACTICE";

export type AddBacklogChapterInput = {
  chapterId: string;
  priority: "URGENT" | "NORMAL" | "LOW";
  taskTypes: BacklogTaskTypeInput;
};

export function addBacklogTasks(chapters: AddBacklogChapterInput[]) {
  return authRequest<{ success: true; data: unknown }>("", {
    method: "POST",
    body: JSON.stringify({ chapters }),
  });
}

export type AddBacklogTaskToPlanInput = {
  title: string;
  taskType: string;
  estimatedMinutes: number;
  chapterId: string;
  subjectId: number;
  description?: string;
  suggestedWindow?: SuggestedWindow;
};

export function addBacklogTaskToPlan(backlogTaskId: string, input: AddBacklogTaskToPlanInput) {
  return authRequest<{ success: true; data: unknown }>(`/${backlogTaskId}/addtask`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
