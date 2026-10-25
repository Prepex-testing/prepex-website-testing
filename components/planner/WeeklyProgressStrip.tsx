"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCurrentGoals, type CurrentGoals } from "@/lib/api/goals";

/** This week's goals at a glance: a bar, how many are done, and the way to the whole week. */
export function WeeklyProgressStrip() {
  const [goals, setGoals] = useState<CurrentGoals | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    getCurrentGoals().then(
      (res) => live && setGoals(res.data),
      () => live && setGoals(null),
    );
    return () => {
      live = false;
    };
  }, []);

  if (goals === undefined) return <div className="h-[88px] animate-pulse rounded-2xl bg-tint-strong dark:bg-[#FAF7F214]" aria-hidden data-testid="weekly-loading" />;

  const live = (goals?.goals ?? []).filter((g) => g.status !== "ABANDONED" && g.status !== "CARRIED_OVER");
  if (!goals || live.length === 0) {
    return (
      <Link href="/goals" data-testid="weekly-progress" data-state="empty" className="flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border border-dashed border-brand/30 bg-surface px-4 py-3 hover:bg-tint-strong">
        <span className="min-w-0">
          <span className="block text-[14px] font-bold text-ink">This Week</span>
          <span className="block text-[12px] text-muted">No goals set yet. Goals are what the daily plan is built from.</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-ink">
          Set goals <ArrowRight className="size-4" aria-hidden />
        </span>
      </Link>
    );
  }

  const { done, total, percent } = goals.summary;
  return (
    <section aria-label="This week" data-testid="weekly-progress" data-state="goals" className="flex flex-col gap-2.5 rounded-2xl border border-brand/10 bg-surface px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[14px] font-bold text-ink">This Week</h3>
        <p className="text-right text-[12px] text-muted" data-testid="weekly-summary">
          {done} of {total} goals done · {percent}% complete
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-tint-strong dark:bg-[#FAF7F214]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="This week's goal progress">
        <div className="h-full rounded-full bg-ink/70 transition-[width] duration-500 dark:bg-[#FAF7F2]/80" style={{ width: `${percent}%` }} />
      </div>
      <Link href="/goals" data-testid="view-full-week" className="flex min-h-9 items-center gap-1 self-end text-[13px] font-semibold text-ink underline-offset-2 hover:underline">
        View full week <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
