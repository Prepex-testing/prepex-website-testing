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

/** Launch step 2 (C1): performance spans follow the same rules (query-less URLs, masked text, no input attributes). */
const DROP_SPAN_ATTRS = /(^|\.)(query|query_string|body|request\.body|user\.(email|name|username|full_name)|cookies?)$/i;
export function scrubSpan<T extends { name: string; attributes?: Record<string, unknown> }>(span: T): T {
  span.name = scrubText(stripQuery(span.name));
  if (span.attributes) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(span.attributes)) {
      if (DROP_SPAN_ATTRS.test(k)) continue;
      const clean = (s: string) => scrubText(/url|target|route|path/i.test(k) ? stripQuery(s) : s);
      if (typeof v === "string") out[k] = clean(v);
      else if (v && typeof v === "object" && typeof (v as { value?: unknown }).value === "string") out[k] = { ...(v as object), value: clean((v as { value: string }).value) };
      else out[k] = v;
    }
    span.attributes = out;
  }
  return span;
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
    beforeSendSpan: scrubSpan,
  };
}
