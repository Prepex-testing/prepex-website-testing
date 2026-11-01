"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { getGoalState } from "@/lib/api/goalAssistant";

const SEEN = "prepex.no-goals-prompt";

/** The day (YYYY-MM-DD) the student last said "Not now", kept in this browser only. Never throws. */
function seenToday(today: string): boolean {
  try {
    return window.localStorage.getItem(SEEN) === today;
  } catch {
    return false;
  }
}
function markSeen(today: string): void {
  try {
    window.localStorage.setItem(SEEN, today);
  } catch {
    /* a blocked store only means the prompt can come back */
  }
}

/** True until the student has goals for the current week; null while it is not known (and on a failed call). */
export function useHasGoals(): boolean | null {
  const [has, setHas] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    getGoalState().then(
      (res) => live && setHas(res.data.hasGoals),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);
  return has;
}

/**
 * Shown the first time the Planner opens in a week with no goals: the plan is built from what the student has, but a week of
 * goals makes it much better. It asks once a day and never blocks the plan.
 */
export function NoGoalsModal({ today }: { today: string }) {
  const has = useHasGoals();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(() => seenToday(today));
  if (has !== false || dismissed) return null;
  const close = () => {
    markSeen(today);
    setDismissed(true);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="no-goals-title" data-testid="no-goals-modal">
      <div className="flex w-full max-w-[420px] flex-col gap-4 rounded-3xl bg-surface p-6 shadow-modal">
        <div>
          <h2 id="no-goals-title" className="text-[20px] font-extrabold leading-tight text-ink">
            Set this week&apos;s goals
          </h2>
          <p className="mt-2 text-[14px] leading-snug text-body-text dark:text-ink/80">
            Your plan is built from your goals, your classes and what is due for revision. Without goals it still works, but it can only guess what you want from the week. Prepex can suggest a week that fits your timetable in a minute.
          </p>
        </div>
        <CoralButton
          data-testid="no-goals-set"
          onClick={() => {
            close();
            router.push("/goals");
          }}
        >
          Set my goals
        </CoralButton>
        <GhostButton data-testid="no-goals-later" onClick={close}>
          Not now
        </GhostButton>
      </div>
    </div>
  );
}

/** The quiet reminder on Home for as long as the week has no goals. It cannot be dismissed: setting goals is what removes it. */
export function NoGoalsBanner() {
  const has = useHasGoals();
  if (has !== false) return null;
  return (
    <Link href="/goals" data-testid="no-goals-banner" className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border border-dashed border-brand/30 bg-surface px-4 py-3 hover:bg-tint-strong">
      <span className="text-[14px] font-bold text-ink">Set your weekly goals for a smarter plan</span>
      <span className="shrink-0 text-[13px] font-semibold text-ink underline">Set goals</span>
    </Link>
  );
}
