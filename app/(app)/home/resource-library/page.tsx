"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import {
  BellIcon,
  SearchIcon,
  // PlayIcon,
  // FileIcon,
  StarIcon,
  BookIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  BookmarkIcon,
} from "@/components/ui/icons";
import {Containers,TargetIcon} from "@/assets/icons";
const BROWSE_FILTERS = ["Subject", "Chapter", "Type"];

const FEATURED = [
  {
    id: "newtons-laws-foundation",
    icon: <Containers />,
    title: "Newton's Laws Foundation",
    meta: "PW · 28 min",
    rating: "4.8 · 247 reviews",
  },
  {
    id: "coord-geo-cengage",
    icon: <TargetIcon />,
    title: "Coordinate Geometry - Cengage Ch24",
    meta: "PDF · 45 pages",
  },
];

const TAGS = ["Lectures", "Concept Map", "PYQs", "NCERT", "Books"];

const PHYSICS_CHAPTERS = [
  { id: "units-measurements", title: "Units & Measurements", chapter: "Chapter 1" },
  { id: "kinematics", title: "Kinematics", chapter: "Chapter 2" },
  { id: "newtons-laws-motion", title: "Newton's Laws of Motion", chapter: "Chapter 3" },
  { id: "work-energy-power", title: "Work, Energy, Power", chapter: "Chapter 4" },
  { id: "rotational-dynamics", title: "Rotational Dynamics", chapter: "Chapter 5" },
  { id: "gravitation", title: "Gravitation", chapter: "Chapter 6" },
  { id: "shm-oscillations", title: "SHM & Oscillations", chapter: "Chapter 7" },
  { id: "waves", title: "Waves", chapter: "Chapter 8" },
  { id: "thermodynamics", title: "Thermodynamics", chapter: "Chapter 9" },
];

export default function ResourceLibraryPage() {
  const [physicsOpen, setPhysicsOpen] = useState(true);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink">Library</h1>
          <p className="text-sm text-muted">
            Notes, formula sheets, key points, and concept maps. Bookmarkable. Searchable.
          </p>
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


      <div className="flex flex-col gap-6 rounded-2xl bg-surface px-5 py-6 shadow-[0px_4px_20px_0px_#00000008] sm:px-8">
        {/* Search bar */}
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            <SearchIcon />
          </span>
          <input
            type="text"
            placeholder="Search resources, topics, or formulas..."
            autoComplete="off"
            className="h-[57px] w-full rounded-xl border border-tint-strong bg-tint-strong pl-12 pr-4 text-[16px] font-medium text-body-text outline-none placeholder:text-muted focus:border-brand/30"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-col gap-3 border-t border-brand/10 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
          <span className="text-[12px] font-semibold uppercase tracking-[0.6px] text-muted">
            Browse by
          </span>

          <div className="flex flex-wrap items-center gap-3">
            {BROWSE_FILTERS.map((label) => (
              <button
                key={label}
                type="button"
                className="relative flex h-[39px] min-w-[146px] items-center justify-between rounded-lg border border-tint-strong bg-tint-strong py-2 pl-4 pr-3 text-[14px] font-medium text-ink hover:border-brand/20"
              >
                {label}
                <ChevronDownIcon className="h-4 w-4 text-muted" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <p className="text-[20px] sm:text-[22px] font-bold leading-tight text-ink">
            Top This Week
          </p>
          <p className="text-[14px] sm:text-[16px] font-semibold text-muted">
            Curated for this week
          </p>
        </div>

        {/* Resource rows */}
        <div className="flex flex-col gap-4">
          {FEATURED.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-5 rounded-2xl border border-brand/10 bg-surface p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
            >
              {/* Left */}
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
                  {item.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[18px] sm:text-[20px] font-semibold leading-7 text-ink">
                    {item.title}
                  </p>

                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] sm:text-[14px] text-muted">
                    {item.meta}
                    {item.rating && (
                      <>
                        <span>•</span>
                        <StarIcon />
                        {item.rating}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Right */}
              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <button
                  type="button"
                  className="inline-flex h-[42px] w-full sm:w-auto items-center justify-center rounded-lg border border-brand px-6 text-[14px] font-medium text-ink transition-colors hover:bg-[#FF7A59] hover:text-white hover:border-[#FF7A59]"
                >
                  Open
                </button>

                <button
                  type="button"
                  className="inline-flex h-[42px] w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-brand px-6 text-[14px] font-medium text-ink transition-colors hover:bg-[#FF7A59] hover:text-white hover:border-[#FF7A59]"
                >
                  Track as study
                  <ArrowRightIcon className="h-4 w-4 shrink-0" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <button
          type="button"
          className="text-center text-sm font-semibold text-ink underline underline-offset-2"
        >
          View 24 more resources
        </button>
      </div>

      <div className="flex w-full flex-col gap-4">
        <button
          type="button"
          onClick={() => setPhysicsOpen((value) => !value)}
          aria-expanded={physicsOpen}
          className="flex w-full items-center gap-3 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint text-ink">
            <BookIcon />
          </span>
          <span className="text-[20px] font-bold leading-7 text-ink">Physics</span>
          <span className="text-[14px] font-medium leading-5 text-muted">18 chapters</span>
          <ChevronDownIcon
            className={`h-5 w-5 shrink-0 text-muted transition-transform ${physicsOpen ? "" : "-rotate-90"
              }`}
          />
        </button>
        {physicsOpen && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PHYSICS_CHAPTERS.map((chapter) => (
              <div
                key={chapter.id}
                className="flex flex-col gap-3 rounded-2xl border border-brand/5 bg-surface p-6 shadow-sm transition-colors hover:border-brand/20"
              >
                {/* Title row */}
                <Link
                  href="/home/resource-library/chapter"
                  className="flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[18px] font-bold leading-8 text-ink">
                      {chapter.title}
                    </h3>

                    <p className="mt-1 text-[14px] font-medium leading-5 text-muted">
                      {chapter.chapter}
                    </p>
                  </div>
                  <ChevronDownIcon className="mt-1 h-4 w-4 shrink-0 -rotate-90 text-muted" />
                </Link>

                {/* Tags + bookmark, same row, bookmark pinned right */}
                <div className="flex items-end justify-between gap-4">
                  <div className="flex flex-wrap gap-2 max-w-[calc(100%-40px)]">
                    {TAGS.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-tint-strong px-4 py-2 text-[12px] font-semibold text-ink"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    aria-label={`Bookmark ${chapter.title}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-muted hover:text-ink"
                  >
                    <BookmarkIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
