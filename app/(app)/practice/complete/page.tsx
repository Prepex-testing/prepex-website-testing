"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { BellIcon, CheckCircleIcon, AlertTriangleIcon } from "@/components/ui/icons";
import { LayersIcon, ClockIcon, VectorIcon } from "@/assets/icons";
import {
  getPracticeSession,
  type PracticeSessionDetail,
  type PracticeTopicAnalysis,
} from "@/lib/api/practice";

type Mastery = "mastered" | "on-track" | "needs-work" | "critical";

const MASTERY_STYLES: Record<
  Mastery,
  { badgeBg: string; badgeText: string; percentText: string; rowClass: string }
> = {
  mastered: {
    badgeBg: "bg-[rgba(67,176,144,0.1)]",
    badgeText: "text-[#28B485]",
    percentText: "text-[#28B485]",
    rowClass: "bg-surface border-transparent",
  },
  "on-track": {
    badgeBg: "bg-[#E7F9F3]",
    badgeText: "text-[#28B485]",
    percentText: "text-ink",
    rowClass: "bg-surface border-transparent",
  },
  "needs-work": {
    badgeBg: "bg-[rgba(245,158,11,0.1)]",
    badgeText: "text-[#FFAE1A]",
    percentText: "text-ink",
    rowClass: "bg-surface border-transparent",
  },
  critical: {
    badgeBg: "bg-[rgba(245,158,11,0.1)]",
    badgeText: "text-[#F59E0B]",
    percentText: "text-[#F59E0B]",
    rowClass: "bg-[rgba(245,158,11,0.05)] border-[rgba(255,127,92,0.2)]",
  },
};

function masteryOf(topic: PracticeTopicAnalysis): Mastery {
  const pct =
    topic.totalQuestions > 0 ? (topic.correctQuestions / topic.totalQuestions) * 100 : 0;
  if (topic.weaknessDetected || pct < 40) return "critical";
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
  const chapterLabel =
    session?.questions.find((q) => q.question)?.question?.topic ?? "Practice";
  const weakTopic = topics.find((t) => masteryOf(t) === "critical" || t.weaknessDetected);

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
                <h2 className="text-[40px] font-extrabold leading-10 tracking-[-1px] text-ink whitespace-nowrap">
                  {correct} / {total} Correct
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-[20px] font-bold leading-7 text-muted">{chapterLabel}</p>
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
                  const mastery = masteryOf(topic);
                  const style = MASTERY_STYLES[mastery];
                  const isWarning = mastery === "needs-work" || mastery === "critical";

                  return (
                    <div
                      key={topic.id}
                      className={`flex items-center justify-between rounded-2xl border p-5 ${style.rowClass}`}
                    >
                      <p className="text-[18px] font-bold text-body-text">{topic.topic}</p>
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-bold ${style.badgeBg} ${style.badgeText}`}
                        >
                          {isWarning ? <AlertTriangleIcon /> : <CheckCircleIcon />}
                          {topic.correctQuestions}/{topic.totalQuestions}
                        </span>
                        <span
                          className={`w-12 text-right text-[15px] font-bold ${style.percentText}`}
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

          {/* Weakness + mistake notebook (PRD 5.5.1) */}
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

          {/* Actions */}
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
          </div>
        </div>
      )}
    </div>
  );
}
