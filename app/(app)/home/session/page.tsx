"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CrossAppSessionModal } from "@/components/home/CrossAppSessionModal";
import { SessionCompleteModal } from "@/components/home/SessionCompleteModal";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  // ArrowLeftIcon,
  // BellIcon,
  ClockIcon,
  CheckIcon,
  // FileIcon,
  PauseIcon,
  PlayIcon,
} from "@/components/ui/icons";
import { LeftIconcon, TargetIcon ,ArrowLeftIcon,BellIcon} from "@/assets/icons";
const TARGET_SECONDS = 60 * 60;
const INITIAL_ELAPSED = 24 * 60 + 53;

const INITIAL_CHECKLIST = [
  { id: "read-ncert", label: "Read NCERT", done: true },
  { id: "watch-lecture", label: "Watch Lecture", done: true },
  { id: "solve-examples", label: "Solve Examples", done: true },
  { id: "attempt-problems", label: "Attempt Problems", done: false },
  { id: "self-quiz", label: "Self Quiz", done: false },
];

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function FocusSessionPage() {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(INITIAL_ELAPSED);
  const [isPaused, setPaused] = useState(false);
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [isCrossAppOpen, setCrossAppOpen] = useState(false);
  const [isCompleteOpen, setCompleteOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setElapsed((value) => Math.min(value + 1, TARGET_SECONDS));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const toggleTask = (id: string) => {
    setChecklist((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  };

  const completedCount = checklist.filter((task) => task.done).length;
  const percent = Math.round((completedCount / checklist.length) * 100);

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

      <div className="w-full rounded-2xl border border-brand/10 bg-surface p-6">

        <div className="mx-auto flex max-w-[984px] flex-col items-center gap-2 text-center">
          <p className="flex items-center justify-center gap-2 text-lg font-semibold uppercase tracking-[1.5px] text-body-text sm:text-2xl sm:leading-[31.2px] sm:tracking-[2.4px]">
            <ClockIcon />
            Focus Session
          </p>

          <div className="flex flex-col items-center gap-1">
            <p className="text-2xl font-extrabold leading-none text-ink sm:text-[32px]">
              Electrochemistry
            </p>
            <p className={`text-sm font-semibold leading-none ${isDark ? "text-white/70" : "text-[#464650]/80"}`}>
              Physical Chemistry
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
              /{formatTime(TARGET_SECONDS)}
            </span>
          </p>

          <div className="mt-4 flex justify-center gap-2">
            {checklist.map((task) => (
              <span
                key={task.id}
                className={`h-4 w-4 rounded-full ${task.done
                  ? "bg-[#10B981] shadow-[0_0_8.6px_0_#FD786358]"
                  : isDark
                    ? "bg-white/20"
                    : "bg-brand/10"
                  }`}
              />
            ))}
          </div>

          <p className="mt-3 text-xs font-semibold uppercase leading-[14.4px] tracking-[0.6px] text-muted">
            {completedCount} of {checklist.length} completed
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
          {checklist.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => toggleTask(task.id)}
              aria-pressed={task.done}
              className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-opacity ${task.done ? "opacity-70" : "opacity-100"
                } ${isDark ? "border-white/10 bg-tint" : "border-[#C7C5D1]/30 bg-white"}`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] ${task.done
                  ? isDark
                    ? "border border-white bg-white text-[#10B981]"
                    : "bg-[#E7F9F3] text-[#10B981]"
                  : isDark
                    ? "border border-white bg-white"
                    : "border border-[#C7C5D1]"
                  }`}
              >
                {task.done && <CheckIcon />}
              </span>
              <span
                className={`text-sm font-medium leading-[21px] text-body-text ${task.done ? "line-through" : ""
                  }`}
              >
                {task.label}
              </span>
            </button>
          ))}
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
            className="flex items-center justify-center gap-2 border-b border-tint-strong pb-6 text-center text-base font-bold text-ink sm:text-lg"
          >
            <span>Start Cross App Session</span>
            <LeftIconcon className="h-4 w-4 shrink-0" />
          </button>

          <div className="text-right">
            <button
              type="button"
              onClick={() => setCompleteOpen(true)}
              className="text-base font-bold text-muted underline sm:text-lg"
            >
              Complete session
            </button>
          </div>
        </div>
      </div>

      <CrossAppSessionModal
        open={isCrossAppOpen}
        onClose={() => setCrossAppOpen(false)}
        onStart={() => {
          setCrossAppOpen(false);
          router.push("/home/session/welcome-back");
        }}
      />
      <SessionCompleteModal
        open={isCompleteOpen}
        onClose={() => setCompleteOpen(false)}
        onContinue={() => setCompleteOpen(false)}
        topic="Electrochemistry"
        minutesStudied={60}
        milestonesCompleted={5}
        milestonesTotal={5}
      />
    </div>
  );
}