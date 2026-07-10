"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { AddRevisionTaskModal } from "@/components/home/AddRevisionTaskModal";
import {
  ArrowLeftIcon,
  BellIcon,
  RefreshIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  PlusIcon,
} from "@/components/ui/icons";

const STAT_CARDS = [
  { label: "Due Today", value: "5", icon: <RefreshIcon /> },
  { label: "Upcoming", value: "23", icon: <ClockIcon /> },
  { label: "Mastered", value: "47", icon: <CheckCircleIcon /> },
];

const FILTERS = ["All", "Physics", "Chemistry", "Maths", "Biology"];

type Difficulty = "hard" | "medium" | "easy";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  hard: "bg-danger-bg text-danger",
  medium: "bg-warning/10 text-warning",
  easy: "bg-success-bg text-success",
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
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint text-ink">
              {card.icon}
            </span>
            <div>
              <p className="text-xl font-extrabold text-ink">{card.value}</p>
              <p className="text-xs text-muted">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Chip key={item} selected={filter === item} onClick={() => setFilter(item)}>
              {item}
            </Chip>
          ))}
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted"
        >
          Sort by: Due Date
          <ChevronDownIcon />
        </button>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Due Today <span className="font-normal">• 5 Topics</span>
          </p>
          <button type="button" className="text-xs font-semibold text-ink underline">
            View all
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {DUE_TODAY.map((topic) => (
            <div
              key={topic.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-brand/10 p-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
                {topic.subjectLabel}
              </span>
              <div className="min-w-0 flex-1">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${DIFFICULTY_STYLES[topic.difficulty]}`}
                >
                  {topic.difficulty}
                </span>
                <p className="text-sm font-bold text-ink">{topic.title}</p>
                <p className="text-xs text-muted">{topic.meta}</p>
              </div>
              <Link
                href="/revision-session"
                className="inline-flex h-9 w-full shrink-0 items-center justify-center rounded-lg border border-brand/15 bg-surface px-4 text-sm font-semibold text-body-text transition-colors hover:border-cta hover:bg-cta hover:text-white sm:w-auto"
              >
                Start Revision
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-success-bg px-5 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircleIcon />
          Mastered Topics <span className="font-normal">• 47</span>
        </p>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-semibold text-success"
        >
          View Mastered
          <ChevronDownIcon className="h-3 w-3 -rotate-90" />
        </button>
      </div>

      <div className="flex justify-center">
        <Button variant="primary" size="sm" onClick={() => setAddTaskOpen(true)}>
          <PlusIcon />
          Add Task
        </Button>
      </div>

      <AddRevisionTaskModal open={isAddTaskOpen} onClose={() => setAddTaskOpen(false)} />
    </div>
  );
}
