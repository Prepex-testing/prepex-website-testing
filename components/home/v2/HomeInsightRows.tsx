"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { getCurrentGoals, type CurrentGoals } from "@/lib/api/goals";
import { getTop5WeakTopics, type WeakTopicSummary } from "@/lib/api/weakness";

/**
 * 5. Where to focus next.
 * TODO(planner-v2): owner = "Where to focus next" window. They are building the AI one-liner that reads all of a
 * student's Prepex data. Until their public component lands this shows the top weak topic from the existing weakness
 * API; swap this whole file's FocusNextCard for their component and delete the fetch here.
 */
export function FocusNextCard() {
  const [topic, setTopic] = useState<WeakTopicSummary | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    getTop5WeakTopics().then(
      (res) => live && setTopic(res.topics[0] ?? null),
      () => live && setTopic(null),
    );
    return () => {
      live = false;
    };
  }, []);

  if (topic === null) return null;
  if (topic === undefined) return <div className="h-20 animate-pulse rounded-2xl bg-tint-strong dark:bg-[#FAF7F214]" aria-hidden data-testid="focus-next-loading" />;

  const accuracy = topic.practiceAccuracy == null ? null : Math.round(Number(topic.practiceAccuracy));
  const subject = topic.chapter?.subject?.name;
  return (
    <Link
      href="/home/focus-next"
      data-testid="focus-next-card"
      className="flex min-h-20 items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-4 transition-colors hover:border-brand/30"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF5F3] text-cta dark:bg-[#FAF7F214]">
        <Target className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold text-muted">Where to focus next</span>
        <span className="block text-[15px] font-bold leading-snug text-ink">
          {topic.chapter?.name ?? "Your weakest topic"}
          {subject ? <span className="font-medium text-muted"> · {subject}</span> : null}
        </span>
        {accuracy !== null && <span className="block text-[12px] text-muted">{accuracy}% accuracy so far</span>}
      </span>
      <ArrowRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

/** 6. Weekly progress: how much of this week's goals is done, and the way to the goals screen. */
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

  if (goals === undefined) return <div className="h-20 animate-pulse rounded-2xl bg-tint-strong dark:bg-[#FAF7F214]" aria-hidden data-testid="weekly-loading" />;

  const live = (goals?.goals ?? []).filter((g) => g.status !== "ABANDONED" && g.status !== "CARRIED_OVER");
  if (!goals || live.length === 0) {
    return (
      <Link href="/goals" data-testid="weekly-progress" data-state="empty" className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-dashed border-brand/30 bg-surface p-4 hover:bg-tint-strong">
        <span className="min-w-0">
          <span className="block text-[15px] font-bold text-ink">Set this week&apos;s goals</span>
          <span className="block text-[12px] text-muted">Goals are what Prepex builds your daily plan from.</span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted" aria-hidden />
      </Link>
    );
  }
  const percent = goals.summary.percent;
  return (
    <section aria-label="Weekly progress" data-testid="weekly-progress" data-state="goals" className="flex flex-col gap-2.5 rounded-2xl border border-brand/10 bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold text-ink">This week&apos;s goals</h2>
        <span className="text-[13px] font-bold text-ink" data-testid="weekly-percent">
          {percent}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-tint-strong dark:bg-[#FAF7F214]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Weekly goal progress">
        <div className="h-full rounded-full bg-cta transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-muted">
          {goals.summary.done} of {goals.summary.total} done · {goals.daysLeft <= 0 ? "last day" : `${goals.daysLeft} ${goals.daysLeft === 1 ? "day" : "days"} left`}
        </p>
        <Link href="/goals" className="flex min-h-11 items-center gap-1 text-[13px] font-bold text-ink underline-offset-2 hover:underline">
          View weekly goals <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
