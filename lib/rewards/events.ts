import { getRewards, getXpSummary, markBadgesSeen, type BadgeInfo, type RecordKind, type XpSummary } from "@/lib/api/xp";

/**
 * A tiny reward event bus. Anything that writes a log calls `refreshXp()` afterwards; it fetches the new XP total, works
 * out what changed since the last look and tells the listeners (the XP pop-up, the level-up and badge moments, the
 * record toasts). It never throws and never blocks the screen that called it.
 */
export type RewardEvent =
  | { type: "xp"; amount: number; total: number }
  | { type: "level_up"; level: number; title: string }
  | { type: "badges"; badges: Pick<BadgeInfo, "key" | "title" | "description">[] }
  | { type: "record"; kind: RecordKind; value: number; previous: number | null };

type Listener = (event: RewardEvent) => void;

const listeners = new Set<Listener>();
let last: XpSummary | null = null;

export function onReward(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitReward(event: RewardEvent): void {
  for (const l of listeners) {
    try {
      l(event);
    } catch {
      /* one broken listener must not stop the others */
    }
  }
}

/** Remember the XP the screen already showed, so the next refresh reports only what is new. */
export function primeXp(summary: XpSummary): void {
  last = summary;
}

export function lastKnownXp(): XpSummary | null {
  return last;
}

export function resetRewardState(): void {
  last = null;
}

/** Short buzz on Android when the browser supports it; nothing elsewhere. */
export function haptic(pattern: number | number[] = 12): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  } catch {
    /* haptics are a nicety */
  }
}

/** What changed between two summaries. Pure, so it is tested without a network. */
export function diffXp(before: XpSummary | null, after: XpSummary): { amount: number; leveledUp: boolean } {
  if (!before) return { amount: 0, leveledUp: false };
  return { amount: after.totalXp - before.totalXp, leveledUp: after.level > before.level };
}

/**
 * Fetches the new XP total (and, when XP went up, any new badges / broken records) and emits the matching events.
 * Returns the XP gained, or 0 when nothing changed or the call failed.
 */
export async function refreshXp(): Promise<number> {
  try {
    const after = await getXpSummary();
    const { amount, leveledUp } = diffXp(last, after);
    last = after;
    if (amount !== 0) emitReward({ type: "xp", amount, total: after.totalXp });
    if (leveledUp) {
      emitReward({ type: "level_up", level: after.level, title: after.title });
      haptic([20, 40, 20]);
    }
    if (amount > 0) {
      const rewards = await getRewards();
      const fresh = rewards.badges.filter((b) => rewards.unseen.includes(b.key));
      if (fresh.length > 0) {
        emitReward({ type: "badges", badges: fresh.map(({ key, title, description }) => ({ key, title, description })) });
        haptic([20, 40, 20]);
        void markBadgesSeen(fresh.map((b) => b.key)).catch(() => undefined);
      }
      for (const r of rewards.brokenRecords) emitReward({ type: "record", kind: r.kind, value: r.value, previous: r.previous });
    }
    return Math.max(0, amount);
  } catch {
    return 0;
  }
}
