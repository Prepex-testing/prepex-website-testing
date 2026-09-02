"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { WhiteModal } from "@/components/ui/WhiteModal";
import { BellIcon, ClockIcon, BookmarkIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { getTodayPlan } from "@/lib/api/planner";
import {
  completePracticeSession,
  getTaskQuestions,
  optionEntries,
  prettyDifficulty,
  submitPracticeAnswer,
  type PracticeSessionQuestion,
  type TaskQuestionsResponse,
} from "@/lib/api/practice";

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function PracticeModePage() {
  return (
    <Suspense fallback={<CenteredMessage title="Loading practice…" />}>
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

  const [data, setData] = useState<TaskQuestionsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Remaining question queue (front = current). Skipping rotates to the back.
  const [queue, setQueue] = useState<PracticeSessionQuestion[]>([]);
  const [lockedCount, setLockedCount] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  const questionStartRef = useRef<number>(0);

  // ---- load ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let taskId = taskIdParam;
        if (!taskId) {
          const plan = await getTodayPlan();
          const practiceTasks =
            plan.data.plan?.tasks?.filter((t) => t.taskType === "PRACTICE") ?? [];
          const practice =
            practiceTasks.find((t) => t.status !== "COMPLETED" && t.status !== "SKIPPED") ??
            practiceTasks[0];
          if (!practice) {
            if (!cancelled) setLoadError("No practice task scheduled for today.");
            return;
          }
          taskId = practice.id;
        }
        const res = await getTaskQuestions(taskId);
        if (cancelled) return;
        const playable = res.data.questions.filter((q) => q.question !== null);
        if (playable.length === 0) {
          setLoadError("No practice questions are available for this task yet.");
          return;
        }
        setData(res.data);
        setQueue(playable);
        setLockedCount(
          res.data.questions.filter((q) => q.result === "CORRECT" || q.result === "WRONG").length,
        );
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
  }, [taskIdParam]);

  // ---- continuous timer (PRD 121) --------------------------------------------
  useEffect(() => {
    if (!data) return;
    const timer = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(timer);
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
    setFinishing(true);
    try {
      await completePracticeSession(data.sessionId);
    } catch {
      // Non-fatal — the analysis screen will surface the real state.
    }
    router.push(`/practice/complete?sessionId=${data.sessionId}`);
  }, [data, finishing, router]);

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

  // PRD 122 — Skip moves the question to the end of the session for retry.
  const handleSkip = useCallback(() => {
    if (!current || submitting) return;
    setQueue((q) => {
      if (q.length <= 1) return q; // last one — nothing to rotate to
      const next = [...q.slice(1), q[0]];
      setSelectedKey(null);
      questionStartRef.current = Date.now();
      return next;
    });
  }, [current, submitting]);

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
        <Button variant="secondary" size="sm" onClick={() => router.push("/plan")}>
          Back to plan
        </Button>
      </CenteredMessage>
    );
  }
  if (!data || !current || !currentQ) {
    return <CenteredMessage title="Loading practice…" />;
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

      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex h-7 items-center gap-3">
          <p className="text-[20px] font-bold leading-7 text-ink whitespace-nowrap">
            Question {questionNumber} of {total}
          </p>
          <span className="flex h-4 items-center rounded-sm bg-tint px-2 text-[12px] font-semibold uppercase tracking-[0.6px] leading-4 text-ink">
            {prettyDifficulty(currentQ.difficulty)}
          </span>
          {isMarked && (
            <span className="flex h-4 items-center rounded-sm bg-tint-strong px-2 text-[11px] font-semibold uppercase tracking-[0.6px] leading-4 text-ink">
              Marked
            </span>
          )}
        </div>

        <div className="flex h-7 items-center gap-8">
          <div className="flex items-center gap-2">
            <ClockIcon />
            <span className="text-[18px] font-semibold leading-7 text-ink whitespace-nowrap">
              {formatTime(elapsed)} elapsed
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfirmEndOpen(true)}
            className="text-[14px] font-bold uppercase leading-5 tracking-[1.4px] text-muted whitespace-nowrap transition-colors hover:text-ink"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Progress dots (PRD 5.4.1) */}
      <div className="flex flex-wrap items-center gap-[15px]">
        {Array.from({ length: total }).map((_, index) => {
          const isDone = index < lockedCount;
          const isActive = index === lockedCount;
          return (
            <span
              key={index}
              className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                isDone || isActive ? "bg-question-dot-active" : "bg-question-dot-inactive"
              }`}
            />
          );
        })}
      </div>

      {/* Breadcrumb */}
      <div className="flex min-h-8 w-full flex-wrap items-center gap-4">
        {breadcrumb.map((item, index) => (
          <React.Fragment key={`${item}-${index}`}>
            {index === 0 ? (
              <span className="flex h-8 items-center rounded-lg bg-subject-bg px-4 text-[14px] font-semibold leading-5 text-subject-text">
                {item}
              </span>
            ) : (
              <>
                <span className="h-[6px] w-[6px] rounded-full bg-muted" />
                <span className="text-[14px] font-semibold leading-5 text-ink">{item}</span>
              </>
            )}
          </React.Fragment>
        ))}
      </div>

      <h2 className="text-h2 text-ink">{currentQ.questionText}</h2>

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
              className={`flex min-h-[98px] w-full items-center rounded-xl border p-6 text-left transition-all duration-200 ${
                isSelected ? "border-brand bg-tint-strong" : "border-brand/20 bg-transparent"
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                  isSelected ? "bg-brand text-background" : "bg-tint text-ink"
                }`}
              >
                <span className="text-[18px] font-bold leading-7">{key}</span>
              </div>
              <span
                className="ml-6 text-[20px] font-medium italic leading-8 text-ink"
                style={{ fontFamily: "Liberation Serif, serif" }}
              >
                {value}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-6 rounded-2xl border border-brand/10 bg-surface px-6 py-6 sm:px-10">
        <div className="flex flex-wrap items-center gap-8 sm:gap-12">
          <button
            type="button"
            onClick={handleToggleMark}
            aria-pressed={isMarked}
            className={`flex h-8 items-center gap-3 transition-colors ${
              isMarked ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            <BookmarkIcon filled={isMarked} />
            <span className="text-[16px] font-bold leading-6">Mark for review</span>
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isLast || submitting}
            className="flex h-8 items-center gap-3 text-muted transition-colors hover:text-ink disabled:opacity-30"
          >
            <span className="text-xl font-semibold">»</span>
            <span className="text-[16px] font-bold leading-6">Skip Question</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={selectedKey === null || submitting || finishing}
          className="flex h-14 w-[200px] items-center justify-center rounded-xl bg-cta text-[18px] font-bold leading-7 text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? "Saving…" : isLast ? "Submit & Finish" : "Submit answer"}
        </button>
      </div>

      {/* PRD 130 — End Session requires confirmation. */}
      <WhiteModal
        open={confirmEndOpen}
        onClose={() => setConfirmEndOpen(false)}
        ariaLabel="End practice session"
      >
        <div className="text-center">
          <h2 className="text-xl font-bold text-ink sm:text-2xl">End this session?</h2>
          <p className="mt-2 text-sm text-muted">
            Your answers so far are saved. We&apos;ll analyse what you&apos;ve done and add wrong
            answers to your Mistake Notebook.
          </p>
        </div>
        <Button
          variant="primary"
          className="mt-5"
          disabled={finishing}
          onClick={() => {
            setConfirmEndOpen(false);
            void finish();
          }}
        >
          {finishing ? "Finishing…" : "End & see analysis"}
        </Button>
        <button
          type="button"
          onClick={() => setConfirmEndOpen(false)}
          className="mt-2 w-full text-center text-sm font-semibold text-muted"
        >
          Keep practising
        </button>
      </WhiteModal>
    </div>
  );
}
