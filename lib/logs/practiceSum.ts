/**
 * The practice log's one invariant, checked live as the student types:
 * attempted = correct + wrong + skipped. (The server and the database enforce the same rule.)
 */

export type Counts = { attempted: number; correct: number; wrong: number; skipped: number };

export interface SumCheck {
  /** correct + wrong + skipped */
  parts: number;
  ok: boolean;
  /** attempted − parts: positive = questions not accounted for, negative = more outcomes than attempts. */
  difference: number;
  /** Plain-English, empty when everything adds up. */
  message: string;
}

export function checkSum(c: Counts): SumCheck {
  const parts = c.correct + c.wrong + c.skipped;
  const difference = c.attempted - parts;
  if (c.attempted < 1) return { parts, ok: false, difference, message: "Log at least one question." };
  if (difference === 0) return { parts, ok: true, difference, message: "" };
  const sum = `${c.correct} + ${c.wrong} + ${c.skipped} = ${parts}`;
  if (difference > 0) {
    return { parts, ok: false, difference, message: `${sum}, but you attempted ${c.attempted}. ${difference} ${difference === 1 ? "question is" : "questions are"} not counted as correct, wrong or skipped.` };
  }
  return { parts, ok: false, difference, message: `${sum} is ${-difference} more than the ${c.attempted} you attempted.` };
}

/** A count typed into a field: whole, 0..1000; anything else is NaN (the form treats it as invalid). */
export function parseCount(raw: string): number {
  if (raw.trim() === "") return 0;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 1000 ? n : Number.NaN;
}

export function accuracyOf(c: Pick<Counts, "attempted" | "correct">): number | null {
  return c.attempted > 0 ? Math.round((c.correct / c.attempted) * 1000) / 10 : null;
}
