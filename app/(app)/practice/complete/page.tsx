"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import {
  BellIcon,
  ClockIcon,
  BoltIcon,
  AlertTriangleIcon,
  BookIcon,
  LightningIcon,
} from "@/components/ui/icons";

type Mastery = "mastered" | "on-track" | "needs-work" | "critical";

const MASTERY_STYLES: Record<Mastery, string> = {
  mastered: "bg-success-bg text-success",
  "on-track": "bg-tint text-ink",
  "needs-work": "bg-warning/10 text-warning",
  critical: "bg-cta/10 text-cta",
};

const MASTERY_LABELS: Record<Mastery, string> = {
  mastered: "Mastered",
  "on-track": "On Track",
  "needs-work": "Needs Work",
  critical: "Critical Weakness",
};

const SKILLS = [
  { name: "Tangents", correct: 3, total: 3, mastery: "mastered" as Mastery },
  { name: "Equations", correct: 2, total: 3, mastery: "on-track" as Mastery },
  { name: "Family of Circles", correct: 2, total: 3, mastery: "needs-work" as Mastery },
  { name: "Common Tangents", correct: 0, total: 3, mastery: "critical" as Mastery },
];

export default function PracticeCompletePage() {
  return (
    <Suspense fallback={null}>
      <PracticeCompleteContent />
    </Suspense>
  );
}

function PracticeCompleteContent() {
  const searchParams = useSearchParams();
  const correct = Number(searchParams.get("correct") ?? 7);
  const total = Number(searchParams.get("total") ?? 12);
  const elapsedSeconds = Number(searchParams.get("time") ?? 18 * 60);
  const minutes = Math.round(elapsedSeconds / 60);
  const avgPerQuestion = total > 0 ? (elapsedSeconds / 60 / total).toFixed(1) : "0";
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Practice Complete</h1>
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

      <div className="w-full rounded-3xl border border-brand/10 bg-surface shadow-hover">
        <div className="grid h-[274px] grid-cols-[220px_1fr_240px] items-center gap-10 px-10">

          {/* Score */}
          <div className="flex items-center justify-center pl-4">
            <CircularProgress
              percent={percent}
              displayValue={`${correct}/${total}`}
              suffix=""
              label="SCORE"
              size={168}
            />
          </div>

          {/* Content */}
          <div className="flex flex-col justify-center">
            <h2 className="text-[36px] font-extrabold leading-[40px] tracking-[-0.9px] text-ink whitespace-nowrap">
              Practice Complete
            </h2>

            <p className="mt-2 text-[20px] font-semibold leading-7 text-ink whitespace-nowrap">
              Maths • Coordinate Geometry
            </p>

            <div className="mt-5 flex items-center gap-3">
              <span className="flex h-9 items-center gap-2 rounded-2xl border border-muted px-4 text-[14px] font-bold text-muted">
                <ClockIcon />
                {minutes} min
              </span>

              <span className="flex h-9 items-center gap-2 rounded-2xl border border-muted px-4 text-[14px] font-bold text-muted whitespace-nowrap">
                <LightningIcon />
                Avg {avgPerQuestion} min/Q
              </span>
            </div>
          </div>

          {/* Button */}
          <div className="flex items-center justify-end">
            <Button
              href="/practice/custom"
              className="h-[46px] w-[217px] whitespace-nowrap rounded-xl bg-cta px-10 text-base font-semibold text-white hover:bg-cta"
            >
              Add Custom Practice
            </Button>
          </div>

        </div>
      </div>

    <div className="mx-auto w-full max-w-[1046px]">
  <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,684px)_322px]">

    {/* LEFT COLUMN */}
    <div className="flex min-w-0 flex-col gap-6">

      {/* PERFORMANCE BREAKDOWN */}
      <div className="flex h-[72px] items-center rounded-2xl border border-brand/10 bg-surface px-6">
        <p className="text-[14px] font-bold uppercase tracking-[1.4px] leading-5 text-body-text">
          PERFORMANCE BREAKDOWN
        </p>
      </div>

      {/* Four Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SKILLS.map((skill) => {
          const skillPercent = Math.round(
            (skill.correct / skill.total) * 100
          );

          return (
            <div
              key={skill.name}
              className="flex min-h-[126px] flex-col justify-between rounded-2xl border border-brand/10 bg-surface p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-bold text-ink">
                  {skill.name}
                </p>

                <span
                  className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase whitespace-nowrap ${MASTERY_STYLES[skill.mastery]}`}
                >
                  {MASTERY_LABELS[skill.mastery]}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-muted">
                  {skill.correct}/{skill.total} Correct
                </span>

                <span className="text-[14px] font-bold text-ink">
                  {skillPercent}%
                </span>
              </div>

              <div className="mt-3 h-2 rounded-full bg-tint-strong">
                <div
                  className="h-2 rounded-full bg-brand"
                  style={{ width: `${skillPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Consistency */}
      <div className="flex min-h-[121px] flex-col justify-center rounded-2xl border border-brand/10 bg-surface p-6">
        <p className="text-[10px] font-bold uppercase tracking-[1.2px] text-muted">
          CONSISTENCY
        </p>

        <p className="mt-2 text-[42px] font-extrabold leading-none text-ink">
          12 Day Streak
        </p>
      </div>
    </div>

    {/* RIGHT COLUMN */}
    <div className="flex min-w-0 flex-col gap-6">

      {/* Recovery */}
      <div className="min-h-[291px] rounded-2xl border-l-4 border-cta bg-surface p-6 shadow-sm">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[1.2px] text-cta">
          <BoltIcon />
          Recovery Detected
        </p>

        <div className="mt-5">
          <h3 className="text-[18px] font-bold leading-7 text-ink">
            Common Tangents needs work
          </h3>

          <p className="mt-3 text-[16px] leading-8 text-body-text">
            System analysis suggests reviewing geometric properties of
            intersecting circles before next attempt.
          </p>
        </div>
      </div>

      {/* Notebook */}
      <div className="min-h-[94px] rounded-2xl border border-brand/10 bg-surface p-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tint">
            <BookIcon />
          </span>

          <div className="min-w-0">
            <p className="text-[16px] font-semibold leading-6 text-ink">
              5 questions added to Mistake Notebook
            </p>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-[1.2px] text-muted">
              Automated Update
            </p>
          </div>
        </div>
      </div>

      {/* Tomorrow */}
      <div className="min-h-[94px] rounded-2xl border border-brand/10 bg-surface p-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tint">
            <ClockIcon />
          </span>

          <div className="min-w-0">
            <p className="text-[16px] font-semibold leading-6 text-ink">
              Tomorrow&apos;s plan updated
            </p>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-[1.2px] text-muted">
              AI Scheduler
            </p>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>
    </div>
  );
}
