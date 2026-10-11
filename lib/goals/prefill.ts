import type { GoalType, GoalUnit, NewGoal } from "@/lib/api/goals";
import { GOAL_TYPES, clampTarget } from "@/lib/goals/format";

/**
 * Pre-filling a goal from somewhere else in the app (the weekly diagnosis chips; later the goal assistant). The link
 * carries the goal in the query string — `/goals?week=next&type=HOURS&unit=MINUTES&target=90&chapter=<id>` — and the
 * goals screen turns it back into a draft. Everything read from the URL is validated: a hand-edited link can only ever
 * produce a goal the composer would have allowed anyway.
 */

export type Prefill = {
  /** `next`: the goal is for next week (the default for the diagnosis chips); otherwise this week. */
  week: "next" | "current";
  goal: NewGoal;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = new Set<string>(GOAL_TYPES.map((t) => t.type));

export function prefillHref(input: { type: GoalType; unit: GoalUnit; target: number; chapterId?: string | null; week?: "next" | "current" }): string {
  const sp = new URLSearchParams();
  sp.set("week", input.week ?? "next");
  sp.set("type", input.type);
  sp.set("unit", input.unit);
  sp.set("target", String(Math.round(input.target)));
  if (input.chapterId) sp.set("chapter", input.chapterId);
  return `/goals?${sp.toString()}`;
}

/** A diagnosis fix as a goal link: minutes of study on its chapter. */
export function fixToGoalHref(fix: { chapterId: string | null; minutes: number | null }): string {
  return prefillHref({ type: "HOURS", unit: "MINUTES", target: fix.minutes ?? 60, chapterId: fix.chapterId, week: "next" });
}

export function parsePrefill(params: { get(name: string): string | null }, subjectOfChapter: (chapterId: string) => number | null): Prefill | null {
  const type = params.get("type");
  if (!type || !TYPES.has(type)) return null;
  const rawUnit = params.get("unit");
  const unit: GoalUnit = rawUnit === "MINUTES" || rawUnit === "HOURS" || rawUnit === "COUNT" ? rawUnit : type === "HOURS" ? "HOURS" : "COUNT";
  // a unit that does not fit the type (e.g. HOURS goal in COUNT) falls back to the type's own
  const fixedUnit: GoalUnit = type === "HOURS" ? (unit === "COUNT" ? "HOURS" : unit) : "COUNT";
  const rawTarget = Number(params.get("target"));
  if (!Number.isFinite(rawTarget) || rawTarget <= 0) return null;
  const chapter = params.get("chapter");
  const chapterId = chapter && UUID.test(chapter) ? chapter : null;
  const subjectId = chapterId ? subjectOfChapter(chapterId) : null;
  return {
    week: params.get("week") === "current" ? "current" : "next",
    goal: {
      type: type as GoalType,
      unit: fixedUnit,
      target: clampTarget(type as GoalType, fixedUnit, rawTarget),
      subjectId,
      chapterId: subjectId === null ? null : chapterId,
    },
  };
}
