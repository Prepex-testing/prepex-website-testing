"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useTheme } from "@/components/theme/ThemeProvider";
import { UserMenu } from "@/components/layout/UserMenu";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import {
  BellIcon,
  // ClockIcon,
  TargetIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  // BoltIcon,
} from "@/components/ui/icons";
import { LayersIcon, ClockIcon, VectorIcon } from "@/assets/icons";
type Mastery = "mastered" | "on-track" | "needs-work" | "critical";

const MASTERY_STYLES: Record<
  Mastery,
  { badgeBg: string; badgeText: string; percentText: string; rowClass: string }
> = {
  mastered: {
    badgeBg: "bg-[rgba(67,176,144,0.1)]",
    badgeText: "text-[#28B485]",
    percentText: "text-[#28B485]",
    rowClass: "bg-surface border-transparent",
  },
  "on-track": {
    badgeBg: "bg-[#E7F9F3]",
    badgeText: "text-[#28B485]",
    percentText: "text-ink",
    rowClass: "bg-surface border-transparent",
  },
  "needs-work": {
    badgeBg: "bg-[rgba(245,158,11,0.1)]",
    badgeText: "text-[#FFAE1A]",
    percentText: "text-ink",
    rowClass: "bg-surface border-transparent",
  },
  critical: {
    badgeBg: "bg-[rgba(245,158,11,0.1)]",
    badgeText: "text-[#F59E0B]",
    percentText: "text-[#F59E0B]",
    rowClass: "bg-[rgba(245,158,11,0.05)] border-[rgba(255,127,92,0.2)]",
  },
};

const SKILLS = [
  { name: "Tangents", correct: 3, total: 3, mastery: "mastered" as Mastery },
  { name: "Equations", correct: 2, total: 3, mastery: "on-track" as Mastery },
  { name: "Common Tangents", correct: 0, total: 3, mastery: "critical" as Mastery },
  { name: "Family of Circles", correct: 2, total: 3, mastery: "needs-work" as Mastery },
];

export default function PracticeCompletePage() {
  return (
    <Suspense fallback={null}>
      <PracticeCompleteContent />
    </Suspense>
  );
}

function PracticeCompleteContent() {
  const { resolvedTheme } = useTheme();
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
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Score card */}
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-brand/10 bg-surface p-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg  bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
                <LayersIcon />
              </span>
              <h2 className="text-[40px] font-extrabold leading-10 tracking-[-1px] text-ink whitespace-nowrap">
                {correct} / {total} Correct
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[20px] font-bold leading-7  text-muted">
                Maths · Coordinate Geometry
              </p>

              <div className="flex items-center gap-3 text-[15px] font-medium text-muted">
                <ClockIcon />
                <span>
                  Time: {minutes} min · Avg {avgPerQuestion} min/Q
                </span>
              </div>
            </div>
          </div>

          <CircularProgress
            percent={Math.max(percent, 2)}
            displayValue={percent}
            size={128}
            progressColor={resolvedTheme === "dark" ? "#ffffff" : "#1A1A4E"}
          />
        </div>

        {/* Performance breakdown */}
        <div className="rounded-2xl border border-brand/10 bg-surface p-6">
          <div className="flex items-center justify-between border-b border-tint-strong pb-5">
            <p className="text-[13px] font-bold uppercase tracking-[1.95px] text-ink">
              Performance Breakdown
            </p>
            <span className="rounded-2xl bg-tint px-3 py-1 text-caption font-semibold uppercase text-ink dark:bg-white dark:text-[#1A1A4E]">
              Skill Analytics
            </span>
          </div>

          <div className="flex flex-col gap-3 pt-6">
            {SKILLS.map((skill) => {
              const skillPercent = Math.round((skill.correct / skill.total) * 100);
              const style = MASTERY_STYLES[skill.mastery];
              const isCritical = skill.mastery === "critical";
              const isWarning = skill.mastery === "needs-work" || isCritical;

              return (
                <div
                  key={skill.name}
                  className={`flex items-center justify-between rounded-2xl border p-5 ${style.rowClass}`}
                >
                  <p className="text-[18px] font-bold text-body-text">{skill.name}</p>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-bold ${style.badgeBg} ${style.badgeText}`}
                      >
                        {isWarning ? <AlertTriangleIcon /> : <CheckCircleIcon />}
                        {skill.correct}/{skill.total}
                      </span>
                      {isCritical && (
                        <span className="text-[#F59E0B]">
                          <AlertTriangleIcon />
                        </span>
                      )}
                    </div>
                    <span className={`w-12 text-right text-[15px] font-bold ${style.percentText}`}>
                      {skillPercent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Next focus */}
        <div className="rounded-2xl border border-brand/10 bg-surface p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(245,158,11,0.1)] text-[#F59E0B]">
              <VectorIcon className="w-5 h-5" />
            </span>
            <p className="text-caption font-extrabold uppercase tracking-[1.2px] text-[#F59E0B]">
              Next Focus
            </p>
          </div>

          <h3 className="mt-3 text-[18px] font-bold text-body-text">Gap to close</h3>

          <p className="mt-1 text-[15px] leading-6 text-muted">
            The trouble was finding circle intersections. Three more focused attempts and
            you&apos;ll have it.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-5">
          <Button
            href="/practice/analysis"
            className="h-17 rounded-2xl bg-cta text-[18px] font-bold text-white hover:bg-cta"
          >
            View Question by Question Analysis
          </Button>

          <Button
            href="/practice/analysis"
            variant="secondary"
            className="h-18 rounded-2xl border-2 border-ink bg-transparent text-[18px] font-bold text-ink hover:bg-tint-strong"
          >
            View Solution
          </Button>
        </div>
      </div>
    </div>
  );
}
