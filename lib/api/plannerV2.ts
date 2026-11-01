import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/**
 * Planner v2 — core-service /api/planner/v2/*. Times are minutes of the student's day (IST), so the screens never do
 * time-zone maths. Every call is made as the signed-in student; the server takes the student from the token.
 */

export type TaskKind = "lecture" | "self_study" | "practice" | "revision" | "mock" | "backlog" | "other";
export type TaskStatus = "pending" | "in_progress" | "done" | "skipped" | "rolled_over";
export type PlannerMode = "auto" | "manual";

export type PlanTask = {
  id: string;
  planId: string;
  kind: TaskKind;
  title: string;
  description: string | null;
  subjectId: number | null;
  /** physics | chemistry | maths | biology (null when the task has no subject). */
  subject: string | null;
  chapterId: string | null;
  chapterName: string | null;
  topic: string | null;
  startMin: number | null;
  endMin: number | null;
  estimatedMinutes: number;
  plannedUnits: number | null;
  questionCount: number | null;
  status: TaskStatus;
  origin: string | null;
  contentSource: string | null;
  contentSourceLabel: string | null;
  generatedBy: string;
  fixedSlot: boolean;
  weeklyGoalId: string | null;
  backlogItemId: string | null;
  secondsCompleted: number;
  actualMinutes: number | null;
  linkedSessionLogId: string | null;
  linkedPracticeLogId: string | null;
  linkedRevisionLogId: string | null;
  linkedMockLogId: string | null;
  warning: string | null;
  /** The one-line reason the planner put this task here ("Due for revision · 2 days late", "Today's class DPP"). */
  why: string | null;
  /** An optional extra the planner suggests when the day has room: shown dimmed, never counted in the day's totals. */
  suggested: boolean;
  /** Class work (a class's DPP and the same-day recall): placed first, never dropped. */
  isProtected: boolean;
  /** The student pinned it: a rebuild of the plan leaves it where it is. */
  locked: boolean;
};

export type PlanWarning = { code: string; message: string };
export type Band = { startMin: number; endMin: number; chip: string };

export type UsageState = { kind: string; used: number; limit: number; remaining: number; resetsAt: string };

export type DaySummary = { plannedMinutes: number; doneMinutes: number; plannedCount: number; doneCount: number; percent: number };

export type SuggestedRevision = { queueId: string; chapterId: string; chapterName: string; subject: string; subjectId: number | null; minutes: number; dueOn: string };
export type SuggestedBacklog = { id: string; chapterId: string | null; chapterName: string | null; topic: string | null; subject: string; subjectId: number | null; minutes: number };

export type PlanDay = {
  date: string;
  isToday: boolean;
  mode: PlannerMode;
  plan: null | {
    id: string;
    version: number;
    generatedBy: string;
    engineVersion: number;
    budgetMinutes: number | null;
    warnings: PlanWarning[];
    generatedAt: string;
  };
  tasks: PlanTask[];
  bands: Band[];
  studyBlocks: { startMin: number; endMin: number }[];
  slotSource: "timetable" | "gaps" | "default";
  summary: DaySummary;
  regenerate: UsageState;
  /** A Light Day is 30% less, with the backlog paused. It is only ever switched on by the student. */
  lightDay: boolean;
  /** Why the app is asking "Switch to a Light Day?" (null when it is not asking). */
  lightDayOffer: "low_checkin" | "falling_hours" | null;
  phase: { id: string; label: string };
  daysToExam: number;
  /** Minutes the timetable gives the day, the share of it the student usually completes, and the minutes planned. */
  capacity: { slotMinutes: number; factor: number; plannedMinutes: number };
  suggestions: null | { revisions: SuggestedRevision[]; backlog: SuggestedBacklog[] };
};

function req<T>(path: string, options: RequestInit = {}): Promise<{ success: true; data: T }> {
  return authenticatedRequest<{ success: true; data: T }>(`${CORE_API_BASE_URL}/api/planner/v2${path}`, options);
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body ?? {}) });

export function getPlanDay(date?: string) {
  return req<PlanDay>(`/day${date ? `?date=${encodeURIComponent(date)}` : ""}`);
}

export function buildPlan(input: { reason?: "SCHEDULED" | "REGENERATE"; date?: string; regenReason?: string } = {}) {
  return req<{ day: PlanDay | null; skipped?: "manual" | "exists" }>("/generate", post(input));
}

export function setPlannerMode(mode: PlannerMode) {
  return req<{ mode: PlannerMode }>("/mode", { method: "PUT", body: JSON.stringify({ mode }) });
}

// ---- tasks ----
export type AddTaskInput = {
  kind: TaskKind;
  subjectId: number;
  chapterId?: string;
  topic?: string;
  minutes: number;
  slot?: "now" | "next_free" | "specific";
  startMin?: number;
  date?: string;
  contentSource?: string;
  origin?: "manual" | "sr" | "backlog";
  backlogItemId?: string;
  override?: boolean;
};

