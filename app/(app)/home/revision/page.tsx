"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTheme } from "@/components/theme/ThemeProvider";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AddCustomTaskModal } from "@/components/plan/AddCustomTaskModal";
import { Container, BellIcon, ArrowLeftIcon } from "@/assets/icons";
import {
  // ArrowLeftIcon,
  // BellIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  PlusIcon,
  CalendarIcon,
} from "@/components/ui/icons";
import type { PlannerSubject, TaskStatus } from "@/lib/api/planner";
import {
  getRevisionOverview,
  type RevisionChapterProgress,
  type RevisionOverview,
  type RevisionTask,
} from "@/lib/api/revision";
import { withResumeLabel, CUSTOM_BADGE_STYLE } from "@/components/home/taskTypes";
import { formatShortDate } from "@/lib/utils/datetime";

type Tab = "due" | "upcoming" | "mastered";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "due", label: "Due Today", icon: <Container /> },
  { id: "upcoming", label: "Upcoming", icon: <ClockIcon /> },
  { id: "mastered", label: "Mastered", icon: <CheckCircleIcon /> },
];

const STATUS_OPTIONS: { id: TaskStatus; label: string }[] = [
  { id: "PENDING", label: "Pending" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "COMPLETED", label: "Completed" },
];

type Difficulty = "hard" | "medium" | "easy";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  hard: "bg-[#EEF0F8] text-[#4B5563]",
  medium: "bg-[#EEF0F8] text-[#4B5563]",
  easy: "bg-[#EEF0F8] text-[#4B5563]",
};

function toDifficulty(raw: string | null | undefined): Difficulty {
  const value = raw?.toLowerCase();
  return value === "hard" || value === "medium" || value === "easy" ? value : "medium";
}

type RevisionTopic = {
  id: string;
  taskId: string | null;
  subjectLabel: string;
  subjectName: string;
  difficulty: Difficulty;
  title: string;
  meta: string;
  badge: string;
  actionLabel: string;
  isCustom: boolean;
  estimatedMinutes: number;
  isTaskCompleted: boolean;
};

function fromTask(task: RevisionTask): RevisionTopic {
  const subject = task.chapter?.subject;

  return {
    id: task.id,
    taskId: task.id,
    subjectLabel: subject?.code?.[0] ?? "R",
    subjectName: subject?.name ?? "Revision",
    difficulty: toDifficulty(task.chapter?.chapterMetadata?.difficulty),
    title: task.title,
    meta: [subject?.name, task.chapter?.name].filter(Boolean).join(" • "),
    badge: "",
    actionLabel: withResumeLabel("Start Revision", task.status),
    isCustom: Boolean(task.isAnchor),
    isTaskCompleted: task.status === "COMPLETED",
    estimatedMinutes: task.estimatedMinutes,
  };
}

function fromChapterProgress(entry: RevisionChapterProgress, tab: "upcoming" | "mastered"): RevisionTopic {
  const subject = entry.chapter.subject;
  const badge =
    tab === "upcoming"
      ? entry.nextRevisionAt
        ? formatShortDate(entry.nextRevisionAt)
        : "Scheduled"
      : "Mastered";
  const meta = tab === "upcoming" ? `Next revision: ${badge}` : "Mastered chapter";

  return {
    id: entry.id,
    taskId: null,
    subjectLabel: subject.code?.[0] ?? "R",
    subjectName: subject.name,
    difficulty: toDifficulty(entry.chapter.chapterMetadata?.difficulty),
    title: entry.chapter.name,
    meta: [subject.name, meta].filter(Boolean).join(" • "),
    badge,
    actionLabel: "",
    isCustom: false,
    estimatedMinutes: 0,
    isTaskCompleted: false,
  };
}

function uniqueSubjects(list: (PlannerSubject | undefined | null)[]): PlannerSubject[] {
  const bySubjectId = new Map<number, PlannerSubject>();
  list.forEach((subject) => {
    if (subject) bySubjectId.set(subject.id, subject);
  });
  return Array.from(bySubjectId.values());
}

type SubjectsByTab = Record<Tab, PlannerSubject[]>;

function collectSubjectsByTab(data: RevisionOverview): SubjectsByTab {
  return {
    due: uniqueSubjects((data.todaysRevisionTasks?.tasks ?? []).map((task) => task.chapter?.subject)),
    upcoming: uniqueSubjects((data.upcomingRevisions?.chapters ?? []).map((entry) => entry.chapter.subject)),
    mastered: uniqueSubjects((data.masteredChapters?.chapters ?? []).map((entry) => entry.chapter.subject)),
  };
}

