"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, FileIcon, ChartBarIcon, BookmarkIcon } from "@/components/ui/icons";
import {TargetIcon,ComputerIcon} from "@/assets/icons";
type Resource = {
  id: string;
  title: string;
  typeLabel: string;
  updated: string;
};

const NOTES: Resource[] = [
  { id: "fluids-notes", title: "Fluids — Notes", typeLabel: "Notes", updated: "6/27/2026" },
  { id: "elasticity-notes", title: "Elasticity — Notes", typeLabel: "Notes", updated: "6/27/2026" },
  {
    id: "waves-sounds-notes",
    title: "Waves & Sounds — Notes",
    typeLabel: "Notes",
    updated: "6/27/2026",
  },
];

const FORMULA_SHEETS: Resource[] = [
  {
    id: "fluids-formula",
    title: "Mechanical Properties of Fluids — Formula Sheet",
    typeLabel: "Formulas",
    updated: "6/27/2026",
  },
  {
    id: "solids-formula",
    title: "Mechanical Properties of Solids — Formula Sheet",
    typeLabel: "Formulas",
    updated: "6/27/2026",
  },
  {
    id: "waves-formula",
    title: "Waves — Formula Sheet",
    typeLabel: "Formulas",
    updated: "6/27/2026",
  },
];

export default function ResourceChapterPage() {
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set(["fluids-notes"]));

  const toggleBookmark = (id: string) => {
    setBookmarked((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/home/resource-library"
          className="flex w-fit items-center gap-2 text-sm font-semibold text-ink hover:text-brand transition-colors"
        >
          <ArrowLeftIcon />
          Back to Library
        </Link>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Content */}
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-5 text-ink">
              Physics
            </p>

            <h1 className="mt-1 text-[36px] font-extrabold leading-none tracking-[-1px] text-ink sm:text-[42px] lg:text-[48px]">
              Waves
            </h1>

            <p className="mt-2 text-[16px] font-medium leading-6 text-muted">
              Chapter 8
            </p>
          </div>

          {/* Right Button */}
          <button
            type="button"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#FF7A59] px-6 text-[16px] font-bold text-white transition-all hover:bg-[#FF6A45] sm:w-[209px]"
          >
            Practice this chapter
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint text-ink">
            <TargetIcon />
          </span>

          <div className="flex items-center gap-3">
            <h2 className="text-[24px] font-bold leading-8 text-ink">
              Notes
            </h2>

            <span className="text-[14px] font-semibold text-muted">
              {NOTES.length} resources
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {NOTES.map((resource) => (
            <div
              key={resource.id}
              className={`flex items-center justify-between rounded-2xl border p-5 transition-all ${bookmarked.has(resource.id)
                  ? "border-brand shadow-sm"
                  : "border-brand/10 hover:border-brand/20"
                }`}
            >
              {/* Left */}
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
                  <TargetIcon />
                </span>

                <div className="min-w-0">
                  <h3 className="truncate text-[16px] font-bold leading-6 text-ink">
                    {resource.title}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[14px] text-muted">
                    <span className="font-semibold text-ink">
                      {resource.typeLabel}
                    </span>

                    <span>•</span>

                    <span>Updated {resource.updated}</span>
                  </div>
                </div>
              </div>

              {/* Bookmark */}
              <button
                type="button"
                onClick={() => toggleBookmark(resource.id)}
                aria-label={`Bookmark ${resource.title}`}
                aria-pressed={bookmarked.has(resource.id)}
                className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-tint hover:text-ink"
              >
                <BookmarkIcon filled={bookmarked.has(resource.id)} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8">
            <ComputerIcon />
          </span>

          <div className="flex items-center gap-3">
            <h2 className="text-[24px] font-bold leading-8 text-ink">
              Formula Sheets
            </h2>

            <span className="text-[14px] font-semibold text-muted">
              {FORMULA_SHEETS.length} resources
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {FORMULA_SHEETS.map((resource) => (
            <div
              key={resource.id}
              className={`flex items-center justify-between rounded-2xl border p-5 transition-all ${bookmarked.has(resource.id)
                  ? "border-brand shadow-sm"
                  : "border-brand/10 hover:border-brand/20"
                }`}
            >
              {/* Left */}
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tint text-[14px] font-bold text-ink">
                  fx
                </span>

                <div className="min-w-0">
                  <h3 className="truncate text-[16px] font-bold leading-6 text-ink">
                    {resource.title}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[14px] text-muted">
                    <span className="font-semibold text-ink">
                      {resource.typeLabel}
                    </span>

                    <span>•</span>

                    <span>Updated {resource.updated}</span>
                  </div>
                </div>
              </div>

              {/* Bookmark */}
              <button
                type="button"
                onClick={() => toggleBookmark(resource.id)}
                aria-pressed={bookmarked.has(resource.id)}
                aria-label={`Bookmark ${resource.title}`}
                className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-tint hover:text-ink"
              >
                <BookmarkIcon filled={bookmarked.has(resource.id)} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
