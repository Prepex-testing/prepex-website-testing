import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Shared Sentry options for browser, server and edge. Sentry is OFF unless
 * `NEXT_PUBLIC_SENTRY_DSN` is set, so local dev, CI and E2E never send anything.
 * No session replay, no default PII, and request bodies / cookies / query strings
 * are stripped before anything leaves the app (a study app's URLs and forms carry
 * a student's personal data).
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.headers) {
      const { authorization: _a, cookie: _c, ...safe } = event.request.headers as Record<string, string>;
      void _a;
      void _c;
      event.request.headers = safe;
    }
    if (event.request.url) event.request.url = event.request.url.split("?")[0];
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  return event;
}

export function baseOptions() {
  return {
    dsn: SENTRY_DSN,
    enabled: Boolean(SENTRY_DSN),
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  };
}
