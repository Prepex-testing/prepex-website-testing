"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckIcon,
  FileIcon,
  PlayIcon,
} from "@/components/ui/icons";

/**
 * Colors pulled directly from the Figma spec:
 *  - Navy / ink        #1A1A4E  (headings, primary text, borders on dark buttons)
 *  - Deep navy (Q text) #1E1B4B
 *  - Body gray          #374151
 *  - Muted gray         #6B7280
 *  - Label gray         #333333
 *  - Icon tint bg       #EEF0F8
 *  - Card border        #F1F5F9 / #F3F4F6 / #EEF0F7 / #E2E8F0
 *  - CTA orange         #FF7A59
 *
 * Dark mode colors are approximated from the dark-theme Figma reference
 * (deep navy background #0B0B2A, card surface #1A1A4E, white text) since the
 * spec sheet only listed light-mode tokens. Adjust the dark:* values below if
 * your design system already exposes CSS variables for these.
 */

const QUESTIONS = [
  "What is Newton's First Law of Motion?",
  "State Newton's Second Law with its formula.",
  "What are Newton's three laws of motion?",
  "Give a real-world example of Newton's Third Law.",
  "What is the difference between mass and weight?",
];

const REFERENCES = [
  { label: "NCERT Chapter", meta: "Chapter 5", icon: <FileIcon /> },
  { label: "Teacher Notes", meta: "Handwritten Notes", icon: <FileIcon /> },
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

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => {
    setQuestionIndex(Math.min(Math.max(index, 0), QUESTIONS.length - 1));
    setRecalled(false);
  };

  return (
    <div className="mx-auto flex max-w-[1213px] flex-col gap-6 bg-[#FAFAFA] p-4 dark:bg-[#0B0B2A] sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/home/revision"
          className="flex w-fit shrink-0 items-center gap-1 text-sm font-bold text-[#1A1A4E] dark:text-white"
        >
          <ArrowLeftIcon />
          Exit Session
        </Link>
        <p className="flex-1 truncate text-center text-[14px] font-extrabold uppercase tracking-[2.8px] text-[#1A1A4E] dark:text-white">
          Revision Session
        </p>
        <span className="w-[92px] shrink-0" aria-hidden="true" />
      </div>

      {/* Title */}
      <div>
        <h1 className="text-[28px] font-bold leading-[36px] text-[#1A1A4E] dark:text-white sm:text-[32px] sm:leading-[40px]">
          Newton&apos;s Laws
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="rounded-full bg-[#EEF0F8] px-2.5 py-1 text-[10px] font-extrabold uppercase leading-[15px] text-[#1A1A4E] dark:bg-white dark:text-[#1A1A4E]">
            Physics
          </span>
          <span className="text-[14px] font-medium leading-5 text-[#6B7280] dark:text-white/60">
            Concept Video • NCERT Chapter • Class 11
          </span>
        </div>
      </div>

      {/* Quick Recall + Focus Timer */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-[12px] font-extrabold uppercase leading-[15px] tracking-[1px] text-[#333333] dark:text-white/70">
          Quick Recall
        </p>
        <p className="text-sm font-bold text-[#1A1A4E] dark:text-white">
          Question {questionIndex + 1} of {QUESTIONS.length}
        </p>
        <div className="flex gap-1.5">
          {QUESTIONS.map((_, index) => (
            <span
              key={index}
              className={`h-3 w-3 rounded-full transition-colors ${
                index <= questionIndex
                  ? "bg-[#1A1A4E] dark:bg-white"
                  : "bg-[#1A1A4E]/10 dark:bg-white/15"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-[#1A1A4E]/10 bg-white px-5 py-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF0F8]">
            <ClockIcon />
          </span>
          <div className="flex flex-col items-start">
            <span className="text-[32px] font-bold leading-[38px] text-[#1A1A4E]">
              {formatTime(seconds)}
            </span>
            <span className="text-[10px] font-semibold uppercase leading-5 tracking-wide text-[#6B7280]">
              Focus Time
            </span>
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-3xl border border-[#EEF0F7] bg-gradient-to-b from-white to-[#FDFDFF] p-6 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-[#1A1A4E] dark:bg-none sm:p-8">
        <h2 className="mx-auto max-w-[606px] text-[22px] font-extrabold leading-[28px] text-[#1E1B4B] dark:text-white sm:text-[30px] sm:leading-[36px]">
          {QUESTIONS[questionIndex]}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-5 text-[#374151] dark:text-white/60">
          Take a moment to answer from memory.
        </p>
        <button
          type="button"
          onClick={() => setRecalled(true)}
          className={`mt-4 inline-flex h-[60px] items-center justify-center gap-2 rounded-xl border-2 px-6 text-base font-bold leading-6 transition-colors ${
            recalled
              ? "border-[#1A1A4E] bg-[#1A1A4E]/5 text-[#1A1A4E] dark:border-white dark:bg-white/10 dark:text-white"
              : "border-[#1A1A4E] text-[#1A1A4E] hover:bg-[#1A1A4E]/5 dark:border-white dark:text-white dark:hover:bg-white/10"
          }`}
        >
          <CheckIcon />
          I&apos;ve recalled this answer
        </button>
        <p className="mt-2 text-xs text-[#6B7280] dark:text-white/40">
          {recalled
            ? "Great — tap Next to continue."
            : "Tap Next when you're ready to continue."}
        </p>
      </div>

      {/* Previous / Skip / Next */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F3F4F6] bg-white px-4 py-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-[#1A1A4E]">
        <button
          type="button"
          onClick={() => goTo(questionIndex - 1)}
          disabled={questionIndex === 0}
          className="flex items-center gap-1 text-base font-bold leading-6 text-[#1A1A4E] disabled:opacity-30 dark:text-white"
        >
          <ArrowLeftIcon />
          Previous
        </button>
        <button
          type="button"
          onClick={() => goTo(questionIndex + 1)}
          className="text-base font-bold leading-6 text-[#6B7280] dark:text-white/50"
        >
          Skip Question »
        </button>
        <button
          type="button"
          onClick={() => goTo(questionIndex + 1)}
          disabled={questionIndex === QUESTIONS.length - 1}
          className="flex items-center gap-1 text-base font-bold leading-6 text-[#1A1A4E] disabled:opacity-30 dark:text-white"
        >
          Next
          <span className="inline-block rotate-180">
            <ArrowLeftIcon />
          </span>
        </button>
      </div>

      {/* Reference Review */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[#333333] dark:text-white/60">
          Reference Review
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REFERENCES.map((ref) => (
            <div
              key={ref.label}
              className="flex flex-col gap-4 rounded-2xl border border-[#F1F5F9] bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-[#1A1A4E]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#EEF0F8] text-[#1A1A4E] dark:bg-white/10 dark:text-white">
                {ref.icon}
              </span>
              <div>
                <p className="text-sm font-bold leading-5 text-[#1A1A4E] dark:text-white">
                  {ref.label}
                </p>
                <p className="text-[11px] leading-5 text-[#6B7280] dark:text-white/50">
                  {ref.meta}
                </p>
              </div>
              <button
                type="button"
                className="flex h-[38px] w-full items-center justify-center rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#1A1A4E] transition-colors hover:bg-[#F8FAFC] dark:border-white/20 dark:text-white dark:hover:bg-white/5"
              >
                Open ↗
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#6B7280] dark:text-white/40">
          Open any resource to review before continuing.
        </p>
      </div>

      {/* End session */}
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/revision-session/complete"
          className="flex h-[68px] w-full items-center justify-center rounded-2xl bg-[#FF7A59] text-lg font-bold leading-7 text-white transition-colors hover:bg-[#FF7A59]/90"
        >
          End session, rate difficulty
        </Link>
        <button
          type="button"
          className="text-sm font-semibold text-[#6B7280] transition-colors hover:text-[#1A1A4E] dark:text-white/50 dark:hover:text-white"
        >
          Pause Session
        </button>
      </div>
    </div>
  );
}