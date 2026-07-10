"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { TimeBlockSection } from "@/components/home/TimeBlockSection";
import { PlanTaskRow } from "@/components/home/PlanTaskRow";
import type { PlanTask } from "@/components/home/PlanTaskRow";
import { RegeneratePlanModal } from "@/components/home/RegeneratePlanModal";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import { TodaysPracticeModal } from "@/components/practice/TodaysPracticeModal";
import {
  ArrowLeftIcon,
  BellIcon,
  CheckIcon,
  ClockIcon,
  ListIcon,
  CalendarIcon,
  CloudSunIcon,
  SunIcon,
  CloudMoonIcon,
  PlusIcon,
  RefreshIcon,
  FlameIcon,
} from "@/components/ui/icons";

const STAT_TILES = [
  { label: "Completed", value: "2h 15m", icon: <CheckIcon /> },
  { label: "Remaining", value: "4h 15m", icon: <ClockIcon /> },
  { label: "Tasks Done", value: "3 / 7", icon: <ListIcon /> },
  { label: "Planned Study", value: "6h 30m", icon: <CalendarIcon /> },
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
          <Link
            href="/home/streak"
            className="flex items-center gap-1.5 rounded-full border border-brand/15 bg-surface px-3 py-1.5 text-xs font-semibold text-cta hover:bg-tint-strong"
          >
            <FlameIcon />
            14 Day Streak
          </Link>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[280px_1fr]">
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-brand/10 bg-surface p-5 text-center">
          <CircularProgress percent={35} label="Overall" size={100} />
          <p className="mt-1 text-sm font-bold text-ink">Daily Goal Progress</p>
          <span className="flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            On Track
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {STAT_TILES.map((tile) => (
            <div key={tile.label} className="rounded-2xl border border-brand/10 bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {tile.label}
                </p>
                <span className="text-ink">{tile.icon}</span>
              </div>
              <p className="mt-1 text-lg font-extrabold text-ink">{tile.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-brand/10 bg-surface p-5">
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Button variant="secondary" size="sm" onClick={() => setAddTaskOpen(true)}>
          <PlusIcon />
          Add Custom Task
        </Button>
        <Button variant="primary" size="sm" onClick={() => setRegenerateOpen(true)}>
          <RefreshIcon />
          Regenerate Today&apos;s Plan
        </Button>
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
