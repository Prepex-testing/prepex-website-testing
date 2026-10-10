import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import { query, type AddToPlannerInput, type Page, type Period, type PlannerPlacement, type PlannerWindow } from "@/lib/api/logsCommon";

/**
 * Revision log — core-service /api/revisions/*. What the student revised, for how long, and how it went.
 * (The spaced-repetition engine's own revisions live in lib/api/revision.ts, /api/revision.)
 */

export type RevisionType = "notes" | "short_notes" | "handwritten" | "formula_sheet" | "mixed";

export type RevisionLog = {
  id: string;
  subjectId: number;
  chapterId: string;
  topic: string | null;
  revisionType: RevisionType;
  durationMinutes: number;
  questionsSolved: number | null;
  questionsCorrect: number | null;
  /** correct ÷ solved as a percentage; null when no questions were solved. */
  accuracy: number | null;
  errors: string | null;
  revisionNumber: number;
  loggedAt: string;
  createdAt: string;
};

export type NewRevision = {
  subjectId: number;
  chapterId: string;
  topic?: string | null;
  revisionType: RevisionType;
  durationMinutes: number;
  questionsSolved?: number | null;
  questionsCorrect?: number | null;
  errors?: string | null;
  revisionNumber?: number;
  /** ISO instant; omit for "now". */
  loggedAt?: string;
};

export type RevisionStatus = "fresh" | "ok" | "stale" | "never";

export type HeatCell = {
  chapterId: string;
  chapterName: string | null;
  subjectId: number;
  subjectName: string | null;
  lastRevisedAt: string | null;
  daysAgo: number | null;
  revisionCount: number;
  status: RevisionStatus;
};

export type StaleChapter = HeatCell & { practiceAccuracy: number | null };

export type SubjectComparison = {
  subjectId: number;
  subjectName: string | null;
  revision: number | null;
  practice: number | null;
  mock: number | null;
};

export type RevisionAnalytics = {
  period: Period;
  range: { from: string; to: string } | null;
  totals: { revisions: number; minutes: number; questionsSolved: number; questionsCorrect: number; accuracy: number | null };
  perSubject: { subjectId: number; subjectName: string | null; revisions: number; minutes: number }[];
  heatmap: HeatCell[];
  stale: StaleChapter[];
  accuracyComparison: SubjectComparison[];
  staleAfterDays: number;
};

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/revisions${path}`, options);
}

export function listRevisions(q: { subjectId?: number | null; chapterId?: string | null; from?: string; to?: string; cursor?: string | null; limit?: number } = {}) {
  return request<{ success: true; data: Page<RevisionLog> }>(query(q));
}

export function createRevision(input: NewRevision) {
  return request<{ success: true; data: RevisionLog }>("", { method: "POST", body: JSON.stringify(input) });
}

export function updateRevision(id: string, patch: Partial<NewRevision>) {
  return request<{ success: true; data: RevisionLog }>(`/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function deleteRevision(id: string) {
  return request<{ success: true; data: { deleted: true } }>(`/${id}`, { method: "DELETE" });
}

export function getRevisionAnalytics(period: Period) {
  return request<{ success: true; data: RevisionAnalytics }>(`/analytics${query({ period })}`);
}

export function addRevisionToPlanner(id: string, input: AddToPlannerInput) {
  return request<{ success: true; data: PlannerPlacement }>(`/${id}/add-to-planner`, { method: "POST", body: JSON.stringify(input) });
}

/** For a chapter with no log yet (the stale list). */
export function planChapterRevision(input: AddToPlannerInput & { chapterId: string }) {
  return request<{ success: true; data: PlannerPlacement }>("/plan-chapter", { method: "POST", body: JSON.stringify(input) });
}

export type { PlannerWindow };
