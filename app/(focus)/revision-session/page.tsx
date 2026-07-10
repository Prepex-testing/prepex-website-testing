"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckIcon,
  FileIcon,
  PlayIcon,
} from "@/components/ui/icons";

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
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/home/revision"
          className="flex w-fit shrink-0 items-center gap-1 text-sm font-semibold text-ink"
        >
          <ArrowLeftIcon />
          Exit Session
        </Link>
        <p className="flex-1 truncate text-center text-xs font-bold uppercase tracking-wide text-muted">
          Revision Session
        </p>
        <span className="shrink-0" />
      </div>

      <div>
        <h1 className="text-h1 text-ink">Newton&apos;s Laws</h1>
        <p className="mt-1 text-xs text-muted">
          <span className="rounded-full bg-tint px-2 py-0.5 font-semibold uppercase text-ink">
            Physics
          </span>{" "}
          Concept Video • NCERT Chapter • Class 11
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Quick Recall
        </p>
        <p className="text-sm font-bold text-ink">
          Question {questionIndex + 1} of {QUESTIONS.length}
        </p>
        <div className="flex gap-1.5">
          {QUESTIONS.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 w-6 rounded-full ${
                index <= questionIndex ? "bg-brand" : "bg-brand/10"
              }`}
            />
          ))}
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-brand/10 bg-surface px-6 py-3">
          <span className="flex items-center gap-1 text-lg font-bold text-ink">
            <ClockIcon />
            {formatTime(seconds)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Focus Time
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-8 text-center">
        <h2 className="text-h2 text-ink">{QUESTIONS[questionIndex]}</h2>
        <p className="mt-2 text-xs text-muted">
          Take a moment to answer from memory.
        </p>
        <button
          type="button"
          onClick={() => setRecalled(true)}
          className={`mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-semibold transition-colors ${
            recalled
              ? "border-brand bg-tint-strong text-ink"
              : "border-brand/15 text-ink hover:bg-tint-strong"
          }`}
        >
          <CheckIcon />
          I&apos;ve recalled this answer
        </button>
        <p className="mt-2 text-xs text-muted">
          {recalled ? "Great — tap Next to continue." : "Tap Next when you're ready to continue."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-ink">
        <button
          type="button"
          onClick={() => goTo(questionIndex - 1)}
          disabled={questionIndex === 0}
          className="flex items-center gap-1 disabled:opacity-30"
        >
          <ArrowLeftIcon />
          Previous
        </button>
        <button
          type="button"
          onClick={() => goTo(questionIndex + 1)}
          className="text-muted"
        >
          Skip Question »
        </button>
        <button
          type="button"
          onClick={() => goTo(questionIndex + 1)}
          disabled={questionIndex === QUESTIONS.length - 1}
          className="flex items-center gap-1 disabled:opacity-30"
        >
          Next
          <span className="inline-block rotate-180">
            <ArrowLeftIcon />
          </span>
        </button>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Reference Review
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {REFERENCES.map((ref) => (
            <div
              key={ref.label}
              className="flex flex-col items-start gap-2 rounded-xl border border-brand/10 bg-surface p-3"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tint text-ink">
                {ref.icon}
              </span>
              <div>
                <p className="text-xs font-semibold text-ink">{ref.label}</p>
                <p className="text-[11px] text-muted">{ref.meta}</p>
              </div>
              <Button variant="secondary" size="sm" className="w-full">
                Open ↗
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Open any resource to review before continuing.
        </p>
      </div>

      <Link
        href="/revision-session/complete"
        className="flex h-14 w-full items-center justify-center rounded-lg bg-cta text-base font-semibold text-white hover:bg-cta/90"
      >
        End session, rate difficulty
      </Link>
    </div>
  );
}
