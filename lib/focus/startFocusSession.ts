import { intentToParams, type FocusSessionIntent } from "@/lib/focus/intent";

/**
 * THE way into a focus session. Every "start" button in the app — the planner, weekly goals, the revision and backlog
 * tabs, the practice log, the mistake notebook, the syllabus, the Home tiles, the bottom nav — describes what the
 * student is about to do as a FocusSessionIntent and calls `startFocusSession(intent)`. There is no other timer, no
 * other route and no ad-hoc timer modal.
 *
 * The timer opens full screen at `/focus/start?...`, pre-filled from the intent (the server fills in anything the
 * link only carries an id for). Use `focusSessionHref(intent)` where the control is a real link (a nav item, a card)
 * so it can be opened in a new tab; it is the same URL `startFocusSession` navigates to.
 */

export const FOCUS_START_PATH = "/focus/start";

export function focusSessionHref(intent: FocusSessionIntent): string {
  return `${FOCUS_START_PATH}?${intentToParams(intent).toString()}`;
}

type FocusNavigator = (href: string) => void;
let currentNavigator: FocusNavigator | null = null;

/** Called once by <FocusLauncher /> in the app layout, so the router is used when there is one. */
export function registerFocusNavigator(next: FocusNavigator): () => void {
  currentNavigator = next;
  return () => {
    if (currentNavigator === next) currentNavigator = null;
  };
}

export function startFocusSession(intent: FocusSessionIntent): void {
  const href = focusSessionHref(intent);
  if (currentNavigator) {
    currentNavigator(href);
    return;
  }
  // Before the app shell has mounted (or in a test with no router): a plain navigation still lands in the timer.
  if (typeof window !== "undefined") window.location.assign(href);
}
