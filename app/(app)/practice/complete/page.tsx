"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
} from "@/components/ui/icons";
import { LayersIcon, ClockIcon, VectorIcon, VectorIcons } from "@/assets/icons";
import {
  getPracticeSession,
  type PracticeSessionDetail,
  type PracticeTopicAnalysis,
} from "@/lib/api/practice";

type Mastery = "mastered" | "on-track" | "needs-work" | "critical";

const MASTERY_STYLES: Record<
  Mastery,
  { badge: string; pct: string; row: string }
> = {
  mastered: {
    badge: "bg-[rgba(67,176,144,0.1)] text-[#28B485]",
    pct: "text-[#28B485]",
    row: "border-[rgba(0,0,0,0)] bg-[#FFFFFF] dark:border-[var(--border-card,#FAF7F214)] dark:bg-surface",
  },
  "on-track": {
    badge: "bg-[#E7F9F3] text-[#28B485]",
    pct: "text-ink",
    row: "border-[rgba(0,0,0,0)] bg-[#FFFFFF] dark:border-[var(--border-card,#FAF7F214)] dark:bg-surface",
  },
  "needs-work": {
    badge: "bg-[rgba(245,158,11,0.1)] text-[#FFAE1A]",
    pct: "text-ink",
    row: "border-[rgba(0,0,0,0)] bg-[#FFFFFF] dark:border-[var(--border-card,#FAF7F214)] dark:bg-surface",
  },
  critical: {
    badge: "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]",
    pct: "text-[#F59E0B]",
    row: "border-[rgba(255,127,92,0.2)] bg-[rgba(245,158,11,0.05)] dark:border-[var(--border-divider,#FAF7F20F)] dark:bg-surface",
  },
};

function masteryOf(t: PracticeTopicAnalysis): Mastery {
  const pct = t.totalQuestions > 0 ? (t.correctQuestions / t.totalQuestions) * 100 : 0;
  if (t.weaknessDetected || pct < 40) return "critical";
  if (pct < 65) return "needs-work";
  if (pct < 100) return "on-track";
  return "mastered";
}

export default function PracticeCompletePage() {
  return (
    <Suspense fallback={<PageLoader label="Loading your results…" />}>
      <PracticeCompleteContent />
    </Suspense>
  );
}

