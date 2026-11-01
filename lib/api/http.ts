export class ApiError extends Error {
  status: number;
  /** On a 429: how long the server asked us to wait before trying again (from Retry-After). */
  retryAfterMs: number | null;

  constructor(status: number, message: string, retryAfterMs: number | null = null) {
    super(message);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * How long a request may take before we give up on it. Without a limit a request stuck on a flaky mobile connection never
 * settles, and whatever waits on it (the timer's Pause and End buttons, a page's loading state) waits forever.
 */
export const REQUEST_TIMEOUT_MS = 20_000;

function retryAfterMs(response: Response): number | null {
  const raw = response.headers.get("Retry-After");
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(raw);
  return Number.isNaN(at) ? null : Math.max(0, at - Date.now());
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  // FormData bodies need the browser to set their own multipart boundary —
  // forcing application/json here would break upload parsing server-side.
  const isFormData = options.body instanceof FormData;

  // A caller that passes its own signal (a stream it can cancel) keeps control of it; everyone else gets the time limit.
  const timeout = options.signal ? null : new AbortController();
  const timer = timeout ? setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS) : null;

  let response: Response;
  try {
    response = await fetch(url, {
      // Always hit the network — GET responses (e.g. today's plan) must reflect
      // mutations (skip/complete/edit/delete/reorder) immediately, without
      // requiring a hard page reload to bypass a stale cached response.
      cache: "no-store",
      ...options,
      ...(timeout ? { signal: timeout.signal } : {}),
      headers: isFormData
        ? { "ngrok-skip-browser-warning": "true", ...options.headers }
        : {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
            ...options.headers,
          },
    });
  } catch (err) {
    if (timeout?.signal.aborted) throw new ApiError(408, "The connection is slow. Please try again.");
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.message ?? "Something went wrong. Please try again.",
      response.status === 429 ? retryAfterMs(response) : null,
    );
  }

  return body as T;
}
