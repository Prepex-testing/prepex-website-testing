/**
 * Launch step 1 (C4): the website's security headers, built from the same NEXT_PUBLIC_* settings the app uses, so
 * testing and production each allow only their own API origins. Used by next.config.ts.
 *
 * CSP follows the Next.js "without nonces" guide: nonces would force every page to render dynamically. Scripts and
 * styles stay 'self' plus Next's inline bootstrap; nothing can be framed, no plugins, no foreign form targets, and the
 * page may only talk to our own APIs and Sentry.
 */
export type HeaderEnv = Partial<Record<string, string | undefined>>;

function origin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Sentry's ingest host comes from the DSN (https://key@o1.ingest.sentry.io/1 -> https://o1.ingest.sentry.io). */
function sentryOrigin(dsn: string | undefined): string | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy(env: HeaderEnv, isDev = false): string {
  const apis = [env.NEXT_PUBLIC_AUTH_API_URL, env.NEXT_PUBLIC_CORE_API_URL, env.NEXT_PUBLIC_DASHBOARD_API_URL].map(origin);
  const connect = ["'self'", ...apis, sentryOrigin(env.NEXT_PUBLIC_SENTRY_DSN)].filter((x): x is string => Boolean(x));
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    // profile photos come from Google (lh3.googleusercontent.com) and notebook files from the core API
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["font-src", ["'self'", "data:"]],
    ["media-src", ["'self'", "blob:", "data:"]],
    ["connect-src", [...new Set(connect)]],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
    // only where the APIs are https themselves: on a local http stack it would rewrite every API call to https
    ...(isDev || apis.some((a) => a?.startsWith("http:")) ? [] : ([["upgrade-insecure-requests", []]] as [string, string[]][])),
  ];
  return directives.map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k)).join("; ");
}

export function securityHeaders(env: HeaderEnv, isDev = false): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(env, isDev) },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // only the microphone, and only for our own pages (opt-in voice in onboarding)
    { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
