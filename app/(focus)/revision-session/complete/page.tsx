"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  // CalendarIcon,
  CheckIcon,
  // ClockIcon,
  // TargetIcon,
  // TrendingUpIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import { useTheme } from "@/components/theme/ThemeProvider";
import { TargetIcon, TrendingUpIcon, CalendarIcon, ClockIcon, LayersIcon } from "@/assets/icons";
type Difficulty = "Low" | "Medium" | "High";

const DIFFICULTIES: Difficulty[] = ["Low", "Medium", "High"];

const STATS = [
  { icon: <ClockIcon />, value: "24:53", label: "Focus time" },
  { icon: <LayersIcon />, value: "5 / 5", label: "Recall prompts" },
  { icon: <TrendingUpIcon />, value: "Good", label: "Performance" },
];

export default function RevisionCompletePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="mx-auto flex w-full max-w-[1083px] flex-col gap-4 p-4 sm:gap-6 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <Link
          href="/home/revision"
          className="flex shrink-0 items-center gap-1 text-sm font-semibold leading-5 text-ink"
        >
          <ArrowLeftIcon />
          Exit Session
        </Link>

        <p className="order-3 w-full text-center text-xs font-extrabold uppercase leading-5 tracking-[2.8px] text-ink sm:order-none sm:w-auto sm:flex-1 sm:text-sm sm:tracking-[2.8px]">
          Last Revision
        </p>

        <span className="hidden shrink-0 items-center gap-2 text-xs font-medium leading-4 text-muted sm:flex">
          <CalendarIcon />
          14 May 2024, 10:30 AM
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-[1083px] rounded-2xl border border-brand/10 bg-surface px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
        {/* Success header */}
        <div className="flex w-full flex-col items-center gap-2 text-center sm:gap-3">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-full text-success sm:h-12 sm:w-12 ${isDark ? "bg-white" : "bg-success-bg"}`}
          >
            <CheckIcon />
          </span>

          <h1 className="text-xl font-bold text-ink sm:text-2xl lg:text-h1">
            Great job, Rohan
          </h1>

          <p className="text-sm leading-5 text-muted">
            You&apos;ve completed this revision session.
          </p>
        </div>

        {/* Stat tiles */}
        <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-6">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center rounded-2xl border border-brand/10  p-4 text-center first:col-span-2 sm:p-6 sm:first:col-span-1 lg:h-[194px] lg:justify-center lg:p-8"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8 sm:h-10 sm:w-10">
                {stat.icon}
              </span>

              <p className="pt-3 text-2xl font-extrabold leading-tight text-ink sm:pt-4 sm:text-3xl lg:text-[36px] lg:leading-[52px]">
                {stat.value}
              </p>

              <p className="mt-1 text-center text-xs font-medium leading-5 text-muted sm:mt-2 sm:text-sm">
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
            <h3 className="text-base font-bold leading-6 text-ink sm:text-lg lg:text-[20px] lg:leading-7">
              How was this session?
            </h3>

            <p className="text-xs font-medium leading-5 text-muted sm:text-sm">
              Select the difficulty level to help us optimize your next revision
            </p>
          </div>

          <div className="mt-4 grid w-full grid-cols-3 gap-2 sm:mt-6 sm:gap-4">
            {DIFFICULTIES.map((option) => {
              const selected = difficulty === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDifficulty(option)}
                  aria-pressed={selected}
                  className={`flex h-16 items-center justify-center rounded-xl border-2 p-2 transition-all sm:h-20 sm:rounded-2xl sm:p-4 lg:h-[104px] ${selected
                    ? "border-brand bg-surface text-ink"
                    : isDark
                      ? "border-white/20 bg-surface text-ink hover:border-white/40"
                      : "border-brand/15 bg-surface text-ink hover:border-brand/30"
                    }`}
                >
                  <span className="text-sm font-bold leading-none sm:text-lg lg:text-[22px]">
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Topics revised */}
        <div className="mt-6 flex w-full flex-col gap-4 sm:mt-10 sm:gap-6">
          <p className="text-xs font-extrabold uppercase tracking-[1.6px] text-muted">
            Topics Revised
          </p>

          {/* Topic Card */}
          <div
            className="
      flex flex-col gap-4
      rounded-2xl
      border border-brand/10 dark:border-[#FAF7F240]
      bg-surface
      p-4
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
                  Newton&apos;s Laws
                </p>

                <p className="mt-1 break-words text-xs sm:text-sm font-medium leading-5 text-muted">
                  Physics • Concept Video • NCERT Chapter
                </p>
              </div>
            </div>

            <span className="self-start text-xs sm:self-center sm:text-sm font-bold text-muted whitespace-nowrap">
              Day 7 → Day 14
            </span>
          </div>

          {/* Next Revision */}
          <button
            type="button"
            className={`
      flex
      flex-col
      gap-4
      rounded-2xl
      border
      border-transparent
      dark:border-[#FAF7F240]
      px-4
      py-4
      text-left
      transition-colors
      hover:bg-tint-strong
      sm:flex-row
      sm:items-center
      sm:justify-between
      sm:px-6
      sm:py-6
      ${isDark
                ? "bg-transparent"
                : "bg-tint"
              }
    `}
          >
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-icon-chip-bg text-ink shadow-sm dark:bg-[#FAF7F2]/8 sm:h-12 sm:w-12">
                <CalendarIcon />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-bold text-ink">
                  Next revision scheduled
                </p>

                <p className="mt-1 break-words text-xs sm:text-sm font-medium leading-5 text-muted">
                  Tuesday, 21 May 2024 • in 7 days
                </p>
              </div>
            </div>

            <ChevronDownIcon className="h-5 w-5 shrink-0 self-end -rotate-90 text-ink sm:self-center sm:h-6 sm:w-6" />
          </button>
        </div>
        {/* Actions */}
        <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-[2fr_3fr] lg:gap-8">
          <Link
            href="/revision-session"
            className="flex h-14 items-center justify-center rounded-2xl border-2 border-brand bg-surface text-sm font-semibold leading-6 text-ink transition-colors hover:bg-tint-strong sm:text-base lg:h-[60px]"
          >
            Review another topic
          </Link>

          <Link
            href="/home/revision"
            className="flex h-14 items-center justify-center rounded-2xl bg-cta text-sm font-semibold leading-6 text-white transition hover:bg-cta/90 sm:text-base lg:h-[60px]"
          >
            Back to Revision Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}