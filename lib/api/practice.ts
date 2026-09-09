import { CORE_API_BASE_URL } from "@/lib/api/config";
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
  mistakeTags: MistakeTag[];
  studentNote: string | null;
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

/**
 * Starts a Mistake Review practice session from one chapter's ACTIVE + due
 * mistake-notebook entries, optionally narrowed to a single tag. A question
 * with several tags appears in each tag's session until it is answered
 * correctly in any of them, at which point it graduates out of the notebook.
 */
/** Plays one notebook group: a `tag` selects that pattern across the chapter,
 * and no tag selects the chapter's still-untagged mistakes — the two groupings
 * the notebook lists. */
export function startMistakeSession(chapterId: string, tag?: MistakeTag | null) {
  return authRequest<{ success: true; data: TaskQuestionsResponse }>(
    `/mistakes/session`,
    {
      method: "POST",
      body: JSON.stringify({ chapterId, ...(tag ? { tag } : { untagged: true }) }),
    },
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
// Mistake notebook
// ---------------------------------------------------------------------------

export type MistakeTag =
  | "SILLY_ERROR"
  | "CONCEPTUAL_GAP"
  | "TIME_PRESSURE"
  | "WILD_GUESS";

export type MistakeReviewFeedback = "HARD" | "MEDIUM" | "EASY";

export const MISTAKE_TAG_LABELS: Record<MistakeTag, string> = {
  SILLY_ERROR: "Silly Error",
  CONCEPTUAL_GAP: "Conceptual Gap",
  TIME_PRESSURE: "Time Pressure",
  WILD_GUESS: "Wild Guess",
};

export type MistakeListItem = {
  id: string;
  source: string;
  chapterId: string;
  topic: string;
  subTopic: string | null;
  mistakeTags: MistakeTag[];
  studentNote: string | null;
  currentIntervalDays: number;
  reviewCount: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
  status: string;
  chapter?: {
    id: string;
    name: string;
    subject?: { id: number; name: string; code: string };
  } | null;
  question?: { questionText: string; difficulty: string; topic: string } | null;
};

export function listMistakes(
  params: {
    status?: "ACTIVE" | "MASTERED" | "ARCHIVED";
    chapterId?: string;
    subjectId?: number;
    dueToday?: boolean;
    page?: number;
    limit?: number;
  } = {},
) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) q.set(k, String(v));
  });
  const qs = q.toString();
  return authRequest<{
    success: true;
    data: { total: number; page: number; limit: number; items: MistakeListItem[] };
  }>(`/mistakes${qs ? `?${qs}` : ""}`);
}

// ---------------------------------------------------------------------------
// Paginated chapter+tag groups for the notebook's "Due Today" / "All Due"
// sections. One row per (chapter, tag); pagination is over the grouped rows.
// ---------------------------------------------------------------------------

export type DueMistakeBucket = "today" | "overdue";

/** A mistake tag, or the pseudo-tag for entries that have none yet. */
export type MistakeTagFilter = MistakeTag | "UNTAGGED";

export type DueMistakeGroup = {
  key: string;
  chapterId: string;
  chapterName: string;
  subjectName: string;
  /** null on the untagged group — one per chapter, spanning every topic. */
  tag: MistakeTag | null;
  count: number;
  topics: string[];
  oldestDue: string;
};

export type DueMistakeGroupsResponse = {
  bucket: DueMistakeBucket;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  entryCount: number;
  groups: DueMistakeGroup[];
};

export function listDueMistakeGroups(params: {
  bucket: DueMistakeBucket;
  page?: number;
  limit?: number;
  tag?: MistakeTagFilter;
  subjectId?: number;
}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) q.set(k, String(v));
  });
  return authRequest<{ success: true; data: DueMistakeGroupsResponse }>(
    `/mistakes/due-groups?${q.toString()}`,
  );
}

export type MistakeReviewHistoryItem = {
  id: string;
  feedback: MistakeReviewFeedback;
  durationSeconds: number | null;
  reviewedAt: string;
};

export type MistakeDetail = {
  id: string;
  source: string;
  questionId: string | null;
  chapterId: string;
  topic: string;
  subTopic: string | null;
  studentAnswer: unknown;
  correctAnswer: unknown;
  mistakeTags: MistakeTag[];
  studentNote: string | null;
  currentIntervalDays: number;
  reviewCount: number;
  consecutiveEasy: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
  status: "ACTIVE" | "MASTERED" | "ARCHIVED" | string;
  createdAt: string;
  reviewHistory: MistakeReviewHistoryItem[];
  chapter: {
    id: string;
    name: string;
    subject?: { id: number; name: string; code: string };
  } | null;
  question:
    | (PracticeQuestionView & { solutionText?: string | null; correctAnswer?: unknown })
    | null;
};

export function getMistake(mistakeId: string) {
  return authRequest<{ success: true; data: MistakeDetail }>(`/mistakes/${mistakeId}`);
}

// ---------------------------------------------------------------------------
// Mistake pattern recognition (PRD 5.7) — GET /practice/mistakes/patterns
// ---------------------------------------------------------------------------

export type MistakePattern = {
  tag: MistakeTag;
  label: string;
  count: number;
  marksLost: number;
  topics: string[];
  chapters: { chapterId: string; chapterName: string; count: number }[];
  topChapterName: string | null;
  suggestedAction: string | null;
};

export type MistakePatternsResponse = {
  windowDays: number;
  since: string;
  totalEntries: number;
  windowEntryCount: number;
  qualifiesForInsight: boolean;
  minEntriesForInsight: number;
  assumedMarksPerQuestion: number;
  totalMarksLost: number;
  recoverableMarks: number;
  untaggedWrongCount: number;
  patterns: MistakePattern[];
  insight: string | null;
};

export function getMistakePatterns() {
  return authRequest<{ success: true; data: MistakePatternsResponse }>(`/mistakes/patterns`);
}

/** Add/update tags and personal note on a mistake (PRD 5.5.2 / 5.5.3). */
export function tagMistake(
  mistakeId: string,
  body: { mistakeTags?: MistakeTag[]; studentNote?: string; reReview?: boolean },
) {
  return authRequest<{ success: true; data: unknown }>(`/mistakes/${mistakeId}/tag`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type MistakeReviewResult = {
  id: string;
  status: "ACTIVE" | "MASTERED" | "ARCHIVED" | string;
  currentIntervalDays: number;
  consecutiveEasy: number;
  reviewCount: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
};

/** Spaced-repetition review feedback (PRD 5.6.4). */
export function reviewMistake(
  mistakeId: string,
  body: { feedback: MistakeReviewFeedback; durationSeconds?: number },
) {
  return authRequest<{ success: true; data: MistakeReviewResult }>(
    `/mistakes/${mistakeId}/review`,
    { method: "POST", body: JSON.stringify(body) },
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
