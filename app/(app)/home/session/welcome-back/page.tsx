"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { RadioOption } from "@/components/ui/RadioOption";
import { ArrowLeftIcon, BellIcon, ClockIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { getCheckInStatus } from "@/lib/api/checkin";
import { updatePlannerTask, type TaskStatus } from "@/lib/api/planner";
import { getActiveSessionTaskId, clearActiveSessionTaskId } from "@/lib/session/activeTask";
import { minutesSince } from "@/lib/utils/datetime";

const OUTCOMES = [
  { id: "completed", label: "Completed as planned" },
  { id: "partial", label: "Partial credit" },
  { id: "distracted", label: "Distracted" },
  { id: "cancelled", label: "Cancel session" },
];

const OUTCOME_STATUS: Record<string, TaskStatus> = {
  completed: "COMPLETED",
  partial: "IN_PROGRESS",
  distracted: "IN_PROGRESS",
  cancelled: "SKIPPED",
};

export default function WelcomeBackPage() {
  const router = useRouter();
  const [outcome, setOutcome] = useState("completed");
  const [crossAppActivity, setCrossAppActivity] = useState("Watch Coaching Lecture");
  const [switchedAt, setSwitchedAt] = useState<string | null>(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    getCheckInStatus()
      .then(({ data }) => {
        if (data.checkin?.crossAppActivity) setCrossAppActivity(data.checkin.crossAppActivity);
        if (data.checkin?.switchCrossStudyAt) setSwitchedAt(data.checkin.switchCrossStudyAt);
      })
      .catch(() => {
        // Best-effort — the page falls back to the placeholder session below.
      });
  }, []);

  useEffect(() => {
    if (!switchedAt) return;
    const tick = () => setElapsedMinutes(minutesSince(switchedAt));
    const immediate = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(timer);
    };
  }, [switchedAt]);

  const handleConfirm = () => {
    const taskId = getActiveSessionTaskId();
    if (taskId) {
      updatePlannerTask(taskId, {
        secondsCompleted: elapsedMinutes * 60,
        status: OUTCOME_STATUS[outcome] ?? "IN_PROGRESS",
        isStudyingCrossApp: false,
      }).catch(() => {
        // Best-effort — the user still returns to the app.
      });
    }
    clearActiveSessionTaskId();
    router.push("/home");
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home/session" aria-label="Back to Focus Session" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Welcome Back</h1>
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

      <div className="mx-auto w-full max-w-xl rounded-2xl border border-brand/10 bg-surface p-5 sm:p-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-tint-strong px-3 py-1 text-xs font-semibold text-ink">
            <ClockIcon />
            Session Overview
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-brand/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Active Task
            </p>
            <p className="mt-1 text-sm font-bold text-ink">{crossAppActivity}</p>
          </div>
          <div className="rounded-xl border border-brand/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Duration
            </p>
            <p className="mt-1 text-sm font-bold text-ink">{elapsedMinutes} mins elapsed</p>
          </div>
        </div>

        <p className="mt-5 text-center text-sm font-bold text-ink">How did it go?</p>

        <div className="mt-3 flex flex-col gap-3">
          {OUTCOMES.map((item) => (
            <RadioOption
              key={item.id}
              name="session-outcome"
              value={item.id}
              label={item.label}
              selected={outcome === item.id}
              onSelect={() => setOutcome(item.id)}
              unselectedLabelClassName="text-[#666666] dark:text-[#8B8998]"
            />
          ))}
        </div>

        <Button variant="primary" className="mt-6" onClick={handleConfirm}>
          Confirm
        </Button>
      </div>
    </div>
  );
}
