"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import {
  // ArrowLeftIcon,
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
import { ArrowLeftIcon, BellIcon } from "@/assets/icons";

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
    <Suspense fallback={null}>
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

      {!session ? (
        <p className="text-sm text-muted">Loading analysis…</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:gap-3 md:gap-4">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => selectFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`
          flex
          h-8
          shrink-0
          items-center
          justify-center
          rounded-full
          border
          px-2.5
          text-[9px]
          font-semibold
          leading-4
          whitespace-nowrap
          transition-all
          duration-200

          sm:h-10
          sm:px-4
          sm:text-xs
          sm:leading-5

          md:h-[42px]
          md:px-5
          md:text-[13px]

          lg:text-sm

          ${filter === f.id
                      ? "border-brand bg-brand text-white dark:border-white dark:bg-white dark:text-[#1A1A4E]"
                      : "border-brand bg-surface text-[#444655] hover:text-ink dark:border-secondary dark:bg-transparent dark:text-secondary dark:hover:border-white"
                    }
        `}
                >
                  {f.label} ({counts[f.id]})
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-muted">Nothing to show here.</p>
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-ink">
                  Question {currentIndex + 1} of {visible.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                    className="flex h-9 items-center gap-1.5 rounded-full border border-brand/20 px-4 text-[13px] font-bold text-ink transition-colors hover:bg-tint-strong disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowLeftIcon />
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setIndex((i) => Math.min(visible.length - 1, i + 1))
                    }
                    disabled={currentIndex >= visible.length - 1}
                    className="flex h-9 items-center gap-1.5 rounded-full border border-brand/20 px-4 text-[13px] font-bold text-ink transition-colors hover:bg-tint-strong disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    Next
                    <span className="rotate-180">
                      <ArrowLeftIcon />
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
        </>
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
    if (!mistakeId || busy) return;
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    onTagsChange(next);
    setBusy(true);
    const reReview = reReviewFlag();
    try {
      await tagMistake(mistakeId, { mistakeTags: next, ...(reReview && { reReview: true }) });
    } catch {
      onTagsChange(tags); // revert on failure
    } finally {
      setBusy(false);
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
        <div className="flex min-h-[23px] flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[12px] font-bold uppercase leading-4 tracking-[1.2px] text-ink sm:text-[14px] sm:leading-5 sm:tracking-[1.4px]">
            Q.{sq.displayOrder} · {q.topic}
          </p>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:gap-2">
            {q.difficulty && (
              <span className="rounded-full bg-tint px-2.5 py-1 text-[9px] font-bold uppercase leading-[15px] tracking-wide text-ink sm:px-3 sm:text-[10px]">
                {prettyDifficulty(q.difficulty)}
              </span>
            )}

            {sq.markedForReview && (
              <span className="flex items-center gap-1 rounded-full bg-tint px-2.5 py-1 text-[9px] font-bold uppercase leading-[15px] text-ink sm:px-3 sm:text-[10px]">
                <BookmarkIcon
                  filled
                  className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                />
                Marked
              </span>
            )}

            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase leading-[15px] sm:px-3 sm:text-[10px] ${isCorrect
                ? "bg-[rgba(67,176,144,0.1)] text-[#28B485]"
                : sq.result === "WRONG"
                  ? "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"
                  : "bg-tint text-muted"
                }`}
            >
              {isCorrect ? (
                <CheckIcon />
              ) : sq.result === "WRONG" ? (
                <XIcon />
              ) : null}

              {sq.result}
            </span>
          </div>
        </div>

        <p className="mt-3 text-[15px] font-medium italic leading-6 text-body-text sm:mt-4 sm:text-[18px] sm:leading-[29.25px]">
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
                className={`rounded-xl border p-4 ${isRight
                  ? "border-[1.5px] border-[#28B485] bg-[rgba(67,176,144,0.06)]"
                  : isYour
                    ? "border-[1.5px] border-[#F59E0B] bg-cta/5"
                    : "border-brand/10"
                  }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    Option {key}
                    {isYour && <span className="ml-1 normal-case text-[#F59E0B]">(Your answer)</span>}
                    {isRight && <span className="ml-1 normal-case text-[#28B485]">(Correct)</span>}
                  </p>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-ink">{value}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-brand/10 pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#F59E0B]">Your answer</p>
            <p className="text-sm font-bold text-[#F59E0B]">{yourKey ?? "Skipped"}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-success">Correct</p>
            <p className="text-sm font-bold text-success">{correctKey}</p>
          </div>
          {sq.timeTakenSeconds != null && (
            <p className="text-xs text-muted">
              Time: {Math.floor(sq.timeTakenSeconds / 60)}:
              {String(sq.timeTakenSeconds % 60).padStart(2, "0")}
            </p>
          )}
        </div>

        {(q.solutionText || q.solutionImageUrl) && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowSolution((v) => !v)}
              className="text-[13px] font-bold text-ink underline"
            >
              {showSolution ? "Hide solution" : "View solution"}
            </button>
            {showSolution && (
              <div className="mt-2 rounded-xl bg-tint/40 p-4 text-sm leading-relaxed whitespace-pre-line text-body-text">
                {q.solutionText}
                {q.solutionImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={q.solutionImageUrl}
                    alt="Solution figure"
                    loading="lazy"
                    className="mt-3 max-h-72 w-auto rounded-lg border border-brand/10 object-contain"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mistake-notebook context — for a question re-practised from the Mistake
        Notebook (already tagged / reviewed). Reflects the live-edited values. */}
      {isReviewedMistake && sq.mistakeEntry && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-brand/10 bg-surface p-5">
            <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted">
              Mistake Tag
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.length ? (
                tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1.5 rounded-full bg-tint px-3 py-1 text-[12px] font-bold text-ink"
                  >
                    {TAG_ICONS[t]}
                    {MISTAKE_TAG_LABELS[t]}
                  </span>
                ))
              ) : (
                <span className="text-[13px] text-muted">Not tagged yet</span>
              )}
            </div>
            {tags[0] && (
              <p className="mt-2 text-[13px] leading-5 text-muted">
                {TAG_DESCRIPTIONS[tags[0]]}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-brand/10 bg-surface p-5">
            <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted">
              Student Note
            </p>
            <p className="mt-2 text-[13px] italic leading-5 text-body-text">
              {savedNote ? `“${savedNote}”` : "No note added."}
            </p>
          </div>

          <div className="rounded-2xl border border-brand/10 bg-surface p-5 sm:col-span-2">
            <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand">
                  Review Count
                </p>
                <p className="mt-1 text-[22px] font-extrabold leading-7 text-ink">
                  {reviewCount}
                </p>
                <p className="text-[12px] text-muted">Times reviewed</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted">
                  Last Reviewed
                </p>
                <p className="mt-1 text-[14px] font-bold text-ink">
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

      {/* Tag this mistake (PRD 5.5.2 / 5.5.3) — shown for any wrong answer in the
        notebook. Re-tagging one already reviewed counts as a re-review. */}
      {mistakeId && (
        <div className="rounded-2xl border border-brand/10 bg-surface p-6">
          <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-muted">
            {isReviewedMistake ? "Re-tag this mistake" : "Tag this mistake"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ALL_TAGS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  disabled={busy}
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-colors disabled:opacity-50 ${active
                    ? "border-[1.5px] border-brand bg-tint/50 text-brand"
                    : "border-brand/15 text-body-text hover:border-ink/40"
                    }`}
                >
                  {TAG_ICONS[tag]}
                  <span className="text-[12px] font-semibold leading-4">
                    {MISTAKE_TAG_LABELS[tag]}
                  </span>
                </button>
              );
            })}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            placeholder="Add a personal note (e.g. “forgot the sign convention”)"
            rows={2}
            className="mt-4 w-full resize-none rounded-lg border border-brand/20 bg-transparent p-3 text-sm text-ink outline-none focus:border-ink/40"
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-success">
              ✓ Added to Mistake Notebook
            </span>
            {note !== savedNote && (
              <button
                type="button"
                onClick={saveNote}
                disabled={busy}
                className="text-[12px] font-bold text-ink underline disabled:opacity-50"
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
