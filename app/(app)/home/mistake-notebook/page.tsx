"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useState } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  BellIcon,
  ChevronDownIcon,
  MoreIcon,
  // FileIcon,
  AlertTriangleIcon,
  // CalendarIcon,
  // ClockIcon,
} from "@/components/ui/icons";
import {ClockIcon,CalendarIcon,FileIcon} from "@/assets/icons";
const SUBJECT_FILTERS = ["All", "Physics", "Chemistry", "Maths"];
const TYPE_FILTERS = ["All", "Silly", "Concept", "Time", "Guess"];

type MistakeTag = "conceptual" | "silly" | "time" | "guess";

const TAG_STYLES: Record<MistakeTag, string> = {
  conceptual: "bg-tint text-ink",
  silly: "bg-cta/10 text-cta",
  time: "bg-warning/10 text-warning",
  guess: "bg-info-bg text-info",
};

type MistakeEntry = {
  id: string;
  subjectLabel: string;
  title: string;
  tag: MistakeTag;
  lastReviewed: string;
  quote: string;
  dueIn?: string;
};

const DUE_TODAY: MistakeEntry[] = [
  {
    id: "coord-geo",
    subjectLabel: "M",
    title: "Coordinate Geometry · Common Tangents",
    tag: "conceptual",
    lastReviewed: "Last reviewed: 7 days ago",
    quote: "I need to memorize the 4 tangent cases",
  },
  {
    id: "optics-lens",
    subjectLabel: "P",
    title: "Physics · Optics · Lens",
    tag: "silly",
    lastReviewed: "Last reviewed: 3 days ago",
    quote: "Sign convention slip",
  },
  {
    id: "thermo",
    subjectLabel: "C",
    title: "Chemistry · Thermodynamics · ΔG & ΔH",
    tag: "conceptual",
    lastReviewed: "Last reviewed: 5 days ago",
    quote: "Confuse ΔG sign in spontaneity",
  },
  {
    id: "integration",
    subjectLabel: "M",
    title: "Mathematics · Calculus · Integration",
    tag: "time",
    lastReviewed: "Last reviewed: 8 days ago",
    quote: "Take too long in partial fractions",
  },
];

const UPCOMING: MistakeEntry[] = [
  {
    id: "friction",
    subjectLabel: "P",
    title: "Physics · Mechanics · Friction",
    tag: "conceptual",
    lastReviewed: "Last reviewed: 9 days ago",
    quote: "Forgot limiting friction condition",
    dueIn: "Due in 2 days",
  },
];

function MistakeRow({ entry }: { entry: MistakeEntry }) {
  return (
    <div className="flex flex-col gap-5 rounded-[20px] border border-brand/10 p-5 sm:flex-row sm:items-center">
      {/* Icon box */}
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-tint text-2xl font-black text-ink">
        {entry.subjectLabel}
      </span>

      {/* Content block */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-[16px] font-bold leading-6 text-ink">
            {entry.title}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.25px] ${TAG_STYLES[entry.tag]}`}
          >
            {entry.tag}
          </span>
          <span className="text-[11px] font-medium leading-[16.5px] text-muted/70">
            {entry.lastReviewed}
          </span>
        </p>
        <p className="text-[14px] font-medium italic leading-5 text-muted">
          &ldquo;{entry.quote}&rdquo;
        </p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-3 pl-[76px] sm:pl-0">
        {entry.dueIn ? (
          <span className="rounded-full bg-tint-strong px-3 py-1 text-xs font-semibold text-ink">
            {entry.dueIn}
          </span>
        ) : (
          <Link
            href="/home/mistake-notebook/entry"
            className="inline-flex h-9 w-[138px] items-center justify-center gap-2 rounded-lg border border-brand px-4 text-[14px] font-semibold text-ink transition-colors hover:bg-[#FF7A59] hover:text-white"
          >
            Start Practice
          </Link>
        )}
        <button
          type="button"
          aria-label={`More options for ${entry.title}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
        >
          <span className="inline-block rotate-90">
            <MoreIcon />
          </span>
        </button>
      </div>
    </div>
  );
}

export default function MistakeNotebookPage() {
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">Mistake Notebook</h1>
        <div className="flex items-center gap-4">
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

      <div className="flex items-center gap-6 rounded-2xl border border-brand/10 bg-surface p-6 min-h-[112px] w-full">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-icon-chip-bg text-ink shadow-sm dark:bg-[#FAF7F2]/8 [&>svg]:h-6 [&>svg]:w-auto">
          <FileIcon />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-[22px] font-bold leading-[100%] text-ink">
            Mistake Notebook
          </h2>

          <div className="flex flex-wrap items-center gap-2 text-[14px] leading-5">
            <span className="font-medium text-muted">47 entries</span>

            <span className="text-muted">•</span>

            <span className="font-bold text-[#F59E0B] underline decoration-[#FED7AA] decoration-[2px] underline-offset-2">
              12 due for review today
            </span>
          </div>
        </div>
      </div>

      <div className="w-full rounded-2xl border border-brand/10 bg-surface px-6 pt-[17px] pb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-bold uppercase tracking-[0.7px] text-muted">Filters</p>

          <button
            type="button"
            onClick={() => {
              setSubjectFilter("All");
              setTypeFilter("All");
            }}
            className="text-xs font-semibold text-muted hover:text-ink transition-colors"
          >
            Clear all
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Subject */}
          <div className="flex w-full max-w-[355px] flex-col gap-3">
            <p className="text-sm font-bold uppercase text-ink">Subject</p>

            <div className="flex flex-wrap gap-2">
              {SUBJECT_FILTERS.map((item) => (
                <button
                  key={item}
                  onClick={() => setSubjectFilter(item)}
                  className={`h-[34px] rounded-full border px-4 text-[12px] font-medium transition-all ${subjectFilter === item
                    ? "border-brand bg-brand text-white"
                    : isDark
                      ? "border-muted text-white bg-transparent hover:bg-tint"
                      : "border-brand text-ink bg-transparent hover:bg-tint"
                    }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Mistake Type */}
          <div className="flex w-full flex-1 flex-col gap-3">
            <p className="text-sm font-bold uppercase text-ink">Mistake Type</p>

            <div className="flex flex-wrap gap-2">
              {TYPE_FILTERS.map((item) => (
                <button
                  key={item}
                  onClick={() => setTypeFilter(item)}
                  className={`h-[34px] rounded-full border px-4 text-[12px] font-medium transition-all ${typeFilter === item
                    ? "border-brand bg-brand text-white"
                    : isDark
                      ? "border-muted text-white bg-transparent hover:bg-tint"
                      : "border-brand text-ink bg-transparent hover:bg-tint"
                    }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase leading-4 tracking-[1.2px] text-[#F59E0B]">
            <ClockIcon />
            Due Today <span className="text-muted normal-case">(12)</span>
          </p>

          <div className="flex items-center gap-3">
            <span className="text-[12px] font-bold leading-4 text-muted">Sort by</span>
            <button
              type="button"
              className="flex h-[34px] items-center gap-3 rounded-xl border border-brand/15 px-4 text-[12px] font-bold leading-4 text-ink"
            >
              Due soon
              <ChevronDownIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {DUE_TODAY.map((entry) => (
            <MistakeRow key={entry.id} entry={entry} />
          ))}
        </div>

        <button
          type="button"
          className="mt-3 w-full text-center text-sm font-semibold text-[#F59E0B] underline decoration-[#FED7AA]"
        >
          8 more due for review today
        </button>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
          <CalendarIcon />
          Upcoming <span className="font-normal">(35)</span>
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {UPCOMING.map((entry) => (
            <MistakeRow key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}
