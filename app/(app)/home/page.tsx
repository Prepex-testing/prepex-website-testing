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
import { CheckInModal, MOODS, type Mood } from "@/components/check-in/CheckInModal";
import { submitCheckIn, moodIdToApiValue } from "@/lib/api/checkin";
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

  const handleMoodSave = (mood: Mood) => {
    setEnergyMood(mood);
    submitCheckIn({ mood: moodIdToApiValue(mood.id) }).catch(() => {
      // Best-effort — the UI already reflects the new mood.
    });
  };

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink lg:text-h1">Good Morning, Rohan</h1>
          <p className="text-sm text-muted">JEE Main 2026 in 284 days</p>
        </div>

      </div>




    </div>
  );
}