export const AUTH_API_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL ?? "http://localhost:4001";

export const CORE_API_BASE_URL =
  process.env.NEXT_PUBLIC_CORE_API_URL ?? "http://localhost:4002";

export const DASHBOARD_API_BASE_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_API_URL ?? "http://localhost:4003";

/**
 * Where the browser is sent to sign in with Google. It must be the host in GOOGLE_REDIRECT_URI: the sign-in is bound to
 * the starting browser with a cookie on that host. Every other API call can go through the website's own address
 * (same origin: no extra DNS lookup, TLS handshake or CORS preflight, which on some mobile networks cost 10+ seconds).
 */
export const AUTH_OAUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_OAUTH_URL || AUTH_API_BASE_URL;
