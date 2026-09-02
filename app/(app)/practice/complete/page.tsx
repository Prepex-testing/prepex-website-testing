"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import {
  AlertTriangleIcon,
  BellIcon,
  CheckCircleIcon,
} from "@/components/ui/icons";
import { LayersIcon, ClockIcon, VectorIcon } from "@/assets/icons";
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
    row: "border-transparent bg-surface",
  },
  "on-track": {
    badge: "bg-[#E7F9F3] text-[#28B485]",
    pct: "text-ink",
    row: "border-transparent bg-surface",
  },
  "needs-work": {
    badge: "bg-[rgba(245,158,11,0.1)] text-[#FFAE1A]",
    pct: "text-ink",
    row: "border-transparent bg-surface",
  },
  critical: {
    badge: "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]",
    pct: "text-[#F59E0B]",
    row: "border-[rgba(255,127,92,0.2)] bg-[rgba(245,158,11,0.05)]",
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
    <Suspense fallback={null}>
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

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Practice Complete</h1>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      {!session ? (
        <p className="text-sm text-muted">Loading your results…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Score card */}
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-brand/10 bg-surface p-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
                  <LayersIcon />
                </span>
                <h2 className="whitespace-nowrap text-[40px] font-extrabold leading-10 tracking-[-1px] text-ink">
                  {correct} / {total} Correct
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-[20px] font-bold leading-7 text-muted">{primaryTopic}</p>
                <div className="flex items-center gap-3 text-[15px] font-medium text-muted">
                  <ClockIcon />
                  <span>
                    Time: {minutes} min · Avg {avgPerQuestion} min/Q
                  </span>
                </div>
              </div>
            </div>

            <CircularProgress
              percent={Math.max(percent, 2)}
              displayValue={percent}
              size={128}
              progressColor={resolvedTheme === "dark" ? "#ffffff" : "#1A1A4E"}
            />
          </div>

          {/* Performance breakdown */}
          <div className="rounded-2xl border border-brand/10 bg-surface p-6">
            <div className="flex items-center justify-between border-b border-tint-strong pb-5">
              <p className="text-[13px] font-bold uppercase tracking-[1.95px] text-ink">
                Performance Breakdown
              </p>
              <span className="rounded-2xl bg-tint px-3 py-1 text-caption font-semibold uppercase text-ink dark:bg-white dark:text-[#1A1A4E]">
                Skill Analytics
              </span>
            </div>

            {topics.length === 0 ? (
              <p className="pt-6 text-sm text-muted">
                No per-topic breakdown — not enough attempted questions.
              </p>
            ) : (
              <div className="flex flex-col gap-3 pt-6">
                {topics.map((topic) => {
                  const skillPercent =
                    topic.totalQuestions > 0
                      ? Math.round((topic.correctQuestions / topic.totalQuestions) * 100)
                      : 0;
                  const m = masteryOf(topic);
                  const style = MASTERY_STYLES[m];
                  const isWarn = m === "needs-work" || m === "critical";
                  return (
                    <div
                      key={topic.id}
                      className={`flex items-center justify-between rounded-2xl border p-5 ${style.row}`}
                    >
                      <p className="text-[18px] font-bold text-body-text">{topic.topic}</p>
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-bold ${style.badge}`}
                        >
                          {isWarn ? <AlertTriangleIcon /> : <CheckCircleIcon />}
                          {topic.correctQuestions}/{topic.totalQuestions}
                        </span>
                        <span className={`w-12 text-right text-[15px] font-bold ${style.pct}`}>
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
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(245,158,11,0.1)] text-[#F59E0B]">
                <VectorIcon className="h-5 w-5" />
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
              className="h-17 rounded-2xl bg-cta text-[18px] font-bold text-white hover:bg-cta"
            >
              View Question by Question Analysis
            </Button>
            <Button
              href={`/practice/analysis?sessionId=${sessionId}&solutions=1`}
              variant="secondary"
              className="h-18 rounded-2xl border-2 border-ink bg-transparent text-[18px] font-bold text-ink hover:bg-tint-strong"
            >
              View Solutions
            </Button>
            <Button
              href="/home/mistake-notebook"
              variant="secondary"
              className="h-16 rounded-2xl border border-brand/20 bg-transparent text-[16px] font-bold text-ink hover:bg-tint-strong"
            >
              Open Mistake Notebook
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
