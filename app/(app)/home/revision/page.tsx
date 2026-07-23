"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { useTheme } from "@/components/theme/ThemeProvider";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { AddRevisionTaskModal } from "@/components/home/AddRevisionTaskModal";
import {Container} from "@/assets/icons";
import {
  ArrowLeftIcon,
  BellIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  PlusIcon,
  CalendarIcon,
} from "@/components/ui/icons";

const STAT_CARDS = [
  { label: "Due Today", value: "5", icon: <Container /> },
  { label: "Upcoming", value: "23", icon: <ClockIcon /> },
  { label: "Mastered", value: "47", icon: <CheckCircleIcon /> },
];

const FILTERS = ["All", "Physics", "Chemistry", "Maths", "Biology"];

type Difficulty = "hard" | "medium" | "easy";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  hard: "bg-[#EEF0F8] text-[#4B5563]",
  medium: "bg-[#EEF0F8] text-[#4B5563]",
  easy: "bg-[#EEF0F8] text-[#4B5563]",
};

const DUE_TODAY = [
  {
    id: "newtons-laws",
    subjectLabel: "P",
    subjectName: "Physics",
    difficulty: "hard" as Difficulty,
    title: "Newton's Laws",
    meta: "Physics • 14 days ago",
  },
  {
    id: "electrochemistry",
    subjectLabel: "C",
    subjectName: "Chemistry",
    difficulty: "medium" as Difficulty,
    title: "Electrochemistry",
    meta: "Chemistry • 7 days ago",
  },
  {
    id: "complex-numbers",
    subjectLabel: "M",
    subjectName: "Maths",
    difficulty: "easy" as Difficulty,
    title: "Complex Numbers",
    meta: "Maths • 21 days ago",
  },
  {
    id: "work-energy",
    subjectLabel: "P",
    subjectName: "Physics",
    difficulty: "medium" as Difficulty,
    title: "Work & Energy",
    meta: "Physics • 10 days ago",
  },
];

export default function RevisionPage() {
  const [filter, setFilter] = useState("All");
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
            <h1 className="text-h1 text-ink">Revision</h1>
            <p className="text-sm text-muted">
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
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${isDark ? "text-white" : "text-muted"} hover:bg-tint-strong`}
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="flex min-h-[106px] items-center gap-4 rounded-xl border border-brand/10 bg-surface p-6 shadow-sm transition-colors"
          >
            {/* Icon */}
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-icon-chip-bg text-ink [&>svg]:h-6 [&>svg]:w-6 dark:bg-[#FAF7F2]/8"
            >
              {card.icon}
            </div>

            {/* Content */}
            <div className="min-w-0">
              <h3 className="font-['Plus_Jakarta_Sans'] text-[30px] font-bold leading-[36px] text-ink">
                {card.value}
              </h3>

              <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm font-medium leading-5 text-muted">
                {card.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {FILTERS.map((item) => {
            const active = filter === item;

            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`flex h-[42px] items-center justify-center rounded-full border px-5 text-[14px] font-semibold leading-5 transition-all duration-200 ${active
                    ? isDark
                      ? "border-white bg-white text-[#1A1A4E]"
                      : "border-brand bg-brand text-white"
                    : isDark
                      ? "border-white/30 bg-transparent text-white hover:border-white"
                      : "border-brand/20 bg-surface text-muted hover:border-brand hover:text-ink"
                  }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Sort Button */}
    <button
  type="button"
  className={`flex h-[38px] min-w-[182px] items-center justify-between rounded-lg border px-4 text-[14px] font-medium transition-all duration-200 ${
    isDark
      ? "border-white bg-white text-[#1A1A4E] hover:bg-gray-100"
      : "border-brand/20 bg-surface text-muted hover:border-brand hover:text-ink"
  }`}
>
  <span>Sort by: Due Date</span>

  <span className="flex items-center justify-center">
    <ChevronDownIcon />
  </span>
</button>
      </div>

      <div className="rounded-xl border border-brand/10 bg-surface p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p
            className={`text-[12px] font-bold uppercase tracking-[0.08em] ${isDark ? "text-white" : "text-muted"}`}
          >
            Due Today <span className="font-medium">• 5 Topics</span>
          </p>
        </div>

        {/* Topic List */}
        <div className="mt-6 flex flex-col gap-4">
          {DUE_TODAY.map((topic) => (
            <div
              key={topic.id}
              className="flex min-h-[112px] items-center justify-between rounded-xl border border-brand/10 bg-surface px-4 py-6 shadow-sm transition-colors"
            >
              {/* Left */}
              <div className="flex min-w-0 flex-1 items-center gap-4">
                {/* Subject Icon */}
                <div className="flex h-12 w-12 min-w-[48px] items-center justify-center rounded-xl bg-tint">
                  <span
                    className={`font-['Plus_Jakarta_Sans'] text-[18px] font-bold leading-6 ${isDark ? "text-white" : "text-brand"}`}
                  >
                    {topic.subjectLabel}
                  </span>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <span
                    className={`inline-flex rounded-sm px-2 py-1 text-[10px] font-bold uppercase ${isDark ? "bg-white/10 text-white" : DIFFICULTY_STYLES[topic.difficulty]}`}
                  >
                    {topic.difficulty}
                  </span>

                  <h3 className="mt-2 truncate font-['Plus_Jakarta_Sans'] text-[16px] font-bold leading-6 text-ink">
                    {topic.title}
                  </h3>

                  <p className="mt-1 text-[13px] font-medium text-muted">
                    {topic.meta}
                  </p>
                </div>
              </div>

              {/* Right */}
              <Link
                href="/revision-session"
                className={`ml-6 inline-flex h-[38px] min-w-[132px] items-center justify-center rounded-lg border bg-surface px-4 text-[12px] font-semibold transition-all hover:bg-[#FF7A59] hover:text-white ${isDark ? "border-white text-white" : "border-brand text-brand"
                  }`}
              >
                Start Revision
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          variant="primary"
          onClick={() => setAddTaskOpen(true)}
          className="h-[60px]! w-[323px]! rounded-[12px] px-8 py-4 font-['Plus_Jakarta_Sans'] text-[18px] font-bold leading-7 transition-all duration-300 ease-out"
        >
          <PlusIcon />
          Add Task
        </Button>
      </div>

      <AddRevisionTaskModal open={isAddTaskOpen} onClose={() => setAddTaskOpen(false)} />
    </div>
  );
}
