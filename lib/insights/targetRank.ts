/**
 * The student's target rank is set on their device and sent with the analytics requests (`?targetRank=`). It is also kept
 * on their profile: at the next login the device value is written there (or, on a fresh device, the profile value is
 * pulled down), so it survives a new browser or phone.
 */

import { getProfile, updateTargetRank } from "@/lib/api/auth";

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

export type TargetRankSync = { action: "push"; rank: number } | { action: "pull"; rank: number } | { action: "none" };

/**
 * What to do at login. A rank on the device wins and is written to the profile (the student set it most recently, on
 * this device); with nothing on the device, the profile's rank is pulled down; equal or both empty: nothing.
 */
export function planTargetRankSync(device: number | null, server: number | null | undefined): TargetRankSync {
  if (device !== null) return device === (server ?? null) ? { action: "none" } : { action: "push", rank: device };
  if (server !== null && server !== undefined) return { action: "pull", rank: server };
  return { action: "none" };
}

/** Best-effort, run right after a successful login: a failure here must never get in the way of signing in. */
export async function syncTargetRankAfterLogin(accessToken: string): Promise<void> {
  try {
    const profile = await getProfile(accessToken);
    const plan = planTargetRankSync(readTargetRank(), profile.data.targetRank);
    if (plan.action === "push") await updateTargetRank(accessToken, plan.rank);
    else if (plan.action === "pull") writeTargetRank(plan.rank);
  } catch {
    // offline, or the profile call failed: the device value stays, and the next login tries again
  }
}
