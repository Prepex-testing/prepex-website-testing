import * as Sentry from "@sentry/nextjs";
import { TRACK_DOM_EVENT } from "@/lib/onboarding/telemetry";

/** Where the "Join the Prepex community" link was tapped. */
export type CommunityPlacement = "contact" | "footer" | "help";

/**
 * community_link_click: a Sentry counter (with the placement) and a breadcrumb, the same telemetry onboarding uses,
 * plus the DOM event the E2E suite listens to. Nothing about the student is sent. Never throws.
 */
export function trackCommunityClick(placement: CommunityPlacement): void {
  try {
    Sentry.addBreadcrumb({ category: "community", level: "info", message: "community_link_click", data: { placement } });
    Sentry.metrics.count("community_link_click", 1, { attributes: { placement } });
  } catch {
    // telemetry must never get in a student's way
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(TRACK_DOM_EVENT, { detail: { event: "community_link_click", placement } }));
}

/** legacy_link_click: "Used Prepex before?" on the sign-in screen. Same telemetry as the community link. */
export function trackLegacyClick(placement: "signin"): void {
  try {
    Sentry.addBreadcrumb({ category: "legacy", level: "info", message: "legacy_link_click", data: { placement } });
    Sentry.metrics.count("legacy_link_click", 1, { attributes: { placement } });
  } catch {
    // telemetry must never get in a student's way
  }
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(TRACK_DOM_EVENT, { detail: { event: "legacy_link_click", placement } }));
}
