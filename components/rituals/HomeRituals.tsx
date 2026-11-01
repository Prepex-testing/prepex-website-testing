"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClassCoverageCard } from "@/components/rituals/ClassCoverageCard";
import { DayCloseFlow } from "@/components/rituals/DayCloseFlow";
import { WelcomeBack } from "@/components/home/WelcomeBack";
import { CountUp } from "@/components/study/CountUp";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { dismissDayClose, getDayClose, getSundayReview, type DayCloseState, type SundayReviewState } from "@/lib/api/rituals";
import type { RewardsSummary } from "@/lib/api/xp";
import { summaryLine } from "@/lib/rituals/dayClose";

/** Lifetime counters: questions, hours, chapters completed. Real numbers from the logs; nothing renders until they load. */
export function LifetimeCounters({ lifetime }: { lifetime: RewardsSummary["lifetime"] | null }) {
  if (!lifetime) return null;
  const tiles = [
    { id: "questions", label: "Questions solved", value: lifetime.questions, format: (n: number) => n.toLocaleString("en-IN") },
    { id: "hours", label: "Hours studied", value: lifetime.hours, format: (n: number) => `${n}h` },
    { id: "chapters", label: "Chapters completed", value: lifetime.chaptersCompleted, format: (n: number) => String(n) },
  ];
  return (
    <section aria-label="Lifetime" className="grid grid-cols-3 gap-3" data-testid="lifetime-counters">
      {tiles.map((t) => (
        <div key={t.id} className="rounded-2xl border border-border-subtle bg-surface-elevated p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t.label}</p>
          <p className="mt-1 text-[22px] font-extrabold leading-none text-ink">
            <CountUp value={t.value} format={t.format} testId={`lifetime-${t.id}`} />
          </p>
        </div>
      ))}
    </section>
  );
}

/**
 * What the evening and the week add to Home: the Day Close card as the top card once its time has come (until done or
 * dismissed), the Sunday Review banner, class prompts that are still unanswered, and the lifetime counters.
 */
export function HomeRituals() {
  const [day, setDay] = useState<DayCloseState | null>(null);
  const [review, setReview] = useState<SundayReviewState | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    void getDayClose().then(setDay).catch(() => undefined);
    void getSundayReview().then(setReview).catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const dayReady = day?.status === "ready";
  return (
    <div className="flex flex-col gap-4" data-testid="home-rituals">
      <WelcomeBack onDone={() => window.location.reload()} />
      {dayReady && day && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-elevated-2 p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="day-close-card">
          <div className="min-w-0">
            <h2 className="text-[18px] font-extrabold text-ink">Close your day</h2>
            <p className="text-[13px] text-muted" data-testid="day-close-summary">{summaryLine(day.summary)}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <GhostButton data-testid="day-close-dismiss" onClick={() => void dismissDayClose().then(() => setDay({ ...day, status: "dismissed" })).catch(() => undefined)}>
              Not now
            </GhostButton>
            <CoralButton data-testid="day-close-open" onClick={() => setOpen(true)}>
              Close your day
            </CoralButton>
          </div>
        </section>
      )}
      {day && open && <DayCloseFlow state={day} open={open} onClose={() => setOpen(false)} onDone={load} />}

      {review?.status === "ready" && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-elevated p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="sunday-banner">
          <div>
            <h2 className="text-[18px] font-extrabold text-ink">Your week in review</h2>
            <p className="text-[13px] text-muted">Recap, this week&apos;s coaching test and next week&apos;s goals. 50 XP.</p>
          </div>
          <Link href="/home/review" data-testid="sunday-open" className={dayReady ? "inline-flex min-h-12 items-center justify-center rounded-[10px] border-[1.5px] border-secondary-button-border bg-surface px-6 text-[15px] font-semibold text-body-text dark:text-ink" : "inline-flex min-h-12 items-center justify-center rounded-[10px] bg-brand-coral px-6 text-[15px] font-semibold text-white"}>
            Start the review
          </Link>
        </section>
      )}

      {!dayReady && <ClassCoverageCard />}
    </div>
  );
}
