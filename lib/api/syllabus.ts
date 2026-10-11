import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import { query, type PlannerPlacement, type PlannerWindow } from "@/lib/api/logsCommon";

/** Syllabus overview — core-service /api/syllabus: the chapter list joined with the student's own progress. */

export type TheoryStatus = "not_started" | "learning" | "studied";
export type Strength = "strong" | "medium" | "weak";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type Progress = {
  theoryStatus: TheoryStatus;
  /** True once the student set the status by hand. */
  theoryManual: boolean;
  hours: number;
  accuracy: number | null;
  questionsAttempted: number;
  strengthLabel: Strength | null;
  counts: { lecture: number; dpp: number; hcv: number; module: number; pyqMains: number; pyqAdvanced: number; revision: number };
  lastStudiedAt: string | null;
};

export type ChapterRow = {
  chapterId: string;
  name: string;
  subjectId: number;
  class: number | null;
  ncertChapterNumber: number | null;
  estimatedHours: number | null;
  /** 0-1 share of the whole JEE Main paper (editorial estimate). */
  weightage: number | null;
  typicalDifficulty: Difficulty | null;
  topicCount: number;
  progress: Progress;
};

export type Tally = { chapters: number; studied: number; learning: number; notStarted: number; hours: number; strong: number; medium: number; weak: number; unrated: number };

export type SyllabusOverview = {
  subjects: { subjectId: number; code: string; name: string; summary: Tally; chapters: ChapterRow[] }[];
  totals: Tally;
};

export type ChapterDetail = {
  chapter: ChapterRow & { aliases: string[]; topics: { number: number; name: string }[]; subjectName: string };
  linked: {
    studySessions: { id: string; minutes: number; loggedAt: string; source: string; topic: string | null }[];
    practice: { id: string; source: string; attempted: number; correct: number; accuracy: number | null; loggedAt: string }[];
    revisions: { id: string; revisionType: string; minutes: number; loggedAt: string }[];
    mistakes: { total: number; active: number; mastered: number; dueNow: number };
    mocks: { id: string; name: string | null; date: string; scorePercent: number }[];
    planned: { id: string; date: string; title: string | null }[];
  };
};

export type CountAspect = "lecture" | "dpp" | "hcv" | "module" | "pyq_mains" | "pyq_advanced" | "revision";
export type MarkInput = { aspect: "theory"; value: TheoryStatus } | { aspect: CountAspect; value: number };

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/syllabus${path}`, options);
}

export function getSyllabus(q: { subjectId?: number | null; class?: 11 | 12 | null; theory?: TheoryStatus | null; strength?: Strength | "unrated" | null } = {}) {
  return request<{ success: true; data: SyllabusOverview }>(query(q));
}

export function getChapterDetail(chapterId: string) {
  return request<{ success: true; data: ChapterDetail }>(`/chapter/${chapterId}`);
}

export function markChapter(chapterId: string, input: MarkInput) {
  return request<{ success: true; data: Progress }>(`/chapter/${chapterId}/mark`, { method: "PATCH", body: JSON.stringify(input) });
}

export function scheduleChapter(chapterId: string, input: { dates: string[]; timeSlot?: PlannerWindow; estimatedMinutes?: number }) {
  return request<{ success: true; data: { assignments: (PlannerPlacement & { chapterId: string })[] } }>(`/chapter/${chapterId}/schedule`, { method: "POST", body: JSON.stringify(input) });
}
