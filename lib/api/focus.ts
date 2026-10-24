import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";
import type { FocusMode, OriginSource, TaskType } from "@/lib/focus/intent";
import type { PomodoroConfig } from "@/lib/focus/pomodoro";

/**
 * Focus Mode — core-service /api/focus-sessions/*. One timed block at a time. The SERVER clock is
 * the truth: `elapsedSeconds` is measured at `serverTime`, so a wrong phone clock cannot skew it.
 *
 * (The screens never call this to open the timer: they go through `startFocusSession` in lib/focus.
 * `createFocusSession` below is the request the timer itself makes when the student presses Start.)
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
  originSource: OriginSource;
  originId: string | null;
  taskType: TaskType;
  mode: FocusMode;
  pomodoro: PomodoroConfig | null;
  moodRating: number | null;
  confidenceRating: number | null;
  status: FocusStatus;
  /** Focused (non-paused) seconds as of the response. */
  elapsedSeconds: number;
};

export type StartFocusInput = {
  subjectId: number;
  chapterId?: string | null;
  topic?: string | null;
  plannedMinutes: number;
  deepFocusMode?: boolean;
  originSource?: OriginSource;
  originId?: string | null;
  taskType?: TaskType;
  mode?: FocusMode;
  pomodoro?: PomodoroConfig | null;
};

export const PRACTICE_SOURCES = [
  { value: "coaching_dpp", label: "Coaching DPP" },
  { value: "hcv", label: "HC Verma" },
  { value: "dc_pandey", label: "DC Pandey" },
  { value: "allen_modules", label: "Allen modules" },
  { value: "pw_practice", label: "PW practice" },
  { value: "ncert", label: "NCERT" },
  { value: "pyq_mains", label: "PYQ (Mains)" },
  { value: "pyq_advanced", label: "PYQ (Advanced)" },
  { value: "own_notebook", label: "My own notebook" },
  { value: "other", label: "Something else" },
] as const;
export type PracticeSource = (typeof PRACTICE_SOURCES)[number]["value"];

/** The 15-second practice log sheet. attempted = correct + wrong + skipped. */
export type PracticeSheet = {
  source: PracticeSource;
  sourceDetail?: string | null;
  questionsAttempted: number;
  questionsCorrect: number;
  questionsWrong: number;
  questionsSkipped?: number;
  /** One short note per wrong question; they go to the Mistake Notebook. */
  wrongQuestions?: string[];
};

export type StopFocusInput = {
  wasCompleted: boolean;
  notes?: string | null;
  /** 1 (rough) – 5 (great). */
  moodRating?: number | null;
  /** Revision sessions: 1 (shaky) – 5 (solid). */
  confidenceRating?: number | null;
  practice?: PracticeSheet | null;
};

export type StreakInfo = {
  current: number;
  longest: number;
  /** This week's Streak Freeze is still unspent. */
  shieldAvailable: boolean;
  /** Focus time today already earns the day. */
  todayCounts: boolean;
  minutesToCount: number;
  todayMinutes: number;
};

export type FocusStats = {
  todayMinutes: number;
  weekMinutes: number;
  allTimeMinutes: number;
  totalSessions: number;
  completedSessions: number;
  currentStreak: number;
  longestStreak: number;
  streak: StreakInfo;
};

export type StudyLogRow = {
  id: string;
  subjectId: number;
  chapterId: string | null;
  topic: string | null;
  durationMinutes: number;
  loggedAt: string;
  notes: string | null;
  source: "manual" | "focus_mode" | "LEGACY_MIGRATION";
  focusSessionId: string | null;
  createdAt: string;
};

export type LogKind = "study_session" | "practice_log" | "revision_log" | "mock_review_log" | "mistakes" | "chapter_progress";

export type CompletionSummary = {
  logsWritten: LogKind[];
  practiceLogId: string | null;
  revisionLogId: string | null;
  mockReviewLogId: string | null;
  mistakesCreated: number;
  mistakesSkipped: number;
  origin: {
    source: OriginSource;
    id: string | null;
    updated: "plan_task" | "backlog_item" | "backlog_task" | "weekly_goal" | null;
    status: string | null;
    progressPercent: number | null;
  };
  revision: { quality: number; lapsed: boolean; intervalDays: number; easeFactor: number; nextReviewAt: string } | null;
  chapter: { id: string; lectureMinutes: number; studyMinutes: number; theoryStatus: string } | null;
  notes: string[];
};

export type StopFocusResult = {
  focusSession: FocusSession;
  studySession: StudyLogRow | null;
  completion: CompletionSummary;
  extras: {
    goalHits: { id: string; type: string; target: number; unit: string; topic: string | null }[];
    needsCheckIn: boolean;
    streak: StreakInfo;
  };
};

/** A filled-in intent from the server (GET /intent): the row an id points at, read for the timer's pre-fill. */
export type ResolvedIntent = {
  originSource: OriginSource;
  originId: string | null;
  subjectId: number | null;
  chapterId: string | null;
  topic: string | null;
  taskType: TaskType;
  targetMinutes: number | null;
  humanReadableOrigin: string | null;
};

function focusRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/focus-sessions${path}`, options);
}

/** The request behind the Start button. Screens open the timer with `startFocusSession` (lib/focus), never with this. */
export function createFocusSession(input: StartFocusInput) {
  return focusRequest<{ success: true; data: FocusSession }>("", { method: "POST", body: JSON.stringify(input) });
}

export function getFocusIntent(params: { origin: OriginSource; id?: string; chapter?: string }) {
  const q = new URLSearchParams({ origin: params.origin });
  if (params.id) q.set("id", params.id);
  if (params.chapter) q.set("chapter", params.chapter);
  return focusRequest<{ success: true; data: ResolvedIntent }>(`/intent?${q.toString()}`);
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

export function stopFocusSession(id: string, input: StopFocusInput) {
  return focusRequest<{ success: true; data: StopFocusResult }>(`/${id}/stop`, { method: "PATCH", body: JSON.stringify(input) });
}
