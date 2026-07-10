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

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex min-w-0 items-center gap-4">
          <CircularProgress percent={percent} displayValue={`${correct}/${total}`} suffix="" label="Score" size={90} />
          <div className="min-w-0">
            <p className="text-lg font-bold text-ink">Practice Complete</p>
            <p className="text-sm text-muted">Maths • Coordinate Geometry</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full border border-brand/15 px-3 py-1 text-xs font-semibold text-ink">
                {minutes} min
              </span>
              <span className="rounded-full border border-brand/15 px-3 py-1 text-xs font-semibold text-ink">
                Avg {avgPerQuestion} min/Q
              </span>
            </div>
          </div>
        </div>
        <Button href="/practice/custom" variant="secondary" size="sm" className="shrink-0">
          Add Custom Practice
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-brand/10 bg-surface p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Performance Breakdown
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SKILLS.map((skill) => {
              const skillPercent = Math.round((skill.correct / skill.total) * 100);
              return (
                <div key={skill.name} className="rounded-xl border border-brand/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-bold text-ink">{skill.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${MASTERY_STYLES[skill.mastery]}`}
                    >
                      {MASTERY_LABELS[skill.mastery]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted">
                      {skill.correct}/{skill.total} Correct
                    </span>
                    <span className="font-semibold text-ink">{skillPercent}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-tint-strong">
                    <div
                      className="h-1.5 rounded-full bg-brand"
                      style={{ width: `${skillPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl bg-cta/10 p-4">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-cta">
              <AlertTriangleIcon />
              Next Focus
            </p>
            <p className="mt-1 text-sm font-bold text-ink">Gap to close</p>
            <p className="text-xs text-muted">
              The trouble was finding circle intersections. Three more focused attempts and
              you&apos;ll have it.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/practice/analysis"
              className="flex h-11 w-full items-center justify-center rounded-lg bg-cta text-sm font-semibold text-white hover:bg-cta/90"
            >
              View Question by Question Analysis
            </Link>
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center rounded-lg border border-brand/15 bg-surface text-sm font-semibold text-body-text hover:bg-tint-strong"
            >
              View Solution
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-brand/10 bg-surface p-4">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-cta">
              <BoltIcon />
              Recovery Detected
            </p>
            <p className="mt-1 text-sm font-bold text-ink">Common Tangents needs work</p>
            <p className="mt-1 text-xs text-muted">
              System analysis suggests reviewing geometric properties of intersecting circles
              before next attempt.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-brand/10 bg-surface p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
              <BookIcon />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">
                5 questions added to Mistake Notebook
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted">
                Automated Update
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-brand/10 bg-surface p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
              <ClockIcon />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Tomorrow&apos;s plan updated</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">
                AI Scheduler
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-brand/10 bg-surface p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Consistency
            </p>
            <p className="text-lg font-bold text-ink">12 Day Streak</p>
          </div>
        </div>
      </div>
    </div>
  );
}
