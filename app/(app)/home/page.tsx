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
import {
  BellIcon,
  SparkleIcon,
  FlameIcon,
  RefreshIcon,
  PlusIcon,
  TargetIcon,
  ChartBarIcon,
  BookIcon,
  LayersIcon,
  RadarIcon,
  UserIcon,
  TrophyIcon,
  BriefcaseIcon,
  ClockIcon,
  InfoIcon,
  PencilIcon,
} from "@/components/ui/icons";

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
  { href: "/practice", label: "Practice", subtitle: "Solve Questions", icon: <TargetIcon /> },
  {
    href: "/home/journal",
    label: "Weekly Win Journal",
    subtitle: "Reflect & celebrate wins",
    icon: <PencilIcon />,
  },
  {
    href: "/home/mock-analysis",
    label: "Mock Test Analysis",
    subtitle: "Analyze & Improve",
    icon: <ChartBarIcon />,
  },
  { href: "/home/mistake-notebook", label: "Mistake Notebook", icon: <BookIcon /> },
  {
    href: "/home/focus-topic",
    label: "This Week's Focus Topic",
    icon: <LayersIcon />,
  },
  { href: "/plan/focus-next", label: "Where to focus next", icon: <RadarIcon /> },
  { href: "/home/partner", label: "Partner", icon: <UserIcon /> },
  { href: "/home/leaderboard", label: "Leader Board", icon: <TrophyIcon /> },
  { href: "/home/resource-library", label: "Resource Library", icon: <BriefcaseIcon /> },
  { href: "/home/revision", label: "Revision", icon: <RefreshIcon /> },
  { label: "Quick Focus", icon: <ClockIcon />, isModal: true },
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
  missed: "bg-brand/10",
};

function subscribeNoop() {
  return () => {};
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
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-brand/10 bg-surface p-4">
          <p className="text-xs text-muted">Today&apos;s Energy</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tint text-lg">
                {energyMood.emoji}
              </span>
              <span className="text-base font-bold text-ink">{energyMood.label}</span>
            </div>
            <button
              type="button"
              onClick={() => setCheckInOpen(true)}
              className="text-xs font-semibold text-ink underline"
            >
              Change
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">Plan optimized for you</p>
        </div>

        <Link
          href="/home/streak"
          className="rounded-2xl border border-brand/10 bg-surface p-4 hover:border-brand/30"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cta/10 text-cta">
              <FlameIcon />
            </span>
            <span className="text-base font-bold text-ink">14 Day Streak</span>
          </div>
          <p className="mt-2 text-xs text-muted">Keep going.</p>
        </Link>

        <div className="rounded-2xl border border-brand/10 bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">Today&apos;s Progress</p>
            <span className="rounded-full bg-tint-strong px-2 py-0.5 text-[10px] font-semibold text-ink">
              Live
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <CircularProgress percent={22} size={56} />
            <p className="text-xs text-muted">1.3h / 6h completed</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {isFriday && (
            <div className="rounded-2xl border border-brand/10 bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold text-ink">Friday Win Journal</p>
                  <p className="text-xs text-muted">Weekly reflection & insights</p>
                </div>
                <span className="shrink-0 rounded-full bg-tint-strong px-3 py-1 text-[10px] font-semibold text-ink">
                  5% Ahead of Timeline
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {JOURNAL_STATS.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-2xl font-extrabold text-ink">{stat.value}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-brand/10 pt-3">
                <Link
                  href="/home/journal"
                  className="text-sm font-semibold text-ink underline"
                >
                  Explore Full Weekly Summary
                </Link>
                <span className="text-xs text-muted">Click to view details</span>
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
                    AI-arranged around your energy today
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs font-semibold text-ink">
                <button
                  type="button"
                  onClick={() => setRegenerateOpen(true)}
                  className="flex items-center gap-1"
                >
                  <RefreshIcon />
                  Regenerate Plan
                </button>
                <button
                  type="button"
                  onClick={() => setAddTaskOpen(true)}
                  className="flex items-center gap-1"
                >
                  <PlusIcon />
                  Add task
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
            <p className="text-sm font-bold text-ink">Quick Access</p>
            <div className="mt-3 flex flex-col gap-1">
              {QUICK_ACCESS.map((item) => {
                const content = (
                  <>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
                      {item.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        {item.label}
                      </span>
                      {item.subtitle && (
                        <span className="block text-[11px] text-muted">
                          {item.subtitle}
                        </span>
                      )}
                    </span>
                  </>
                );

                if (item.isModal) {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setQuickFocusOpen(true)}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-tint-strong"
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-tint-strong"
                  >
                    {content}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-brand/10 bg-surface p-4">
            <p className="text-sm font-bold text-ink">Study Consistency</p>
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="grid grid-cols-7 gap-1.5">
                {CONSISTENCY_DAYS.map((day, index) => (
                  <span
                    key={`${day}-${index}`}
                    className="text-center text-[10px] font-semibold text-muted"
                  >
                    {day}
                  </span>
                ))}
              </div>
              {CONSISTENCY_DATA.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1.5">
                  {week.map((status, dayIndex) => (
                    <span
                      key={dayIndex}
                      className={`aspect-square rounded-md ${CONSISTENCY_STYLES[status]}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-brand" />
                Completed
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-brand/40" />
                Partial
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-brand/10" />
                Missed
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
            <InfoIcon />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-warning">Backlog Alert</p>
            <p className="text-xs text-muted">Thermodynamics • Pending for 3 days</p>
          </div>
        </div>
        <Button href="/home/backlog" variant="secondary" size="sm" className="shrink-0">
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
