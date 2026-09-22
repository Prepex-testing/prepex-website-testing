"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { RadioOption } from "@/components/ui/RadioOption";
import { ArrowLeftIcon, ClockIcon } from "@/components/ui/icons";
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
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 flex items-center gap-3">
        </div>
       <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl rounded-2xl border border-brand/10 bg-surface p-5 sm:p-8">
        {/* Header */}
        <div className="flex h-auto min-h-[81.39px] w-full max-w-[512px] flex-col gap-2 text-center">
          {/* First row */}
          <div className="flex min-h-[51px] w-full items-start justify-center pt-3">
            <h2 className="whitespace-nowrap font-['Plus_Jakarta_Sans'] text-[clamp(24px,5vw,32px)] font-bold leading-[1.2] tracking-[-0.64px] text-ink">
              Welcome Back
            </h2>
          </div>

          {/* Second row */}
          <div className="flex min-h-[22.39px] w-full items-center justify-center">
            <span className="inline-flex h-[22.39px] shrink-0 items-center justify-center gap-2 rounded-full bg-tint-strong px-3 py-1 font-['Plus_Jakarta_Sans'] text-[12px] font-semibold leading-[14.4px] text-ink">
              <ClockIcon className="h-[11.67px] w-[11.67px] shrink-0" />
              <span className="whitespace-nowrap">Session Overview</span>
            </span>
          </div>
        </div>

        {/* Session Overview */}
        <div className="mt-5 grid w-full max-w-[512px] grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Left Box */}
          <div className="flex min-h-[116px] w-full flex-col gap-1 rounded-[12px] border border-brand/10 p-5">
            <p className="h-[14px] font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase leading-[13.2px] text-muted">
              Active Task
            </p>

            <p className="font-['Plus_Jakarta_Sans'] text-[20px] font-semibold leading-7 text-ink">
              {crossAppActivity}
            </p>
          </div>

          {/* Right Box */}
          <div className="flex min-h-[116px] w-full flex-col gap-1 rounded-[12px] border border-brand/10 p-5">
            <p className="h-[14px] font-['Plus_Jakarta_Sans'] text-[11px] font-medium uppercase leading-[13.2px] text-muted">
              Duration
            </p>

            <p className="font-['Plus_Jakarta_Sans'] text-[20px] font-semibold leading-7 text-ink">
              {elapsedMinutes} mins elapsed
            </p>
          </div>
        </div>

        {/* Outcome Question */}
        <p className="mt-5 w-full font-['Plus_Jakarta_Sans'] text-center text-[20px] font-semibold leading-7 tracking-normal text-ink">
          How did it go?
        </p>

        {/* Outcomes */}
        <div className="mt-3 flex flex-col gap-2">
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

        {/* Confirm */}
        <Button
          variant="primary"
          className="mt-6 w-full"
          onClick={handleConfirm}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
