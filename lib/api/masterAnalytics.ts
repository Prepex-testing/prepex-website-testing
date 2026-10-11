import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import { query } from "@/lib/api/logsCommon";
import type { ExamPattern } from "@/lib/api/mocks";

/** Master analytics dashboard — core-service /api/analytics. */

export type GridLabel = "strong" | "medium" | "weak" | "unrated";

export type MasterAnalytics = {
  generatedAt: string;
  hours: { today: number; week: number; month: number; all: number };
  minutes: { today: number; week: number; month: number; all: number };
  /** This month's study time by subject; sums to `minutes.month`. */
  bySubject: { subjectId: number | null; name: string; minutes: number; share: number }[];
  streaks: { current: number; longest: number; shields: { available: boolean; perWeek: number } };
  weeklyGoalProgress: {
    weekStart: string;
    weekEnd: string;
    daysLeft: number;
    summary: { total: number; done: number; percent: number };
    goals: { id: string; type: string; subjectId: number | null; chapterId: string | null; topic: string | null; status: string; target: number; current: number; unit: string; percent: number; complete: boolean }[];
  };
  accuracyTrend: { weekStart: string; attempted: number; correct: number; accuracy: number | null }[];
  speedTrend: { weekStart: string; questions: number; minutes: number; secondsPerQuestion: number | null }[];
  mockProjection: {
    latestPercentile: number | null;
    projectedRank: number | null;
    targetGap: number | null;
    targetRank: number | null;
    examPattern: ExamPattern | null;
    candidatePool: number | null;
    asOf: string | null;
  };
  chapterStrengthGrid: {
    chapters: { chapterId: string; name: string; subjectId: number; label: GridLabel; hours: number; accuracy: number | null }[];
    counts: Record<GridLabel, number>;
  };
  revisionReadiness: { studiedChapters: number; fresh: number; ok: number; stale: number; readinessPercent: number | null };
  backlogSize: { total: number; open: number; scheduled: number; overdue: number };
  dueMistakesCount: number;
  upcomingTests: { id: string; date: string; title: string | null }[];
  exam: { examDate: string | null; daysToExam: number | null };
};

export type DrillMetric = "hours" | "questions" | "accuracy" | "speed" | "revisions";
export type DrillPeriod = "week" | "month" | "quarter" | "all";

export type DrillBucket = { key: string; label: string; value: number | null } & Record<string, unknown>;

export type Drill = {
  metric: DrillMetric;
  period: DrillPeriod;
  subjectId: number | null;
  unit: "minutes" | "questions" | "percent" | "seconds_per_question" | "revisions";
  granularity: "day" | "week" | "month";
  range: { from: string; to: string };
  buckets: DrillBucket[];
  total: { value: number | null } & Record<string, unknown>;
  average: number | null;
  best: { key: string; value: number } | null;
  bySubject?: { subjectId: number | null; name: string; minutes: number; share: number }[];
};

function request<T>(path: string): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/analytics${path}`);
}

export function getMasterAnalytics(q: { targetRank?: number | null } = {}) {
  return request<{ success: true; data: MasterAnalytics }>(`/master${query(q)}`);
}

export function getDrill(metric: DrillMetric, q: { period: DrillPeriod; subject?: number | null }) {
  return request<{ success: true; data: Drill }>(`/drill/${metric}${query(q)}`);
}