function PracticeCompleteContent() {
  const { resolvedTheme } = useTheme();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [session, setSession] = useState<PracticeSessionDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const error = fetchError ?? (sessionId ? null : "No session specified.");

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    getPracticeSession(sessionId)
      .then((res) => !cancelled && setSession(res.data))
      .catch(
        (err) =>
          !cancelled &&
          setFetchError(err instanceof Error ? err.message : "Could not load your results."),
      );
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const correct = session?.correctQuestions ?? 0;
  const total = session?.totalQuestions ?? 0;
  const wrong = session?.wrongQuestions ?? 0;
  const attempted = session?.attemptedQuestions ?? 0;
  const elapsedSeconds = session?.durationSeconds ?? 0;
  const minutes = Math.max(1, Math.round(elapsedSeconds / 60));
  const avgPerQuestion = attempted > 0 ? (elapsedSeconds / 60 / attempted).toFixed(1) : "0";
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  const topics = session?.topicAnalysis ?? [];
  const primaryTopic = useMemo(() => {
    if (!session) return "Practice";
    const counts = new Map<string, number>();
    for (const q of session.questions) {
      const t = q.question?.topic;
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    let best = "Practice";
    let bestN = 0;
    for (const [t, n] of counts) if (n > bestN) [best, bestN] = [t, n];
    return best;
  }, [session]);
  const weakTopic = useMemo(() => {
    const ranked = [...topics].sort((a, b) => {
      const pa = a.totalQuestions ? a.correctQuestions / a.totalQuestions : 1;
      const pb = b.totalQuestions ? b.correctQuestions / b.totalQuestions : 1;
      return pa - pb;
    });
    const first = ranked[0];
    if (!first) return null;
    const pct = first.totalQuestions ? first.correctQuestions / first.totalQuestions : 1;
    return first.weaknessDetected || pct < 0.65 ? first : null;
  }, [topics]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-h2 text-ink">Results unavailable</p>
        <p className="max-w-md text-sm text-muted">{error}</p>
        <Button href="/plan" variant="secondary" size="sm">
          Back to plan
        </Button>
      </div>
    );
  }

  if (!session) return <PageLoader label="Loading your results…" />;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <h1 className="min-w-0 flex-1 text-h1 text-ink">Practice Complete</h1>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Score card */}
        <div className="flex w-full flex-col gap-6 rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-icon-chip-bg p-2.5 text-ink dark:bg-[#FAF7F2]/8 sm:h-[49px] sm:w-[49px] sm:p-3">
                <LayersIcon className="h-6 w-6 sm:h-[25px] sm:w-[25px]" />
              </span>

              <h2 className="min-w-0 text-[28px] font-extrabold leading-8 tracking-[-0.7px] text-ink sm:text-[34px] sm:leading-9 sm:tracking-[-0.8px] lg:text-[40px] lg:leading-10 lg:tracking-[-1px]">
                {correct} / {total} Correct
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[17px] font-bold leading-6 text-[#464650] dark:text-muted sm:text-[20px] sm:leading-7">
                {primaryTopic}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-[#777681] dark:text-muted sm:gap-3 sm:text-[15px]">
                <ClockIcon />

                <span>
                  Time: {minutes} min · Avg {avgPerQuestion} min/Q
                </span>
              </div>
            </div>
          </div>

          <div className="flex w-full justify-center lg:w-auto lg:justify-end">
            <CircularProgress
              percent={Math.max(percent, 2)}
              displayValue={percent}
              size={window.innerWidth < 640 ? 104 : 128}
              progressColor={resolvedTheme === "dark" ? "#ffffff" : "#1A1A4E"}
            />
          </div>
        </div>

        {/* Performance breakdown */}
        <div className="rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6">
          <div className="flex items-center justify-between border-b border-tint-strong pb-4 sm:pb-5">
            <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink sm:text-[13px] sm:tracking-[1.95px]">
              Performance Breakdown
            </p>

            <span className="shrink-0 rounded-2xl bg-[#EEF0F8] px-2.5 py-1 text-[10px] font-semibold uppercase text-ink dark:bg-[#EEF0F8] dark:text-[#1A1A4E] sm:px-3 sm:text-caption">
              Skill Analytics
            </span>
          </div>

          {topics.length === 0 ? (
            <p className="pt-5 text-sm text-muted sm:pt-6">
              No per-topic breakdown — not enough attempted questions.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5 pt-5 sm:gap-3 sm:pt-6">
              {topics.map((topic) => {
                const skillPercent =
                  topic.totalQuestions > 0
                    ? Math.round(
                      (topic.correctQuestions / topic.totalQuestions) * 100,
                    )
                    : 0;

                const m = masteryOf(topic);
                const style = MASTERY_STYLES[m];
                const isWarn = m === "needs-work" || m === "critical";

                return (
                  <div
                    key={topic.id}
                    className={`flex min-w-0 items-center justify-between gap-2 rounded-2xl border p-3 ${style.row} sm:gap-3 sm:p-5`}
                  >
                    <p className="min-w-0 truncate text-[15px] font-bold text-body-text dark:text-[#FAF7F2] sm:text-[18px]">
                      {topic.topic}
                    </p>

                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold sm:px-3 sm:text-[13px] ${style.badge}`}
                      >
                        {isWarn ? <AlertTriangleIcon /> : <CheckCircleIcon />}
                        {topic.correctQuestions}/{topic.totalQuestions}
                      </span>

                      <span
                        className={`w-9 text-right text-[13px] font-bold ${style.pct} dark:text-[#FAF7F2] sm:w-12 sm:text-[15px]`}
                      >
                        {skillPercent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Next focus / weakness */}
        <div className="rounded-2xl border border-brand/10 bg-surface p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9.6px] bg-[rgba(245,158,11,0.1)] p-2 text-[#F59E0B] sm:h-[32.67px] sm:w-[32.67px] sm:rounded-[9.6px] sm:p-2">
              <VectorIcons className="h-[16.67px] w-[16.67px]" />
            </span>
            <p className="text-caption font-extrabold uppercase tracking-[1.2px] text-[#F59E0B]">
              {weakTopic ? "Weakness Detected" : "Next Focus"}
            </p>
          </div>

          <h3 className="mt-3 text-[18px] font-bold text-body-text">
            {weakTopic ? `${weakTopic.topic} needs work` : "Solid session — keep the streak"}
          </h3>

          <p className="mt-2 text-[15px] leading-6 text-muted">
            {wrong > 0
              ? `${wrong} question${wrong === 1 ? "" : "s"} added to your Mistake Notebook. Tomorrow's plan is updated.`
              : "No wrong answers — nothing added to your Mistake Notebook."}
          </p>
        </div>

        {/* Deep-dive actions */}
        <div className="flex flex-col gap-5">
          <Button
            href={`/practice/analysis?sessionId=${sessionId}`}
            className="h-14 w-full whitespace-nowrap rounded-xl bg-cta px-3 text-[13px] font-bold leading-[1] text-white hover:bg-cta sm:h-[72px] sm:rounded-2xl sm:px-4 sm:text-[18px]"
          >
            View Question by Question Analysis
          </Button>
          <Button
            href={`/practice/analysis?sessionId=${sessionId}&solutions=1`}
            variant="secondary"
            className="h-14 w-full whitespace-nowrap rounded-xl bg-transparent px-3 text-[13px] font-bold leading-[1] text-ink hover:bg-tint-strong dark:border-[var(--text-primary,#FAF7F2)] sm:h-[72px] sm:rounded-2xl sm:px-4 sm:text-[18px]"
          >
            View Solutions
          </Button>

          <Button
            href="/home/mistake-notebook"
            variant="secondary"
            className="h-14 w-full whitespace-nowrap rounded-xl bg-transparent px-3 text-[13px] font-bold leading-[1] text-ink hover:bg-tint-strong dark:border-[var(--text-primary,#FAF7F2)] sm:h-[72px] sm:rounded-2xl sm:px-4 sm:text-[18px]"
          >
            Open Mistake Notebook
          </Button>
        </div>
      </div>
    </div>
  );
}
