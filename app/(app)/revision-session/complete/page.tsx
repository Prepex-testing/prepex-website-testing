"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { submitRevisionFeedback, demoteRevisionChapter, type RevisionFeedback } from "@/lib/api/revision";
import { getPlannerTask, type PlannerTaskDetail } from "@/lib/api/planner";
import { formatClock } from "@/lib/utils/datetime";
import { getChapterTitle } from "@/lib/utils/text";
type Difficulty = "Easy" | "Medium" | "Hard";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

const DIFFICULTY_FEEDBACK: Record<Difficulty, RevisionFeedback> = {
  Easy: "EASY",
  Medium: "MEDIUM",
  Hard: "HARD",
};

export default function RevisionCompletePage() {
  return (
    <Suspense fallback={null}>
      <RevisionCompleteContent />
    </Suspense>
  );
}

function RevisionCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [isSubmittingFeedback, setSubmittingFeedback] = useState(false);
  const [isDemoting, setDemoting] = useState(false);
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
  };

  const handleSubmit = async () => {
    if (!taskId) return;
    setSubmittingFeedback(true);
    try {
      await submitRevisionFeedback(taskId, DIFFICULTY_FEEDBACK[difficulty]);
      router.push("/home/revision");
    } catch {
      // Best-effort — nothing to recover here beyond re-enabling the button.
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleMoveChapterToLearning = async () => {
    const chapterId = task?.chapter?.id;
    if (!chapterId) return;
    setDemoting(true);
    try {
      await demoteRevisionChapter(chapterId);
      router.push("/home/revision");
    } catch {
      // Best-effort — nothing to recover here beyond re-enabling the button.
    } finally {
      setDemoting(false);
    }
  };

  const STATS = [
    {
      icon: <ClockIcon className="size-[14px] sm:size-[15px]" />,
      value: task ? formatClock(task.secondsCompleted) : "24:53",
      label: "Focus time",
    },
    {
      icon: <LayersIcon className="size-[14px] sm:size-[15px]" />,
      value: "0 / 0",
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

        <p className="order-3 w-full text-center text-xs font-extrabold uppercase leading-5 tracking-[2.8px] text-ink sm:order-none sm:w-auto sm:flex-1 sm:text-sm sm:tracking-[2.8px]">
          Last Revision
        </p>

        {/* <span
          className={`hidden shrink-0 items-center gap-2 text-xs font-medium leading-4 sm:flex ${isDark ? "text-muted" : "text-[#6B7280]"}`}
        >
          <CalendarIcon className="h-3.75 w-3.75 shrink-0" />
          14 May 2024, 10:30 AM
        </span> */}
      </div>

      {/* Card */}
      <div className="w-full rounded-2xl border border-brand/10 bg-surface px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
        {/* Success header */}
        <div className="flex w-full flex-col items-center gap-2 text-center sm:gap-3">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full border-0 bg-[#F0FDF4] dark:border-[6px] dark:border-[#4B5563] sm:size-20 sm:dark:border-[7px]">
            <CheckIcon className="h-8 w-8 shrink-0 text-[#22C55E] [&>path]:stroke-[3.5px] sm:h-10 sm:w-10 sm:[&>path]:stroke-[4px]" />
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
              className="flex flex-col items-center rounded-2xl border border-brand/10 p-4 text-center dark:border-[#FAF7F214] dark:bg-[#1A1A4E] sm:p-6 sm:first:col-span-1 lg:h-[194px] lg:justify-center lg:p-8"
            >
              {/* Icon circle */}
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8 sm:size-10">
                <span className="flex size-[18px] shrink-0 items-center justify-center sm:size-5 [&>svg]:size-[14px] [&>svg]:shrink-0 sm:[&>svg]:size-[15px]">
                  {stat.icon}
                </span>
              </span>

              {/* Value */}
              <p className="mt-5 text-[26px] font-extrabold leading-8 text-ink sm:text-[30px] sm:leading-9">
                {stat.value}
              </p>

              {/* Label */}
              <p className="mt-2 text-center text-xs font-medium leading-[18px] text-muted sm:text-sm sm:leading-5">
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
                  className={`flex h-[80px] min-w-0 items-center justify-center rounded-2xl border-2 bg-surface p-4 text-center transition-all duration-300 sm:h-[90px] md:h-[104px] ${selected
                    ? isDark
                      ? "border-[#FAF7F2]"
                      : "border-brand"
                    : isDark
                      ? "border-muted"
                      : "border-[#F3F4F6]"
                    }`}
                >
                  <span
                    className={`whitespace-nowrap font-['Plus_Jakarta_Sans'] text-[16px] font-bold leading-[16px] tracking-normal sm:text-[18px] sm:leading-[18px] md:text-[22px] md:leading-[22px] ${isDark ? "text-ink" : "text-[#1E293B]"
                      }`}
                  >
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Topics Revised */}
        <div className="mx-2 mt-6 flex w-auto flex-col gap-3 sm:mx-4 sm:mt-8 sm:gap-4">
          <p
            className={`mx-2 text-xs font-extrabold uppercase tracking-[1.6px] sm:mx-4 ${isDark ? "text-ink" : "text-[#1F2937]"
              }`}
          >
            Topics Revised
          </p>

          {/* Topic Card */}
          <div
            className="
      mx-2
      flex
      min-h-[90px]
      flex-col
      gap-3
      rounded-2xl
      border
      border-[#F3F4F6]
      bg-surface
      p-4
      shadow-[0px_1px_2px_0px_#F9FAFB]
      dark:border-[#FAF7F240]
      dark:shadow-none
      sm:mx-4
      sm:min-h-[102px]
      sm:flex-row
      sm:items-center
      sm:justify-between
      sm:gap-6
      sm:p-5
    "
          >
            <div
              className={`flex min-w-0 items-center gap-3 transition-opacity duration-300 sm:gap-4 ${task ? "opacity-100" : "opacity-0"}`}
            >
              <span
                className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-tint
          text-sm
          font-bold
          text-ink
          sm:h-12
          sm:w-12
          sm:text-base
        "
              >
                {task?.title?.trim()?.[0]?.toUpperCase() ?? ""}
              </span>

              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-extrabold leading-5 text-ink sm:text-base sm:leading-6">
                  {task?.title ? getChapterTitle(task.title) : ""}
                </p>

                <p className="mt-0.5 break-words text-[11px] font-medium leading-4 text-[#6B7280] sm:text-xs">
                  {task?.description ? getChapterTitle(task.description) : ""}
                </p>
              </div>
            </div>

            {/* <span className="self-start whitespace-nowrap text-[11px] font-bold text-muted sm:self-center sm:text-xs">
              Day 7 → Day 14
            </span> */}
          </div>

          {/* Actions */}
          <div className="mx-2 mt-1 flex w-auto flex-col gap-2 sm:mx-4 sm:mt-2 sm:gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmittingFeedback || isDemoting}
              className="
        flex
        h-12
        w-full
        items-center
        justify-center
        rounded-xl
        bg-cta
        text-sm
        font-semibold
        leading-5
        text-white
        transition-colors
        hover:bg-cta/90
        disabled:opacity-60
        sm:h-14
        sm:rounded-2xl
        sm:text-base
      "
            >
              Submit
            </button>

            {task?.isFirstRevision ? (
              <button
                type="button"
                onClick={handleMoveChapterToLearning}
                disabled={isDemoting || isSubmittingFeedback}
                className="
          flex
          h-12
          w-full
          items-center
          justify-center
          rounded-xl
          border-2
          border-brand
          bg-surface
          text-sm
          font-semibold
          leading-5
          text-brand
          transition-colors
          hover:bg-brand/5
          disabled:opacity-60
          sm:h-14
          sm:rounded-2xl
          sm:text-base
        "
              >
                Move Chapter to Learning
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}