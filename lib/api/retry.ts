import { ApiError } from "@/lib/api/http";

/**
 * Onboarding v2, A1: a Home read that fails for a passing reason (the server was busy, restarting or slow, or the
 * network blinked) is tried again with backoff before the student ever sees an error. A 429 waits as long as the
 * server asked (Retry-After). Anything else (401, 403, 404, 400) is a real answer and is not retried.
 */
export const RETRY_ATTEMPTS = 3;
const BASE_DELAY_MS = 600;
const MAX_DELAY_MS = 8_000;

export function isTransient(err: unknown): boolean {
  if (err instanceof ApiError)
    return (
      err.status === 0 ||
      err.status === 408 ||
      err.status === 429 ||
      err.status >= 500
    );
  // fetch() rejects with a TypeError when the network is down or the request was cut off
  return (
    err instanceof TypeError ||
    (err instanceof Error && err.name === "AbortError")
  );
}

export function retryDelayMs(err: unknown, attempt: number): number {
  const asked = err instanceof ApiError ? err.retryAfterMs : null;
  if (asked !== null && asked !== undefined)
    return Math.min(MAX_DELAY_MS, asked);
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  load: () => Promise<T>,
  opts: {
    attempts?: number;
    onRetry?: (attempt: number, err: unknown) => void;
    wait?: (ms: number) => Promise<unknown>;
  } = {},
): Promise<T> {
  const attempts = opts.attempts ?? RETRY_ATTEMPTS;
  const wait = opts.wait ?? sleep;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await load();
    } catch (err) {
      if (!isTransient(err) || attempt >= attempts - 1) throw err;
      opts.onRetry?.(attempt + 1, err);
      await wait(retryDelayMs(err, attempt));
    }
  }
}
