"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, FileIcon, ChartBarIcon, BookmarkIcon } from "@/components/ui/icons";

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
      <div>
        <Link
          href="/home/resource-library"
          className="flex w-fit items-center gap-1 text-sm font-semibold text-ink"
        >
          <ArrowLeftIcon />
          Back to Library
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted">Physics</p>
            <h1 className="text-h1 text-ink">Waves</h1>
            <p className="text-sm text-muted">Chapter 8</p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-cta px-5 text-sm font-semibold text-white hover:bg-cta/90"
          >
            Practice this chapter
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          <FileIcon />
          Notes <span className="font-normal text-muted">{NOTES.length} resources</span>
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {NOTES.map((resource) => (
            <div
              key={resource.id}
              className={`flex items-start justify-between gap-2 rounded-xl border bg-surface p-3 ${
                bookmarked.has(resource.id) ? "border-brand" : "border-brand/10"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tint text-ink">
                  <FileIcon />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{resource.title}</p>
                  <p className="text-xs text-muted">
                    <span className="font-semibold text-ink">{resource.typeLabel}</span>
                    {" · "}Updated {resource.updated}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleBookmark(resource.id)}
                aria-pressed={bookmarked.has(resource.id)}
                aria-label={`Bookmark ${resource.title}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-muted hover:text-ink"
              >
                <BookmarkIcon filled={bookmarked.has(resource.id)} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-brand/10 bg-surface p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          <ChartBarIcon />
          Formula Sheets{" "}
          <span className="font-normal text-muted">
            {FORMULA_SHEETS.length} resources
          </span>
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FORMULA_SHEETS.map((resource) => (
            <div
              key={resource.id}
              className={`flex items-start justify-between gap-2 rounded-xl border bg-surface p-3 ${
                bookmarked.has(resource.id) ? "border-brand" : "border-brand/10"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tint text-xs font-bold text-ink">
                  fx
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{resource.title}</p>
                  <p className="text-xs text-muted">
                    <span className="font-semibold text-ink">{resource.typeLabel}</span>
                    {" · "}Updated {resource.updated}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleBookmark(resource.id)}
                aria-pressed={bookmarked.has(resource.id)}
                aria-label={`Bookmark ${resource.title}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-muted hover:text-ink"
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
