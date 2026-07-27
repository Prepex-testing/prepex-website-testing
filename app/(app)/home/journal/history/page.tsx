"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  // ArrowLeftIcon,
  // BellIcon,
  // ClockIcon,
  // CalendarIcon,
} from "@/components/ui/icons";
import { CalendarIcon, ClockIcon ,ArrowLeftIcon,BellIcon} from "@/assets/icons";
type HistoryEntry = {
  id: string;
  badge: string;
  title: string;
  description?: string;
  progressLabel: string;
  progressValue: string;
  progressPercent: number;
  dateRange: string;
};

const MAY_ENTRIES: HistoryEntry[] = [
  {
    id: "consistency-streak",
    badge: "Best This Month",
    title: "14-Day Consistency Streak",
    description: "You completed every planned study session this week.",
    progressLabel: "Consistency Goal",
    progressValue: "100%",
    progressPercent: 100,
    dateRange: "May 12 - May 18",
  },
  {
    id: "mock-marks",
    badge: "Accuracy Improved by 6%",
    title: "+8 Marks in Mock",
    progressLabel: "Score Improvement",
    progressValue: "Active",
    progressPercent: 60,
    dateRange: "May 5 - May 11",
  },
];

const APRIL_ENTRIES: HistoryEntry[] = [
  {
    id: "recovery-week",
    badge: "Burnout Prevented",
    title: "Recovery Week Honored",
    progressLabel: "Recovery Status",
    progressValue: "Restored",
    progressPercent: 100,
    dateRange: "Apr 28 - May 4",
  },
  {
    id: "full-plan",
    badge: "Major Milestone",
    title: "First Full Weekly Plan Completed",
    description: "You stuck to your entire weekly plan without missing a single task.",
    progressLabel: "Plan Completion",
    progressValue: "100%",
    progressPercent: 100,
    dateRange: "Apr 21 - Apr 27",
  },
];

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="rounded-2xl border border-brand/10 bg-surface p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* LEFT SIDE */}
        <div className="flex w-full max-w-[672px] flex-col gap-1">
          {/* Badge */}
          <span
            className={`inline-flex w-fit items-center rounded-full px-2 py-1 text-[9px] font-extrabold uppercase leading-[13.5px] tracking-[0.45px] ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"}`}
          >
            {entry.badge}
          </span>

          {/* Title */}
          <p className="mt-1 text-[20px] font-extrabold leading-[28px] text-ink">
            {entry.title}
          </p>

          {/* Description */}
          {entry.description && (
            <p className="text-[13px] leading-[20px] text-muted">
              {entry.description}
            </p>
          )}

          {/* Progress */}
          <div className="mt-2 flex w-full max-w-[320px] items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-muted">
            <span>{entry.progressLabel}</span>
            <span className="text-ink">{entry.progressValue}</span>
          </div>
          <div
            className={`h-[6px] w-full max-w-[320px] rounded-full ${isDark ? "bg-white/15" : "bg-tint-strong"}`}
          >
            <div
              className={`h-full rounded-full ${isDark ? "bg-white" : "bg-brand"}`}
              style={{ width: `${entry.progressPercent}%` }}
            />
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex w-full shrink-0 flex-row items-center justify-between gap-4 lg:w-[160px] lg:flex-col lg:items-end lg:justify-between lg:gap-[54px]">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <CalendarIcon />
            {entry.dateRange}
          </span>

          <Link
            href="/home/journal"
            className={`inline-flex h-12 w-full max-w-[160px] sm:w-[160px] shrink items-center justify-center gap-3 rounded-lg border px-4 sm:px-8 text-[14px] sm:text-[16px] font-bold whitespace-nowrap text-ink transition-colors hover:bg-[#FF7A59] hover:text-white ${isDark ? "border-white" : "border-brand"
              }`}
          >
            View Card
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WinJournalHistoryPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home/journal" aria-label="Back to Weekly Win Journal" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <div>
            <h1 className="text-h1 text-ink">Win Journal History</h1>
            <p className="flex items-center gap-1 text-xs text-muted">
              <ClockIcon />
              12 weeks tracked
            </p>
          </div>
        </div>
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

      <div className="relative overflow-hidden rounded-2xl border border-brand/10 bg-surface px-6 py-8 sm:px-8 lg:px-10 lg:pt-12 lg:pb-10 min-h-[312px]">
        {/* Background Circle */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-tint-strong opacity-40" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10 h-full">
          {/* Left Section */}
          <div className="flex w-full max-w-[568px] flex-col gap-4">
            {/* Top Labels */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${isDark ? "bg-white text-[#1A1A4E]" : "bg-tint text-ink"}`}
              >
                NEW ACHIEVEMENT
              </span>

              <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                THIS WEEK&apos;S WIN
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-[32px] font-extrabold leading-none text-ink">
              14-Day Consistency
              <br />
              Streak
            </h2>

            {/* Description */}
            <p className="max-w-[568px] text-[18px] leading-[29px] text-muted">
              Your strongest streak this month. You showed up every day and maintained
              momentum.
            </p>
          </div>

          {/* Right Section */}
          <div className="flex w-full justify-start lg:w-auto lg:justify-end">
            <Button
              href="/home/journal"
              variant="secondary"
              className={`h-[55px] w-full sm:w-[236px] rounded-xl px-8 text-[18px] font-bold hover:bg-[#FF7A59]! hover:text-white! ${isDark ? "" : "text-[#1A1A4E]!"}`}
            >
              View Full Card
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p
          className={`text-xs font-bold uppercase tracking-wide ${isDark ? "text-white" : "text-muted"}`}
        >
          May 2026
        </p>
        {MAY_ENTRIES.map((entry) => (
          <HistoryCard key={entry.id} entry={entry} />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <p
          className={`text-xs font-bold uppercase tracking-wide ${isDark ? "text-white" : "text-muted"}`}
        >
          April 2026
        </p>
        {APRIL_ENTRIES.map((entry) => (
          <HistoryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
