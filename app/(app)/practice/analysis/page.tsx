"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { PageLoader } from "@/components/ui/PageLoader";
import { ArrowLeftIcons, BookmarkIcon, CheckIcon, XIcon } from "@/components/ui/icons";
import {
  answerToText,
  getPracticeSession,
  optionEntries,
  prettyDifficulty,
  type PracticeSessionDetail,
  type PracticeSessionQuestion,
} from "@/lib/api/practice";
import { ArrowLeftIcon, Open } from "@/assets/icons";
import { REASONS, REASON_LABEL, setReasons, updateEntry, type Reason } from "@/lib/api/notebooks";

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
  // Live reason edits, layered over each page's saved reason. Keyed by practiceSessionQuestionId.
  const [reasonOverrides, setReasonOverrides] = useState<Record<string, Reason | null>>({});
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

  const reasonFor = (sq: PracticeSessionQuestion): Reason | null =>
    sq.practiceSessionQuestionId in reasonOverrides ? reasonOverrides[sq.practiceSessionQuestionId]! : (sq.mistakeEntry?.reason ?? null);

  // Wrong answers land in the notebook by themselves; the student only says why. Reasons are optional, but they are what
  // lets the notebook spot a pattern, so the screen counts how many are still open.
  const wrongToTag = withQuestion.filter((q) => q.result === "WRONG" && q.mistakeEntry?.id);
  const untaggedCount = wrongToTag.filter((q) => reasonFor(q) === null).length;
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
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <Link
            href={sessionId ? `/practice/complete?sessionId=${sessionId}` : "/practice"}
            aria-label="Back to practice results"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-tint-strong"
          >
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Question Analysis</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <NotificationBell />
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
              className={`flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-[13px] leading-none whitespace-nowrap transition-all duration-200

         ${filter === f.id
                  ? "border-brand bg-brand text-white dark:border-white dark:bg-white dark:text-[#1A1A4E]"
                  : "border-[#8B8998] bg-surface text-[#8B8998] hover:text-ink dark:border-[#8B8998] dark:bg-transparent dark:text-[#8B8998] dark:hover:border-white"
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
              reason={reasonFor(sq)}
              onReasonChange={(next) => setReasonOverrides((m) => ({ ...m, [sq.practiceSessionQuestionId]: next }))}
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
            reason={reasonFor(currentQuestion!)}
            onReasonChange={(next) => setReasonOverrides((m) => ({ ...m, [currentQuestion!.practiceSessionQuestionId]: next }))}
          />
        </div>
      )}

      {wrongToTag.length > 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand/10 bg-surface p-6 text-center" data-testid="reasons-footer">
          <p className="text-sm text-muted">
            {allTagged
              ? "Every wrong answer is in your notebook with a reason. Prepex will bring them back at the right time."
              : `Your wrong answers are in your notebook. Say why you missed each one — ${untaggedCount} of ${wrongToTag.length} left.`}
          </p>
          <Button variant="primary" size="sm" onClick={() => router.push("/notebooks")}>
            Open my notebooks
          </Button>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  sq,
  openSolution,
  reason,
  onReasonChange,
}: {
  sq: PracticeSessionQuestion;
  openSolution: boolean;
  /** Controlled by the page so it can tell when every wrong answer has a reason. */
  reason: Reason | null;
  onReasonChange: (reason: Reason | null) => void;
}) {
  const q = sq.question!;
  const correctKey = answerToText(sq.correctAnswer ?? q.correctAnswer);
  const yourKey = sq.result === "SKIPPED" ? null : answerToText(sq.studentAnswer);
  const isCorrect = sq.result === "CORRECT";
  const options = optionEntries(q.options);

  const [showSolution, setShowSolution] = useState(openSolution);
  const [fix, setFix] = useState(sq.mistakeEntry?.fix ?? "");
  const [savedFix, setSavedFix] = useState(sq.mistakeEntry?.fix ?? "");
  const [busy, setBusy] = useState(false);
  const mistakeId = sq.mistakeEntry?.id ?? null;
  const reviewCount = sq.mistakeEntry?.reviewCount ?? 0;
  const lastReviewedAt = sq.mistakeEntry?.lastReviewedAt ?? null;
  // A page already re-solved from the notebook: its history shows above the reason chips.
  const isReviewedMistake = !!sq.mistakeEntry && (!!sq.mistakeEntry.reason || reviewCount > 0 || !!lastReviewedAt);

  const pickReason = async (r: Reason) => {
    if (!mistakeId || busy) return;
    const next = reason === r ? null : r;
    onReasonChange(next);
    setBusy(true);
    try {
      if (next) await setReasons([{ entryId: mistakeId, reason: next }]);
      else await updateEntry(mistakeId, { reason: null });
    } catch {
      onReasonChange(reason); // revert on failure
    } finally {
      setBusy(false);
    }
  };

  const saveFix = async () => {
    if (!mistakeId || busy || fix === savedFix) return;
    setBusy(true);
    try {
      await updateEntry(mistakeId, { fix: fix.trim() || null });
      setSavedFix(fix);
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

      {/* A page already in the notebook: what it has been through so far. */}
      {isReviewedMistake && sq.mistakeEntry && (
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5" data-testid="reviewed-context">
          <div className="flex w-full flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-5 sm:p-6">
            <p className="text-[12px] font-semibold uppercase leading-[18px] tracking-[0.5px] text-muted sm:text-[14px]">Why you missed it</p>
            <p className="text-[14px] font-semibold text-ink">{reason ? REASON_LABEL[reason] : "No reason yet"}</p>
            {savedFix && <p className="break-words text-[13px] text-body-text sm:text-[14px]">Fix: {savedFix}</p>}
          </div>
          <div className="flex w-full flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-5 sm:p-6">
            <p className="text-[12px] font-semibold uppercase leading-[18px] tracking-[0.5px] text-muted sm:text-[14px]">Re-solved</p>
            <p className="text-[20px] font-extrabold text-ink">
              {reviewCount} <span className="text-[12px] font-normal text-muted">{reviewCount === 1 ? "time" : "times"}</span>
            </p>
            <p className="text-[13px] text-muted">
              {lastReviewedAt ? `Last on ${new Date(lastReviewedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} (${relativeDay(lastReviewedAt)})` : "Not re-solved yet"}
            </p>
          </div>
        </div>
      )}

      {/* "Why did you miss it?" — only for a wrong answer; the page itself is already in the notebook. */}
      {mistakeId && sq.result === "WRONG" && (
        <div className="w-full rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6 lg:p-8" data-testid="reason-editor">
          <p className="text-[12px] font-semibold uppercase leading-[18px] tracking-[0.5px] text-muted sm:text-[14px]">Why did you miss it?</p>
          <div role="radiogroup" aria-label="Why did you miss it?" className="mt-4 flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                disabled={busy}
                onClick={() => void pickReason(r)}
                data-testid={`reason-${r}`}
                className={`min-h-11 rounded-full border px-4 text-[13px] font-semibold transition-colors disabled:opacity-50 ${reason === r ? "border-[1.5px] border-brand bg-tint-strong text-ink" : "border-border-subtle text-body-text dark:text-ink"}`}
              >
                {REASON_LABEL[r]}
              </button>
            ))}
          </div>
          <input
            value={fix}
            maxLength={500}
            onChange={(e) => setFix(e.target.value)}
            onBlur={() => void saveFix()}
            placeholder="What will you do differently? One line (optional)"
            aria-label="What will you do differently"
            className="mt-5 h-12 w-full rounded-xl border border-brand/20 bg-transparent px-3 text-[14px] text-ink outline-none placeholder:text-muted focus:border-ink/40"
            data-testid="reason-fix"
          />
          <div className="mt-4 flex min-h-[16px] flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-success sm:text-[13px]">
              <span aria-hidden="true">✓</span>
              <span>Saved in your notebook</span>
            </span>
            <Link href="/notebooks" className="text-[12px] font-bold text-ink underline sm:text-[13px]">
              Open it
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
