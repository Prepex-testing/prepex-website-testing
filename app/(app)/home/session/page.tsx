"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CrossAppSessionModal } from "@/components/home/CrossAppSessionModal";
import { SessionCompleteModal } from "@/components/home/SessionCompleteModal";
import {
  ArrowLeftIcon,
  BellIcon,
  ClockIcon,
  CheckIcon,
  FileIcon,
  PauseIcon,
  PlayIcon,
} from "@/components/ui/icons";

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
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl rounded-2xl border border-brand/10 bg-surface p-6">
        <div className="text-center">
          <p className="flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wide text-muted">
            <ClockIcon />
            Focus Session
          </p>
          <p className="mt-1 text-h2 text-ink">Electrochemistry</p>
          <p className="text-sm text-muted">Physical Chemistry</p>
        </div>

        <div className="mt-4 rounded-xl bg-tint-strong p-6 text-center">
          <p className="text-4xl font-extrabold text-ink">
            {formatTime(elapsed)}
            <span className="text-lg font-semibold text-muted">
              /{formatTime(TARGET_SECONDS)}
            </span>
          </p>
          <div className="mt-3 flex justify-center gap-1.5">
            {checklist.map((task) => (
              <span
                key={task.id}
                className={`h-2 w-2 rounded-full ${task.done ? "bg-success" : "bg-brand/10"}`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
            {completedCount} of {checklist.length} completed
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Task Checklist
          </p>
          <p className="text-xs text-muted">{percent}% Done</p>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          {checklist.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => toggleTask(task.id)}
              aria-pressed={task.done}
              className="flex items-center gap-3 rounded-xl border border-brand/10 px-3 py-2.5 text-left"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  task.done
                    ? "border-success bg-success text-white"
                    : "border-brand/20"
                }`}
              >
                {task.done && <CheckIcon />}
              </span>
              <span
                className={`text-sm ${
                  task.done ? "text-muted line-through" : "font-medium text-ink"
                }`}
              >
                {task.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button variant="primary" onClick={() => setPaused((value) => !value)}>
            {isPaused ? <PlayIcon /> : <PauseIcon />}
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button variant="secondary">
            <FileIcon />
            Resources
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setCrossAppOpen(true)}
          className="mt-4 block w-full text-center text-sm font-semibold text-ink"
        >
          Start Cross App Session →
        </button>

        <div className="mt-3 border-t border-brand/10 pt-3 text-right">
          <button
            type="button"
            onClick={() => setCompleteOpen(true)}
            className="text-sm font-semibold text-ink underline"
          >
            Complete session
          </button>
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
