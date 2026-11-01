import { apiRequest, ApiError } from "@/lib/api/http";
import { refreshAccessToken } from "@/lib/api/auth";
import { getAccessToken, getRefreshToken, saveTokens, clearSession } from "@/lib/auth/session";

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  window.location.assign("/login");
}

let refreshPromise: Promise<string> | null = null;

/**
 * A page load fires several authenticated requests at once (today's plan,
 * check-in status, study consistency, …). If the access token has expired,
 * they'd all 401 together and — without this — each would independently
 * call /refresh with the same refresh token. The backend rotates refresh
 * tokens on use, so only the first of those concurrent calls succeeds; the
 * rest get rejected with an already-consumed token and each force a logout,
 * even though the first call just re-established a perfectly valid session.
 * Sharing one in-flight promise makes every 401 in the same window ride the
 * same single refresh, so the token is only ever consumed once.
 */
function refreshAccessTokenOnce(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token");

      const { data: newTokens } = await refreshAccessToken(refreshToken);
      saveTokens(newTokens);
      return newTokens.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

/** A refresh that failed because the server was busy or unreachable says nothing about the session: keep it. */
const sessionIsDead = (err: unknown) => !(err instanceof ApiError) || err.status === 400 || err.status === 401 || err.status === 403;

// ---- busy server: wait as asked, never let one 429 take the page down ----------------------------------------------

/** Fired when the server asked us to slow down, so the shell can show a small, non-blocking notice. */
export const BUSY_EVENT = "prepex:server-busy";
function announceBusy() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(BUSY_EVENT));
}
const MAX_429_RETRIES = 2;
const MAX_WAIT_MS = 8_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function send<T>(url: string, options: RequestInit, retry429: boolean): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await sendWithAuth<T>(url, options);
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 429) throw err;
      announceBusy();
      if (!retry429 || attempt >= MAX_429_RETRIES) throw err;
      // A 429 means the request was not processed, so trying again is safe for writes too.
      await sleep(Math.min(MAX_WAIT_MS, err.retryAfterMs ?? 1_000 * 2 ** attempt));
    }
  }
}

async function sendWithAuth<T>(url: string, options: RequestInit): Promise<T> {
  const accessToken = getAccessToken();

  try {
    return await apiRequest<T>(url, {
      ...options,
      headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
    });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    if (!getRefreshToken()) {
      clearSession();
      redirectToLogin();
      throw err;
    }

    let newAccessToken: string;
    try {
      newAccessToken = await refreshAccessTokenOnce();
    } catch (refreshErr) {
      // No way to recover client-side from an invalid/expired/revoked
      // refresh token — end the session and send the user back to login.
      // Scoped to just the refresh call: a failure of the retried request
      // below is a separate problem and shouldn't force a logout when the
      // refresh itself succeeded. A busy or unreachable auth server is not
      // a dead session, so that keeps the student signed in.
      if (sessionIsDead(refreshErr)) {
        clearSession();
        redirectToLogin();
      }
      throw refreshErr;
    }

    return await apiRequest<T>(url, {
      ...options,
      headers: { Authorization: `Bearer ${newAccessToken}`, ...options.headers },
    });
  }
}

// ---- reads: one request per URL at a time, and a short memory ------------------------------------------------------

/**
 * Many screens mount several components that ask for the same thing (subjects, the running timer, today's XP) and the
 * app shell re-asks on every tab switch. Concurrent reads of one URL share a single request, and an answer is reused
 * for a few seconds. Any write (POST/PUT/PATCH/DELETE) forgets every remembered answer, so what a student just changed is
 * always re-read from the server.
 */
const DEFAULT_TTL_MS = 15_000;
const LONG_TTL: { match: RegExp; ms: number }[] = [
  // the syllabus list changes only when the student edits their chapters (a write, which clears this)
  { match: /\/profile\/subjects-chapters/, ms: 5 * 60_000 },
];
let ttlEnabled = typeof process === "undefined" || !process.env.VITEST;

type Remembered = { at: number; value: unknown };
const remembered = new Map<string, Remembered>();
const inflight = new Map<string, Promise<unknown>>();
let generation = 0;

/** Forget every remembered read (sign-out, or a write made outside this module). */
export function clearRequestCache(): void {
  generation += 1;
  remembered.clear();
  inflight.clear();
}

/** Tests turn the memory on explicitly (it is off under Vitest so mocked sequences behave as written). */
export function setRequestCacheEnabled(on: boolean): void {
  ttlEnabled = on;
  clearRequestCache();
}

const ttlFor = (url: string) => (ttlEnabled ? (LONG_TTL.find((r) => r.match.test(url))?.ms ?? DEFAULT_TTL_MS) : 0);

/**
 * Shared by every `/lib/api/*.ts` module: attaches the access token, and on a
 * 401 refreshes it once and retries. If the refresh token itself is invalid,
 * expired, or revoked, the local session is cleared and the browser is sent
 * to /login — otherwise that failure was propagating as an unhandled
 * rejection (e.g. "Refresh token has been revoked") instead of recovering.
 * On a 429 it waits as long as the server asks and tries again; a read that
 * still cannot get through answers with the last copy it has, if any.
 */
export async function authenticatedRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();

  if (method !== "GET" || options.signal) {
    if (method === "GET") return send<T>(url, options, true);
    clearRequestCache();
    try {
      return await send<T>(url, options, true);
    } finally {
      clearRequestCache();
    }
  }

  const ttl = ttlFor(url);
  // keyed by the signed-in session too, so a different student signing in on this browser never sees the last one's data
  const key = `${getAccessToken() ?? ""}|${url}`;
  const copy = remembered.get(key);
  if (copy && ttl > 0 && Date.now() - copy.at < ttl) return copy.value as T;

  const running = inflight.get(key);
  if (running) return running as Promise<T>;

  const startedIn = generation;
  const request = send<T>(url, options, !copy)
    .then((value) => {
      if (startedIn === generation) remembered.set(key, { at: Date.now(), value });
      return value;
    })
    .catch((err: unknown) => {
      // keep showing what we had rather than turning one refused read into an error screen
      if (copy && err instanceof ApiError && (err.status === 429 || err.status === 408)) return copy.value as T;
      throw err;
    })
    .finally(() => {
      if (inflight.get(key) === request) inflight.delete(key);
    });
  inflight.set(key, request);
  return request;
}
