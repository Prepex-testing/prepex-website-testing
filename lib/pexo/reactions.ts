import { pexoMark, pexoReact } from "@/lib/pexo/store";

/**
 * Pexo's reactions to what the student just did (C3): one short line each, through the one transient bubble. They are
 * called where the action succeeds (mostly the API layer, so every screen that does the action gets the same line).
 * Each is a no-op when Pexo is off or Quiet mode does not allow it (the store decides). Pure pickers are exported for
 * tests.
 */

export const PRACTICE_HIGH = 0.8;
export const PRACTICE_LOW = 0.5;
export const COUNTDOWN_DAYS = [100, 50, 30, 10, 1] as const;
export const STREAK_DAYS = [7, 30, 100] as const;
/** Other streak lengths Pexo marks with the plain milestone line. */
export const STREAK_MILESTONES = [14, 21, 50, 60, 75, 150, 200, 365] as const;
export const BIG_BACKLOG_MINUTES = 15 * 60;

type Recall = "easy" | "ok" | "hard";
type Practice = { questionsAttempted: number; questionsCorrect: number };

/** Which line a finished planner task gets. */
export function taskDoneTrigger(input: { recall?: Recall; practice?: Practice; kind?: string | null; taskType?: string | null }): { trigger: string; context: Record<string, string | number> } {
  if (input.recall) return { trigger: `task.rating.${input.recall}`, context: {} };
  if (input.practice && input.practice.questionsAttempted > 0) {
    const { questionsAttempted: attempted, questionsCorrect: correct } = input.practice;
    const acc = correct / attempted;
    const level = acc >= PRACTICE_HIGH ? "high" : acc < PRACTICE_LOW ? "low" : "mid";
    return { trigger: `task.done.practice.${level}`, context: { correct, attempted } };
  }
  if (input.kind === "lecture") return { trigger: "task.done.lecture", context: {} };
  return { trigger: "task.done", context: {} };
}

export function reactTaskDone(input: Parameters<typeof taskDoneTrigger>[0] & { chapter?: string | null }): void {
  const { trigger, context } = taskDoneTrigger(input);
  if (trigger === "task.done" && (input.kind === "revision" || input.taskType === "REVISION") && input.chapter) {
    pexoReact(["task.done.revision", "task.done"], { chapter: input.chapter });
    return;
  }
  pexoReact(trigger, context);
}

export const reactTaskUndo = (): void => void pexoReact("task.undo");
export const reactMovedTomorrow = (): void => void pexoReact("task.moved_tomorrow");
export const reactAllTasksDone = (date: string): void => {
  if (pexoMark(`task.done.all:${date}`, true)) pexoReact("task.done.all", {}, { kind: "celebration" });
};

export const reactBacklogAdded = (): void => void pexoReact("backlog.added");
export function reactBacklogCleared(input: { chapter?: string | null; remainingMinutes?: number | null; left?: number | null }): void {
  const context: Record<string, string | number> = {};
  if (input.chapter) context.chapter = input.chapter;
  if (input.left != null && input.left > 0) context.left = input.left;
  if (input.remainingMinutes != null && input.remainingMinutes > 0) context.hours = Math.round((input.remainingMinutes / 60) * 10) / 10;
  pexoReact("backlog.cleared", context, { kind: "celebration" });
}
export const reactLastRock = (): void => void pexoReact("backlog.last_rock", {}, { kind: "celebration" });

/** Viewing a big backlog: one calm line a day. */
export function reactBacklogView(totalMinutes: number, grewThisWeek: boolean, feasible: boolean | null): void {
  if (feasible === false) {
    if (pexoMark("backlog.infeasible")) pexoReact("backlog.infeasible");
    return;
  }
  if (totalMinutes > BIG_BACKLOG_MINUTES) {
    if (pexoMark("backlog.big_calm")) pexoReact("backlog.big_calm");
  } else if (grewThisWeek && pexoMark("backlog.growing")) pexoReact("backlog.growing");
}
export const reactSkipLane = (): void => void pexoReact("backlog.skip_lane");

export function reactMistakesSaved(input: { count: number; chapter?: string | null; silly?: boolean; fromMock?: boolean }): void {
  if (input.count > 1 || input.fromMock) {
    pexoReact("mistake.batch.done", { n: input.count });
    return;
  }
  if (input.silly) {
    pexoReact(["mistake.reason.silly", "mistake.saved"], input.chapter ? { chapter: input.chapter } : {});
    return;
  }
  pexoReact("mistake.saved", input.chapter ? { chapter: input.chapter } : {});
}

export function reactMistakeReview(result: "correct" | "wrong", mastered: boolean, masteredTotal?: number): void {
  if (mastered) {
    pexoReact("mistake.mastered", {}, { kind: "celebration" });
    if (masteredTotal === 10 || masteredTotal === 50) pexoMark(`share.mastered.${masteredTotal}`, true);
    return;
  }
  pexoReact(result === "correct" ? "mistake.review.got" : "mistake.review.not_yet");
}

export const reactQuickLog = (): void => void pexoReact("log.quick");
export function reactMockLogged(input: { totalMarks: number; previousMarks?: number | null }): void {
  if (input.previousMarks == null) {
    pexoReact("log.mock");
    return;
  }
  const delta = Math.round((input.totalMarks - input.previousMarks) * 10) / 10;
  if (delta > 0) pexoReact("log.mock.up", { delta }, { kind: "celebration" });
  else if (delta < 0) pexoReact("log.mock.down");
  else pexoReact("log.mock");
}

/** The streak flame reached a milestone (once each). */
export function reactStreak(days: number): void {
  if ((STREAK_DAYS as readonly number[]).includes(days)) {
    if (pexoMark(`streak.${days}`, true)) pexoReact(`streak.${days}`, {}, { kind: "celebration" });
  } else if ((STREAK_MILESTONES as readonly number[]).includes(days) && pexoMark(`streak.${days}`, true)) {
    pexoReact("streak.milestone", { days }, { kind: "celebration" });
  }
}

/** Days to the exam: 100, 50, 30, 10 and 1, once each. */
export function reactCountdown(daysLeft: number | null | undefined): void {
  if (daysLeft == null || !(COUNTDOWN_DAYS as readonly number[]).includes(daysLeft)) return;
  if (pexoMark(`countdown.${daysLeft}`, true)) pexoReact(`countdown.${daysLeft}`);
}
