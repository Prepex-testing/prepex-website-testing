"use client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";

import { useState } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import {
  BellIcon,
  FileIcon,
  AlertTriangleIcon,
  CalendarIcon,
  ChevronDownIcon,
  MoreIcon,
} from "@/components/ui/icons";

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
    <div className="flex flex-wrap items-start gap-3 rounded-xl border border-brand/10 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
        {entry.subjectLabel}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
          {entry.title}
          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${TAG_STYLES[entry.tag]}`}
          >
            {entry.tag}
          </span>
        </p>
        <p className="text-xs text-muted">{entry.lastReviewed}</p>
        <p className="text-xs italic text-muted">&ldquo;{entry.quote}&rdquo;</p>
      </div>
      <div className="flex w-full shrink-0 items-center gap-2 pl-12 sm:w-auto sm:pl-0">
        {entry.dueIn ? (
          <span className="rounded-full bg-tint-strong px-3 py-1 text-xs font-semibold text-ink">
            {entry.dueIn}
          </span>
        ) : (
          <Link
            href="/home/mistake-notebook/entry"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-brand/15 bg-surface px-4 text-sm font-semibold text-body-text transition-colors hover:border-cta hover:bg-cta hover:text-white"
          >
            Start Practice
          </Link>
        )}
        <button
          type="button"
          aria-label={`More options for ${entry.title}`}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-tint-strong"
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

      <div className="flex items-center gap-4 rounded-2xl border border-brand/10 bg-surface p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint text-ink">
          <FileIcon />
        </span>
        <div>
          <p className="text-base font-bold text-ink">Mistake Notebook</p>
          <p className="text-xs text-muted">
            47 entries <span className="font-semibold text-cta">• 12 due for review today</span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Filters
          </p>
          <button
            type="button"
            onClick={() => {
              setSubjectFilter("All");
              setTypeFilter("All");
            }}
            className="text-xs font-semibold text-ink underline"
          >
            Clear all
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Subject
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {SUBJECT_FILTERS.map((item) => (
                <Chip
                  key={item}
                  selected={subjectFilter === item}
                  onClick={() => setSubjectFilter(item)}
                >
                  {item}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Mistake Type
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {TYPE_FILTERS.map((item) => (
                <Chip
                  key={item}
                  selected={typeFilter === item}
                  onClick={() => setTypeFilter(item)}
                >
                  {item}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cta">
            <AlertTriangleIcon />
            Due Today <span className="font-normal text-muted">(12)</span>
          </p>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted"
          >
            Sort by: Due soon
            <ChevronDownIcon />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {DUE_TODAY.map((entry) => (
            <MistakeRow key={entry.id} entry={entry} />
          ))}
        </div>

        <button type="button" className="mt-3 w-full text-center text-sm font-semibold text-cta">
          8 more due for review today
        </button>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
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
