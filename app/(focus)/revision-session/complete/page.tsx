"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeftIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  TargetIcon,
  TrendingUpIcon,
  StarIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";

type Difficulty = "Easy" | "Medium" | "Hard";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

export default function RevisionCompletePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");

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
          Last Revision
        </p>
        <span className="hidden shrink-0 items-center justify-end gap-1 text-xs text-muted sm:flex">
          <CalendarIcon />
          14 May 2024, 10:30 AM
        </span>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5 sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success">
            <CheckIcon />
          </span>
          <h1 className="text-h1 text-ink">Great job, Rohan</h1>
          <p className="text-sm text-muted">
            You&apos;ve completed this revision session.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-brand/10 p-3 text-center">
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-tint text-ink">
              <ClockIcon />
            </span>
            <p className="mt-2 text-sm font-extrabold text-ink">24:53</p>
            <p className="text-[11px] text-muted">Focus time</p>
          </div>
          <div className="rounded-xl border border-brand/10 p-3 text-center">
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-tint text-ink">
              <TargetIcon />
            </span>
            <p className="mt-2 text-sm font-extrabold text-ink">5 / 5</p>
            <p className="text-[11px] text-muted">Recall prompts</p>
          </div>
          <div className="rounded-xl border border-brand/10 p-3 text-center">
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-tint text-ink">
              <TrendingUpIcon />
            </span>
            <p className="mt-2 text-sm font-extrabold text-ink">Good</p>
            <p className="text-[11px] text-muted">Performance</p>
          </div>
          <div className="rounded-xl border border-brand/10 p-3 text-center">
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-tint text-ink">
              <StarIcon />
            </span>
            <div className="mt-2 flex justify-center gap-1">
              {DIFFICULTIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDifficulty(option)}
                  aria-pressed={difficulty === option}
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    difficulty === option
                      ? "bg-brand text-white"
                      : "text-muted hover:bg-tint-strong"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted">Difficulty rating</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Topics Revised
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand/10 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
                P
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">Newton&apos;s Laws</p>
                <p className="text-xs text-muted">
                  Physics • Concept Video • NCERT Chapter
                </p>
              </div>
            </div>
            <span className="text-xs text-muted">Day 7 → Day 14</span>
          </div>
        </div>

        <button
          type="button"
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl bg-tint-strong p-3 text-left"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink">
              <CalendarIcon />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">
                Next revision scheduled
              </span>
              <span className="block text-xs text-muted">
                Tuesday, 21 May 2024 • in 7 days
              </span>
            </span>
          </span>
          <ChevronDownIcon className="h-4 w-4 -rotate-90 text-muted" />
        </button>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1">
            <Link
              href="/revision-session"
              className="flex h-14 w-full items-center justify-center rounded-lg border border-brand/15 bg-surface text-base font-semibold text-body-text hover:bg-tint-strong"
            >
              Review another topic
            </Link>
          </div>
          <div className="flex-1">
            <Button href="/home/revision" variant="primary">
              Back to Revision Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
