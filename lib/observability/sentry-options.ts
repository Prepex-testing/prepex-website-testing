import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Shared Sentry options for browser, server and edge. Sentry is OFF unless
 * `NEXT_PUBLIC_SENTRY_DSN` is set, so local dev, CI and E2E never send anything.
 * No session replay, no default PII, and request bodies / cookies / query strings
 * are stripped before anything leaves the app (a study app's URLs and forms carry
 * a student's personal data).
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Launch step 2 (C1): e-mail addresses, JWT-like tokens and phone numbers are masked wherever they appear.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JWT = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g;
const PHONE = /(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)/g;
export const scrubText = (s: string) => s.replace(JWT, "[token]").replace(EMAIL, "[email]").replace(PHONE, "[phone]");
const stripQuery = (u: string) => u.split("?")[0] ?? u;

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
  if (event.message) event.message = scrubText(event.message);
  for (const v of event.exception?.values ?? []) if (v.value) v.value = scrubText(v.value);
  // breadcrumbs keep their category and a query-less URL; their payload (typed text, notebook content) is dropped
  if (event.breadcrumbs)
    event.breadcrumbs = event.breadcrumbs.map((b) => {
      const url = typeof b.data?.url === "string" ? scrubText(stripQuery(b.data.url)) : undefined;
      const status = b.data?.status_code;
      return { ...b, ...(b.message ? { message: scrubText(b.message) } : {}), data: { ...(url ? { url } : {}), ...(status !== undefined ? { status_code: status } : {}) } };
    });
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
