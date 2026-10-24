import * as Sentry from "@sentry/nextjs";
import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

/**
 * Planner telemetry. One call at every meaningful action; it never throws and never blocks the screen.
 * Each event goes to the server log (so it shows up next to the request it belongs to), to Sentry as a breadcrumb (so
 * an error report carries the steps before it), and to Mixpanel when the page has it loaded.
 */

export const PLANNER_EVENTS = [
  "planner_view",
  "planner_regenerate",
  "planner_task_start",
  "planner_task_complete",
  "planner_task_skip",
  "planner_task_delete",
  "planner_add_task",
  "planner_manual_toggle",
  "weekly_goal_save",
  "weekly_goal_suggest_accept",
  "weekly_goal_suggest_reject",
] as const;

export type PlannerEvent = (typeof PLANNER_EVENTS)[number];
export type EventProps = Record<string, string | number | boolean | null | undefined>;

type MixpanelLike = { track?: (name: string, props?: Record<string, unknown>) => void };

/** Keeps only small primitive properties: nothing a student typed ever leaves in an event. */
export function cleanProps(props: EventProps): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined) continue;
    out[key.slice(0, 32)] = typeof value === "string" ? value.slice(0, 64) : value;
  }
  return out;
}

export function trackPlanner(event: PlannerEvent, props: EventProps = {}): void {
  if (typeof window === "undefined") return;
  const clean = cleanProps(props);
  try {
    (window as unknown as { mixpanel?: MixpanelLike }).mixpanel?.track?.(event, clean);
  } catch {
    /* an analytics tool being absent or broken must never reach the student */
  }
  try {
    Sentry.addBreadcrumb({ category: "planner", message: event, data: clean, level: "info" });
  } catch {
    /* same */
  }
  authenticatedRequest(`${CORE_API_BASE_URL}/api/planner/v2/events`, {
    method: "POST",
    body: JSON.stringify({ event, props: clean }),
    keepalive: true,
  }).catch(() => undefined);
}
