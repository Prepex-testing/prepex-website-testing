"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClockIcon, CheckIcon } from "@/components/ui/icons";
import { useTheme } from "@/components/theme/ThemeProvider";
import { FileIcon, PlayIcon, Open, ArrowLeftIcon, LightbulbIcon ,TargetIcon} from "@/assets/icons";
import { updateRevisionProgress, markRevisionDone } from "@/lib/api/revision";
import { getPlannerTask, type PlannerTaskDetail } from "@/lib/api/planner";
import { useRevisionSession } from "@/components/session/RevisionSessionProvider";
import { RevisionSessionActionsModal } from "@/components/session/RevisionSessionActionsModal";
import { formatClock } from "@/lib/utils/datetime";
import { getChapterTitle } from "@/lib/utils/text";

// The one destination a "leave this page" click is allowed to go to directly
// — everything else is intercepted and routed through the session options
// popup instead (see the click/popstate interception effects below).
const RESOURCE_LIBRARY_PATH = "/home/resource-library";

const QUESTIONS = [
  "What is Newton's First Law of Motion?",
  "State Newton's Second Law with its formula.",
  "What are Newton's three laws of motion?",
  "Give a real-world example of Newton's Third Law.",
  "What is the difference between mass and weight?",
];

const REFERENCES = [
  { label: "NCERT Chapter", meta: "Chapter 5", icon: <TargetIcon className="h-6 w-6" /> },
  { label: "Teacher Notes", meta: "Handwritten Notes", icon: <TargetIcon className="h-6 w-6" /> },
  { label: "Lecture Slides", meta: "PDF • 24 Slides", icon: <PlayIcon className="h-6 w-6" /> },
];

export default function RevisionSessionPage() {
  return (
    <Suspense fallback={null}>
      <RevisionSessionContent />
    </Suspense>
  );
}

function RevisionSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const revisionId = searchParams.get("taskId");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [recalled, setRecalled] = useState(false);
  const [isEnding, setEnding] = useState(false);
  const [isHeaderExiting, setHeaderExiting] = useState(false);
  const [isPausing, setPausing] = useState(false);
  const [isPaused, setPaused] = useState(false);
  const [isResuming, setResuming] = useState(false);
  const [pausedElapsedSeconds, setPausedElapsedSeconds] = useState(0);
  const [task, setTask] = useState<PlannerTaskDetail | null>(null);
  const [isTaskLoading, setTaskLoading] = useState(true);
  const [isActionsOpen, setActionsOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const savedMinutesRef = useRef(0);
  const autoCompletedRef = useRef(false);
  const resolvedRef = useRef(false);
  const { isActive, taskId, elapsedSeconds, startSession, exitSession, clearSession } = useRevisionSession();

  // Loads the task's full detail (title, chapter/subject, status, secondsCompleted)
  // to drive the page content and to decide how the timer should be seeded below.
  useEffect(() => {
    if (!revisionId) {
      setTaskLoading(false);
      return;
    }
    let cancelled = false;
    setTaskLoading(true);
    getPlannerTask(revisionId)
      .then(({ data }) => {
        if (!cancelled) setTask(data);
      })
      .catch(() => {
        // Best-effort — the page falls back to placeholder content below.
      })
      .finally(() => {
        if (!cancelled) setTaskLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [revisionId]);

  // Single canonical place that starts the tracked session (POST /session/start),
  // regardless of which page's Start/Resume Revision button routed here — /home,
  // /home/today-plan, /home/revision, or a direct/refreshed URL all land here first.
  // A task still PENDING (never started) begins at 0; one already IN_PROGRESS
  // (e.g. resumed after a Pause) seeds the timer from its banked secondsCompleted.
  useEffect(() => {
    if (!revisionId || isTaskLoading || (isActive && taskId === revisionId)) return;
    startSession({
      taskId: revisionId,
      targetDuration: task?.estimatedMinutes ?? 0,
      taskTitle: task?.title ? getChapterTitle(task.title) : undefined,
      subjectName: task?.subject?.name,
      initialElapsedSeconds: task?.status === "IN_PROGRESS" ? (task?.secondsCompleted ?? 0) : 0,
    }).catch(() => {
      // Best-effort — the page still works without a tracked session.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revisionId, isTaskLoading]);

  useEffect(() => {
    if (!revisionId) return;
    const minutesElapsed = Math.floor(elapsedSeconds / 60);
    if (minutesElapsed === 0 || minutesElapsed === savedMinutesRef.current) return;
    savedMinutesRef.current = minutesElapsed;
    updateRevisionProgress(revisionId).catch(() => {
      // Best-effort — progress will be retried on the next minute tick.
    });
  }, [elapsedSeconds, revisionId]);

  const estimatedMinutes = task?.estimatedMinutes ?? 0;

  // Auto-completes once tracked minutes catch up with the task's estimate,
  // sending the student straight to the rate-difficulty screen.
  useEffect(() => {
    if (!revisionId || autoCompletedRef.current || estimatedMinutes <= 0) return;
    const minutesElapsed = Math.floor(elapsedSeconds / 60);
    if (minutesElapsed < estimatedMinutes) return;
    autoCompletedRef.current = true;
    (async () => {
      try {
        await markRevisionDone(revisionId, elapsedSeconds);
      } catch {
        // Best-effort — still let the user proceed to rate difficulty.
      } finally {
        // mark-done already told the backend the session ended — no active
        // session is left to exit, so just clear local state (no API call).
        clearSession();
        router.push(`/revision-session/complete?taskId=${revisionId}`);
      }
    })();
  }, [elapsedSeconds, estimatedMinutes, revisionId, clearSession, router]);

  // Intercepts in-app link clicks away from this page (sidebar/back arrow/
  // etc.) so leaving always goes through the Exit/Complete/Cancel popup —
  // except Reference Review's "Open" buttons, which intentionally route to
  // /home/resource-library directly, keeping the session's floating banner
  // alive there instead of asking the student to decide anything.
  useEffect(() => {
    if (!revisionId) return;

    const handleClick = (event: MouseEvent) => {
      if (resolvedRef.current) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      const href = anchor?.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      if (href === RESOURCE_LIBRARY_PATH || href.startsWith(`${RESOURCE_LIBRARY_PATH}/`)) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
      setActionsOpen(true);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [revisionId]);

  // Intercepts the browser back/forward buttons the same way.
  useEffect(() => {
    if (!revisionId) return;

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      if (resolvedRef.current) return;
      window.history.pushState(null, "", window.location.href);
      setPendingHref("/home");
      setActionsOpen(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [revisionId]);

  const handleEndSession = async () => {
    resolvedRef.current = true;
    if (!revisionId) {
      router.push("/revision-session/complete");
      return;
    }
    autoCompletedRef.current = true;
    setEnding(true);
    try {
      await markRevisionDone(revisionId, displayedElapsedSeconds);
    } catch {
      // Best-effort — still let the user proceed to rate difficulty.
    } finally {
      // mark-done already told the backend the session ended — no active
      // session is left to exit, so just clear local state (no API call).
      clearSession();
      setEnding(false);
      router.push(`/revision-session/complete?taskId=${revisionId}`);
    }
  };

  // Header "Exit Session" — ends the tracked session (POST
  // /revision/:taskId/session/exit via exitSession) and goes straight back
  // to the revision list, bypassing the Exit/Complete/Cancel popup.
  const handleHeaderExit = async () => {
    resolvedRef.current = true;
    setHeaderExiting(true);
    try {
      await exitSession();
    } finally {
      setHeaderExiting(false);
      router.push("/home/revision");
    }
  };

  const handlePauseSession = async () => {
    if (!revisionId) return;
    setPausing(true);
    const frozenSeconds = elapsedSeconds;
    try {
      await exitSession();
    } finally {
      setPausedElapsedSeconds(frozenSeconds);
      setPaused(true);
      setPausing(false);
    }
  };

  // Re-fetches the task so the resumed timer is seeded from the server's
  // current secondsCompleted, then calls POST /session/start via startSession.
  const handleResumeSession = async () => {
    if (!revisionId) return;
    setResuming(true);
    try {
      const { data } = await getPlannerTask(revisionId);
      setTask(data);
      await startSession({
        taskId: revisionId,
        targetDuration: data.estimatedMinutes,
        taskTitle: getChapterTitle(data.title),
        subjectName: data.subject?.name,
        initialElapsedSeconds: data.secondsCompleted,
      });
      setPaused(false);
    } catch {
      // Best-effort — the session stays paused so the user can retry.
    } finally {
      setResuming(false);
    }
  };

  const displayedElapsedSeconds = isPaused ? pausedElapsedSeconds : elapsedSeconds;

  // After the popup's "Exit Session" completes, continue on to wherever the
  // intercepted click/back-navigation was originally headed.
  const handleExitedViaActions = () => {
    resolvedRef.current = true;
    router.push(pendingHref ?? "/home/revision");
  };

  const goTo = (index: number) => {
    setQuestionIndex(Math.min(Math.max(index, 0), QUESTIONS.length - 1));
    setRecalled(false);
  };

  return (
    <div className="mx-auto flex max-w-[1213px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleHeaderExit}
          disabled={isHeaderExiting}
          className={`flex shrink-0 items-center gap-1 text-xs font-semibold leading-5 transition-opacity disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm ${isDark ? "text-muted" : "text-[#334155]"}`}
        >
          <ArrowLeftIcon className="h-[9.33px] w-3 shrink-0" />
          <span>{isHeaderExiting ? "Exiting..." : "Exit Session"}</span>
        </button>
        <p className="flex-1 truncate text-center text-[14px] font-extrabold uppercase tracking-[2.8px] text-ink">
          Revision Session
        </p>
        <span className="w-[92px] shrink-0" aria-hidden="true" />
      </div>

      {/* Title */}
      <div>
        <h1 className="text-[28px] font-bold leading-[36px] text-ink sm:text-[32px] sm:leading-[40px]">
          {task?.title ? getChapterTitle(task.title) : "Revision Session"}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {task?.subject?.name && (
            <span
              className={`rounded px-3 py-1 text-[10px] font-extrabold uppercase leading-[15px] ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"}`}
            >
              {task.subject.name}
            </span>
          )}
          <span className="flex items-center text-[14px] font-medium leading-5 text-[#6B7280] dark:text-primary!">
            {task?.chapter?.name}
            {task?.chapter?.name && task?.subject?.name && (
              <span className="flex h-5 w-[24.08px] shrink-0 items-center justify-center px-2 text-[#D1D5DB] dark:text-secondary!">
                •
              </span>
            )}
            {task?.subject?.name}
          </span>
        </div>
        <div className="mt-3 h-px w-full max-w-[1213px] bg-[#F1F5F9]/40" />
      </div>

      {/* Quick Recall + Focus Timer */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-[12px] font-extrabold uppercase leading-[15px] tracking-[1px] text-muted">
          Quick Recall
        </p>
        <p className="text-[20px] font-extrabold leading-[28px] text-ink">
          Question {questionIndex + 1} of {QUESTIONS.length}
        </p>
        <div className="flex gap-1.5">
          {QUESTIONS.map((_, index) => (
            <span
              key={index}
              className={`h-3 w-3 rounded-full transition-colors ${index <= questionIndex ? "bg-ink" : "bg-tint"
                }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-brand/10 bg-surface px-5 py-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] dark:bg-ink">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0F8] text-[#1A1A4E] dark:bg-transparent dark:text-[#111145]">
            <ClockIcon className="h-[28px] w-[28px] shrink-0 sm:h-[33.54px] sm:w-[33.54px]" />
          </span>
          <div className="flex flex-col items-start">
            <span className="text-[32px] font-bold leading-[38px] text-ink dark:text-[#111145]">
              {formatClock(displayedElapsedSeconds)}
              {estimatedMinutes > 0 && (
                <span className="text-muted dark:text-[#111145]/70">/{estimatedMinutes}</span>
              )}
            </span>
            <span className="text-[10px] font-semibold  leading-5 tracking-wide text-muted dark:text-[#111145]/70">
              focus time
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-brand/10 bg-surface p-6 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] sm:p-8">
        <p className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold leading-5 text-body-text">
          Revision Questions Not Available.
        </p>
      </div>

      {/* Question card */}
      {/* <div className="rounded-3xl border border-brand/10 bg-surface p-6 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] sm:p-8">
        <h2 className="mx-auto max-w-[606px] text-[22px] font-extrabold leading-[28px] text-ink sm:text-[30px] sm:leading-[36px]">
          {QUESTIONS[questionIndex]}
        </h2>
        <p className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold leading-5 text-body-text">
          <LightbulbIcon className="h-[18px] w-[18px] shrink-0" />
          Take a moment to answer from memory.
        </p>
        <button
          type="button"
          onClick={() => setRecalled(true)}
          className={`mt-4 inline-flex min-h-[52px] sm:h-[60px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 px-4 sm:px-6 py-3 text-sm sm:text-base font-bold leading-5 sm:leading-6 text-center transition-colors ${isDark
            ? "border-white text-white"
            : "border-brand text-brand"
            } ${recalled
              ? "bg-brand/5"
              : "hover:bg-brand/5"
            }`}
        >
          <CheckIcon className="h-5 w-5 shrink-0" />
          <span className="whitespace-nowrap">
            I&apos;ve recalled this answer
          </span>
        </button>
        <p className="mt-2 text-xs text-muted">
          {recalled
            ? "Great — tap Next to continue."
            : "Tap Next when you're ready to continue."}
        </p>
      </div> */}

      {/* Previous / Skip / Next */}
      {/* <div className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface px-4 py-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => goTo(questionIndex - 1)}
          disabled={questionIndex === 0}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold text-ink disabled:opacity-30 sm:h-auto sm:w-auto sm:justify-start sm:text-base"
        >
          <ArrowLeftIcon />
          <span>Previous</span>
        </button>

        <button
          type="button"
          onClick={() => goTo(questionIndex + 1)}
          className="h-11 w-full rounded-lg text-center text-sm font-bold text-muted sm:h-auto sm:w-auto sm:text-base"
        >
          Skip Question »
        </button>

        <button
          type="button"
          onClick={() => goTo(questionIndex + 1)}
          disabled={questionIndex === QUESTIONS.length - 1}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold text-ink disabled:opacity-30 sm:h-auto sm:w-auto sm:justify-end sm:text-base"
        >
          <span>Next</span>
          <span className="rotate-180">
            <ArrowLeftIcon />
          </span>
        </button>
      </div> */}

      {/* Reference Review */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#1E293B] dark:text-[#FAF7F2]">
          Reference Review
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REFERENCES.map((ref) => (
            <div
              key={ref.label}
              className="flex flex-col rounded-2xl border border-brand/10 bg-surface p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
            >
              {/* Top Row */}
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg  bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
                  {ref.icon}
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-bold leading-5 text-ink">
                    {ref.label}
                  </p>
                  <p className="text-[11px] leading-5 text-muted">
                    {ref.meta}
                  </p>
                </div>
              </div>

              {/* Button */}

              <button
                type="button"
                // onClick={() => router.push(RESOURCE_LIBRARY_PATH)}
                className={`mt-4 flex h-[38px] w-full items-center justify-center gap-2 rounded-lg border text-xs font-bold text-ink transition-colors hover:bg-tint-strong ${isDark ? "border-white" : "border-brand/15"
                  }`}
              >
                <span>Open</span>
                <Open className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#64748B] dark:text-[#FAF7F2]">
          Open any resource to review before continuing.
        </p>
      </div>

      {/* End session */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleEndSession}
          disabled={isEnding}
          className="flex h-[68px] w-full items-center justify-center rounded-2xl bg-cta text-lg font-bold leading-7 text-white transition-colors hover:bg-cta/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isEnding ? "Ending..." : "End session, rate difficulty"}
        </button>
        <button
          type="button"
          onClick={isPaused ? handleResumeSession : handlePauseSession}
          disabled={isPausing || isResuming || isEnding}
          className="flex h-[72px] items-center justify-center text-lg font-bold text-body-text transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPaused
            ? isResuming
              ? "Resuming..."
              : "Resume Session"
            : isPausing
              ? "Pausing..."
              : "Pause Session"}
        </button>
      </div>

      <RevisionSessionActionsModal
        open={isActionsOpen}
        onClose={() => {
          setActionsOpen(false);
          setPendingHref(null);
        }}
        onExited={handleExitedViaActions}
      />
    </div>
  );
}