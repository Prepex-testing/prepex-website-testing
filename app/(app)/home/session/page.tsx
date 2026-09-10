"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CrossAppSessionModal } from "@/components/home/CrossAppSessionModal";
import { SessionCompleteModal } from "@/components/home/SessionCompleteModal";
import { LeaveSessionModal } from "@/components/home/LeaveSessionModal";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  ClockIcon,
  CheckIcon,
  PauseIcon,
  PlayIcon,
  ClockIconss,
} from "@/components/ui/icons";
import { LeftIconcon, TargetIcon, ArrowLeftIcon } from "@/assets/icons";
import { getTodayPlan, updatePlannerTask, type PlannerTask, type TaskChecklist } from "@/lib/api/planner";
import { getChapterTitle } from "@/lib/utils/text";
import {
  setActiveSessionTaskId,
  getStoredElapsedSeconds,
  setStoredElapsedSeconds,
  clearStoredElapsedSeconds,
} from "@/lib/session/activeTask";

const CHECKLIST_ITEMS: { field: keyof TaskChecklist; label: string }[] = [
  { field: "readNCRT", label: "Read NCERT" },
  { field: "watchLecture", label: "Watch Lecture" },
  { field: "solveExample", label: "Solve Examples" },
  { field: "attemptProblems", label: "Attempt Problems" },
  { field: "selfQuiz", label: "Self Quiz" },
];

const EMPTY_CHECKLIST: Required<TaskChecklist> = {
  readNCRT: false,
  watchLecture: false,
  solveExample: false,
  attemptProblems: false,
  selfQuiz: false,
};

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function FocusSessionPage() {
  return (
    <Suspense fallback={null}>
      <FocusSessionContent />
    </Suspense>
  );
}

function FocusSessionContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [task, setTask] = useState<PlannerTask | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [targetSeconds, setTargetSeconds] = useState(60 * 60);
  const [isPaused, setPaused] = useState(false);
  const [checklist, setChecklist] = useState<Required<TaskChecklist>>(EMPTY_CHECKLIST);
  const [isCrossAppOpen, setCrossAppOpen] = useState(false);
  const [isCrossAppActive, setCrossAppActive] = useState(false);
  const [isCompleteOpen, setCompleteOpen] = useState(false);
  const [isLeaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isReady, setReady] = useState(() => !taskId);
  const resolvedRef = useRef(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (!taskId) return;
    getTodayPlan()
      .then(({ data }) => {
        const found = data.plan?.tasks.find((item) => item.id === taskId) ?? null;
        if (!found) return;
        setTask(found);
        const storedElapsed = getStoredElapsedSeconds(taskId);
        setElapsed(storedElapsed ?? found.secondsCompleted);
        setTargetSeconds(found.estimatedMinutes * 60);
        setChecklist({
          readNCRT: found.readNCRT ?? false,
          watchLecture: found.watchLecture ?? false,
          solveExample: found.solveExample ?? false,
          attemptProblems: found.attemptProblems ?? false,
          selfQuiz: found.selfQuiz ?? false,
        });
      })
      .catch(() => {
        // Best-effort — the page falls back to the placeholder session below.
      })
      .finally(() => setReady(true));
  }, [taskId]);

  useEffect(() => {
    if (!isReady || isPaused) return;
    const timer = setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isReady, isPaused]);

  // Mirror the live timer to localStorage every tick, so a refresh restores
  // the exact elapsed seconds instead of falling back to the API's
  // whole-minute snapshot from the last explicit save. Gated on isReady so
  // this doesn't fire with the initial elapsed=0 before the seed value
  // (stored seconds or secondsCompleted from the API) has been read in.
  useEffect(() => {
    if (!taskId || !isReady) return;
    setStoredElapsedSeconds(taskId, elapsed);
  }, [taskId, isReady, elapsed]);

  // Intercept in-app link clicks (sidebar/bottom nav/back arrow) away from
  // this page so we can confirm before losing an active session.
  useEffect(() => {
    if (!taskId) return;

    const handleClick = (event: MouseEvent) => {
      if (resolvedRef.current) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      const href = anchor?.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      const url = new URL(href, window.location.origin);
      if (url.pathname === pathname) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
      setLeaveConfirmOpen(true);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [taskId, pathname]);

  // Intercept the browser back/forward buttons the same way.
  useEffect(() => {
    if (!taskId) return;

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      if (resolvedRef.current) return;
      window.history.pushState(null, "", window.location.href);
      setPendingHref("/home");
      setLeaveConfirmOpen(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [taskId]);

  const toggleTask = (field: keyof TaskChecklist) => {
    const nextChecklist = { ...checklist, [field]: !checklist[field] };
    setChecklist(nextChecklist);
    if (!taskId) return;
    updatePlannerTask(taskId, {
      secondsCompleted: elapsed,
      status: "IN_PROGRESS",
      isStudyingCrossApp: false,
      ...nextChecklist,
    }).catch(() => {
      // Best-effort — the checklist still reflects the local toggle.
    });
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const percent = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);

  const handleComplete = () => {
    resolvedRef.current = true;
    if (taskId) {
      updatePlannerTask(taskId, {
        secondsCompleted: elapsed,
        status: "COMPLETED",
        isStudyingCrossApp: false,
        ...checklist,
      }).catch(() => {
        // Best-effort — the completion modal still reflects the local session.
      });
      clearStoredElapsedSeconds(taskId);
    }
    setCompleteOpen(true);
  };

  const handleCrossAppStart = (activityLabel: string) => {
    resolvedRef.current = true;
    if (taskId) {
      setActiveSessionTaskId(taskId);
      updatePlannerTask(taskId, {
        isStudyingCrossApp: true,
        crossAppActivity: activityLabel,
      }).catch(() => {
        // Best-effort — the user is leaving the app regardless.
      });
      clearStoredElapsedSeconds(taskId);
    }
    setCrossAppOpen(false);
    setCrossAppActive(true);
  };

  const handleStopCrossApp = () => {
    router.push("/home/session/welcome-back");
  };

  const handleLeaveConfirm = () => {
    resolvedRef.current = true;
    if (taskId) {
      updatePlannerTask(taskId, {
        secondsCompleted: elapsed,
        status: "IN_PROGRESS",
        isStudyingCrossApp: false,
        ...checklist,
      }).catch(() => {
        // Best-effort — the user still leaves the session.
      });
      clearStoredElapsedSeconds(taskId);
    }
    setLeaveConfirmOpen(false);
    router.push(pendingHref ?? "/home");
  };

  const handleLeaveCancel = () => {
    setPendingHref(null);
    setLeaveConfirmOpen(false);
  };

  if (isCrossAppActive) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/90 px-4 text-center backdrop-blur-sm">
        <p className="text-lg font-bold text-ink sm:text-xl">
          Cross app study session is going on
        </p>
        <Button
          variant="primary"
          onClick={handleStopCrossApp}
          className="w-full max-w-xs"
        >
          Stop Cross App Study Session
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Back to Home" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Focus Session</h1>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      <div className="w-full rounded-2xl border border-brand/10 bg-surface p-6">

        <div className="mx-auto flex max-w-[984px] flex-col items-center gap-3 px-4 text-center sm:gap-4 sm:px-0">
          {/* Focus Session */}
          <p className="flex items-center justify-center gap-2 text-center text-[16px] font-semibold uppercase leading-5 tracking-[1.6px] text-body-text dark:text-ink min-[360px]:text-[18px] min-[360px]:leading-6 min-[360px]:tracking-[1.8px] sm:text-[24px] sm:leading-[31.2px] sm:tracking-[2.4px]">
            <ClockIconss className="h-[14px] w-[12px] shrink-0 min-[360px]:h-[16px] min-[360px]:w-[14px] sm:h-[21px] sm:w-[18px]" />
            Focus Session
          </p>

          {/* Task Title + Subject */}
          <div className="flex flex-col items-center gap-1.5 sm:gap-2">
            <p className="max-w-full break-words text-base font-extrabold leading-6 text-ink min-[360px]:text-lg min-[360px]:leading-7 sm:text-[32px] sm:leading-none">
              {task?.title ? getChapterTitle(task.title) : "Electrochemistry"}
            </p>

            <p
              className={`text-xs font-semibold leading-4 ${isDark ? "text-white/70" : "text-[#464650]/80"
                } sm:text-sm sm:leading-none`}
            >
              {task?.subject?.name ?? "Physical Chemistry"}
            </p>
          </div>
        </div>

        <div className={`mt-4 rounded-2xl px-4 py-8 text-center sm:px-6 ${isDark ? "bg-tint" : "bg-[#F3F4F5]/50"}`}>
          <p
            className="font-extrabold leading-none tracking-[-2px] text-ink sm:tracking-[-3px] lg:text-[84px] lg:leading-[84px] lg:tracking-[-4.2px]"
            style={{ textShadow: "0px 0px 20px #2D2E6E1A" }}
          >
            <span className="text-5xl sm:text-7xl lg:text-[84px]">
              {formatTime(elapsed)}
            </span>
            <span
              className={`ml-2 align-middle text-xl tracking-[-1px] sm:text-3xl lg:text-[40px] lg:leading-[40px] lg:tracking-[-4.2px] ${isDark ? "text-white/30" : "text-[#464650]/30"}`}
              style={{ textShadow: "0px 0px 20px #2D2E6E1A" }}
            >
              /{formatTime(targetSeconds)}
            </span>
          </p>

          <div className="mt-4 flex justify-center gap-2">
            {CHECKLIST_ITEMS.map((item) => (
              <span
                key={item.field}
                className={`h-4 w-4 rounded-full ${checklist[item.field]
                  ? "bg-[#10B981] shadow-[0_0_8.6px_0_#FD786358]"
                  : isDark
                    ? "bg-white/20"
                    : "bg-brand/10"
                  }`}
              />
            ))}
          </div>

          <p className="mt-3 text-xs font-semibold uppercase leading-[14.4px] tracking-[0.6px] text-muted">
            {completedCount} of {CHECKLIST_ITEMS.length} completed
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 px-2">
          <p className="text-xs font-semibold uppercase leading-[14.4px] tracking-[1.2px] text-body-text">
            Task Checklist
          </p>
          <p className="text-xs font-semibold uppercase leading-[14.4px] tracking-[1.2px] text-body-text">
            {percent}% Done
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {CHECKLIST_ITEMS.map((item) => {
            const done = checklist[item.field];

            return (
              <button
                key={item.field}
                type="button"
                onClick={() => toggleTask(item.field)}
                aria-pressed={done}
                className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-opacity ${done ? "opacity-70" : "opacity-100"
                  } ${isDark
                    ? "border-[#FAF7F214] bg-[#1A1A4E]"
                    : "border-[#C7C5D1]/30 bg-white"
                  }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] ${done
                    ? isDark
                      ? "border border-white bg-white text-[#10B981]"
                      : "bg-[#E7F9F3] text-[#10B981]"
                    : isDark
                      ? "border border-white bg-white"
                      : "border border-[#C7C5D1]"
                    }`}
                >
                  {done && <CheckIcon />}
                </span>

                <span
                  className={`text-sm font-medium leading-[21px] text-body-text ${done ? "line-through" : ""
                    }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-6">
            <Button
              variant="primary"
              className="h-14 w-full gap-2 rounded-xl text-base font-bold shadow-[0_0_8.6px_0_#FD786358] sm:w-[257px] sm:text-lg"
              onClick={() => setPaused((value) => !value)}
            >
              {isPaused ? <PlayIcon /> : <PauseIcon />}
              {isPaused ? "Resume" : "Pause"}
            </Button>
            <Button
              variant="secondary"
              className={`h-14 w-full gap-2 rounded-xl border-2 text-base font-bold sm:w-[261px] sm:text-lg ${isDark ? "border-white/30!" : ""}`}
            >
              <TargetIcon />
              Resources
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setCrossAppOpen(true)}
            className="flex items-center justify-center gap-2 border-b border-tint-strong pb-6 text-center text-base font-bold text-[#1A1A4E] dark:text-[#8B8998] sm:text-lg"
          >
            <span>Start Cross App Session</span>
            <LeftIconcon className="h-4 w-4 shrink-0" />
          </button>

          <div className="text-right">
            <button
              type="button"
              onClick={handleComplete}
              className="text-base font-bold text-[#666666] underline dark:text-[#FAF7F2] sm:text-lg"
            >
              Complete session
            </button>
          </div>
        </div>
      </div>

      <CrossAppSessionModal
        open={isCrossAppOpen}
        onClose={() => setCrossAppOpen(false)}
        onStart={handleCrossAppStart}
        task={task}
      />
      <SessionCompleteModal
        open={isCompleteOpen}
        onClose={() => setCompleteOpen(false)}
        onContinue={() => setCompleteOpen(false)}
        topic={task?.title ? getChapterTitle(task.title) : "Electrochemistry"}
        minutesStudied={Math.ceil(elapsed / 60)}
        milestonesCompleted={completedCount}
        milestonesTotal={CHECKLIST_ITEMS.length}
      />
      <LeaveSessionModal
        open={isLeaveConfirmOpen}
        onClose={handleLeaveCancel}
        onConfirm={handleLeaveConfirm}
      />
    </div>
  );
}
