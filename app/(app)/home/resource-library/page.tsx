"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PageLoader } from "@/components/ui/PageLoader";
import { UserMenu } from "@/components/layout/UserMenu";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  SearchIcon,
  XIcon,
} from "@/components/ui/icons";
import {
  getSubjectsChapters,
  type ProfileChapter,
  type SubjectWithChapters,
} from "@/lib/api/profile";
import {
  getChapterResourceCounts,
  type LibraryContentType,
  type LibraryCounts,
} from "@/lib/api/library";
import { BookIcon } from "@/assets/icons";

const CHAPTERS_PER_PAGE = 5;

/**
 * The "Show" dropdown. `type: null` is the default (every pill shown); picking
 * a type narrows the pills on each row and deep-links the chapter page to that
 * section, so a student hunting for formula sheets lands directly on them.
 */
const CONTENT_FILTERS: { label: string; type: LibraryContentType | null }[] = [
  { label: "All resources", type: null },
  { label: "Notes", type: "NOTE" },
  { label: "Formula sheets", type: "FORMULA_SHEET" },
  { label: "Lectures", type: "YOUTUBE" },
  { label: "Questions", type: "PRACTICE_QUESTION" },
];

/** Row pills, in display order, mapped to their key in the API's `counts`. */
const PILLS: { label: string; key: keyof LibraryCounts; type: LibraryContentType }[] = [
  { label: "Notes", key: "notes", type: "NOTE" },
  { label: "Formulas", key: "formulaSheets", type: "FORMULA_SHEET" },
  { label: "Lectures", key: "youtubeLectures", type: "YOUTUBE" },
  { label: "Questions", key: "practiceQuestions", type: "PRACTICE_QUESTION" },
];

/**
 * Most chapters come back with a null sequenceOrder, so fall back to the class
 * rather than rendering "Chapter" with nothing after it.
 */
function chapterLabel(sequenceOrder: number | null, cls: number | null) {
  if (sequenceOrder) return `Chapter ${sequenceOrder}`;
  if (cls) return `Class ${cls}`;
  return "Chapter";
}

function chapterHref(subjectName: string, chapterName: string, focus: LibraryContentType | null) {
  const params = new URLSearchParams({ subject: subjectName, chapter: chapterName });
  if (focus) params.set("focus", focus);
  return `/home/resource-library/chapter?${params.toString()}`;
}

/**
 * Type-ahead over the active subject's chapters. Chemistry runs to 67 chapters
 * across 9 pages, so paging to find one by eye is slow. Picking a match doesn't
 * navigate — it reports the choice up so the page narrows to that single row,
 * and opening the chapter stays the row's own click.
 */
