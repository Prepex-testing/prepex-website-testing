const ACTIVE_TASK_KEY = "prepex.activeSessionTaskId";

/** Remembers which planner task a cross-app session belongs to, so the
 * welcome-back flow can PATCH the right task once the user returns — the
 * checkin/status endpoint only reports that a cross-app session is active,
 * not which task it was started from. */
export function setActiveSessionTaskId(taskId: string) {
  localStorage.setItem(ACTIVE_TASK_KEY, taskId);
}

export function getActiveSessionTaskId(): string | null {
  return localStorage.getItem(ACTIVE_TASK_KEY);
}

export function clearActiveSessionTaskId() {
  localStorage.removeItem(ACTIVE_TASK_KEY);
}

function elapsedSecondsKey(taskId: string) {
  return `prepex.session.${taskId}.elapsedSeconds`;
}

/** The planner API only tracks progress in whole minutes, and is only saved
 * on explicit actions (leave/complete) — so a mid-session refresh has
 * nowhere else to recover the in-progress minute's seconds from. */
export function getStoredElapsedSeconds(taskId: string): number | null {
  const raw = localStorage.getItem(elapsedSecondsKey(taskId));
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function setStoredElapsedSeconds(taskId: string, seconds: number) {
  localStorage.setItem(elapsedSecondsKey(taskId), String(seconds));
}

export function clearStoredElapsedSeconds(taskId: string) {
  localStorage.removeItem(elapsedSecondsKey(taskId));
}
