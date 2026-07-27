"use client";

import { useState } from "react";
import Link from "next/link";
import { FileIcon, ChartBarIcon, BookmarkIcon } from "@/components/ui/icons";
import { TargetIcon, ComputerIcon } from "@/assets/icons";
import {ArrowLeftIcon} from "@/assets/icons";
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

  const renderCard = (resource: Resource, icon: React.ReactNode) => (
    <div
      key={resource.id}
      className={`flex items-start justify-between gap-3 rounded-2xl border p-4 transition-all sm:items-center sm:gap-4 sm:p-5 ${
        bookmarked.has(resource.id)
          ? "border-brand shadow-sm"
          : "border-brand/10 hover:border-brand/20"
      }`}
    >
      {/* Left */}
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-[13px] font-bold text-ink sm:h-10 sm:w-10 sm:text-[14px]">
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[15px] font-bold leading-5 text-ink sm:text-[16px] sm:leading-6">
            {resource.title}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[13px] leading-5 text-muted sm:text-[14px]">
            <span className="font-semibold text-ink">{resource.typeLabel}</span>
            <span aria-hidden="true">•</span>
            <span className="whitespace-nowrap">Updated {resource.updated}</span>
          </div>
        </div>
      </div>

      {/* Bookmark */}
      <button
        type="button"
        onClick={() => toggleBookmark(resource.id)}
        aria-label={`Bookmark ${resource.title}`}
        aria-pressed={bookmarked.has(resource.id)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-tint hover:text-ink sm:h-10 sm:w-10"
      >
        <BookmarkIcon filled={bookmarked.has(resource.id)} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 p-4 sm:gap-6 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/home/resource-library"
          className="flex w-fit items-center gap-2 text-[13px] font-semibold text-ink transition-colors  sm:text-sm"
        >
          <ArrowLeftIcon />
          Back to Library
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          {/* Left Content */}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-5 text-ink sm:text-[14px]">Physics</p>

            <h1 className="mt-1 break-words text-[28px] font-extrabold leading-tight tracking-[-0.5px] text-ink sm:text-[36px] sm:tracking-[-0.75px] lg:text-[48px] lg:leading-none lg:tracking-[-1px]">
              Waves
            </h1>

            <p className="mt-2 text-[14px] font-medium leading-6 text-muted sm:text-[16px]">
              Chapter 8
            </p>
          </div>

          {/* Right Button */}
          <button
            type="button"
            className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-lg bg-[#FF7A59] px-5 text-[15px] font-bold text-white transition-all hover:bg-[#FF6A45] sm:h-12 sm:w-[209px] sm:px-6 sm:text-[16px]"
          >
            Practice this chapter
          </button>
        </div>
      </div>

      {/* Notes */}
      <section className="rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tint text-ink sm:h-10 sm:w-10">
            <TargetIcon />
          </span>

          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-[20px] font-bold leading-7 text-ink sm:text-[24px] sm:leading-8">
              Notes
            </h2>

            <span className="text-[13px] font-semibold text-muted sm:text-[14px]">
              {NOTES.length} resources
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-2 lg:gap-6">
          {NOTES.map((resource) => renderCard(resource, <TargetIcon />))}
        </div>
      </section>

      {/* Formula Sheets */}
      <section className="rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-icon-chip-bg text-ink dark:bg-[#FAF7F2]/8 sm:h-10 sm:w-10">
            <ComputerIcon />
          </span>

          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-[20px] font-bold leading-7 text-ink sm:text-[24px] sm:leading-8">
              Formula Sheets
            </h2>

            <span className="text-[13px] font-semibold text-muted sm:text-[14px]">
              {FORMULA_SHEETS.length} resources
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-2 lg:gap-6">
          {FORMULA_SHEETS.map((resource) => renderCard(resource, "fx"))}
        </div>
      </section>
    </div>
  );
}