export function addPlanTask(input: AddTaskInput) {
  return req<{ task: PlanTask; warning: string | null }>("/tasks", post(input));
}
export const startPlanTask = (id: string) => req<PlanTask>(`/tasks/${id}/start`, post({}));
export const skipPlanTask = (id: string) => req<PlanTask>(`/tasks/${id}/skip`, post({}));
export const deletePlanTask = (id: string) => req<{ deleted: true }>(`/tasks/${id}`, { method: "DELETE" });
export const reschedulePlanTask = (id: string, input: { date?: string; startMin?: number } = {}) => req<PlanTask>(`/tasks/${id}/reschedule`, post(input));
/** Answers "Switch to a Light Day?" (on) or turns the Light Day off. The plan is rebuilt for the day. */
export function setLightDay(on: boolean, date?: string) {
  return req<{ day: PlanDay | null }>("/light-day", post({ on, ...(date ? { date } : {}) }));
}
/** Pins a task where it is (or lets it go): a rebuild of the plan keeps a locked task in place. */
export const lockPlanTask = (id: string, locked: boolean) => req<PlanTask>(`/tasks/${id}/lock`, post({ locked }));
export const recordTaskProgress = (id: string, input: { focusSessionId?: string; minutes?: number }) => req<PlanTask>(`/tasks/${id}/progress`, post(input));

export type CompleteInput = {
  via?: "focus" | "revision" | "practice" | "mock" | "manual";
  focusSessionId?: string;
  actualMinutes?: number;
  log?: boolean;
  confidence?: number;
  /** Revision tick: how well it was recalled. Stored on the revision log. */
  recall?: "easy" | "ok" | "hard";
  revision?: { revisionType?: string; questionsSolved?: number; questionsCorrect?: number; errors?: string };
  practice?: { source: string; sourceDetail?: string; questionsAttempted: number; questionsCorrect: number; questionsWrong: number; questionsSkipped?: number; difficulty?: string };
  mock?: {
    testType: string;
    examPattern: string;
    testName?: string;
    totalMarks: number;
    maxMarks?: number;
    physicsMarks?: number;
    chemistryMarks?: number;
    mathsMarks?: number;
    biologyMarks?: number;
    timeMinutes?: number;
    weakChapterIds?: string[];
    percentile?: number;
  };
  mistakes?: { questionText: string; correctAnswer: string; studentAnswer: string; topic?: string }[];
};

export function completePlanTask(id: string, input: CompleteInput) {
  return req<{ task: PlanTask; alreadyDone: boolean }>(`/tasks/${id}/complete`, post(input));
}

/** Takes back a completion made moments ago (the planner offers it for 5 seconds). XP and the logs it wrote are reversed. */
export function undoPlanTask(id: string) {
  return req<{ task: PlanTask; undone: boolean }>(`/tasks/${id}/undo`, post({}));
}

export function getPracticeOptions(id: string) {
  return req<{ available: number; prepexQuestions: boolean }>(`/tasks/${id}/practice-options`);
}

// ---- preferences ----
export type SubjectPreference = { subjectId: number; name: string | null; dailyMinutes: number | null };
export const getPlannerPreferences = () => req<{ subjects: SubjectPreference[]; regenerate: UsageState }>("/preferences");
export const savePlannerPreferences = (subjects: { subjectId: number; dailyMinutes: number | null }[]) =>
  req<{ saved: number }>("/preferences", { method: "PUT", body: JSON.stringify({ subjects }) });

// ---- weekly goals helpers ----
export type WeekSummary = {
  weekStart: string;
  weekEnd: string;
  availableMinutes: number;
  perDay: { date: string; minutes: number }[];
  perStudyDayMinutes: number;
  allocatedMinutes: number;
  remainingMinutes: number;
  overCommittedMinutes: number;
  fit: "under" | "perfect" | "over";
  defaultTimetable: boolean;
  bySubject: { subjectId: number | null; minutes: number }[];
};
export const getWeekSummary = (weekStart?: string) => req<WeekSummary>(`/week${weekStart ? `?weekStart=${weekStart}` : ""}`);

export type GoalDefaults = {
  lectureMinutes: { value: number; source: "history" | "default"; samples: number };
  practiceSessionMinutes: { value: number; source: "history" | "default"; samples: number };
  revisionMinutes: { value: number; source: "history" | "default"; samples: number };
  minutesPerQuestion: { value: number; source: "history" | "default"; samples: number };
  selfStudyChunkMinutes: number;
};
export const getGoalDefaults = (subjectId?: number | null) => req<GoalDefaults>(`/goal-defaults${subjectId ? `?subjectId=${subjectId}` : ""}`);

// ---- the plan's "why" ----
/**
 * Today's plan explained in two lines. The backend does not serve this yet (the call 404s), so callers fall back to a
 * sentence built from the plan itself (lib/planner/taskText explainPlan).
 * TODO(planner): wire /api/planner/today/explain once the backend window exposes it.
 */
export const getPlanExplanation = () => authenticatedRequest<{ success: true; data: { text: string } }>(`${CORE_API_BASE_URL}/api/planner/today/explain`);
