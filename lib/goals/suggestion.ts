import { ApiError } from "@/lib/api/http";

/** Wording and rules for the AI goal suggestions (the card, the Modify box, the error states). */

export const MIN_HOURS = 1;
export const MAX_HOURS = 15;
export const HOURS_STEP = 0.5;

/** "4 hours", "2.5 hours", "1 hour". */
export function hoursText(hours: number): string {
  const text = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
  return `${text} ${hours === 1 ? "hour" : "hours"}`;
}

/** What the Modify box holds, as a number the server will accept; null when it is empty or out of range. */
export function parseHours(raw: string): number | null {
  const n = Number(raw.trim());
  if (raw.trim() === "" || !Number.isFinite(n)) return null;
  if (n < MIN_HOURS || n > MAX_HOURS) return null;
  return Math.round(n * 2) / 2;
}

export type SuggestionProblem =
  /** The Brain is down or too slow: "AI is resting", with a Try again button. */
  | { kind: "resting"; message: string }
  /** Over 10 an hour: the server's message names the minutes to wait. */
  | { kind: "limit"; message: string }
  /** Anything else (a goal like that already exists, the week has passed…): the server's own words. */
  | { kind: "other"; message: string };

export const RESTING_TEXT = "AI is resting, back soon.";

/** Turns a failed request into what the card says. A 503 is always "resting", whatever the server's wording. */
export function problemOf(err: unknown): SuggestionProblem {
  if (err instanceof ApiError) {
    if (err.status === 503) return { kind: "resting", message: RESTING_TEXT };
    if (err.status === 429) return { kind: "limit", message: err.message };
    return { kind: "other", message: err.message };
  }
  // a dropped connection reaches us as a TypeError from fetch
  return { kind: "resting", message: RESTING_TEXT };
}
