"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";
import { ClockIcon, TargetIcon } from "@/components/ui/icons";
import { PageLoader } from "@/components/ui/PageLoader";
import { getTop5WeakTopics, type WeakTopicSummary } from "@/lib/api/weakness";

type FocusItem = {
  chapterId: string;
  subjectLabel: string;
  title: string;
  accuracy: number | null;
  /** Percentage points vs the previous week; null when there's nothing to compare. */
  accuracyChange: number | null;
  score: number;
  tierLabel: string;
  highlight: boolean;
};

function toFocusItem(topic: WeakTopicSummary, index: number): FocusItem {
  const subject = topic.chapter?.subject;
  const rawAccuracy = topic.practiceAccuracy;

  return {
    chapterId: topic.chapterId,
    subjectLabel: (subject?.code?.[0] ?? subject?.name?.[0] ?? "?").toUpperCase(),
    title: topic.chapter?.name ?? "Unknown topic",
    accuracy: rawAccuracy == null ? null : Math.round(Number(rawAccuracy)),
    accuracyChange: topic.accuracyChangeThisWeek ?? null,
    score: Math.round(Number(topic.weaknessScore)),
    tierLabel: topic.tierLabel,
    highlight: index === 0,
  };
}

export default function FocusNextPage() {
  const router = useRouter();
  const [items, setItems] = useState<FocusItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getTop5WeakTopics()
      .then(({ topics }) => {
        if (!cancelled) setItems(topics.map(toFocusItem));
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your weak topics. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const openTopic = (chapterId: string) => {
    router.push(`/home/focus-topic?chapterId=${chapterId}`);
  };

  if (isLoading) return <PageLoader label="Loading focus topics…" />;

  return (
    <div className="flex min-h-screen flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink">Where to focus next</h1>
          <p className="text-sm text-muted">Fixing these gains you the most marks.</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {error ? (
        <p className="py-8 text-center text-sm text-warning">{error}</p>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-brand/10 bg-surface p-10 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tint text-ink">
                  <ClockIcon className="h-6 w-6" />
                </span>
                <p className="text-lg font-bold text-ink">No weak topics detected.</p>
                <p className="text-sm text-muted">Keep practising and check back after a few sessions.</p>
              </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <button
                key={item.chapterId}
                type="button"
                onClick={() => openTopic(item.chapterId)}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-surface p-5 text-left transition-colors hover:border-brand/30 ${
                  item.highlight ? "border-cta/40" : "border-brand/10"
                }`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand/15 bg-tint text-sm font-bold text-ink">
                    {item.subjectLabel}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-ink">{item.title}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                      {item.tierLabel} · score {item.score}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-extrabold leading-none text-ink">
                      {item.accuracy == null ? "—" : `${item.accuracy}%`}
                    </span>
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                      Accuracy
                    </span>
                    {item.accuracyChange != null && (
                      <span
                        className={`mt-1 text-[11px] font-semibold ${
                          item.accuracyChange > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : item.accuracyChange < 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted"
                        }`}
                      >
                        {item.accuracyChange > 0 ? "↑ +" : item.accuracyChange < 0 ? "↓ " : ""}
                        {item.accuracyChange}% this week
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <p className="flex items-center justify-center gap-2 text-sm text-muted">
            <TargetIcon />
            Tap any for targeted practice
          </p>
        </>
      )}
    </div>
  );
}
