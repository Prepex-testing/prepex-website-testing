"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { ClockIcon, BookmarkIcon, DoubleArrowIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { PageLoader } from "@/components/ui/PageLoader";
import { getTodayPlan } from "@/lib/api/planner";
import {
  completePracticeSession,
  getSessionQuestions,
  getTaskQuestions,
  optionEntries,
  prettyDifficulty,
  submitPracticeAnswer,
  type PracticeSessionQuestion,
  type TaskQuestionsResponse,
} from "@/lib/api/practice";
import { BellIcon } from "@/assets/icons";

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function PracticeModePage() {
  return (
    <Suspense fallback={<PageLoader label="Loading practice…" />}>
      <PracticeModeContent />
    </Suspense>
  );
}

function CenteredMessage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-h2 text-ink">{title}</p>
      {children}
    </div>
  );
}

function PracticeModeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get("taskId");
  const sessionIdParam = searchParams.get("sessionId");

  const [data, setData] = useState<TaskQuestionsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Remaining question queue (front = current). Each question is shown once —
  // answering or skipping removes it for good; the session ends when it drains.
  const [queue, setQueue] = useState<PracticeSessionQuestion[]>([]);
  const [lockedCount, setLockedCount] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  // Where an intercepted nav click / back-button was headed. null = the
  // header "End Session" button, which just goes to the analysis or list.
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const questionStartRef = useRef<number>(0);
  // Once End/Exit is chosen the nav interceptors stand down.
  const resolvedRef = useRef(false);

  // ---- load ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let res: Awaited<ReturnType<typeof getTaskQuestions>>;
        if (sessionIdParam) {
          // Resume / play an existing session (e.g. a Mistake Review that has
          // no plan task behind it).
          try {
            res = await getSessionQuestions(sessionIdParam);
          } catch {
            if (!cancelled) setLoadError("No practice questions available for this topic.");
            return;
          }
        } else {
          let taskId = taskIdParam;
          if (!taskId) {
            const plan = await getTodayPlan();
            const practiceTasks =
              plan.data.plan?.tasks?.filter((t) => t.taskType === "PRACTICE") ?? [];
            const practice =
              practiceTasks.find((t) => t.status !== "COMPLETED" && t.status !== "SKIPPED") ??
              practiceTasks[0];
            if (!practice) {
              // Nothing to practise from here — send them to the sessions list
              // rather than a dead-end error screen.
              if (!cancelled) router.replace("/practice/sessions");
              return;
            }
            taskId = practice.id;
          }
          try {
            // A 404 / error here means the question bank has nothing for this
            // task's chapter/topic.
            res = await getTaskQuestions(taskId);
          } catch {
            if (!cancelled) setLoadError("No practice questions available for this topic.");
            return;
          }
        }
        if (cancelled) return;

        // Session already finished (student completed it earlier, or every
        // question was answered/skipped) — never show an error, just take them
        // to the analysis.
        if (res.data.status === "COMPLETED") {
          router.replace(`/practice/complete?sessionId=${res.data.sessionId}`);
          return;
        }

        const withQuestion = res.data.questions.filter((q) => q.question !== null);
        if (withQuestion.length === 0) {
          setLoadError("No practice questions available for this topic.");
          return;
        }

        const answeredCount = res.data.questions.filter(
          (q) => q.result === "CORRECT" || q.result === "WRONG",
        ).length;
        // Only queue questions not already answered in a prior visit — each is
        // played exactly once per session.
        const playable = withQuestion.filter(
          (q) => q.result !== "CORRECT" && q.result !== "WRONG",
        );
        if (playable.length === 0) {
          // In-progress session but nothing left to play — finalize and go
          // straight to the analysis instead of surfacing an error.
          await completePracticeSession(res.data.sessionId).catch(() => { });
          router.replace(`/practice/complete?sessionId=${res.data.sessionId}`);
          return;
        }
        setData(res.data);
        setQueue(playable);
        setLockedCount(answeredCount);
        questionStartRef.current = Date.now();
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Could not load practice questions.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [taskIdParam, sessionIdParam, router]);

  // ---- continuous timer (PRD 121) --------------------------------------------
  useEffect(() => {
    if (!data) return;
    const timer = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [data]);

  // ---- leave-guard: intercept nav clicks + browser back while a session is
  // live, and route them through the End / Exit / Continue popup (mirrors the
  // revision session).
  useEffect(() => {
    if (!data) return;

    const handleClick = (event: MouseEvent) => {
      if (resolvedRef.current) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      const href = anchor?.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      // Staying inside the running session is fine.
      if (href === "/practice" || href.startsWith("/practice?")) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
      setConfirmEndOpen(true);
    };

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      if (resolvedRef.current) return;
      window.history.pushState(null, "", window.location.href);
      setPendingHref("/practice/sessions");
      setConfirmEndOpen(true);
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [data]);

  const total = data?.totalQuestions ?? queue.length;
  const current = queue[0];
  const currentQ = current?.question ?? null;

  const options = useMemo(() => optionEntries(currentQ?.options), [currentQ]);
  const breadcrumb = useMemo(() => {
    if (!data) return [];
    const chapter = data.taskTitle.replace(/\s*\(practice\)\s*$/i, "").trim();
    return [chapter, currentQ?.topic].filter(Boolean) as string[];
  }, [data, currentQ]);

  const finish = useCallback(async () => {
    if (!data || finishing) return;
    resolvedRef.current = true;
    setFinishing(true);
    try {
      await completePracticeSession(data.sessionId);
    } catch {
      // Non-fatal — the analysis screen will surface the real state.
    }
    router.push(`/practice/complete?sessionId=${data.sessionId}`);
  }, [data, finishing, router]);

  // Leave without completing — the session stays IN_PROGRESS and can be
  // resumed later. Answers already submitted are kept.
  const handleExitSession = useCallback(() => {
    resolvedRef.current = true;
    setExiting(true);
    setConfirmEndOpen(false);
    router.push(pendingHref ?? "/practice/sessions");
  }, [pendingHref, router]);

  const handleContinueSession = useCallback(() => {
    setConfirmEndOpen(false);
    setPendingHref(null);
  }, []);

  const advanceQueue = useCallback(
    (nextQueue: PracticeSessionQuestion[]) => {
      setSelectedKey(null);
      questionStartRef.current = Date.now();
      if (nextQueue.length === 0) {
        void finish();
      }
    },
    [finish],
  );

  const handleSubmit = useCallback(async () => {
    if (!data || !current || selectedKey === null || submitting) return;
    setSubmitting(true);
    const timeTakenSeconds = Math.max(1, Math.round((Date.now() - questionStartRef.current) / 1000));
    try {
      await submitPracticeAnswer(data.sessionId, {
        questionId: current.questionId,
        studentAnswer: selectedKey,
        timeTakenSeconds,
        markedForReview: markedIds.has(current.practiceSessionQuestionId),
      });
    } catch (err) {
      setSubmitting(false);
      setLoadError(err instanceof Error ? err.message : "Could not save your answer.");
      return;
    }
    setSubmitting(false);
    setLockedCount((c) => c + 1);
    setQueue((q) => {
      const next = q.slice(1);
      advanceQueue(next);
      return next;
    });
  }, [data, current, selectedKey, submitting, markedIds, advanceQueue]);

  // Skip records the question as SKIPPED and drops it from the session — it is
  // never shown again, and the session ends once the queue drains.
  const handleSkip = useCallback(async () => {
    if (!data || !current || submitting || finishing) return;
    setSubmitting(true);
    const timeTakenSeconds = Math.max(1, Math.round((Date.now() - questionStartRef.current) / 1000));
    try {
      await submitPracticeAnswer(data.sessionId, {
        questionId: current.questionId,
        timeTakenSeconds,
        markedForReview: markedIds.has(current.practiceSessionQuestionId),
        skipped: true,
      });
    } catch (err) {
      setSubmitting(false);
      setLoadError(err instanceof Error ? err.message : "Could not skip this question.");
      return;
    }
    setSubmitting(false);
    setLockedCount((c) => c + 1);
    setQueue((q) => {
      const next = q.slice(1);
      advanceQueue(next);
      return next;
    });
  }, [data, current, submitting, finishing, markedIds, advanceQueue]);

  // PRD 123 — Mark for review flags the question without skipping.
  const handleToggleMark = useCallback(() => {
    if (!current) return;
    setMarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(current.practiceSessionQuestionId)) next.delete(current.practiceSessionQuestionId);
      else next.add(current.practiceSessionQuestionId);
      return next;
    });
  }, [current]);

  // ---- render -----------------------------------------------------------------
  if (loadError) {
    return (
      <CenteredMessage title="Practice unavailable">
        <p className="max-w-md text-sm text-muted">{loadError}</p>
        <Button variant="secondary" size="sm" onClick={() => router.push("/practice/sessions")}>
          Back to practice sessions
        </Button>
      </CenteredMessage>
    );
  }
  if (!data || !current || !currentQ) {
    return <PageLoader label="Loading practice…" />;
  }

  const isMarked = markedIds.has(current.practiceSessionQuestionId);
  const isLast = queue.length === 1;
  const questionNumber = Math.min(lockedCount + 1, total);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Practice Mode</h1>
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

      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        {/* Question Info */}
        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-start sm:gap-3">
          <p className="whitespace-nowrap text-[16px] font-bold leading-6 text-ink sm:text-[20px] sm:leading-7">
            Question {questionNumber} of {total}
          </p>

          <span className="flex h-4 items-center rounded-sm bg-subject-bg px-2 text-[11px] font-semibold uppercase leading-4 tracking-[0.6px] text-ink sm:text-[12px]">
            {prettyDifficulty(currentQ.difficulty)}
          </span>

          {isMarked && (
            <span className="flex h-4 items-center rounded-sm bg-tint-strong px-2 text-[10px] font-semibold uppercase leading-4 tracking-[0.6px] text-ink sm:text-[11px]">
              Marked
            </span>
          )}
        </div>

        {/* Session Info */}
        <div className="flex w-full items-center justify-center gap-5 sm:w-auto sm:justify-end sm:gap-8">
          <div className="flex items-center gap-2">
            <ClockIcon />

            <span className="whitespace-nowrap text-[14px] font-semibold leading-6 text-ink sm:text-[18px] sm:leading-7">
              {formatTime(elapsed)} elapsed
            </span>
          </div>

          <button
            type="button"
            onClick={() => setConfirmEndOpen(true)}
            className="whitespace-nowrap text-[12px] font-bold uppercase leading-5 tracking-[1.2px] text-muted transition-colors hover:text-ink sm:text-[14px] sm:tracking-[1.4px]"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Progress dots (PRD 5.4.1) */}
      <div className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-start sm:gap-x-[15px]">
        {Array.from({ length: total }).map((_, index) => {
          const isDone = index < lockedCount;
          const isActive = index === lockedCount;

          return (
            <span
              key={index}
              className={`h-2 w-2 shrink-0 rounded-full transition-colors duration-200 ${isDone || isActive
                ? "bg-question-dot-active"
                : "bg-question-dot-inactive"
                }`}
            />
          );
        })}
      </div>

      {/* Breadcrumb */}
      <div className="flex min-h-8 w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-start sm:gap-4">
        {breadcrumb.map((item, index) => (
          <React.Fragment key={`${item}-${index}`}>
            {index === 0 ? (
              <span className="flex min-h-8 max-w-full shrink-0 items-center rounded-lg bg-subject-bg px-3 py-1 text-[12px] font-semibold leading-5 text-subject-text sm:px-4 sm:text-[14px]">
                {item}
              </span>
            ) : (
              <>
                <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-muted" />
                <span className="text-[12px] font-semibold leading-5 text-ink sm:text-[14px]">
                  {item}
                </span>
              </>
            )}
          </React.Fragment>
        ))}
      </div>

      <h2 className="text-[16px] font-medium leading-[1.4] tracking-normal text-ink sm:text-[20px] sm:leading-[1.3] lg:text-[24px] lg:leading-[1.25]">
        {currentQ.questionText}
      </h2>

      {currentQ.questionImageUrl && (
        // PRD 126 — question images load progressively on slow connections.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentQ.questionImageUrl}
          alt="Question figure"
          loading="lazy"
          className="max-h-[320px] w-auto rounded-xl border border-brand/10 object-contain"
        />
      )}

      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
        {options.map(([key, value]) => {
          const isSelected = selectedKey === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedKey(key)}
              aria-pressed={isSelected}
              className={`flex min-h-[98px] w-full items-center rounded-xl border p-6 text-left shadow-[0px_1px_2px_#0000000D] transition-all duration-200 dark:shadow-none ${isSelected
                ? "border-brand bg-tint-strong"
                : "border-[#F3F4F6] bg-white dark:border-[#FAF7F214] dark:bg-transparent"
                }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${isSelected
                  ? "bg-brand text-background dark:bg-white dark:text-[#1A1A4E]"
                  : "bg-tint text-ink"
                  }`}
              >
                <span className="text-[18px] font-bold leading-7">
                  {key}
                </span>
              </div>

              <span
                className="ml-6 text-[24px] font-medium italic leading-8 tracking-[0px] text-ink"
                style={{ fontFamily: "Liberation Serif, serif" }}
              >
                {value}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex w-full flex-col items-center justify-between gap-6 rounded-2xl border border-brand/10 bg-surface px-4 py-5 sm:flex-row sm:px-6 sm:py-6 lg:px-10">
        <div className="flex w-full flex-wrap items-center justify-center gap-6 sm:w-auto sm:justify-start sm:gap-8 lg:gap-12">
          <button
            type="button"
            onClick={handleToggleMark}
            aria-pressed={isMarked}
            className={`flex h-8 items-center gap-3 transition-colors ${isMarked
              ? "text-[#666666] dark:text-[#FAF7F2]"
              : "text-[#666666] hover:text-ink dark:text-[#FAF7F2] dark:hover:text-white"
              }`}
          >
            <BookmarkIcon
              filled={isMarked}
              className="h-5 w-5 shrink-0 sm:h-[22px] sm:w-[22px] lg:h-6 lg:w-6"
            />

            <span className="text-[14px] font-bold leading-6 sm:text-[16px]">
              Mark for review
            </span>
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting || finishing}
            className="flex h-8 items-center gap-3 text-[#666666] transition-colors hover:text-ink disabled:opacity-30 dark:text-[#FAF7F2] dark:hover:text-white"
          >
            <DoubleArrowIcon className="h-5 w-5 shrink-0 sm:h-[22px] sm:w-[22px] lg:h-6 lg:w-6" />
            <span className="text-[14px] font-bold leading-6 sm:text-[16px]">
              {isLast ? "Skip & Finish" : "Skip Question"}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={selectedKey === null || submitting || finishing}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-cta text-[16px] font-bold leading-7 text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:h-14 sm:w-[200px] sm:text-[18px]"
        >
          {submitting ? "Saving…" : isLast ? "Submit & Finish" : "Submit answer"}
        </button>
      </div>

      {/* PRD 130 — leaving a live session requires confirmation. */}
      <WhiteModal
        open={confirmEndOpen}
        onClose={handleContinueSession}
        ariaLabel="Practice session options"
      >
        <div className="text-center">
          <h2 className="text-xl font-bold text-ink sm:text-2xl">Leave this practice session?</h2>
          <p className="mt-2 text-sm text-muted">
            Your answers so far are saved either way.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <Button
            variant="primary"
            disabled={finishing || exiting}
            onClick={() => {
              setConfirmEndOpen(false);
              void finish();
            }}
          >
            {finishing ? "Finishing…" : "End Session & see analysis"}
          </Button>
          <Button
            variant="secondary"
            className="border-[#F59E0B]! text-[#F59E0B]! hover:bg-[#F59E0B33]!"
            disabled={finishing || exiting}
            onClick={handleExitSession}
          >
            {exiting ? "Exiting…" : "Exit Session"}
          </Button>
        </div>
        <button
          type="button"
          onClick={handleContinueSession}
          disabled={finishing || exiting}
          className="mt-3 w-full text-center text-sm font-semibold text-muted disabled:opacity-60"
        >
          Continue Session
        </button>
      </WhiteModal>
    </div>
  );
}