function ChapterSearch({
  chapters,
  query,
  onQueryChange,
  selectedChapter,
  onSelect,
  onClear,
}: {
  chapters: ProfileChapter[];
  /** Owned by the page, so clearing from anywhere empties the box too. */
  query: string;
  onQueryChange: (value: string) => void;
  selectedChapter: ProfileChapter | null;
  onSelect: (chapter: ProfileChapter) => void;
  onClear: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  // Once a chapter is picked, the box shows its name — the usual combobox
  // read-back, and it keeps the input agreeing with the single row on screen.
  const inputValue = selectedChapter ? selectedChapter.name : query;

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chapters;
    return chapters.filter((chapter) => chapter.name.toLowerCase().includes(needle));
  }, [chapters, query]);

  // Clamped rather than reset in an effect: a shrinking result list can leave
  // `highlight` past the end.
  const activeIndex = Math.min(highlight, Math.max(0, matches.length - 1));

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const pick = (chapter: ProfileChapter) => {
    setOpen(false);
    setHighlight(0);
    // No need to write the name into the query — `inputValue` reads it back
    // off the selection, and stateKey resets the query for us.
    onSelect(chapter);
  };

  const clear = () => {
    setHighlight(0);
    onClear();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight(Math.min(activeIndex + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight(Math.max(activeIndex - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const chapter = matches[activeIndex];
      if (chapter) pick(chapter);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full sm:w-[280px]">
      <div className="flex h-9 items-center gap-2 rounded-lg border border-tint-strong bg-tint-strong px-3 transition-colors focus-within:border-brand/30 sm:h-[38px]">
        <span className="shrink-0 text-muted">
          <SearchIcon />
        </span>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="chapter-search-results"
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          value={inputValue}
          disabled={chapters.length === 0}
          placeholder="Search chapters..."
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            // Typing over a picked chapter puts the full list back.
            onQueryChange(event.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-muted disabled:cursor-not-allowed"
        />

        {(selectedChapter || query) && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear chapter search"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-brand/10 hover:text-ink"
          >
            <XIcon className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <ul
          id="chapter-search-results"
          role="listbox"
          className="absolute right-0 z-30 mt-2 max-h-[320px] w-full overflow-y-auto rounded-xl border border-brand/10 bg-surface py-1 shadow-lg"
        >
          {matches.length === 0 && (
            <li className="px-4 py-3 text-[13px] text-muted">No chapter matches “{query}”.</li>
          )}

          {matches.map((chapter, index) => (
            <li key={chapter.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => pick(chapter)}
                className={`flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left transition-colors ${
                  index === activeIndex ? "bg-tint" : ""
                }`}
              >
                <span className="w-full truncate text-[13px] font-semibold text-ink">
                  {chapter.name}
                </span>
                <span className="text-[12px] font-medium text-muted">
                  {chapterLabel(chapter.sequenceOrder, chapter.class)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The per-chapter resource tallies, shared by the table and the mobile cards.
 * Every state — pills, the loading skeleton, the empty note — is one 30px row,
 * so a chapter with nothing in it is exactly as tall as one with four pills and
 * the rows below don't shift as the counts land.
 */
function ResourcePills({
  ready,
  pills,
  counts,
}: {
  ready: boolean;
  pills: typeof PILLS;
  counts: LibraryCounts | undefined;
}) {
  if (!ready) {
    return (
      <div className="flex min-h-[26px] flex-wrap items-center gap-1.5 sm:min-h-[30px] sm:gap-2">
        {[0, 1, 2].map((key) => (
          <span
            key={key}
            className="h-[26px] w-[70px] animate-pulse rounded-full bg-tint-strong sm:h-[30px] sm:w-[82px]"
          />
        ))}
      </div>
    );
  }

  if (pills.length === 0) {
    return (
      <span className="flex h-[26px] items-center text-[11px] font-medium text-muted sm:h-[30px] sm:text-[12px]">
        No resources found
      </span>
    );
  }

  return (
    <div className="flex min-h-[26px] flex-wrap items-center gap-1.5 sm:min-h-[30px] sm:gap-2">
      {pills.map((pill) => (
        <span
          key={pill.label}
          className="flex h-[26px] items-center rounded-full bg-tint-strong px-2.5 text-[11px] font-semibold text-ink sm:h-[30px] sm:px-3 sm:text-[12px]"
        >
          {pill.label} · {counts?.[pill.key] ?? 0}
        </span>
      ))}
    </div>
  );
}

export default function ResourceLibraryPage() {
  const [subjects, setSubjects] = useState<SubjectWithChapters[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSubjectId, setActiveSubjectId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const [filter, setFilter] = useState<LibraryContentType | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  // The chapter search: its query text and the chapter picked from it. Both
  // are keyed by subject so switching tabs drops them during render instead of
  // via an effect, and both live here so "Show all chapters" can reset the
  // search box as well as the list.
  const [search, setSearch] = useState<{ subjectId: number | null; value: string }>({
    subjectId: null,
    value: "",
  });
  const [selection, setSelection] = useState<{ subjectId: number | null; chapterId: string } | null>(
    null,
  );

  const searchQuery = search.subjectId === activeSubjectId ? search.value : "";

  const clearSearch = useCallback(() => {
    setSearch({ subjectId: activeSubjectId, value: "" });
    setSelection(null);
    setPage(1);
  }, [activeSubjectId]);

  // chapterId -> per-type totals, for the chapters currently on screen.
  const [counts, setCounts] = useState<Record<string, LibraryCounts>>({});

  useEffect(() => {
    let cancelled = false;

    getSubjectsChapters()
      .then(({ data }) => {
        if (cancelled) return;
        const list = data.subjects ?? [];
        setSubjects(list);
        setActiveSubjectId((current) => current ?? list[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your subjects. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSubjects(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeSubject = useMemo(
    () => subjects.find((subject) => subject.id === activeSubjectId) ?? null,
    [subjects, activeSubjectId],
  );

  const chapters = useMemo(() => {
    const list = activeSubject?.chapters ?? [];
    // Many chapters carry no sequenceOrder — those keep the API's own order,
    // after the numbered ones, rather than being pulled to the top by a 0.
    const rank = (value: number | null) => value ?? Number.MAX_SAFE_INTEGER;
    return [...list].sort((a, b) => rank(a.sequenceOrder) - rank(b.sequenceOrder));
  }, [activeSubject]);

  const selectedChapter = useMemo(() => {
    if (!selection || selection.subjectId !== activeSubjectId) return null;
    return chapters.find((chapter) => chapter.id === selection.chapterId) ?? null;
  }, [selection, activeSubjectId, chapters]);

  // With a chapter picked the page shows that row alone; pagination then has
  // a single entry to page over, so its controls drop out on their own.
  const listedChapters = useMemo(
    () => (selectedChapter ? [selectedChapter] : chapters),
    [selectedChapter, chapters],
  );

  const totalPages = Math.max(1, Math.ceil(listedChapters.length / CHAPTERS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const visibleChapters = useMemo(
    () => listedChapters.slice((safePage - 1) * CHAPTERS_PER_PAGE, safePage * CHAPTERS_PER_PAGE),
    [listedChapters, safePage],
  );

  // One request per subject covers every chapter's tallies. Keyed by subject
  // id and merged into a session-wide map, so switching tabs back and forth
  // never refetches, and rows on later pages already have their counts.
  const [countsLoadedFor, setCountsLoadedFor] = useState<number[]>([]);

  useEffect(() => {
    const subjectName = activeSubject?.name;
    const subjectId = activeSubject?.id;
    if (!subjectName || subjectId === undefined || countsLoadedFor.includes(subjectId)) return;

    const controller = new AbortController();

    getChapterResourceCounts({ subjectName }, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setCounts((current) => ({ ...current, ...data.counts }));
        setCountsLoadedFor((current) =>
          current.includes(subjectId) ? current : [...current, subjectId],
        );
      })
      .catch(() => {
        // Counts are decoration on the rows — a failure here leaves the pills
        // out rather than blocking the chapter list.
      });

    return () => controller.abort();
  }, [activeSubject, countsLoadedFor]);

  const countsReady = activeSubject ? countsLoadedFor.includes(activeSubject.id) : false;

  const selectSubject = useCallback((subjectId: number) => {
    setActiveSubjectId(subjectId);
    setPage(1);
  }, []);

  const activeFilterLabel =
    CONTENT_FILTERS.find((option) => option.type === filter)?.label ?? "All resources";

  // Subjects drive the tabs, the chapter list and the counts, so there's no
  // page worth showing until they land — hold the whole thing behind the
  // loader rather than flashing empty chrome.
  if (loadingSubjects) return <PageLoader label="Loading your library…" />;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[24px] font-bold leading-8 text-ink sm:text-[28px]">Library</h1>
          <p className="text-[13px] leading-5 text-muted sm:text-sm">
            Notes, formula sheets, key points, and concept maps.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-brand/10 bg-surface px-4 py-3 text-sm text-muted">
          {error}
        </p>
      )}

      {/* Chapters, as a table. The subject tabs, the chapter search and the
          content filter all live in this card's own toolbar, so the controls
          sit with the list they narrow rather than floating above it. */}
      <section className="overflow-hidden rounded-[24px] border border-brand/10 bg-surface shadow-sm dark:shadow-[0_1px_4px_rgba(0,0,0,0.16)]">
        <div className="flex flex-col gap-4 border-b border-brand/10 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Subjects">
              {subjects.map((subject) => {
                const isActive = subject.id === activeSubjectId;
                return (
                  <button
                    key={subject.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectSubject(subject.id)}
                    className={`h-9 rounded-full px-4 text-[13px] font-semibold transition-colors sm:h-[38px] sm:px-5 sm:text-[14px] ${
                      isActive
                        ? "bg-brand text-white"
                        : "border border-tint-strong bg-tint-strong text-ink hover:border-brand/20"
                    }`}
                  >
                    {subject.name}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
              <ChapterSearch
                chapters={chapters}
                query={searchQuery}
                onQueryChange={(value) => {
                  setSearch({ subjectId: activeSubjectId, value });
                  // Typing always means "browse again" — drop any picked chapter.
                  setSelection(null);
                  setPage(1);
                }}
                selectedChapter={selectedChapter}
                onSelect={(chapter) => {
                  setSearch({ subjectId: activeSubjectId, value: "" });
                  setSelection({ subjectId: activeSubjectId, chapterId: chapter.id });
                  setPage(1);
                }}
                onClear={clearSearch}
              />

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setFilterOpen((open) => !open)}
                  aria-expanded={filterOpen}
                  aria-haspopup="listbox"
                  className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-tint-strong bg-tint-strong px-3 text-[13px] font-medium text-ink transition-colors hover:border-brand/20 sm:h-[38px] sm:w-[168px] sm:px-4"
                >
                  <span className="truncate">{activeFilterLabel}</span>
                  <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted" />
                </button>

                {filterOpen && (
                  <ul
                    role="listbox"
                    className="absolute right-0 z-20 mt-2 w-full min-w-[168px] overflow-hidden rounded-xl border border-brand/10 bg-surface py-1 shadow-lg"
                  >
                    {CONTENT_FILTERS.map((option) => (
                      <li key={option.label}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={filter === option.type}
                          onClick={() => {
                            setFilter(option.type);
                            setFilterOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-[13px] font-medium transition-colors hover:bg-tint ${
                            filter === option.type ? "text-brand" : "text-ink"
                          }`}
                        >
                          {option.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tint text-ink sm:h-10 sm:w-10">
              <BookIcon />
            </span>
            <span className="text-[17px] font-bold leading-6 text-ink sm:text-[20px] sm:leading-7">
              {activeSubject?.name ?? "Chapters"}
            </span>
            {chapters.length > 0 && (
              <span className="text-[13px] font-medium leading-5 text-muted sm:text-[14px]">
                {selectedChapter ? `1 of ${chapters.length} chapters` : `${chapters.length} chapters`}
              </span>
            )}
            {selectedChapter && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-[12px] font-semibold text-brand transition-colors hover:opacity-80 sm:text-[13px]"
              >
                Show all chapters
              </button>
            )}
          </div>
        </div>

        {/* Chapter rows. Kept as full-width cards rather than table columns:
            the pills wrap freely and long chapter names get the whole row. */}
        <div className="flex flex-col gap-3 p-4 sm:p-6 lg:px-8">
          {visibleChapters.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No chapters yet for this subject.
            </p>
          ) : (
            visibleChapters.map((chapter) => {
              // The counts endpoint omits chapters with nothing in them, so a
              // missing entry means zero once the subject's counts have loaded.
              const chapterCounts = counts[chapter.id];
              const pills = PILLS.filter(
                (pill) => (!filter || pill.type === filter) && (chapterCounts?.[pill.key] ?? 0) > 0,
              );

              return (
                <Link
                  key={chapter.id}
                  href={chapterHref(activeSubject?.name ?? "", chapter.name, filter)}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-brand/5 bg-surface px-4 py-3.5 shadow-sm transition-colors hover:border-brand/20 sm:gap-4 sm:px-6 sm:py-4"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-bold leading-6 text-ink sm:text-[18px] sm:leading-7">
                      {chapter.name}
                    </h3>
                    <p className="mt-0.5 text-[12px] font-medium leading-5 text-muted sm:text-[14px]">
                      {chapterLabel(chapter.sequenceOrder, chapter.class)}
                    </p>
                    <div className="mt-2 sm:mt-2.5">
                      <ResourcePills
                        ready={countsReady}
                        pills={pills}
                        counts={chapterCounts}
                      />
                    </div>
                  </div>

                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted sm:h-5 sm:w-5" />
                </Link>
              );
            })
          )}
        </div>

        {listedChapters.length > CHAPTERS_PER_PAGE && (
          <div className="flex min-h-[68px] flex-col items-center justify-center gap-3 border-t border-brand/10 px-4 py-4 sm:px-6 lg:px-8 md:relative md:flex-row md:py-5">
            <p className="text-center text-caption leading-4 text-muted">
              Showing {visibleChapters.length} of {listedChapters.length} chapters
            </p>

            <div className="flex items-center justify-center gap-3 md:absolute md:right-4 sm:md:right-6 lg:md:right-8">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, safePage - 1))}
                disabled={safePage <= 1}
                aria-label="Previous page"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand/15 text-ink transition hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRightIcon className="h-4 w-4 rotate-180" />
              </button>

              <span className="whitespace-nowrap text-caption font-semibold text-ink">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage >= totalPages}
                aria-label="Next page"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand/15 text-ink transition hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
