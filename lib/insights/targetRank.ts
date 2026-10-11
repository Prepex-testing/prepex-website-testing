/**
 * The student's target rank lives on their device (there is no profile field for it yet) and is sent with the analytics
 * requests, so "how far from my target" can be answered without the server storing it.
 */

const KEY = "prepex_target_rank";

export function parseTargetRank(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 5_000_000 ? n : null;
}

export function readTargetRank(): number | null {
  try {
    return parseTargetRank(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function writeTargetRank(rank: number | null): void {
  try {
    if (rank === null) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, String(rank));
  } catch {
    // storage can be blocked (private window); the target then lasts for this visit only
  }
}
