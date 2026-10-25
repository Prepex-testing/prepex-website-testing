/**
 * The focus timer's entry contract. Every place in the app that can start a session describes it with one of these
 * and hands it to `startFocusSession` (lib/focus/startFocusSession.ts). The same intent travels as query params on
 * `/focus/start`, which is also what a push notification, a WhatsApp broadcast or a PWA shortcut deep-links to.
 *
 * The vocabularies mirror core-service (modules/focusSessions/focus.vocab.ts) and the database CHECK constraints.
 */

export const ORIGIN_SOURCES = [
  "planner",
  "weekly_goals",
  "revision_tab",
  "backlog_tab",
  "practice_tab",
  "practice_own_content_fallback",
  "mistake_notebook",
  "syllabus_overview",
  "home_quick_tile",
  "standalone",
] as const;
export type OriginSource = (typeof ORIGIN_SOURCES)[number];

export const TASK_TYPES = ["lecture", "self_study", "practice", "revision", "mock_review", "other"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const FOCUS_MODES = ["pomodoro", "stopwatch", "countdown"] as const;
export type FocusMode = (typeof FOCUS_MODES)[number];

export type FocusSessionIntent = {
  originSource: OriginSource;
  /** planTaskId / weeklyGoalId / revision task or chapter id / backlogId / mistakeId / chapterId. */
  originId?: string;
  /** A subject name ("physics") or the numeric subject id as a string. */
  subject?: "physics" | "chemistry" | "maths" | "biology" | (string & {});
  /** A chapterId from the syllabus. */
  chapter?: string;
  /** Free text. */
  topic?: string;
  taskType?: TaskType;
  /** Countdown / Pomodoro target. */
  targetMinutes?: number;
  mode?: FocusMode;
  /** A line shown above the timer (for example why the timer opened without Prepex questions). */
  notice?: string;
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  lecture: "Lecture",
  self_study: "Self study",
  practice: "Practice",
  revision: "Revision",
  mock_review: "Mock review",
  other: "Other",
};

export const MODE_LABELS: Record<FocusMode, string> = {
  pomodoro: "Pomodoro",
  stopwatch: "Stopwatch",
  countdown: "Countdown",
};

/** The words after "From " in the chip on the timer header. Standalone sessions have no chip. */
const ORIGIN_LABELS: Record<OriginSource, string | null> = {
  planner: "today's plan",
  weekly_goals: "weekly goals",
  revision_tab: "revision queue",
  backlog_tab: "backlog",
  practice_tab: "practice log",
  practice_own_content_fallback: "today's plan",
  mistake_notebook: "mistake notebook",
  syllabus_overview: "syllabus",
  home_quick_tile: "home",
  standalone: null,
};

/** "From today's plan", or null when the session did not come from anywhere. */
export function originChipText(source: OriginSource): string | null {
  const label = ORIGIN_LABELS[source];
  return label ? `From ${label}` : null;
}

/** Where "back" goes when the student closes the timer without starting. */
export function originBackHref(source: OriginSource): string {
  switch (source) {
    case "planner":
    case "practice_own_content_fallback":
      return "/home";
    case "weekly_goals":
      return "/goals";
    case "revision_tab":
      return "/logs/revision";
    case "backlog_tab":
      return "/logs/backlog";
    case "practice_tab":
      return "/logs/practice";
    case "mistake_notebook":
      return "/mistakes";
    case "syllabus_overview":
      return "/syllabus";
    default:
      return "/home";
  }
}

/** Pomodoro for a block of an hour or less, a plain countdown above that. */
export function defaultMode(targetMinutes: number | null | undefined): FocusMode {
  return targetMinutes != null && targetMinutes > 60 ? "countdown" : "pomodoro";
}

export function isOriginSource(value: unknown): value is OriginSource {
  return typeof value === "string" && (ORIGIN_SOURCES as readonly string[]).includes(value);
}
export function isTaskType(value: unknown): value is TaskType {
  return typeof value === "string" && (TASK_TYPES as readonly string[]).includes(value);
}
export function isFocusMode(value: unknown): value is FocusMode {
  return typeof value === "string" && (FOCUS_MODES as readonly string[]).includes(value);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string | null | undefined): value is string => typeof value === "string" && UUID.test(value);

export const MIN_TARGET_MINUTES = 1;
export const MAX_TARGET_MINUTES = 480;

/** Query params for `/focus/start`. Only what the intent carries is written; ids are never guessed. */
export function intentToParams(intent: FocusSessionIntent): URLSearchParams {
  const p = new URLSearchParams();
  p.set("origin", intent.originSource);
  if (intent.originId) p.set("id", intent.originId);
  if (intent.chapter) p.set("chapter", intent.chapter);
  if (intent.subject) p.set("subject", intent.subject);
  if (intent.topic) p.set("topic", intent.topic.slice(0, 200));
  if (intent.taskType) p.set("type", intent.taskType);
  if (intent.targetMinutes != null && Number.isFinite(intent.targetMinutes)) {
    p.set("minutes", String(Math.min(MAX_TARGET_MINUTES, Math.max(MIN_TARGET_MINUTES, Math.round(intent.targetMinutes)))));
  }
  if (intent.mode) p.set("mode", intent.mode);
  if (intent.notice) p.set("notice", intent.notice.slice(0, 200));
  return p;
}

type ParamSource = { get(name: string): string | null };

/**
 * `/focus/start?...` → an intent. Anything that is not part of the contract is dropped, so a hand-edited or stale
 * link degrades to "open the timer, fill it in yourself" instead of an error. `?origin` missing or unknown means
 * a standalone session.
 */
export function parseIntentParams(params: ParamSource): FocusSessionIntent {
  const origin = params.get("origin");
  const originSource: OriginSource = isOriginSource(origin) ? origin : "standalone";
  const intent: FocusSessionIntent = { originSource };

  const id = params.get("id");
  if (isUuid(id)) intent.originId = id;
  const chapter = params.get("chapter");
  if (isUuid(chapter)) intent.chapter = chapter;
  const subject = params.get("subject")?.trim();
  if (subject) intent.subject = subject.slice(0, 40);
  const topic = params.get("topic")?.trim();
  if (topic) intent.topic = topic.slice(0, 200);
  const type = params.get("type");
  if (isTaskType(type)) intent.taskType = type;
  const minutes = Number(params.get("minutes"));
  if (params.get("minutes") && Number.isFinite(minutes) && minutes >= MIN_TARGET_MINUTES) {
    intent.targetMinutes = Math.min(MAX_TARGET_MINUTES, Math.round(minutes));
  }
  const mode = params.get("mode");
  if (isFocusMode(mode)) intent.mode = mode;
  const notice = params.get("notice")?.trim();
  if (notice) intent.notice = notice.slice(0, 200);
  return intent;
}

/** The intent the timer has once the student's choices (and the server's pre-fill) are applied: everything resolved to ids. */
export type ResolvedFocusIntent = {
  originSource: OriginSource;
  originId: string | null;
  subjectId: number | null;
  chapterId: string | null;
  topic: string;
  taskType: TaskType;
  targetMinutes: number;
  mode: FocusMode;
  notice: string | null;
};

export const DEFAULT_TARGET_MINUTES = 25;

/** Shown above the timer when the student opens it because Prepex has no questions for the chapter yet. */
export const NO_QUESTIONS_NOTICE = "No Prepex questions for this chapter yet — starting focus timer so you can practice from your own source";

/** "Use my own content" on a practice task (and the same path when Prepex has no questions for it). */
export function ownContentIntent(planTaskId: string | null | undefined, targetMinutes: number | null | undefined, noQuestions: boolean): FocusSessionIntent {
  return {
    originSource: "practice_own_content_fallback",
    originId: planTaskId ?? undefined,
    taskType: "practice",
    targetMinutes: targetMinutes ?? undefined,
    notice: noQuestions ? NO_QUESTIONS_NOTICE : undefined,
  };
}
