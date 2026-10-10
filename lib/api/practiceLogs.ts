import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import { query, type AddToPlannerInput, type HeatBand, type Page, type Period, type PlannerPlacement } from "@/lib/api/logsCommon";

/**
 * Practice log — core-service /api/practice (the manual-log routes: `/`, `/analytics`, `/share-card`, `/:id`).
 * The in-app practice sessions under /api/practice/sessions are lib/api/practice.ts.
 */

export type PracticeSource =
  | "coaching_dpp"
  | "hcv"
  | "dc_pandey"
  | "allen_modules"
  | "pw_practice"
  | "ncert"
  | "pyq_mains"
  | "pyq_advanced"
  | "own_notebook"
  | "other";

export type PracticeDifficulty = "easy" | "medium" | "hard" | "mixed";

export type PracticeLog = {
  id: string;
  subjectId: number;
  chapterId: string;
  topic: string | null;
  source: PracticeSource;
  sourceDetail: string | null;
  questionsAttempted: number;
  questionsCorrect: number;
  questionsWrong: number;
  questionsSkipped: number;
  accuracy: number | null;
  durationMinutes: number | null;
  difficulty: PracticeDifficulty | null;
  loggedAt: string;
  notes: string | null;
  createdAt: string;
};

export type NewPractice = {
  subjectId: number;
  chapterId: string;
  topic?: string | null;
  source: PracticeSource;
  sourceDetail?: string | null;
  questionsAttempted: number;
  questionsCorrect: number;
  questionsWrong: number;
  questionsSkipped: number;
  durationMinutes?: number | null;
  difficulty?: PracticeDifficulty | null;
  /** ISO instant; omit for "now". */
  loggedAt?: string;
  notes?: string | null;
};

export type ChapterAccuracy = {
  chapterId: string;
  chapterName: string | null;
  subjectId: number;
  subjectName: string | null;
  attempted: number;
  correct: number;
  accuracy: number | null;
  band: HeatBand | null;
  lowSample: boolean;
};

export type PracticeAnalytics = {
  period: Period;
  range: { from: string; to: string } | null;
  scope: { subjectId: number | null; chapterId: string | null };
  totals: { sessions: number; attempted: number; correct: number; wrong: number; skipped: number; accuracy: number | null; minutes: number; activeDays: number };
  byChapter: ChapterAccuracy[];
  byTopic: { chapterId: string; topic: string; attempted: number; correct: number; accuracy: number | null }[];
  byDay: { date: string; attempted: number; correct: number; accuracy: number | null }[];
  byWeek: { weekStart: string; attempted: number; correct: number; accuracy: number | null }[];
  bySource: { source: string; attempted: number; correct: number; accuracy: number | null; share: number }[];
  speed: { difficulty: string; questions: number; minutes: number; questionsPerMinute: number | null }[];
  speedTrend: { weekStart: string; questions: number; minutes: number; questionsPerMinute: number | null }[];
  weakness: ChapterAccuracy[];
};

export type ShareCard = {
  aspect: "9:16";
  brand: "Prepex";
  period: Period;
  periodLabel: string;
  scope: { subjectId: number | null; subjectName: string | null; chapterId: string | null; chapterName: string | null };
  headline: string;
  hasData: boolean;
  questions: number;
  correct: number;
  accuracy: number | null;
  band: HeatBand | null;
  sessions: number;
  minutes: number;
  activeDays: number;
  topSource: { source: string; share: number } | null;
  strongestChapter: { chapterName: string | null; accuracy: number } | null;
  weakestChapter: { chapterName: string | null; accuracy: number } | null;
  generatedAt: string;
};

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/practice${path}`, options);
}

export function listPracticeLogs(q: { subjectId?: number | null; chapterId?: string | null; source?: PracticeSource | null; from?: string; to?: string; cursor?: string | null; limit?: number } = {}) {
  return request<{ success: true; data: Page<PracticeLog> }>(query(q));
}

export function createPracticeLog(input: NewPractice) {
  return request<{ success: true; data: PracticeLog }>("", { method: "POST", body: JSON.stringify(input) });
}

export function updatePracticeLog(id: string, patch: Partial<NewPractice>) {
  return request<{ success: true; data: PracticeLog }>(`/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function deletePracticeLog(id: string) {
  return request<{ success: true; data: { deleted: true } }>(`/${id}`, { method: "DELETE" });
}

export function getPracticeAnalytics(q: { period: Period; subjectId?: number | null; chapterId?: string | null }) {
  return request<{ success: true; data: PracticeAnalytics }>(`/analytics${query(q)}`);
}

export function getShareCard(q: { period: Period; subjectId?: number | null; chapterId?: string | null }) {
  return request<{ success: true; data: ShareCard }>(`/share-card${query(q)}`);
}

export function addPracticeToPlanner(id: string, input: AddToPlannerInput) {
  return request<{ success: true; data: PlannerPlacement }>(`/${id}/add-to-planner`, { method: "POST", body: JSON.stringify(input) });
}
