import { addBreadcrumb } from "@sentry/nextjs";

/**
 * Focus-timer lifecycle events as the browser sees them. The server logs the same names after each write has
 * succeeded (core-service focusSessions.telemetry.ts) and is the record to count from; this is the client mirror:
 *
 *   - a `prepex:telemetry` window event any analytics provider can listen to, and
 *   - a Sentry breadcrumb (a no-op without a DSN) so a bug report shows what the student had just done.
 *
 * No personal data goes in: ids and enums only.
 */
export type FocusTelemetryEvent =
  | "focus_session_start"
  | "focus_session_pause"
  | "focus_session_resume"
  | "focus_session_end"
  | "focus_session_complete"
  | "focus_session_log_written";

export const TELEMETRY_EVENT = "prepex:telemetry";

export function trackFocusEvent(name: FocusTelemetryEvent, props: Record<string, string | number | boolean | null> = {}): void {
  try {
    addBreadcrumb({ category: "focus", message: name, data: props, level: "info" });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(TELEMETRY_EVENT, { detail: { name, props, at: Date.now() } }));
    }
  } catch {
    /* telemetry must never get in the way of studying */
  }
}
