import { getMasterAnalytics } from "@/lib/api/masterAnalytics";
import { getProfileOverview } from "@/lib/api/profile";
import { getStreakInfo } from "@/lib/api/streak";
import { getStudySummary } from "@/lib/api/studyLog";
import { getRewards, getXpSummary } from "@/lib/api/xp";
import { readTargetRank } from "@/lib/insights/targetRank";

/**
 * P6: fetch a screen's data before the click (hover or focus on a computer, touch on a phone), so the request layer
 * already holds the answer when the screen asks for it. Each warmer calls exactly what the screen calls, with the same
 * arguments; a different argument would only cost a request.
 */
const WARMERS: Record<string, () => Promise<unknown>[]> = {
  "/home": () => [getXpSummary(), getStreakInfo(), getProfileOverview(), getRewards()],
  "/logs": () => [getStudySummary("week"), getStreakInfo()],
  "/analytics": () => [getMasterAnalytics({ targetRank: readTargetRank() })],
  "/profile": () => [getProfileOverview()],
};

const WARM_FOR_MS = 15_000;
const warmedAt = new Map<string, number>();

export function prefetchNavData(href: string): void {
  const path = href.split("?")[0] ?? href;
  const warm = WARMERS[path];
  if (!warm) return;
  const now = Date.now();
  if (now - (warmedAt.get(path) ?? 0) < WARM_FOR_MS) return;
  warmedAt.set(path, now);
  for (const p of warm()) p.catch(() => undefined);
}

/** Props for a nav link: warm on hover, keyboard focus and the start of a touch. */
export const prefetchProps = (href: string) => ({
  onMouseEnter: () => prefetchNavData(href),
  onFocus: () => prefetchNavData(href),
  onTouchStart: () => prefetchNavData(href),
});
