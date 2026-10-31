import type { PlanWarning } from "@/lib/api/plannerV2";

export type WarningAction = { href: string; label: string };

const TIMETABLE = "/timetable?from=planner";

/**
 * The inline fix for a planner warning, when the fix is in the timetable. Only the two warnings the student can
 * solve by editing their week get a link; every other warning stays plain text.
 *
 * - no_study_time: the day has no study slots at all (an empty weekday plans nothing).
 * - sr_overflow because there is no revision slot: the engine says "no revision slot"; when there is a slot but it is
 *   too small the same code is used with a different message, and that one has no single-click fix.
 */
export function warningAction(warning: PlanWarning): WarningAction | null {
  if (warning.code === "no_study_time") return { href: TIMETABLE, label: "Set up" };
  if (warning.code === "sr_overflow" && /no revision slot/i.test(warning.message)) return { href: TIMETABLE, label: "Add one" };
  return null;
}
