"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  // ArrowLeftIcon,
  // CalendarIcon,
  CheckIcon,
  // ClockIcon,
  // TargetIcon,
  // TrendingUpIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useStoredFullName } from "@/lib/auth/useStoredFullName";
import { TargetIcon, TrendingUpIcon, CalendarIcon, ClockIcon, LayersIcon, ArrowLeftIcon } from "@/assets/icons";
import { submitRevisionFeedback, type RevisionFeedback } from "@/lib/api/revision";
import { getPlannerTask, type PlannerTaskDetail } from "@/lib/api/planner";
import { formatClock } from "@/lib/utils/datetime";
type Difficulty = "Low" | "Medium" | "High";

const DIFFICULTIES: Difficulty[] = ["Low", "Medium", "High"];

const DIFFICULTY_FEEDBACK: Record<Difficulty, RevisionFeedback> = {
  Low: "EASY",
  Medium: "MEDIUM",
  High: "HARD",
};

export default function RevisionCompletePage() {
  return (
    <Suspense fallback={null}>
      <RevisionCompleteContent />
    </Suspense>
  );
}

function RevisionCompleteContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [isSubmittingFeedback, setSubmittingFeedback] = useState(false);
  const [task, setTask] = useState<PlannerTaskDetail | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const storedFullName = useStoredFullName();
  const firstName = storedFullName.trim().split(/\s+/)[0] || "there";

  // Loads the just-completed task so this screen can show its real title and
  // the focus time actually banked (secondsCompleted) instead of placeholders.
  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    getPlannerTask(taskId)
      .then(({ data }) => {
        if (!cancelled) setTask(data);
      })
      .catch(() => {
        // Best-effort — the page falls back to placeholder content below.
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const handleSelectDifficulty = (option: Difficulty) => {
    setDifficulty(option);
    if (!taskId) return;
    setSubmittingFeedback(true);
    submitRevisionFeedback(taskId, DIFFICULTY_FEEDBACK[option])
      .catch(() => {
        // Best-effort — the selection still reflects locally.
      })
      .finally(() => setSubmittingFeedback(false));
  };

  const STATS = [
    {
      icon: <ClockIcon className="size-[14px] sm:size-[15px]" />,
      value: task ? formatClock(task.secondsCompleted) : "24:53",
      label: "Focus time",
    },
    {
      icon: <LayersIcon className="size-[14px] sm:size-[15px]" />,
      value: "5 / 5",
      label: "Recall prompts",
    },
    {
      icon: <TrendingUpIcon className="size-[14px] sm:size-[15px]" />,
      value: "Good",
      label: "Performance",
    },
  ];

  return (
    <div className="flex w-full flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <Link
          href="/home/revision"
          className={`flex shrink-0 items-center gap-1 text-xs font-semibold leading-5 sm:text-sm ${isDark ? "text-muted" : "text-[#334155]"}`}
        >
          <ArrowLeftIcon className="h-[9.33px] w-3 shrink-0" />
          <span>Exit Session</span>
        </Link>

        <p className="order-3 w-full text-center text-xs font-extrabold uppercase leading-5 tracking-[2.8px] text-ink sm:order-none sm:w-auto sm:flex-1 sm:text-sm sm:tracking-[2.8px]">
          Last Revision
        </p>

        <span
          className={`hidden shrink-0 items-center gap-2 text-xs font-medium leading-4 sm:flex ${isDark ? "text-muted" : "text-[#6B7280]"}`}
        >
          <CalendarIcon className="h-3.75 w-3.75 shrink-0" />
          14 May 2024, 10:30 AM
        </span>
      </div>

      {/* Card */}
      <div className="w-full rounded-2xl border border-brand/10 bg-surface px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
        {/* Success header */}
        <div className="flex w-full flex-col items-center gap-2 text-center sm:gap-3">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] sm:size-20">
            <CheckIcon className="h-8 w-8 shrink-0 text-[#22C55E] [&>path]:stroke-[4.5px] sm:h-10 sm:w-10 sm:[&>path]:stroke-[5px]" />
          </span>

          <h1
            className={`text-2xl font-extrabold sm:text-3xl lg:text-4xl ${isDark ? "text-ink" : "text-[#0A1D43]"}`}
          >
            Great job, {firstName}
          </h1>

          <p
            className={`text-sm leading-5 sm:text-lg sm:leading-7 ${isDark ? "text-muted" : "text-[#6B7280]"}`}
          >
            You&apos;ve completed this revision session.
          </p>
        </div>

        {/* Stat tiles */}
        <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-6">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center rounded-2xl border border-brand/10 p-4 text-center first:col-span-2 sm:p-6 sm:first:col-span-1 lg:h-[194px] lg:justify-center lg:p-8"
            >
              {/* Icon circle: 40 × 40px */}
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8 sm:size-10">
                {/* Icon wrapper: 20 × 20px */}
                <span className="flex size-[18px] shrink-0 items-center justify-center sm:size-5 [&>svg]:size-[14px] [&>svg]:shrink-0 sm:[&>svg]:size-[15px]">
                  {stat.icon}
                </span>
              </span>

              {/* Value: 30px / 36px */}
              <p className="mt-3 text-[26px] font-extrabold leading-8 text-ink sm:mt-3 sm:text-[30px] sm:leading-9">
                {stat.value}
              </p>

              {/* Label: 14px / 20px */}
              <p className="mt-1 text-center text-xs font-medium leading-[18px] text-muted sm:text-sm sm:leading-5">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Difficulty rating */}
        <div
          className={`mt-6 w-full rounded-2xl border-2 border-dashed p-5 sm:mt-10 sm:rounded-3xl sm:p-6 lg:mt-12 lg:p-8 ${isDark ? "border-white/20" : "border-brand/15"}`}
        >
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-center text-lg font-bold leading-7 text-ink sm:text-[20px] sm:leading-7">
              How was this session?
            </h3>

            <p className="w-full text-center text-sm font-medium leading-5 text-[#666666]">
              Select the difficulty level to help us optimize your next revision
            </p>
          </div>

          <div className="mt-4 grid w-full grid-cols-3 gap-1 sm:mt-5 sm:gap-3 md:gap-4">
            {DIFFICULTIES.map((option) => {
              const selected = difficulty === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelectDifficulty(option)}
                  disabled={isSubmittingFeedback}
                  className={`flex min-w-0 flex-1 items-center justify-center rounded-xl border-2 bg-surface px-1 py-2.5 text-center transition-all duration-300 min-[360px]:px-2 sm:min-h-16 sm:px-3 lg:min-h-20 ${selected
                      ? "border-brand"
                      : isDark
                        ? "border-muted"
                        : "border-[#F3F4F6]"
                    }`}
                >
                  <span
                    className={`whitespace-nowrap text-[14px] font-bold leading-5 min-[360px]:text-[15px] sm:text-lg sm:leading-6 lg:text-[22px] lg:leading-[22px] ${isDark ? "text-ink" : "text-[#1E293B]"
                      }`}
                  >
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Topics revised */}
        <div className="mt-6 flex w-full flex-col gap-4 sm:mt-10 sm:gap-6">
          <p
            className={`text-xs font-extrabold uppercase tracking-[1.6px] ${isDark ? "text-ink" : "text-[#1F2937]"}`}
          >
            Topics Revised
          </p>

          {/* Topic Card */}
          <div
            className="
      flex flex-col gap-4
      rounded-2xl
      border border-[#F3F4F6] dark:border-[#FAF7F240]
      bg-surface
      p-5
      shadow-[0px_1px_2px_0px_#F9FAFB] dark:shadow-none
      sm:flex-row
      sm:items-center
      sm:justify-between
      sm:p-6
    "
          >
            <div className="flex min-w-0 items-center gap-3 sm:gap-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint text-base font-bold text-ink sm:h-14 sm:w-14 sm:text-[20px]">
                P
              </span>

              <div className="min-w-0 flex-1">
                <p className="break-words text-[15px] sm:text-[18px] font-extrabold leading-6 sm:leading-7 text-ink">
                  {task?.title ?? "Newton's Laws"}
                </p>

                <p className="mt-1 break-words text-xs sm:text-sm font-medium leading-5 text-[#6B7280]">
                  Physics • Concept Video • NCERT Chapter
                </p>
              </div>
            </div>

            <span className="self-start text-xs sm:self-center sm:text-sm font-bold text-muted whitespace-nowrap">
              Day 7 → Day 14
            </span>
          </div>
        </div>
        {/* Actions */}
        <div className="mt-6 w-full sm:mt-8">
          <Link
            href="/home/revision"
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-cta text-sm font-semibold leading-6 text-white transition-colors hover:bg-cta/90 sm:h-[60px] sm:text-base"
          >
            Back to Revision Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}