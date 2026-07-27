"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { TaskRow } from "@/components/home/TaskRow";
import type { Task } from "@/components/home/TaskRow";
import { QuickFocusModal } from "@/components/home/QuickFocusModal";
import { RegeneratePlanModal } from "@/components/home/RegeneratePlanModal";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import { TodaysPracticeModal } from "@/components/practice/TodaysPracticeModal";
import { CheckInModal, MOODS } from "@/components/check-in/CheckInModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { FlameIcon, BackIcon, BookIcon, BriefcaseIcon, ChartBarIcon, LayersIcon, QuickIcon, RadarIcon, RevisionIcon, TrophyIcon, UserIcon } from "@/assets/icons";
import {
  BellIcon,
  SparkleIcon,
  RefreshIcon,
  PlusIcon,
  TargetIcon,
  // ChartBarIcon,
  // BookIcon,
  // LayersIcon,
  // RadarIcon,
  // UserIcon,
  // TrophyIcon,
  // BriefcaseIcon,
  ClockIcon,
  InfoIcon,
  PencilIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from "@/components/ui/icons";
import { useTheme } from "@/components/theme/ThemeProvider";

const TASKS: Task[] = [
  {
    id: "newtons-laws",
    subjectLabel: "P",
    subjectName: "Physics",
    type: "revision",
    title: "Newton's Laws",
    meta: "Concept Video • NCERT Chapter",
    duration: "40 min",
    timeSlot: "Midday",
    hasResource: true,
    actionLabel: "Start Revision",
  },
  {
    id: "electrochemistry",
    subjectLabel: "C",
    subjectName: "Chemistry",
    type: "new-learning",
    title: "Electrochemistry",
    meta: "Concept Video • NCERT Chapter",
    duration: "60 min",
    timeSlot: "Midday",
    hasResource: true,
    actionLabel: "Start Session",
  },
  {
    id: "calculus-practice-1",
    subjectLabel: "M",
    subjectName: "Maths",
    type: "practice",
    title: "Calculus Practice",
    meta: "Concept Video • NCERT Chapter",
    duration: "60 min",
    timeSlot: "Midday",
    hasResource: true,
    actionLabel: "Start Practice",
  },
  {
    id: "calculus-practice-2",
    subjectLabel: "M",
    subjectName: "Maths",
    type: "practice",
    title: "Calculus Practice",
    meta: "Concept Video • NCERT Chapter",
    duration: "90 min",
    timeSlot: "Midday",
    hasResource: true,
    actionLabel: "Start Practice",
  },
];

const JOURNAL_STATS = [
  { value: "14", label: "Days Completed" },
  { value: "27", label: "Tasks Mastered" },
  { value: "19", label: "Study Hours" },
];

const QUICK_ACCESS = [
  { href: "/practice/sessions", label: "Practice", subtitle: "Solve Questions", icon: <PencilIcon /> },
  {
    href: "/home/mock-analysis",
    label: "Mock Test Analysis",
    subtitle: "Analyze & Improve",
    icon: <ChartBarIcon className="h-5 w-5" />,
  },
  { href: "/home/mistake-notebook", label: "Mistake Notebook", icon: <BookIcon className="h-5 w-5" /> },
  {
    href: "/home/focus-topic",
    label: "This Week's Focus Topic",
    icon: <LayersIcon className="h-5 w-5" />,
  },
  { href: "/home/focus-next", label: "Where to focus next", icon: <RadarIcon className="h-5 w-5" /> },
  { href: "/home/partner", label: "Partner", icon: <UserIcon className="h-5 w-5" /> },
  { href: "/home/leaderboard", label: "Leader Board", icon: <TrophyIcon className="h-5 w-5" /> },
  { href: "/home/resource-library", label: "Resource Library", icon: <BriefcaseIcon className="h-5 w-5" /> },
  { href: "/home/revision", label: "Revision", icon: <RevisionIcon className="h-5 w-5" /> },
  { label: "Quick Focus", icon: <QuickIcon className="h-5 w-5" />, isModal: true },
  {
    href: "/home/journal",
    label: "Weekly Win Journal",
    subtitle: "Reflect & celebrate wins",
    icon: <PencilIcon />,
  },
];

type ConsistencyStatus = "completed" | "partial" | "missed";

const CONSISTENCY_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const CONSISTENCY_DATA: ConsistencyStatus[][] = [
  ["completed", "completed", "partial", "missed", "completed", "missed", "missed"],
  ["completed", "completed", "completed", "partial", "completed", "missed", "missed"],
  ["partial", "completed", "completed", "completed", "partial", "missed", "missed"],
  ["completed", "partial", "completed", "completed", "completed", "missed", "missed"],
];

const CONSISTENCY_STYLES: Record<ConsistencyStatus, string> = {
  completed: "bg-brand",
  partial: "bg-brand/40",
  missed: "bg-tint-strong",
};

function subscribeNoop() {
  return () => { };
}

function getIsFridaySnapshot() {
  return new Date().getDay() === 5;
}

function getIsFridayServerSnapshot() {
  return false;
}

export default function HomePage() {
  const router = useRouter();
  const [isQuickFocusOpen, setQuickFocusOpen] = useState(false);
  const [isPracticeModalOpen, setPracticeModalOpen] = useState(false);
  const [isAddTaskOpen, setAddTaskOpen] = useState(false);
  const [isRegenerateOpen, setRegenerateOpen] = useState(false);
  const [isCheckInOpen, setCheckInOpen] = useState(false);
  const [energyMood, setEnergyMood] = useState(
    () => MOODS.find((mood) => mood.id === "good") ?? MOODS[3],
  );
  const isFriday = useSyncExternalStore(
    subscribeNoop,
    getIsFridaySnapshot,
    getIsFridayServerSnapshot,
  );

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink lg:text-h1">Good Morning, Rohan</h1>
          <p className="text-sm text-muted">JEE Main 2026 in 284 days</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className={`
    flex h-11 w-11 items-center justify-center rounded-full
    transition-colors
    ${isDark
                ? "bg-slate-800 text-white hover:bg-slate-700"
                : "bg-white text-[#1B245A] hover:bg-tint-strong"
              }
  `}
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-2xl border border-brand/10 bg-surface p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div className="flex items-center gap-4">
              <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-xl bg-tint">
                <span className="text-[32px] leading-none">
                  {energyMood.emoji}
                </span>
              </div>

              <div>
                <p className="text-sm text-muted">
                  Today's Energy
                </p>

                <h3 className="text-3xl font-bold leading-none text-ink">
                  {energyMood.label}
                </h3>

                <p className="text-sm text-muted">
                  Plan optimized for you
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCheckInOpen(true)}
              className="self-start text-sm font-semibold text-ink hover:underline xl:self-center"
            >
              Change
            </button>

          </div>
        </div>


        <Link
          href="/home/streak"
          className="block rounded-2xl border border-brand/10 bg-surface p-6 transition-colors hover:border-brand/30"
        >
          <div className="flex items-center justify-between">
            {/* Left Content */}
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta">
                <FlameIcon className="h-[30px] w-[26.67px]" />
              </div>

              {/* Text */}
              <div>
                <h3 className="text-2xl font-bold leading-none text-ink">
                  14 Day Streak
                </h3>

                <p className="mt-2 text-sm text-muted">
                  Keep going.
                </p>
              </div>
            </div>

            {/* Right Arrow */}
            <BackIcon className="h-[12px] w-[7.4px] text-muted" />
          </div>
        </Link>

        <div className="rounded-2xl border border-brand/10 bg-surface px-6 pt-4 pb-6">
          {/* Date */}
          <div className="flex justify-end">
            <span className="text-[11px] leading-none text-muted">
              Friday 5 June
            </span>
          </div>

          {/* Content */}
          <div className="-mt-1 flex items-center gap-4">
            <CircularProgress percent={22} size={64} />

            <div className="flex h-12 flex-col justify-between">
              <h3 className="text-2xl font-bold leading-none text-ink">
                Today's Progress
              </h3>

              <p className="text-sm leading-none text-muted">
                1.3h / 6h completed
              </p>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          {isFriday && (
            <div className="rounded-[24px] border border-brand/10 bg-surface p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0px_2px_8px_rgba(0,0,0,0.2)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-7 text-ink">Weekly Win Journal</p>
                  <p className="text-xs font-medium text-muted">
                    Weekly progress reflection & insights
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-2 rounded-full bg-tint-strong px-3 py-1.5 text-xs font-bold text-ink">
                  <CheckCircleIcon className="h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px] lg:h-5 lg:w-5" />
                  3% Ahead of Timeline
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-6 divide-x divide-brand/10 text-center">
                {JOURNAL_STATS.map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center gap-2">
                    <p className="text-3xl font-extrabold leading-none text-ink">
                      {stat.value}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[1px] text-muted">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-brand/10 pt-3">
                <Link
                  href="/home/journal"
                  className="text-sm font-bold text-ink"
                >
                  Explore Full Weekly Summary
                </Link>
                <span className="flex items-center gap-1 text-[10px] font-medium text-ink">
                  Click to view details
                  <ArrowRightIcon />
                </span>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-brand/10 bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className="mt-0.5 shrink-0 text-ink">
                  <SparkleIcon />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-ink">AI Plan for Today</p>
                  <p className="text-xs text-muted">
                    Generated at 6:00 AM • Based on your energy, backlog & revision schedule
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs font-semibold text-ink">
                <button
                  type="button"
                  onClick={() => setRegenerateOpen(true)}
                  className="flex h-9 items-center gap-2 rounded-lg border border-button-border bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-tint"
                >
                  <RefreshIcon />
                  <span>Regenerate Plan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAddTaskOpen(true)}
                  className="flex h-9 items-center gap-2 rounded-lg border border-button-border bg-surface px-3 text-xs font-medium text-ink transition-colors hover:bg-tint"
                >
                  <PlusIcon />
                  <span>Add task</span>
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {TASKS.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStartPractice={() => setPracticeModalOpen(true)}
                />
              ))}
            </div>

            <Link
              href="/home/today-plan"
              className="mt-4 block w-full text-center text-sm font-semibold text-ink underline"
            >
              View all
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-brand/10 bg-surface p-4">
            <p className="text-base font-bold text-ink">
              Quick Access
            </p>

            <div className="mt-4 flex flex-col gap-3">
              {QUICK_ACCESS.map((item) => {
                const content = (
                  <>
                    <div className="flex items-center gap-4">
                      {/* Icon */}
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
                        {item.icon}
                      </span>

                      {/* Text */}
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold text-ink">
                          {item.label}
                        </p>

                        {item.subtitle && (
                          <p className="text-xs text-muted">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <span className="text-xl text-muted">
                      ›
                    </span>
                  </>
                );

                const classes =
                  "flex h-15 items-center justify-between rounded-xl border border-brand/10 bg-surface px-4 transition-colors hover:bg-tint";

                if (item.isModal) {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setQuickFocusOpen(true)}
                      className={classes}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className={classes}
                  >
                    {content}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-brand/10 bg-surface p-4 sm:p-5">
            <h3 className="text-base font-bold text-ink">Study Consistency</h3>

            <div className="mt-5">
              {/* Header */}
              <div className="grid grid-cols-[36px_repeat(7,1fr)] items-center gap-x-1.5 sm:grid-cols-[48px_repeat(7,1fr)] sm:gap-x-2.5">
                <div />
                {CONSISTENCY_DAYS.map((day, index) => (
                  <span
                    key={`${day}-${index}`}
                    className="text-center text-[10px] font-semibold text-muted"
                  >
                    {day}
                  </span>
                ))}
              </div>

              {/* Weeks */}
              <div className="mt-3 flex flex-col gap-2 sm:gap-2.5">
                {CONSISTENCY_DATA.map((week, weekIndex) => (
                  <div
                    key={weekIndex}
                    className="grid grid-cols-[36px_repeat(7,1fr)] items-center gap-x-1.5 sm:grid-cols-[48px_repeat(7,1fr)] sm:gap-x-2.5"
                  >
                    <span className="text-caption text-muted">
                      Week {weekIndex + 1}
                    </span>

                    {week.map((status, dayIndex) => (
                      <span key={dayIndex} className="flex justify-center">
                        <span
                          className={`aspect-square w-full max-w-[26px] rounded-lg ${CONSISTENCY_STYLES[status]}`}
                        />
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 flex items-center justify-between text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                Complete
              </span>

              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand/40" />
                Partial
              </span>

              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-tint-strong" />
                Missed
              </span>
            </div>
          </div>
        </div>


      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
            <InfoIcon />
          </span>

          <div className="min-w-0">
            <p className="text-sm font-bold text-warning">
              Backlog Alert
            </p>

            <p className="text-xs text-muted">
              Thermodynamics • Pending for 3 days
            </p>
          </div>
        </div>

        <Button
          href="/home/backlog"
          variant="secondary"
          size="sm"
          className={`
      w-full
      sm:w-auto
      sm:shrink-0
      justify-center
      ${isDark
              ? "border-transparent! bg-white! text-[#1B245A]! hover:bg-white/90!"
              : ""
            }
    `}
        >
          Review Now
        </Button>
      </div>

      <CheckInModal
        open={isCheckInOpen}
        onClose={() => setCheckInOpen(false)}
        name="Rohan"
        mode="update"
        onSave={setEnergyMood}
      />
      <QuickFocusModal open={isQuickFocusOpen} onClose={() => setQuickFocusOpen(false)} />
      <AddCustomTaskModal open={isAddTaskOpen} onClose={() => setAddTaskOpen(false)} />
      <RegeneratePlanModal open={isRegenerateOpen} onClose={() => setRegenerateOpen(false)} />
      <TodaysPracticeModal
        open={isPracticeModalOpen}
        onClose={() => setPracticeModalOpen(false)}
        onStart={() => {
          setPracticeModalOpen(false);
          router.push("/practice");
        }}
      />
    </div>
  );
}
