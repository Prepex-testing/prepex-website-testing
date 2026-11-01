import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import type { XpSummary } from "@/lib/api/xp";

/** Day Close, "what did class cover?" and the Sunday Review. core-service /api/day-close, /api/class-coverage, /api/sunday-review. */

type Envelope<T> = { success: true; data: T };

const core = <T>(path: string, options: RequestInit = {}) => authenticatedRequest<Envelope<T>>(`${CORE_API_BASE_URL}/api${path}`, options).then((r) => r.data);
const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body ?? {}) });

// ---- class coverage ----
export type PendingCoverage = {
  blockKey: string;
  kind: "coaching_class" | "lecture";
  label: string;
  subjectId: number | null;
  mode: string | null;
  date: string;
  suggestedChapterIds: string[];
};
export const getPendingCoverage = () => core<PendingCoverage[]>("/class-coverage/pending");
export const submitCoverage = (input: { blockKey: string; date?: string; chapterId?: string | null; lectureNumber?: number | null; skip?: boolean }) =>
  core<{ saved: true; chapterMoved: boolean }>("/class-coverage", post(input));

// ---- day close ----
export type DaySummary = { minutes: number; tasksDone: number; tasksTotal: number; questions: number; revisions: number };
/** `candidateChapterIds`: for a task with no chapter, the chapters the student is in the middle of (that subject first). */
export type UnfinishedTask = { id: string; title: string; subjectId: number | null; chapterId: string | null; taskType: string; candidateChapterIds: string[] };
export type DayCloseState = {
  date: string;
  status: "not_yet" | "ready" | "completed" | "dismissed";
  triggerMinute: number;
  triggerReason: "plan_complete" | "after_last_block" | "before_sleep" | "fallback";
  summary: DaySummary;
  unfinished: UnfinishedTask[];
  coverage: PendingCoverage[];
};
export type RankResult = { xp: number; rank: number | null; total: number; gapToNext: number | null };
export type DayCloseReward = {
  alreadyClosed: boolean;
  xpEarned: number;
  xp: XpSummary;
  streak: { current: number; countsToday: boolean };
  rankToday: RankResult;
  rankMonth: RankResult;
  moved: { tomorrow: number; backlog: number; dropped: number; failed: string[]; keptForTomorrow: string[] };
};
export type DayCloseDecision = { taskId: string; action: "tomorrow" | "backlog" | "drop"; chapterId?: string };

export const getDayClose = () => core<DayCloseState>("/day-close");
export const completeDayClose = (input: { decisions: DayCloseDecision[]; mood?: number; win?: string }) => core<DayCloseReward>("/day-close/complete", post(input));
export const dismissDayClose = () => core<{ dismissed: true }>("/day-close/dismiss", post({}));

// ---- sunday review ----
export type RecapCard = { key: "hours" | "questions" | "chapters" | "revisions" | "backlog" | "best_day" | "rank"; title: string; value: string; detail: string | null };
export type WeekStats = {
  hours: number;
  questions: number;
  accuracy: number | null;
  accuracyPrev: number | null;
  dailyAccuracy: { date: string; accuracy: number | null }[];
  chaptersCompleted: number;
  revisionsOnTimePct: number | null;
  backlogCleared: number;
  bestDay: { date: string; hours: number } | null;
  rank: number | null;
  rankPrev: number | null;
  streak: number;
  level: number;
};
export type GoalInput = {
  type: "LECTURES" | "QUESTIONS" | "REVISIONS" | "MOCKS" | "HOURS" | "BACKLOG";
  target: number;
  unit: "COUNT" | "MINUTES" | "HOURS";
  subjectId?: number | null;
  chapterId?: string | null;
  topic?: string | null;
  minutesPerUnit?: number | null;
  practiceSource?: string | null;
  revisionType?: string | null;
  targetAccuracy?: number | null;
  backlogItemId?: string | null;
};
export type ProposedGoal = GoalInput & { origin: "last_week" | "coaching" | "backlog" };
export type SundayReviewState = {
  status: "none" | "ready" | "completed";
  weekStart: string | null;
  nextWeekStart: string | null;
  cards: RecapCard[];
  stats: WeekStats | null;
  proposedGoals: ProposedGoal[];
};
export type ReviewHistoryRow = { id: string; weekStart: string; source: "sunday_review" | "win_journal"; completedAt: string | null; goalsAccepted: number; recap: Record<string, unknown> };

export const getSundayReview = () => core<SundayReviewState>("/sunday-review");
export const getSundayHistory = () => core<ReviewHistoryRow[]>("/sunday-review/history");
export const completeSundayReview = (input: { weekStart: string; goals?: GoalInput[]; mockId?: string }) =>
  core<{ completed: true; goalsCreated: number; xp: XpSummary }>("/sunday-review/complete", post(input));

/** The goal fields the server accepts, without the UI-only `origin`. */
export function toGoalInput(g: ProposedGoal): GoalInput {
  const { origin: _origin, ...rest } = g;
  return rest;
}
