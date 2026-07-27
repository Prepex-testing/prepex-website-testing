"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckIcon,
  FileIcon,
  // PlayIcon,
} from "@/components/ui/icons";
import { useTheme } from "@/components/theme/ThemeProvider";
import { TargetIcon, PlayIcon, Open } from "@/assets/icons";

const QUESTIONS = [
  "What is Newton's First Law of Motion?",
  "State Newton's Second Law with its formula.",
  "What are Newton's three laws of motion?",
  "Give a real-world example of Newton's Third Law.",
  "What is the difference between mass and weight?",
];

const REFERENCES = [
  { label: "NCERT Chapter", meta: "Chapter 5", icon: <TargetIcon /> },
  { label: "Teacher Notes", meta: "Handwritten Notes", icon: <TargetIcon /> },
  { label: "Lecture Slides", meta: "PDF • 24 Slides", icon: <PlayIcon /> },
];

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function RevisionSessionPage() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [recalled, setRecalled] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => {
    setQuestionIndex(Math.min(Math.max(index, 0), QUESTIONS.length - 1));
    setRecalled(false);
  };

  return (
    <div className="mx-auto flex max-w-[1213px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/home/revision"
          className={`flex w-fit shrink-0 items-center gap-1 text-sm font-bold ${isDark ? "text-muted" : "text-ink"}`}
        >
          <ArrowLeftIcon />
          Exit Session
        </Link>
        <p className="flex-1 truncate text-center text-[14px] font-extrabold uppercase tracking-[2.8px] text-ink">
          Revision Session
        </p>
        <span className="w-[92px] shrink-0" aria-hidden="true" />
      </div>

      {/* Title */}
      <div>
        <h1 className="text-[28px] font-bold leading-[36px] text-ink sm:text-[32px] sm:leading-[40px]">
          Newton&apos;s Laws
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase leading-[15px] ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"}`}
          >
            Physics
          </span>
          <span className="text-[14px] font-medium leading-5 text-muted">
            Concept Video • NCERT Chapter • Class 11
          </span>
        </div>
      </div>

      {/* Quick Recall + Focus Timer */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-[12px] font-extrabold uppercase leading-[15px] tracking-[1px] text-muted">
          Quick Recall
        </p>
        <p className="text-sm font-bold text-ink">
          Question {questionIndex + 1} of {QUESTIONS.length}
        </p>
        <div className="flex gap-1.5">
          {QUESTIONS.map((_, index) => (
            <span
              key={index}
              className={`h-3 w-3 rounded-full transition-colors ${index <= questionIndex ? "bg-ink" : "bg-ink/10"
                }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-brand/10 bg-surface px-5 py-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] dark:bg-ink">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0F8] text-[#1A1A4E] dark:bg-transparent dark:text-[#111145]">
            <ClockIcon />
          </span>
          <div className="flex flex-col items-start">
            <span className="text-[32px] font-bold leading-[38px] text-ink dark:text-[#111145]">
              {formatTime(seconds)}
            </span>
            <span className="text-[10px] font-semibold  leading-5 tracking-wide text-muted dark:text-[#111145]/70">
              Focus Time
            </span>
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-3xl border border-brand/10 bg-surface p-6 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] sm:p-8">
        <h2 className="mx-auto max-w-[606px] text-[22px] font-extrabold leading-[28px] text-ink sm:text-[30px] sm:leading-[36px]">
          {QUESTIONS[questionIndex]}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-5 text-body-text">
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
          <CheckIcon />
          <span className="break-words">
            I&apos;ve recalled this answer
          </span>
        </button>
        <p className="mt-2 text-xs text-muted">
          {recalled
            ? "Great — tap Next to continue."
            : "Tap Next when you're ready to continue."}
        </p>
      </div>

      {/* Previous / Skip / Next */}
      <div className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface px-4 py-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] sm:flex-row sm:items-center sm:justify-between">
        {/* Previous */}
        <button
          type="button"
          onClick={() => goTo(questionIndex - 1)}
          disabled={questionIndex === 0}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold text-ink disabled:opacity-30 sm:h-auto sm:w-auto sm:justify-start sm:text-base"
        >
          <ArrowLeftIcon />
          <span>Previous</span>
        </button>

        {/* Skip */}
        <button
          type="button"
          onClick={() => goTo(questionIndex + 1)}
          className="h-11 w-full rounded-lg text-center text-sm font-bold text-muted sm:h-auto sm:w-auto sm:text-base"
        >
          Skip Question »
        </button>

        {/* Next */}
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
      </div>

      {/* Reference Review */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
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
                className={`mt-4 flex h-[38px] w-full items-center justify-center gap-2 rounded-lg border text-sm font-semibold text-ink transition-colors hover:bg-tint-strong ${isDark ? "border-white" : "border-brand/15"
                  }`}
              >
                <span>Open</span>
                <Open className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Open any resource to review before continuing.
        </p>
      </div>

      {/* End session */}
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/revision-session/complete"
          className="flex h-[68px] w-full items-center justify-center rounded-2xl bg-cta text-lg font-bold leading-7 text-white transition-colors hover:bg-cta/90"
        >
          End session, rate difficulty
        </Link>
        <button
          type="button"
          className="text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          Pause Session
        </button>
      </div>
    </div>
  );
}