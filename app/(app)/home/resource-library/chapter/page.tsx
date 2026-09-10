"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookmarkIcon, ChevronDownIcon, ChevronRightIcon, PlayIcon } from "@/components/ui/icons";
import { TargetIcon, ComputerIcon, ArrowLeftIcon } from "@/assets/icons";
import {
  getResourceLibrary,
  type LibraryContentType,
  type LibraryFormulaSheet,
  type LibraryLecture,
  type LibraryNote,
  type LibraryQuestion,
  type ResourceLibraryResponse,
} from "@/lib/api/library";

const PAGE_SIZE = 6;

type SectionKey = LibraryContentType;

/**
 * One paginated section of the library, scoped to this chapter. Each section
 * fetches with its own `contentType` so it can page independently — the
 * endpoint applies a single `page`/`limit` to every array it returns, so a
 * shared request would force all four sections onto the same page number.
 */
function useLibrarySection(
  contentType: SectionKey,
  subjectName: string,
  chapterName: string,
  extraParams: { isPYQ?: boolean } = {},
) {
  const { isPYQ } = extraParams;

  // Identifies the filter set independently of the page number, so changing a
  // filter (the PYQ toggle) drops back to page 1 without an effect resetting
  // state after the fact.
  const filterKey = `${contentType}|${subjectName}|${chapterName}|${isPYQ ?? "any"}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: filterKey, page: next });

  const requestKey = `${filterKey}|${page}`;
  // Holds the response together with the request that produced it: comparing
  // that against the current requestKey derives `loading` without a setState
  // in the effect body.
  const [result, setResult] = useState<{
    key: string;
    data: ResourceLibraryResponse | null;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!subjectName || !chapterName) return;

    const controller = new AbortController();

    getResourceLibrary(
      {
        contentType,
        subjectName,
        chapterName,
        exact: true,
        page,
        limit: PAGE_SIZE,
        ...(isPYQ !== undefined && { isPYQ }),
      },
      { signal: controller.signal },
    )
      .then(({ data: payload }) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, data: payload, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ key: requestKey, data: null, failed: true });
      });

    return () => controller.abort();
  }, [contentType, subjectName, chapterName, page, isPYQ, requestKey]);

  const settled = result?.key === requestKey;
  const hasTarget = Boolean(subjectName && chapterName);

  return {
    data: settled ? result.data : null,
    page,
    setPage,
    loading: hasTarget && !settled,
    failed: settled ? result.failed : false,
  };
}

function SectionShell({
  icon,
  title,
  total,
  loading,
  failed,
  isEmpty,
  page,
  onPage,
  shown,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  total: number;
  loading: boolean;
  failed: boolean;
  isEmpty: boolean;
  page: number;
  onPage: (next: number) => void;
  shown: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tint text-ink sm:h-10 sm:w-10">
            {icon}
          </span>

          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-[20px] font-bold leading-7 text-ink sm:text-[24px] sm:leading-8">
              {title}
            </h2>
            <span className="text-[13px] font-semibold text-muted sm:text-[14px]">
              {total} {total === 1 ? "resource" : "resources"}
            </span>
          </div>
        </div>

        {action}
      </div>

      {failed && (
        <p className="mt-5 text-sm text-muted">Couldn&apos;t load this section. Please try again.</p>
      )}

      {loading && !failed && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-2 lg:gap-6">
          {[0, 1].map((key) => (
            <span key={key} className="h-[96px] animate-pulse rounded-2xl bg-tint-strong" />
          ))}
        </div>
      )}

      {!loading && !failed && isEmpty && (
        <p className="mt-5 text-sm text-muted">Resources for this chapter not found.</p>
      )}

      {!loading && !failed && !isEmpty && children}

      {!loading && !failed && total > PAGE_SIZE && (
        <div className="mt-5 flex flex-col items-center justify-center gap-3 border-t border-brand/10 pt-4 md:relative md:flex-row">
          <p className="text-center text-caption leading-4 text-muted">
            Showing {shown} of {total}
          </p>
          <div className="flex items-center justify-center gap-3 md:absolute md:right-0">
            <button
              type="button"
              onClick={() => onPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              aria-label={`Previous page of ${title}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand/15 text-ink transition hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRightIcon className="h-4 w-4 rotate-180" />
            </button>
            <span className="whitespace-nowrap text-caption font-semibold text-ink">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              aria-label={`Next page of ${title}`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand/15 text-ink transition hover:bg-tint-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ResourceCard({
  id,
  icon,
  title,
  meta,
  bookmarked,
  onBookmark,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  meta: React.ReactNode;
  bookmarked: boolean;
  onBookmark: (id: string) => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 transition-all sm:p-5 ${
        bookmarked ? "border-brand shadow-sm" : "border-brand/10 hover:border-brand/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-[13px] font-bold text-ink sm:h-10 sm:w-10 sm:text-[14px]">
            {icon}
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="break-words text-[15px] font-bold leading-5 text-ink sm:text-[16px] sm:leading-6">
              {title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[13px] leading-5 text-muted sm:text-[14px]">
              {meta}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onBookmark(id)}
          aria-label={`Bookmark ${title}`}
          aria-pressed={bookmarked}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-tint hover:text-ink sm:h-10 sm:w-10"
        >
          <BookmarkIcon filled={bookmarked} />
        </button>
      </div>

      {children && (
        <>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="flex w-fit items-center gap-1 text-[13px] font-semibold text-brand transition-colors hover:opacity-80"
          >
            {open ? "Hide details" : "Show details"}
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && <div className="flex flex-col gap-3 border-t border-brand/10 pt-3">{children}</div>}
        </>
      )}
    </div>
  );
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] font-bold uppercase tracking-[0.5px] text-muted">{label}</p>
      <div className="mt-1 text-[14px] leading-6 text-ink">{children}</div>
    </div>
  );
}

