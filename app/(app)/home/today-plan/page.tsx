"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { useTheme } from "@/components/theme/ThemeProvider";
import { TimeBlockSection } from "@/components/home/TimeBlockSection";
import { PlanTaskRow } from "@/components/home/PlanTaskRow";
import type { PlanTask } from "@/components/home/PlanTaskRow";
import { RegeneratePlanModal } from "@/components/home/RegeneratePlanModal";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import { TodaysPracticeModal } from "@/components/practice/TodaysPracticeModal";
import { CheckIcon, ClockIcon, ListIcon, CalendarIcon } from "@/assets/icons";
import {
  ArrowLeftIcon,
  BellIcon,
  // CheckIcon,
  // ClockIcon,
  // ListIcon,
  // CalendarIcon,
  CloudSunIcon,
  SunIcon,
  CloudMoonIcon,
  PlusIcon,
  RefreshIcon,
} from "@/components/ui/icons";

const STAT_TILES = [
  { label: "Completed", value: "2h 15m", icon: <CheckIcon className="h-4 w-4" /> },
  { label: "Remaining", value: "4h 15m", icon: <ClockIcon className="h-4 w-4" /> },
  { label: "Tasks Done", value: "3 / 7", icon: <ListIcon className="h-4 w-4" /> },
  { label: "Planned Study", value: "6h 30m", icon: <CalendarIcon className="h-4 w-4" /> },
];

const MORNING_TASKS: PlanTask[] = [
  {
    id: "newtons-laws",
    subjectLabel: "P",
    subjectName: "Physics",
    type: "revision",
    title: "Newton's Laws",
    meta: "NCERT Ch 4 • Concept Video",
    duration: "60 min",
    timeRange: "9:00 - 10:00 AM",
    difficulty: "high",
    actionLabel: "Start Revision",
  },
  {
    id: "electrochemistry",
    subjectLabel: "C",
    subjectName: "Chemistry",
    type: "new-learning",
    title: "Electrochemistry",
    meta: "PYQ Lecture",
    duration: "45 min",
    timeRange: "10:30 - 11:15 AM",
    difficulty: "medium",
    actionLabel: "Start Session",
  },
];

const AFTERNOON_TASKS: PlanTask[] = [
  {
    id: "calculus-practice",
    subjectLabel: "M",
    subjectName: "Maths",
    type: "practice",
    title: "Calculus Practice",
    meta: "NCERT Ch 7 • 15 Qs",
    duration: "75 min",
    timeRange: "12:00 - 1:15 PM",
    difficulty: "medium",
    actionLabel: "Practice 15 Qs",
  },
];

const EVENING_TASKS: PlanTask[] = [
  {
    id: "optics",
    subjectLabel: "P",
    subjectName: "Physics",
    type: "new-learning",
    title: "Optics",
    meta: "Ray Optics • PW Lecture",
    duration: "60 min",
    timeRange: "5:00 - 6:00 PM",
    difficulty: "high",
    actionLabel: "Start Session",
  },
  {
    id: "organic-chemistry-revision",
    subjectLabel: "C",
    subjectName: "Chemistry",
    type: "revision",
    title: "Organic Chemistry Revision",
    meta: "GOC Basics • Concept Video",
    duration: "60 min",
    timeRange: "6:30 - 7:30 PM",
    difficulty: "medium",
    actionLabel: "Start Revision",
  },
];

export default function TodayPlanPage() {
  const router = useRouter();
  const [isRegenerateOpen, setRegenerateOpen] = useState(false);
  const [isPracticeModalOpen, setPracticeModalOpen] = useState(false);
  const [isAddTaskOpen, setAddTaskOpen] = useState(false);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Back to Home" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <div>
            <h1 className="text-h1 text-ink">Today&apos;s Plan</h1>
            <p className="text-sm text-muted">Monday, 29 June</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
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


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Progress Card */}
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-brand/10 bg-surface p-6 text-center shadow-[0px_1px_2px_0px_#1A1A4E0F]">
          <CircularProgress
            percent={35}
            label="Overall"
            size={110}
            progressColor={isDark ? "#FAF7F2" : undefined}
            progressGradient={
              isDark ? undefined : { from: "#1A1A4E", to: "#4C1D95" }
            }
          />

          <p className="mt-6 text-xl font-semibold text-ink">
            Daily Goal Progress
          </p>

          <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-[#DCFCE7] bg-white px-3 py-1 text-[10px] font-bold uppercase leading-[15px] text-[#16A34A] dark:border-[#166534] dark:bg-white dark:text-[#16A34A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
            ON TRACK
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {STAT_TILES.map((tile) => (
            <div
              key={tile.label}
              className="flex min-h-[102px] flex-col justify-between rounded-2xl border border-brand/10 bg-surface p-6 shadow-[0px_1px_2px_0px_#1A1A4E0F]"
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  {tile.label}
                </p>

                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-icon-chip-bg p-1.5 text-ink dark:bg-[#FAF7F2]/8">
                  {tile.icon}
                </span>
              </div>

              <p className="mt-5 text-[32px] font-extrabold leading-none text-ink">
                {tile.value}
              </p>
            </div>
          ))}
        </div>
      </div>


      <div className="flex flex-col gap-6">
        <TimeBlockSection icon={<CloudSunIcon />} title="Morning" meta="2 Tasks • 1h 45m">
          <div className="flex flex-col gap-3">
            {MORNING_TASKS.map((task) => (
              <PlanTaskRow key={task.id} task={task} onStartPractice={() => setPracticeModalOpen(true)} />
            ))}
          </div>
        </TimeBlockSection>
        <TimeBlockSection icon={<SunIcon />} title="Afternoon" meta="1 Task • 1h 15m">
          <div className="flex flex-col gap-3">
            {AFTERNOON_TASKS.map((task) => (
              <PlanTaskRow key={task.id} task={task} onStartPractice={() => setPracticeModalOpen(true)} />
            ))}
          </div>
        </TimeBlockSection>
        <TimeBlockSection icon={<CloudMoonIcon />} title="Evening" meta="2 Tasks • 2h 00m">
          <div className="flex flex-col gap-3">
            {EVENING_TASKS.map((task) => (
              <PlanTaskRow key={task.id} task={task} onStartPractice={() => setPracticeModalOpen(true)} />
            ))}
          </div>
        </TimeBlockSection>
      </div>


      <div className="py-6">
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[7fr_8fr]">

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAddTaskOpen(true)}
            className="h-[50px] w-full text-[14px] font-bold"
          >
            <PlusIcon />
            Add Custom Task
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setRegenerateOpen(true)}
            className="h-[50px] w-full text-[14px] font-bold"
          >
            <RefreshIcon />
            Regenerate Today&apos;s Plan
          </Button>

        </div>
      </div>
      <RegeneratePlanModal
        open={isRegenerateOpen}
        onClose={() => setRegenerateOpen(false)}
      />
      <AddCustomTaskModal open={isAddTaskOpen} onClose={() => setAddTaskOpen(false)} />
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