export default function RevisionPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("due");
  const [activeSubjectId, setActiveSubjectId] = useState<number | "all">("all");
  const [activeStatus, setActiveStatus] = useState<TaskStatus | null>(null);
  const [isStatusMenuOpen, setStatusMenuOpen] = useState(false);
  const [subjectsByTab, setSubjectsByTab] = useState<SubjectsByTab>({ due: [], upcoming: [], mastered: [] });
  const [overview, setOverview] = useState<RevisionOverview | null>(null);
  const [isAddTaskOpen, setAddTaskOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // The /revision-session page itself fetches the task (GET /planner/task/:taskId) and
  // starts the tracked session (POST /revision/:taskId/session/start) on mount, seeding
  // the timer from secondsCompleted — kept in one place so every entry point behaves the same.
  const handleStartRevision = (topic: RevisionTopic) => {
    if (!topic.taskId) return;
    router.push(`/revision-session?taskId=${topic.taskId}`);
  };

  useEffect(() => {
    if (!isStatusMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isStatusMenuOpen]);

  // Discovers the subjects present in each revision bucket — drives the per-tab filter chips.
  const refetchSubjects = () => {
    getRevisionOverview()
      .then(({ data }) => setSubjectsByTab(collectSubjectsByTab(data)))
      .catch(() => {
        // Best-effort — chips stay empty until this succeeds.
      });
  };

  useEffect(refetchSubjects, []);

  const refetchOverview = () => {
    getRevisionOverview({
      ...(activeSubjectId !== "all" ? { subjectId: activeSubjectId } : {}),
      ...(activeStatus ? { status: activeStatus } : {}),
    })
      .then(({ data }) => setOverview(data))
      .catch(() => setOverview(null));
  };

  // Refetches the revision overview whenever the active subject or status filter changes.
  useEffect(refetchOverview, [activeSubjectId, activeStatus]);

  // A newly added custom task can introduce a subject/status bucket that wasn't
  // present at initial load, so the filter chips need a refetch too — not just topics.
  const handleTaskAdded = () => {
    refetchOverview();
    refetchSubjects();
  };

  const subjects = subjectsByTab[activeTab];

  const dueCount = overview?.todaysRevisionTasks?.count ?? 0;
  const upcomingCount = overview?.upcomingRevisions?.count ?? 0;
  const masteredCount = overview?.masteredChapters?.count ?? 0;
  const TAB_COUNTS: Record<Tab, number> = { due: dueCount, upcoming: upcomingCount, mastered: masteredCount };

  const topics = !overview
    ? []
    : activeTab === "due"
      ? (overview.todaysRevisionTasks?.tasks ?? []).map(fromTask)
      : activeTab === "upcoming"
        ? (overview.upcomingRevisions?.chapters ?? []).map((entry) => fromChapterProgress(entry, "upcoming"))
        : (overview.masteredChapters?.chapters ?? []).map((entry) => fromChapterProgress(entry, "mastered"));

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Back to Home" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <div>
            <h1 className="text-h1 text-ink">Revision</h1>
            <p className="max-w-xs text-sm leading-6 text-muted sm:max-w-none">
              Review topics using spaced repetition. Consistent revision builds long-term
              mastery.
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setActiveSubjectId("all");
              }}
              className={`flex min-h-[106px] items-center gap-4 rounded-xl border p-6 text-left shadow-sm transition-colors ${active ? "border-brand" : "border-brand/10 hover:border-brand/30"
                } bg-surface`}
            >
              {/* Icon */}
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-icon-chip-bg text-ink [&>svg]:h-6 [&>svg]:w-6 dark:bg-[#FAF7F2]/8"
              >
                {tab.icon}
              </div>

              {/* Content */}
              <div className="min-w-0">
                <h3 className="font-['Plus_Jakarta_Sans'] text-[30px] font-bold leading-[36px] text-ink">
                  {TAB_COUNTS[tab.id]}
                </h3>

                <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm font-medium leading-5 text-[#444655] dark:text-secondary!">
                  {tab.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
          {[{ id: "all" as const, name: "All" }, ...subjects].map((item) => {
            const active = activeSubjectId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSubjectId(item.id)}
                className={`
            flex
            h-10
            sm:h-[42px]
            items-center
            justify-center
            rounded-full
            border
            px-3
            sm:px-5
            text-xs
            sm:text-sm
            font-semibold
            leading-5
            whitespace-nowrap
            transition-all
            duration-200
            ${active
                    ? isDark
                      ? "border-white bg-white text-[#1A1A4E]"
                      : "border-brand bg-brand text-white"
                    : isDark
                      ? "border-secondary bg-transparent text-secondary hover:border-white"
                      : "border-brand bg-surface text-[#444655] hover:text-ink"
                  }
          `}
              >
                {item.name}
              </button>
            );
          })}
        </div>

        {/* Status Filter */}
        {activeTab === "due" && (
          <div ref={statusMenuRef} className="relative w-full shrink-0 sm:w-auto">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isStatusMenuOpen}
              onClick={() => setStatusMenuOpen((value) => !value)}
              className={`
      flex
      h-10
      sm:h-[42px]
      w-full
      sm:w-auto
      sm:min-w-[182px]
      items-center
      justify-between
      rounded-lg
      border
      px-4
      text-xs
      sm:text-sm
      font-medium
      transition-all
      duration-200
      ${isDark
                  ? "border-primary bg-primary text-card hover:bg-primary/90"
                  : "border-[#C4C5D8] bg-white text-[#444655] hover:text-ink"
                }
    `}
            >
              <span className="truncate">
                Status: {STATUS_OPTIONS.find((option) => option.id === activeStatus)?.label ?? "All"}
              </span>

              <span className="ml-3 flex shrink-0 items-center justify-center">
                <ChevronDownIcon />
              </span>
            </button>

            {isStatusMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-40 mt-2 w-full overflow-hidden rounded-xl border border-brand/10 bg-surface py-1 shadow-modal sm:w-44"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveStatus(null);
                    setStatusMenuOpen(false);
                  }}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm font-medium hover:bg-tint-strong ${activeStatus === null ? "text-ink" : "text-muted"
                    }`}
                >
                  All
                </button>
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveStatus(option.id);
                      setStatusMenuOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm font-medium hover:bg-tint-strong ${activeStatus === option.id ? "text-ink" : "text-muted"
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-brand/10 bg-surface p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p
            className={`text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.08em] ${isDark ? "text-white" : "text-[#1A1A4E]"
              }`}
          >
            {TABS.find((tab) => tab.id === activeTab)?.label}{" "}
            <span className="font-medium">• {topics.length} Topics</span>
          </p>
        </div>

        {/* Topic List */}
        <div className="mt-5 sm:mt-6 flex flex-col gap-4">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="
          flex
          flex-col
          gap-4
          rounded-xl
          border
          border-brand/10
          bg-surface
          p-4
          sm:flex-row
          sm:items-center
          sm:justify-between
          sm:p-5
        "
            >
              {/* Left */}
              <div className="flex min-w-0 flex-1 items-start sm:items-center gap-4">
                {/* Subject Icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint">
                  <span
                    className={`text-[18px] font-bold ${isDark ? "text-white" : "text-brand"
                      }`}
                  >
                    {topic.subjectLabel}
                  </span>
                </div>

                {/* Content */}
                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex h-5 items-center rounded-[4px] px-2 text-[9px] font-bold uppercase leading-none ${isDark
                          ? "bg-white/10 text-white"
                          : DIFFICULTY_STYLES[topic.difficulty]
                        }`}
                    >
                      {topic.difficulty}
                    </span>

                    {topic.isCustom && (
                      <span
                        className={`inline-flex h-5 items-center rounded-[4px] px-2 text-[9px] font-bold uppercase leading-none ${CUSTOM_BADGE_STYLE}`}
                      >
                        Custom
                      </span>
                    )}
                  </div>

                  <h3 className="mt-1 text-[16px] font-bold leading-5 text-ink">
                    {topic.title}
                  </h3>

                  <p className="mt-0.5 text-[11px] leading-4 text-muted">
                    {topic.meta}
                  </p>
                </div>
              </div>

              {/* Right Button */}
              {topic.taskId ? (
                <Button
                  variant="outline"
                  disabled={topic.isTaskCompleted}
                  onClick={() => handleStartRevision(topic)}
                  className={
                    topic.isTaskCompleted
                      ? "h-10! w-full! sm:ml-6! sm:w-auto! sm:min-w-37.5! justify-center px-4! text-caption! sm:text-[13px]! font-semibold! whitespace-nowrap! cursor-not-allowed! border-brand/20! text-muted! hover:border-brand/20! hover:bg-transparent! hover:text-muted!"
                      : "h-10! w-full! sm:ml-6! sm:w-auto! sm:min-w-37.5! justify-center px-4! text-caption! sm:text-[13px]! font-semibold! whitespace-nowrap!"
                  }
                >
                  {topic.isTaskCompleted ? "Revision Completed" : topic.actionLabel}
                </Button>
              ) : (
                <span
                  className={`
            flex
            h-[40px]
            w-full
            items-center
            justify-center
            rounded-lg
            border
            px-4
            text-[12px]
            sm:text-[13px]
            font-semibold
            whitespace-nowrap
            sm:ml-6
            sm:w-auto
            sm:min-w-[150px]
            ${isDark
                      ? "border-white/30 text-white/70"
                      : "border-brand/20 text-muted"
                    }
          `}
                >
                  {topic.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          variant="primary"
          onClick={() => {
            setStatusMenuOpen(false);
            setAddTaskOpen(true);
          }}
          className="h-[60px]! w-[323px]! rounded-[12px] px-8 py-4 font-['Plus_Jakarta_Sans'] text-[18px] font-bold leading-7 transition-all duration-300 ease-out"
        >
          <PlusIcon />
          Add Task
        </Button>
      </div>

      <AddCustomTaskModal
        open={isAddTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onTaskAdded={handleTaskAdded}
        lockedTaskType="Revision"
      />
    </div>
  );
}
