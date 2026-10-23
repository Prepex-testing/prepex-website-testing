import * as Sentry from "@sentry/nextjs";

/**
 * Onboarding drop-off events. Sentry is the telemetry this app already ships (and it is a no-op without a DSN),
 * so each event is a breadcrumb — it rides along with any error report, which is how a failed submit shows the
 * path that led to it — and a counter, which is what a drop-off funnel is built from. No answers are ever sent:
 * only the step's number and name.
 *
 *   onboarding_step_view      the screen was shown
 *   onboarding_step_complete  the student moved on from it
 */

export type OnboardingEvent = "onboarding_step_view" | "onboarding_step_complete";
export type OnboardingEventPayload = { stepNumber: number; stepName: string };

export const TRACK_DOM_EVENT = "prepex:track";

export function trackOnboarding(event: OnboardingEvent, payload: OnboardingEventPayload): void {
  try {
    Sentry.addBreadcrumb({ category: "onboarding", level: "info", message: event, data: payload });
    Sentry.metrics.count(event, 1, { attributes: { stepNumber: payload.stepNumber, stepName: payload.stepName } });
  } catch {
    // Telemetry must never get in a student's way.
  }
  // Lets the E2E suite (and any future listener) observe events without a vendor SDK.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TRACK_DOM_EVENT, { detail: { event, ...payload } }));
  }
}
