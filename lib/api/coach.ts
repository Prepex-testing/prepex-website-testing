import { CORE_API_BASE_URL } from "@/lib/api/config";
import { authenticatedRequest } from "@/lib/api/authRequest";

function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return authenticatedRequest<T>(`${CORE_API_BASE_URL}/api/coach${path}`, options);
}

/**
 * Section 16 — Onboarding Coach.
 *
 * The schedule and its pacing live in core-service, so the client renders
 * whatever `step` it is handed rather than deciding what is due. That keeps
 * "each feature only once" true across devices (PRD 16.6) and means the copy
 * can't drift from the anchors.
 */
export type CoachStep = {
  /** Stable step identity — what gets posted back to /seen. */
  id: string;
  /** Schedule day this step unlocks on. */
  day: number;
  feature: string;
  message: string;
  /** Element to point at, resolved as [data-coach="<anchor>"]. */
  anchor: string;
  /**
   * Day 14. Renders identically to every other step — the unlock list and
   * partner prompt live in the separate partner pop-up — but server-side it
   * closes the schedule out and fires even when coaching is switched off.
   */
  isGraduation: boolean;
  /** 1-based position, for "3 of 12". */
  index: number;
  total: number;
};

export type CoachState = {
  /** False until onboarding is confirmed — the schedule hasn't started. */
  active: boolean;
  currentDay: number | null;
  seenSteps: string[];
  disabled: boolean;
  graduatedAt: string | null;
  /** Schedule on hold (Recovery Week); `notice` says why and no step is due. */
  paused: boolean;
  notice: string | null;
  step: CoachStep | null;
};

export function getCoachState() {
  return authRequest<{ success: true; data: CoachState }>("/state");
}

/** "Got it" — retires that step. The next one arrives on its own day. */
export function markCoachStepSeen(stepId: string) {
  return authRequest<{ success: true; data: CoachState }>("/seen", {
    method: "POST",
    body: JSON.stringify({ stepId }),
  });
}

/** "Skip tour" / re-enable. Graduation still fires when disabled. */
export function setCoachDisabled(disabled: boolean) {
  return authRequest<{ success: true; data: CoachState }>("/disabled", {
    method: "PATCH",
    body: JSON.stringify({ disabled }),
  });
}