const GRID = "mt-5 grid grid-cols-1 gap-4 sm:mt-6 lg:grid-cols-2 lg:gap-6";

function ChapterLibrary() {
  const searchParams = useSearchParams();
  const subjectName = searchParams.get("subject") ?? "";
  const chapterName = searchParams.get("chapter") ?? "";
  const focus = searchParams.get("focus") as LibraryContentType | null;

  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [pyqOnly, setPyqOnly] = useState(false);

  const toggleBookmark = (id: string) =>
    setBookmarked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const notes = useLibrarySection("NOTE", subjectName, chapterName);
  const formulas = useLibrarySection("FORMULA_SHEET", subjectName, chapterName);
  const lectures = useLibrarySection("YOUTUBE", subjectName, chapterName);
  const questions = useLibrarySection("PRACTICE_QUESTION", subjectName, chapterName, {
    isPYQ: pyqOnly ? true : undefined,
  });

  // Any of the four sections carries the chapter's own record, which is where
  // the class / sequence number for the header comes from.
  const chapterRef =
    notes.data?.notes[0]?.chapter ??
    formulas.data?.formulaSheets[0]?.chapter ??
    lectures.data?.youtubeLectures[0]?.chapter ??
    questions.data?.practiceQuestions[0]?.chapter ??
    null;

  const sections = useMemo(() => {
    const order: SectionKey[] = ["NOTE", "FORMULA_SHEET", "YOUTUBE", "PRACTICE_QUESTION"];
    // Deep-linked from the Library's "Show" filter — lead with that section.
    if (focus && order.includes(focus)) {
      return [focus, ...order.filter((key) => key !== focus)];
    }
    return order;
  }, [focus]);

  if (!subjectName || !chapterName) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
        <Link
          href="/home/resource-library"
          className="flex w-fit items-center gap-2 text-[13px] font-semibold text-ink sm:text-sm"
        >
          <ArrowLeftIcon />
          Back to Library
        </Link>
        <p className="text-sm text-muted">
          Pick a chapter from the Library to see its resources.
        </p>
      </div>
    );
  }

  const renderSection = (key: SectionKey) => {
    if (key === "NOTE") {
      const rows: LibraryNote[] = notes.data?.notes ?? [];
      return (
        <SectionShell
          key={key}
          icon={<TargetIcon />}
          title="Notes"
          total={notes.data?.counts.notes ?? 0}
          loading={notes.loading}
          failed={notes.failed}
          isEmpty={rows.length === 0}
          page={notes.page}
          onPage={notes.setPage}
          shown={rows.length}
        >
          <div className={GRID}>
            {rows.map((note) => (
              <ResourceCard
                key={note.id}
                id={note.id}
                icon={<TargetIcon />}
                title={note.title}
                meta={
                  <>
                    <span className="font-semibold text-ink">Notes</span>
                    {note.difficulty && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span className="capitalize">{note.difficulty.toLowerCase()}</span>
                      </>
                    )}
                  </>
                }
                bookmarked={bookmarked.has(note.id)}
                onBookmark={toggleBookmark}
              >
                {note.oneLiner && <DetailBlock label="In one line">{note.oneLiner}</DetailBlock>}
                {note.formula && (
                  <DetailBlock label="Formula">
                    <code className="block whitespace-pre-wrap break-words rounded-lg bg-tint px-3 py-2 font-mono text-[13px]">
                      {note.formula}
                    </code>
                  </DetailBlock>
                )}
                {note.whenToUse.length > 0 && (
                  <DetailBlock label="When to use">
                    <ul className="list-disc space-y-1 pl-5">
                      {note.whenToUse.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </DetailBlock>
                )}
                {note.commonMistake && (
                  <DetailBlock label="Common mistake">{note.commonMistake}</DetailBlock>
                )}
                {note.quickExample && (
                  <DetailBlock label="Quick example">{note.quickExample}</DetailBlock>
                )}
              </ResourceCard>
            ))}
          </div>
        </SectionShell>
      );
    }

    if (key === "FORMULA_SHEET") {
      const rows: LibraryFormulaSheet[] = formulas.data?.formulaSheets ?? [];
      return (
        <SectionShell
          key={key}
          icon={<ComputerIcon />}
          title="Formula Sheets"
          total={formulas.data?.counts.formulaSheets ?? 0}
          loading={formulas.loading}
          failed={formulas.failed}
          isEmpty={rows.length === 0}
          page={formulas.page}
          onPage={formulas.setPage}
          shown={rows.length}
        >
          <div className={GRID}>
            {rows.map((sheet) => (
              <ResourceCard
                key={sheet.id}
                id={sheet.id}
                icon="fx"
                title={sheet.title}
                meta={
                  <>
                    <span className="font-semibold text-ink">Formula</span>
                    {sheet.class && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span>Class {sheet.class}</span>
                      </>
                    )}
                  </>
                }
                bookmarked={bookmarked.has(sheet.id)}
                onBookmark={toggleBookmark}
              >
                {sheet.formula && (
                  <DetailBlock label="Formula">
                    <code className="block whitespace-pre-wrap break-words rounded-lg bg-tint px-3 py-2 font-mono text-[13px]">
                      {sheet.formula}
                    </code>
                  </DetailBlock>
                )}
                {sheet.variables.length > 0 && (
                  <DetailBlock label="Variables">
                    <ul className="list-disc space-y-1 pl-5">
                      {sheet.variables.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </DetailBlock>
                )}
                {sheet.conditions.length > 0 && (
                  <DetailBlock label="Conditions">
                    <ul className="list-disc space-y-1 pl-5">
                      {sheet.conditions.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </DetailBlock>
                )}
                {sheet.jeeTrick && <DetailBlock label="JEE trick">{sheet.jeeTrick}</DetailBlock>}
              </ResourceCard>
            ))}
          </div>
        </SectionShell>
      );
    }

    if (key === "YOUTUBE") {
      const rows: LibraryLecture[] = lectures.data?.youtubeLectures ?? [];
      return (
        <SectionShell
          key={key}
          icon={<PlayIcon />}
          title="Video Lectures"
          total={lectures.data?.counts.youtubeLectures ?? 0}
          loading={lectures.loading}
          failed={lectures.failed}
          isEmpty={rows.length === 0}
          page={lectures.page}
          onPage={lectures.setPage}
          shown={rows.length}
        >
          <div className={GRID}>
            {rows.map((lecture) => (
              <div
                key={lecture.id}
                className={`flex items-start justify-between gap-3 rounded-2xl border p-4 transition-all sm:gap-4 sm:p-5 ${
                  bookmarked.has(lecture.id)
                    ? "border-brand shadow-sm"
                    : "border-brand/10 hover:border-brand/20"
                }`}
              >
                <a
                  href={lecture.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-ink sm:h-10 sm:w-10">
                    <PlayIcon />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-[15px] font-bold leading-5 text-ink sm:text-[16px] sm:leading-6">
                      {lecture.title}
                    </h3>

                    <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[13px] leading-5 text-muted sm:text-[14px]">
                      {lecture.channel && (
                        <span className="font-semibold text-ink">{lecture.channel}</span>
                      )}
                      {lecture.lectureCategory && (
                        <>
                          <span aria-hidden="true">•</span>
                          <span>{lecture.lectureCategory.replace(/_/g, " ").toLowerCase()}</span>
                        </>
                      )}
                      {lecture.publishedAt && (
                        <>
                          <span aria-hidden="true">•</span>
                          <span className="whitespace-nowrap">
                            {new Date(lecture.publishedAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>

                    <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-brand">
                      Watch on YouTube
                      <ChevronRightIcon className="h-4 w-4" />
                    </span>
                  </div>
                </a>

                <button
                  type="button"
                  onClick={() => toggleBookmark(lecture.id)}
                  aria-label={`Bookmark ${lecture.title}`}
                  aria-pressed={bookmarked.has(lecture.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-tint hover:text-ink sm:h-10 sm:w-10"
                >
                  <BookmarkIcon filled={bookmarked.has(lecture.id)} />
                </button>
              </div>
            ))}
          </div>
        </SectionShell>
      );
    }

    const rows: LibraryQuestion[] = questions.data?.practiceQuestions ?? [];
    return (
      <SectionShell
        key={key}
        icon={<BookmarkIcon />}
        title={pyqOnly ? "Previous Year Questions" : "Practice Questions"}
        total={questions.data?.counts.practiceQuestions ?? 0}
        loading={questions.loading}
        failed={questions.failed}
        isEmpty={rows.length === 0}
        page={questions.page}
        onPage={questions.setPage}
        shown={rows.length}
        action={
          <button
            type="button"
            onClick={() => setPyqOnly((value) => !value)}
            aria-pressed={pyqOnly}
            className={`h-[34px] rounded-full px-4 text-[13px] font-semibold transition-colors ${
              pyqOnly
                ? "bg-brand text-white"
                : "border border-tint-strong bg-tint-strong text-ink hover:border-brand/20"
            }`}
          >
            PYQs only
          </button>
        }
      >
        <div className="mt-5 flex flex-col gap-4 sm:mt-6">
          {rows.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              bookmarked={bookmarked.has(question.id)}
              onBookmark={toggleBookmark}
            />
          ))}
        </div>
      </SectionShell>
    );
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:gap-6 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/home/resource-library"
          className="flex w-fit items-center gap-2 text-[13px] font-semibold text-ink transition-colors sm:text-sm"
        >
          <ArrowLeftIcon />
          Back to Library
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-5 text-ink sm:text-[14px]">
              {subjectName}
            </p>

            <h1 className="mt-1 break-words text-[28px] font-extrabold leading-tight tracking-[-0.5px] text-ink sm:text-[36px] sm:tracking-[-0.75px] lg:text-[48px] lg:leading-none lg:tracking-[-1px]">
              {chapterName}
            </h1>

            <p className="mt-2 text-[14px] font-medium leading-6 text-muted sm:text-[16px]">
              {[
                chapterRef?.sequenceOrder ? `Chapter ${chapterRef.sequenceOrder}` : null,
                chapterRef?.class ? `Class ${chapterRef.class}` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Chapter"}
            </p>
          </div>

          <Link
            href="/practice"
            className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-lg bg-[#FF7A59] px-5 text-[15px] font-bold text-white transition-all hover:bg-[#FF6A45] sm:h-12 sm:w-[209px] sm:px-6 sm:text-[16px]"
          >
            Practice this chapter
          </Link>
        </div>
      </div>

      {sections.map(renderSection)}
    </div>
  );
}

function QuestionCard({
  question,
  bookmarked,
  onBookmark,
}: {
  question: LibraryQuestion;
  bookmarked: boolean;
  onBookmark: (id: string) => void;
}) {
  const [showSolution, setShowSolution] = useState(false);
  const options = question.options ? Object.entries(question.options) : [];

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 transition-all sm:p-5 ${
        bookmarked ? "border-brand shadow-sm" : "border-brand/10 hover:border-brand/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {question.isPYQ && (
              <span className="rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.5px] text-brand">
                PYQ
              </span>
            )}
            <span className="rounded-full bg-tint-strong px-3 py-1 text-[11px] font-semibold capitalize text-ink">
              {question.difficulty.toLowerCase().replace(/_/g, " ")}
            </span>
            {question.examDetail && (
              <span className="text-[12px] font-medium text-muted">{question.examDetail}</span>
            )}
          </div>

          <p className="mt-2 whitespace-pre-wrap break-words text-[15px] font-medium leading-6 text-ink">
            {question.questionText}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onBookmark(question.id)}
          aria-label="Bookmark question"
          aria-pressed={bookmarked}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-tint hover:text-ink"
        >
          <BookmarkIcon filled={bookmarked} />
        </button>
      </div>

      {options.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {options.map(([label, text]) => (
            <li
              key={label}
              className="flex gap-2 rounded-lg bg-tint px-3 py-2 text-[14px] leading-5 text-ink"
            >
              <span className="font-bold">{label}.</span>
              <span className="min-w-0 break-words">{text}</span>
            </li>
          ))}
        </ul>
      )}

      {(question.answerText || question.solutionText) && (
        <>
          <button
            type="button"
            onClick={() => setShowSolution((value) => !value)}
            aria-expanded={showSolution}
            className="flex w-fit items-center gap-1 text-[13px] font-semibold text-brand transition-colors hover:opacity-80"
          >
            {showSolution ? "Hide solution" : "Show solution"}
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${showSolution ? "rotate-180" : ""}`}
            />
          </button>

          {showSolution && (
            <div className="flex flex-col gap-3 border-t border-brand/10 pt-3">
              {question.answerText && <DetailBlock label="Answer">{question.answerText}</DetailBlock>}
              {question.solutionText && (
                <DetailBlock label="Solution">
                  <p className="whitespace-pre-wrap break-words">{question.solutionText}</p>
                </DetailBlock>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ResourceChapterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
          <span className="h-8 w-40 animate-pulse rounded-lg bg-tint-strong" />
          <span className="h-[200px] animate-pulse rounded-2xl bg-tint-strong" />
        </div>
      }
    >
      <ChapterLibrary />
    </Suspense>
  );
}
