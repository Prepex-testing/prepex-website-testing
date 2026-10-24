"use client";

import type { StreakInfo } from "@/lib/api/focus";

/** The day streak and whether this week's shield (Streak Freeze) is still unspent. */
export function StreakChip({ streak }: { streak: StreakInfo | null }) {
  if (!streak) return null;
  const days = streak.current;
  return (
    <div className="flex items-center gap-1.5" data-testid="streak-chip">
      <span className="inline-flex items-center gap-1 rounded-full bg-tint-strong px-2.5 py-1 text-[12px] font-bold text-ink dark:bg-[#FAF7F214]" title={streak.todayCounts ? "Today already counts towards your streak" : `${streak.minutesToCount} more minutes of focus makes today count`}>
        <span aria-hidden>🔥</span>
        <span data-testid="streak-days">
          {days} day{days === 1 ? "" : "s"}
        </span>
        {streak.todayCounts && <span aria-label="Today counts" className="text-success">✓</span>}
      </span>
      <span
        data-testid="streak-shield"
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${
          streak.shieldAvailable ? "bg-tint-strong text-ink dark:bg-[#FAF7F214]" : "bg-tint-strong/60 text-muted line-through dark:bg-[#FAF7F20A]"
        }`}
        title={streak.shieldAvailable ? "Your weekly Streak Freeze is ready" : "This week's Streak Freeze is used"}
      >
        <span aria-hidden>🛡️</span>
        <span>{streak.shieldAvailable ? "Shield ready" : "Shield used"}</span>
      </span>
    </div>
  );
}
