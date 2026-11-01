import { CORE_API_BASE_URL } from "@/lib/api/config";
import type { Reason } from "@/lib/api/notebooks";
import { authenticatedRequest } from "@/lib/api/authRequest";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/practice${path}`, options);
}

// ---------------------------------------------------------------------------
// Questions for a plan task
// ---------------------------------------------------------------------------

export type QuestionDifficulty = "EASY" | "MEDIUM" | "HARD" | "VERY_HARD" | string;

export type PracticeQuestionView = {
  id: string;
  topic: string;
  subTopic: string | null;
  questionType: string;
  difficulty: QuestionDifficulty;
  syllabusTag: string | null;
  expectedTimeSeconds: number | null;
  questionText: string;
  questionImageUrl: string | null;
  options: Record<string, string> | null;
  isPYQ: boolean;
  /** Free-text exam label, e.g. "JEE Main 2020 (06 Sep Shift 2)" — set when isPYQ is true. */
  examDetail: string | null;
  // Present only once a session is completed (getPracticeSession).
  solutionText?: string | null;
  solutionImageUrl?: string | null;
  correctAnswer?: unknown;
};

export type QuestionResult = "CORRECT" | "WRONG" | "SKIPPED";

export type MistakeEntryRef = {
  id: string;
  reason: Reason | null;
  fix: string | null;
  status: string;
  reviewCount: number;
  lastReviewedAt: string | null;
};

export type PracticeSessionQuestion = {
  practiceSessionQuestionId: string;
  id?: string;
  questionId: string;
  displayOrder: number;
  result: QuestionResult;
  markedForReview: boolean;
  studentAnswer?: unknown;
  correctAnswer?: unknown;
  timeTakenSeconds?: number | null;
  attemptedAt?: string | null;
  question: PracticeQuestionView | null;
  mistakeEntry?: MistakeEntryRef | null;
};

export type TaskQuestionsResponse = {
  taskId: string;
  taskTitle: string;
  sessionId: string;
  sessionType: string;
  status: string;
  totalQuestions: number;
  attemptedQuestions: number;
  /** Seconds already banked against this session — seeds a resumed timer. */
  elapsedSeconds: number;
  /**
   * Ceiling the timer stops at, after which the session auto-completes — twice
   * the task's estimate. Null when the session has no plan task behind it
   * (Mistake Review, custom practice), which credits no time and so has no cap.
   */
  maxElapsedSeconds: number | null;
  questions: PracticeSessionQuestion[];
};

/** Up to 10 questions materialised for a PRACTICE / DPP plan task. Self-heals. */
export function getTaskQuestions(taskId: string) {
  return authRequest<{ success: true; data: TaskQuestionsResponse }>(
    `/tasks/${taskId}/questions`,
  );
}

/** Student-facing questions for an existing session id (no plan task needed). */
export function getSessionQuestions(sessionId: string) {
  return authRequest<{ success: true; data: TaskQuestionsResponse }>(
    `/sessions/${sessionId}/questions`,
  );
}

// ---------------------------------------------------------------------------
// Session — answer / complete / detail
// ---------------------------------------------------------------------------

export type SubmitAnswerBody = {
  questionId: string;
  studentAnswer?: string | number | string[];
  timeTakenSeconds?: number;
  markedForReview?: boolean;
  skipped?: boolean;
};

/** Persists one answer onto practice_session_questions (row of the session). */
export function submitPracticeAnswer(sessionId: string, body: SubmitAnswerBody) {
  return authRequest<{
    success: true;
    data: { result: QuestionResult; questionId: string };
  }>(`/sessions/${sessionId}/answer`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type PracticeTopicAnalysis = {
  id: string;
  chapterId: string;
  topic: string;
  subTopic: string | null;
  totalQuestions: number;
  correctQuestions: number;
  wrongQuestions: number;
  accuracy: number | string;
  weaknessDetected: boolean;
};

export type PracticeSessionDetail = {
  id: string;
  sessionType: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED" | string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  wrongQuestions: number;
  skippedQuestions: number;
  /** Count of questions flagged "mark for review" during the session. */
  markedQuestions: number;
  accuracy: number | string | null;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  planTaskId: string | null;
  questions: PracticeSessionQuestion[];
  topicAnalysis: PracticeTopicAnalysis[];
};

export function getPracticeSession(sessionId: string) {
  return authRequest<{ success: true; data: PracticeSessionDetail }>(
    `/sessions/${sessionId}`,
  );
}

/**
 * Checkpoints the player's running timer. Called periodically while a session
 * is open and once more on the way out, so exiting and reopening resumes the
 * timer instead of restarting it, and the plan reflects practice time before
 * the session is finished.
 */
export function updatePracticeSessionProgress(sessionId: string, elapsedSeconds: number) {
  return authRequest<{ success: true; data: { sessionId: string; elapsedSeconds: number } }>(
    `/sessions/${sessionId}/progress`,
    { method: "PATCH", body: JSON.stringify({ elapsedSeconds }) },
  );
}

/** Finalises the session → topic analysis + auto-populates the mistake notebook. */
export function completePracticeSession(sessionId: string, elapsedSeconds?: number) {
  return authRequest<{ success: true; data: PracticeSessionDetail }>(
    `/sessions/${sessionId}/complete`,
    { method: "POST", body: JSON.stringify(elapsedSeconds === undefined ? {} : { elapsedSeconds }) },
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** `{ A: "..", B: ".." }` → `[["A",".."],["B",".."]]` sorted by key. */
export function optionEntries(
  options: Record<string, string> | null | undefined,
): [string, string][] {
  if (!options) return [];
  return Object.entries(options).sort(([a], [b]) => a.localeCompare(b));
}

export function prettyDifficulty(d: string | null | undefined): string {
  if (!d) return "";
  return d
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalises a stored answer (JSON string / array) to a display string. */
export function answerToText(value: unknown): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
