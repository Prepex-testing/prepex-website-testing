/**
 * Focus timer maths. The server measures `elapsedSeconds` at the moment it answers; between
 * answers the page only adds the time that passed on ITS OWN clock since it received that answer.
 * Because it never compares the phone's wall clock with the server's, a wrong device clock
 * cannot skew the timer.
 */

export type TimerStatus = "ACTIVE" | "PAUSED" | "ENDED";

export interface TimerSnapshot {
  status: TimerStatus;
  /** Focused seconds at the moment the server answered. */
  elapsedSeconds: number;
}

/** Focused seconds right now. Only an ACTIVE timer keeps running between server answers. */
export function liveElapsedSeconds(snapshot: TimerSnapshot, receivedAtMs: number, nowMs: number): number {
  if (snapshot.status !== "ACTIVE") return snapshot.elapsedSeconds;
  const sinceAnswer = Math.max(0, Math.floor((nowMs - receivedAtMs) / 1000));
  return snapshot.elapsedSeconds + sinceAnswer;
}

/** Seconds left in the plan; negative once the student is in overtime. */
export function remainingSeconds(plannedMinutes: number, elapsedSeconds: number): number {
  return plannedMinutes * 60 - elapsedSeconds;
}

/** `25:00`, `4:03`, `1:05:09`; overtime is prefixed with `+` (`+2:10`). */
export function formatClock(remaining: number): string {
  const overtime = remaining < 0;
  const total = Math.abs(Math.trunc(remaining));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  const body = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
  return overtime ? `+${body}` : body;
}

/** 0..1 — how much of the plan has been focused (capped at 1 in overtime). */
export function ringProgress(plannedMinutes: number, elapsedSeconds: number): number {
  const planned = plannedMinutes * 60;
  if (planned <= 0) return 0;
  return Math.min(1, Math.max(0, elapsedSeconds / planned));
}

/** "Was this a win?" defaults to yes once at least 80% of the plan was focused. */
export function defaultWasCompleted(plannedMinutes: number, elapsedSeconds: number): boolean {
  return ringProgress(plannedMinutes, elapsedSeconds) >= 0.8;
}

/** Whole minutes the server will credit for the elapsed time (mirrors its rounding; the cap is applied there). */
export function previewMinutes(elapsedSeconds: number): number {
  return Math.round(elapsedSeconds / 60);
}

export const PLAN_PRESETS_MINUTES = [15, 25, 45, 60, 90] as const;
export const MIN_PLANNED_MINUTES = 1;
export const MAX_PLANNED_MINUTES = 480;

export function clampPlannedMinutes(value: number): number {
  if (!Number.isFinite(value)) return 25;
  return Math.min(MAX_PLANNED_MINUTES, Math.max(MIN_PLANNED_MINUTES, Math.round(value)));
}

/** Two interruptions closer than this count once (a quick tab flicker is not two distractions). */
export const INTERRUPTION_DEBOUNCE_MS = 3000;
