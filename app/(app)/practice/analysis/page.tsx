"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  ArrowLeftIcons,
  // BellIcon,
  BookmarkIcon,
  CheckIcon,
  XIcon,
  ConceptualGapIcon,
  SillyErrorIcon,
  TimePressureIcon,
  WildGuessIcon,
} from "@/components/ui/icons";
import {
  answerToText,
  getPracticeSession,
  MISTAKE_TAG_LABELS,
  optionEntries,
  prettyDifficulty,
  tagMistake,
  type MistakeTag,
  type PracticeSessionDetail,
  type PracticeSessionQuestion,
} from "@/lib/api/practice";
import { ArrowLeftIcon, BellIcon, Open } from "@/assets/icons";

const ALL_TAGS = Object.keys(MISTAKE_TAG_LABELS) as MistakeTag[];

const TAG_ICONS: Record<MistakeTag, ReactNode> = {
  SILLY_ERROR: <SillyErrorIcon />,
  CONCEPTUAL_GAP: <ConceptualGapIcon />,
  TIME_PRESSURE: <TimePressureIcon />,
  WILD_GUESS: <WildGuessIcon />,
};

const TAG_DESCRIPTIONS: Record<MistakeTag, string> = {
  CONCEPTUAL_GAP: "You struggled with understanding the concept.",
  SILLY_ERROR: "A careless slip — the concept was understood.",
  TIME_PRESSURE: "You ran short on time on this one.",
  WILD_GUESS: "Answered without a confident method.",
};

function relativeDay(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

type AnalysisFilter = "all" | "correct" | "wrong" | "skipped" | "marked";

const FILTERS: { id: AnalysisFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "correct", label: "Correct" },
  { id: "wrong", label: "Wrong" },
  { id: "skipped", label: "Skipped" },
  { id: "marked", label: "Marked" },
];

export default function QuestionAnalysisPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading analysis…" />}>
      <QuestionAnalysisContent />
    </Suspense>
  );
}

function QuestionAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const solutionsFirst = searchParams.get("solutions") === "1";

  const [session, setSession] = useState<PracticeSessionDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AnalysisFilter>("all");
  // One question shown at a time — this is the position within the filtered set.
  const [index, setIndex] = useState(0);
  // Live tag edits, layered over each mistake's server-side tags. Keyed by
  // practiceSessionQuestionId.
  const [tagOverrides, setTagOverrides] = useState<Record<string, MistakeTag[]>>({});
  const error = fetchError ?? (sessionId ? null : "No session specified.");

  const selectFilter = (id: AnalysisFilter) => {
    setFilter(id);
    setIndex(0);
  };

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    getPracticeSession(sessionId)
      .then((res) => !cancelled && setSession(res.data))
      .catch(
        (err) =>
          !cancelled &&
          setFetchError(err instanceof Error ? err.message : "Could not load the analysis."),
      );
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const withQuestion = useMemo(
    () => (session?.questions ?? []).filter((q) => q.question),
    [session],
  );

  const counts = useMemo(
    () => ({
      all: withQuestion.length,
      correct: withQuestion.filter((q) => q.result === "CORRECT").length,
      wrong: withQuestion.filter((q) => q.result === "WRONG").length,
      skipped: withQuestion.filter((q) => q.result === "SKIPPED").length,
      marked: withQuestion.filter((q) => q.markedForReview).length,
    }),
    [withQuestion],
  );

  const visible = useMemo(() => {
    switch (filter) {
      case "correct":
        return withQuestion.filter((q) => q.result === "CORRECT");
      case "wrong":
        return withQuestion.filter((q) => q.result === "WRONG");
      case "skipped":
        return withQuestion.filter((q) => q.result === "SKIPPED");
      case "marked":
        return withQuestion.filter((q) => q.markedForReview);
      default:
        return withQuestion;
    }
  }, [withQuestion, filter]);

  const currentIndex = visible.length ? Math.min(index, visible.length - 1) : 0;
  const currentQuestion = visible[currentIndex];

  const tagsFor = (sq: PracticeSessionQuestion): MistakeTag[] =>
    tagOverrides[sq.practiceSessionQuestionId] ?? sq.mistakeEntry?.mistakeTags ?? [];

  // Every wrong answer needs at least one tag before the pattern analysis is
  // meaningful. Count how many are still untagged and only unlock the button
  // once none remain.
  const wrongToTag = withQuestion.filter((q) => q.result === "WRONG" && q.mistakeEntry?.id);
  const untaggedCount = wrongToTag.filter((q) => tagsFor(q).length === 0).length;
  const allTagged = wrongToTag.length > 0 && untaggedCount === 0;

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-h2 text-ink">Analysis unavailable</p>
        <p className="max-w-md text-sm text-muted">{error}</p>
        <Button href="/plan" variant="secondary" size="sm">
          Back to plan
        </Button>
      </div>
    );
  }

  if (!session) return <PageLoader label="Loading analysis…" />;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={sessionId ? `/practice/complete?sessionId=${sessionId}` : "/practice"}
            aria-label="Back to practice results"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-tint-strong"
          >
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Question Analysis</h1>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg text-icon-action-text transition-colors hover:bg-tint-strong"
          >
            <BellIcon />
          </button>
          <UserMenu />
        </div>
      </div>

      <div className="flex flex-col gap-3">
            <div className="flex min-h-[38px] min-w-0 flex-1 flex-wrap items-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => selectFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`
          flex
          h-9
          shrink-0
          items-center
          justify-center
          gap-1.5
          rounded-full
          border
          px-4
          text-[13px]
          leading-none
          whitespace-nowrap
          transition-all
          duration-200

          ${filter === f.id
                      ? "border-brand bg-brand text-white dark:border-white dark:bg-white dark:text-[#1A1A4E]"
                      : "border-brand bg-surface text-[#444655] hover:text-ink dark:border-secondary dark:bg-transparent dark:text-secondary dark:hover:border-white"
                    }
        `}
                >
                  <span className="font-semibold">
                    {f.label}
                  </span>

                  <span className="font-medium opacity-70">
                    ({counts[f.id]})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-brand/10 bg-surface p-8 text-center">
              <p className="text-sm text-muted">Nothing to show here.</p>
            </div>
          ) : solutionsFirst ? (
            /* "View Solutions" — every question at once, solutions expanded. */
            <div className="flex flex-col gap-6">
              {visible.map((sq) => (
                <QuestionCard
                  key={sq.practiceSessionQuestionId}
                  sq={sq}
                  openSolution
                  tags={tagsFor(sq)}
                  onTagsChange={(next) =>
                    setTagOverrides((m) => ({ ...m, [sq.practiceSessionQuestionId]: next }))
                  }
                />
              ))}
            </div>
          ) : (
            /* "Question by Question" — one at a time. */
            <div className="flex flex-col gap-4">
              <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
                {/* Question Counter */}
                <p className="text-[13px] font-bold leading-none text-ink sm:text-[14px]">
                  Question {currentIndex + 1} of {visible.length}
                </p>

                {/* Prev / Next */}
                <div className="flex h-8 shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-[rgba(225,227,228,0.3)] bg-[#FFFFFF] px-3 text-[12px] font-semibold leading-none text-[#1A1A4E] transition-colors hover:bg-tint-strong disabled:opacity-30 disabled:hover:bg-transparent dark:border-[var(--border-divider,#FAF7F20F)] dark:bg-[#1A1A4E] dark:text-[#FAF7F2] sm:px-4 sm:text-[13px]"
                  >
                    <ArrowLeftIcons className="h-[14px] w-[14px] shrink-0" />
                    Prev
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setIndex((i) => Math.min(visible.length - 1, i + 1))
                    }
                    disabled={currentIndex >= visible.length - 1}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-[rgba(225,227,228,0.3)] bg-[#FFFFFF] px-3 text-[12px] font-semibold leading-none text-[#1A1A4E] transition-colors hover:bg-tint-strong disabled:opacity-30 disabled:hover:bg-transparent dark:border-[var(--border-divider,#FAF7F20F)] dark:bg-[#1A1A4E] dark:text-[#FAF7F2] sm:px-4 sm:text-[13px]"
                  >
                    Next

                    <span className="rotate-180">
                      <ArrowLeftIcons className="h-[14px] w-[14px] shrink-0" />
                    </span>
                  </button>
                </div>
              </div>

              <QuestionCard
                key={currentQuestion!.practiceSessionQuestionId}
                sq={currentQuestion!}
                openSolution={false}
                tags={tagsFor(currentQuestion!)}
                onTagsChange={(next) =>
                  setTagOverrides((m) => ({
                    ...m,
                    [currentQuestion!.practiceSessionQuestionId]: next,
                  }))
                }
              />
            </div>
          )}

          {wrongToTag.length > 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-6 text-center">
              <p className="text-sm text-muted">
                {allTagged
                  ? "All wrong answers tagged — see how they add up."
                  : `Tag every wrong answer to analyse the mistake pattern — ${untaggedCount} of ${wrongToTag.length} left.`}
              </p>
              <Button
                variant="primary"
                size="sm"
                disabled={!allTagged}
                onClick={() =>
                  router.push(
                    sessionId
                      ? `/practice/mistake-analysis?sessionId=${sessionId}`
                      : "/home/mistake-notebook",
                  )
                }
              >
                Analyse mistake pattern
              </Button>
            </div>
          )}
    </div>
  );
}

function QuestionCard({
  sq,
  openSolution,
  tags,
  onTagsChange,
}: {
  sq: PracticeSessionQuestion;
  openSolution: boolean;
  /** Controlled by the page so it can tell when every mistake is tagged. */
  tags: MistakeTag[];
  onTagsChange: (tags: MistakeTag[]) => void;
}) {
  const q = sq.question!;
  const correctKey = answerToText(sq.correctAnswer ?? q.correctAnswer);
  const yourKey = sq.result === "SKIPPED" ? null : answerToText(sq.studentAnswer);
  const isCorrect = sq.result === "CORRECT";
  const options = optionEntries(q.options);

  const [showSolution, setShowSolution] = useState(openSolution);
  const [note, setNote] = useState(sq.mistakeEntry?.studentNote ?? "");
  const [savedNote, setSavedNote] = useState(sq.mistakeEntry?.studentNote ?? "");
  const [busy, setBusy] = useState(false);
  const [pendingTag, setPendingTag] = useState<MistakeTag | null>(null);
  const mistakeId = sq.mistakeEntry?.id ?? null;

  // Review stats mirrored locally so a re-tag on this screen updates the panel
  // without a refetch.
  const [reviewCount, setReviewCount] = useState(sq.mistakeEntry?.reviewCount ?? 0);
  const [lastReviewedAt, setLastReviewedAt] = useState<string | null>(
    sq.mistakeEntry?.lastReviewedAt ?? null,
  );
  // Only the first edit in a visit counts as one re-review.
  const reReviewedRef = useRef(false);

  // "Reviewed before" — a notebook question already tagged / reviewed, i.e. one
  // being re-practised from the Mistake Notebook. Those also get the read-only
  // context panels above the tag editor. Decided from the server value, not the
  // live-edited `tags`, so tagging here doesn't flip the card mid-use.
  const isReviewedMistake =
    !!sq.mistakeEntry &&
    (sq.mistakeEntry.mistakeTags.length > 0 ||
      sq.mistakeEntry.reviewCount > 0 ||
      !!sq.mistakeEntry.lastReviewedAt);

  // A change to an already-tagged mistake is a re-review: bump the count once.
  const reReviewFlag = () => {
    if (!isReviewedMistake || reReviewedRef.current) return false;
    reReviewedRef.current = true;
    setReviewCount((c) => c + 1);
    setLastReviewedAt(new Date().toISOString());
    return true;
  };

  const toggleTag = async (tag: MistakeTag) => {
    if (!mistakeId || busy || pendingTag) return;
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    onTagsChange(next);
    setPendingTag(tag);
    setBusy(true);
    const reReview = reReviewFlag();
    try {
      await tagMistake(mistakeId, { mistakeTags: next, ...(reReview && { reReview: true }) });
    } catch {
      onTagsChange(tags); // revert on failure
    } finally {
      setBusy(false);
      setPendingTag(null);
    }
  };

  const saveNote = async () => {
    if (!mistakeId || busy || note === savedNote) return;
    setBusy(true);
    const reReview = reReviewFlag();
    try {
      await tagMistake(mistakeId, { studentNote: note, ...(reReview && { reReview: true }) });
      setSavedNote(note);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-brand/10 bg-surface p-6">
        <div className="flex min-h-[22px] flex-wrap items-center justify-between gap-2">
          {/* Question */}
          <p className="min-w-0 truncate text-[13px] font-semibold leading-none tracking-normal text-ink sm:text-[16px]">
            Q.{sq.displayOrder} · {q.topic}
          </p>

          {/* Status badges */}
          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
            {q.difficulty && (
              <span className="flex h-[22px] items-center gap-1 rounded bg-tint px-2 text-[9px] font-bold uppercase leading-[15px] tracking-[0.5px] text-ink sm:text-[10px]">
                {prettyDifficulty(q.difficulty)}
              </span>
            )}

            {sq.markedForReview && (
              <span className="flex h-[22px] items-center gap-1 rounded bg-tint px-2 text-[9px] font-bold uppercase leading-[15px] tracking-[0.5px] text-ink sm:text-[10px]">
                <BookmarkIcon
                  filled
                  className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3"
                />
                Marked
              </span>
            )}

            <span
              className={`flex h-[22px] items-center gap-1 rounded px-2 text-[9px] font-bold uppercase leading-[15px] tracking-[0.5px] sm:text-[10px] ${isCorrect
                ? "bg-[rgba(67,176,144,0.1)] text-[#28B485]"
                : sq.result === "WRONG"
                  ? "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"
                  : "bg-tint text-muted"
                }`}
            >
              {isCorrect ? (
                <CheckIcon className="h-1.5 w-1.5 shrink-0 sm:h-2 sm:w-2" />
              ) : sq.result === "WRONG" ? (
                <XIcon className="h-1.5 w-1.5 shrink-0 sm:h-2 sm:w-2" />
              ) : null}

              {sq.result}
            </span>
          </div>
        </div>

        <p className="mt-3 text-[14px] font-medium italic leading-[21px] tracking-normal text-body-text sm:mt-4 sm:text-[16px] sm:leading-6">
          {q.questionText}
        </p>
        {q.questionImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={q.questionImageUrl}
            alt="Question figure"
            loading="lazy"
            className="mt-3 max-h-72 w-auto rounded-xl border border-brand/10 object-contain"
          />
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {options.map(([key, value]) => {
            const isYour = yourKey === key;
            const isRight = correctKey === key;

            return (
              <div
                key={key}
                className={`min-h-[75px] rounded-xl border p-4 ${isRight
                  ? "border-[1.5px] border-[#28B485] bg-[rgba(67,176,144,0.06)]"
                  : isYour
                    ? "border-[1.5px] border-[#F59E0B] bg-cta/5"
                    : "border-brand/10"
                  }`}
              >
                {/* Option label */}
                <div className="flex min-h-[15px] flex-wrap items-center gap-1">
                  <p className="text-[11px] font-bold uppercase leading-[15px] tracking-[0.5px] text-muted sm:text-[12px] sm:leading-[15px]">
                    Option {key}
                  </p>

                  {isYour && (
                    <span className="text-[11px] font-bold leading-[15px] tracking-normal text-[#F59E0B] sm:text-[12px]">
                      (Your answer)
                    </span>
                  )}

                  {isRight && (
                    <span className="text-[11px] font-bold leading-[15px] tracking-normal text-[#28B485] sm:text-[12px]">
                      (Correct)
                    </span>
                  )}
                </div>

                {/* Option value */}
                <p className="mt-1.5 break-words text-[14px] font-semibold leading-5 tracking-normal text-ink sm:text-[16px] sm:leading-5">
                  {value}
                </p>
              </div>
            );
          })}
        </div>



        <div className="mt-5 flex min-h-[38px] w-full flex-wrap items-center justify-between gap-4 border-t border-brand/10 pt-4">
          {/* Left information section */}
          <div className="flex min-h-[38px] w-full flex-wrap items-center gap-8 sm:w-auto sm:gap-12">
            {/* Your Answer */}
            <div className="flex h-[38px] min-w-[82px] flex-col gap-1">
              <p className="text-[10px] font-bold uppercase leading-[14px] tracking-normal text-[#777681] sm:text-[11px] sm:leading-[14px]">
                Your Answer
              </p>

              <p className="text-[15px] font-bold leading-5 text-[#F59E0B] sm:text-[16px]">
                {yourKey ?? "Skipped"}
              </p>
            </div>

            {/* Correct Answer */}
            <div className="flex h-[38px] min-w-[96px] flex-col gap-1">
              <p className="text-[10px] font-bold uppercase leading-[14px] tracking-normal text-[#777681] sm:text-[11px] sm:leading-[14px]">
                Correct Answer
              </p>

              <p className="text-[15px] font-bold leading-5 text-[#28B485] sm:text-[16px]">
                {correctKey}
              </p>
            </div>

            {/* Time Taken */}
            {sq.timeTakenSeconds != null && (
              <div className="flex h-[38px] min-w-[70px] flex-col gap-1">
                <p className="text-[10px] font-bold uppercase leading-[14px] tracking-normal text-[#777681] sm:text-[11px] sm:leading-[14px]">
                  Time Taken
                </p>

                <p className="text-[15px] font-bold leading-5 text-[#1A1A4E] dark:text-[#FAF7F2] sm:text-[16px]">
                  {Math.floor(sq.timeTakenSeconds / 60)}:
                  {String(sq.timeTakenSeconds % 60).padStart(2, "0")}
                </p>
              </div>
            )}
          </div>

          {/* View Solution */}
          {(q.solutionText || q.solutionImageUrl) && (
            <button
              type="button"
              onClick={() => setShowSolution((v) => !v)}
              className="flex h-[18px] shrink-0 items-center gap-1.5 text-[14px] font-semibold leading-[18px] tracking-normal text-ink transition-opacity hover:opacity-70"
            >
              <span className="underline">
                {showSolution ? "Hide solution" : "View solution"}
              </span>

              <Open className="h-4 w-4 shrink-0" />
            </button>
          )}
        </div>

        {/* Solution content */}
        {showSolution && (q.solutionText || q.solutionImageUrl) && (
          <div className="mt-2 rounded-xl bg-tint/40 p-4 text-sm leading-relaxed whitespace-pre-line text-body-text">
            {q.solutionText}

            {q.solutionImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={q.solutionImageUrl}
                alt="Solution figure"
                loading="lazy"
                className="mt-3 max-h-72 w-auto max-w-full rounded-lg border border-brand/10 object-contain"
              />
            )}
          </div>
        )}
      </div>

      {/* Mistake-notebook context — for a question re-practised from the Mistake
        Notebook (already tagged / reviewed). Reflects the live-edited values. */}
      {isReviewedMistake && sq.mistakeEntry && (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {/* Mistake Tag */}
          <div className="flex min-h-[139px] w-full flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-5 sm:p-6">
            <p className="text-[12px] font-semibold uppercase leading-[18px] tracking-[0.5px] text-muted sm:text-[14px] sm:leading-[18px]">
              Mistake Tag
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {tags.length ? (
                tags.map((t) => (
                  <span
                    key={t}
                    className="flex h-[23px] items-center gap-1 rounded-[6px] bg-tint px-[10px] py-1 text-[12px] font-semibold leading-[15px] tracking-normal text-ink"
                  >
                    <span className="flex h-3 w-3 shrink-0 items-center justify-center [&>svg]:h-3 [&>svg]:w-3">
                      {TAG_ICONS[t]}
                    </span>

                    <span className="whitespace-nowrap">
                      {MISTAKE_TAG_LABELS[t]}
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-[13px] font-normal leading-[18px] text-muted">
                  Not tagged yet
                </span>
              )}
            </div>

            {tags[0] && (
              <p className="text-[13px] font-normal leading-[18px] tracking-normal text-muted sm:text-[14px] sm:leading-[18px]">
                {TAG_DESCRIPTIONS[tags[0]]}
              </p>
            )}
          </div>

          {/* Student Note */}
          <div className="flex min-h-[139px] w-full flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-5 sm:p-6">
            <p className="text-[12px] font-semibold uppercase leading-[18px] tracking-[0.5px] text-muted sm:text-[14px] sm:leading-[18px]">
              Student Note
            </p>

            <p className="break-words text-[13px] font-medium leading-[18px] tracking-normal text-body-text sm:text-[14px] sm:leading-[18px]">
              {savedNote ? `“${savedNote}”` : "No note added."}
            </p>
          </div>

          {/* Review Information - Full Width */}
          <div className="flex min-h-[102px] w-full flex-wrap items-center gap-10 rounded-2xl border border-brand/10 bg-surface p-5 sm:col-span-2 sm:gap-16 sm:p-6">
            {/* Review Count */}
            <div className="flex min-w-[120px] flex-col gap-1.5">
              <p className="text-[12px] font-semibold uppercase leading-[18px] tracking-[0.5px] text-brand sm:text-[14px] sm:leading-[18px]">
                Review Count
              </p>

              <div className="flex h-[30px] items-center gap-1.5">
                <p className="text-[20px] font-extrabold leading-[30px] text-ink sm:text-[22px]">
                  {reviewCount}
                </p>

                <p className="text-[12px] font-normal leading-[18px] text-muted">
                  Times reviewed
                </p>
              </div>
            </div>

            {/* Last Reviewed */}
            <div className="flex min-w-[120px] flex-col gap-1.5">
              <p className="text-[12px] font-semibold uppercase leading-[18px] tracking-[0.5px] text-muted sm:text-[14px] sm:leading-[18px]">
                Last Reviewed
              </p>

              <div className="flex min-h-[30px] items-center">
                <p className="text-[13px] font-medium leading-[18px] text-ink sm:text-[14px] sm:leading-[18px]">
                  {lastReviewedAt ? (
                    <>
                      {new Date(lastReviewedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      <span className="font-medium text-muted">
                        ({relativeDay(lastReviewedAt)})
                      </span>
                    </>
                  ) : (
                    "Not reviewed yet"
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag this mistake (PRD 5.5.2 / 5.5.3) — shown only for a wrong answer
        (re-practising from the Mistake Notebook and getting it right this
        time still carries a mistakeEntry, but there's nothing to re-tag).
        Re-tagging one already reviewed counts as a re-review. */}
      {mistakeId && sq.result === "WRONG" && (
        <div className="w-full rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <p className="text-[12px] font-semibold uppercase leading-[18px] tracking-[0.5px] text-muted sm:text-[14px] sm:leading-[18px]">
            {isReviewedMistake ? "Re-tag this mistake" : "Tag this mistake"}
          </p>

          {/* Tags */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {ALL_TAGS.map((tag) => {
              const active = tags.includes(tag);

              return (
                <button
                  key={tag}
                  type="button"
                  disabled={busy && pendingTag === tag}
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  className={`flex h-[74px] w-full flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors disabled:opacity-50 ${active
                    ? "border-[1.5px] border-brand bg-tint/50 text-brand"
                    : "border-brand/15 text-body-text hover:border-ink/40"
                    }`}
                >
                  {/* Icon */}
                  <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center [&>svg]:h-[18px] [&>svg]:w-[18px]">
                    {TAG_ICONS[tag]}
                  </span>

                  {/* Label */}
                  <span className="text-[13px] font-semibold leading-[16px] tracking-normal">
                    {MISTAKE_TAG_LABELS[tag]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Personal Note */}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            placeholder='Add a personal note (e.g. “forgot the sign convention”)'
            rows={1}
            className="mt-6 h-[50px] w-full resize-none overflow-hidden rounded-xl border border-brand/20 bg-transparent px-3 py-3 text-[13px] font-normal leading-[18px] tracking-normal text-ink outline-none placeholder:text-muted focus:border-ink/40 sm:px-4 sm:py-4 sm:text-[14px]"
          />

          {/* Notebook Status */}
          <div className="mt-6 flex min-h-[16px] w-full flex-wrap items-center justify-between gap-3">
            <span className="flex min-h-[16px] items-center gap-1.5 text-[12px] font-semibold leading-4 tracking-normal text-success sm:text-[13px]">
              <span aria-hidden="true">✓</span>
              <span>Added to Mistake Notebook</span>
            </span>

            {note !== savedNote && (
              <button
                type="button"
                onClick={saveNote}
                disabled={busy}
                className="text-[12px] font-bold leading-4 text-ink underline disabled:opacity-50 sm:text-[13px]"
              >
                Save note
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
