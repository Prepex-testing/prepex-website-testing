import { ApiError } from "@/lib/api/http";
import type { StopFocusInput } from "@/lib/api/focus";

/**
 * D5 on the client. A finished session is saved by one request, and the server saves it all or not at all. If that
 * request fails for a reason a retry can fix (offline, a 5xx, a rate limit), the answers the student just gave are kept
 * here and re-sent in the background until they land — the student is told, not blocked, and a reload does not lose them.
 */

const KEY = "prepex.focus.pendingStop";

export type PendingStop = {
  sessionId: string;
  input: StopFocusInput;
  attempts: number;
  savedAt: number;
};

export const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000, 60_000] as const;
export const MAX_RETRY_ATTEMPTS = 20;

export function retryDelayMs(attempts: number): number {
  return RETRY_DELAYS_MS[Math.min(Math.max(0, attempts), RETRY_DELAYS_MS.length - 1)]!;
}

/** Offline, timed out, a server error or "slow down" are worth another go; any other 4xx will not change by waiting. */
export function isRetryable(err: unknown): boolean {
  if (err instanceof ApiError) return err.status >= 500 || err.status === 408 || err.status === 429;
  return true; // fetch itself failed: no connection
}

export function readPendingStop(): PendingStop | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingStop>;
    if (typeof parsed.sessionId !== "string" || typeof parsed.input !== "object" || parsed.input === null) return null;
    return { sessionId: parsed.sessionId, input: parsed.input as StopFocusInput, attempts: Number(parsed.attempts) || 0, savedAt: Number(parsed.savedAt) || Date.now() };
  } catch {
    return null;
  }
}

export function writePendingStop(pending: PendingStop): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    /* private mode: the in-memory retry still runs for this visit */
  }
}

export function clearPendingStop(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
