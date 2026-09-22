"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import {
  BookIcon,
  CheckCircleIcon,
  CircleXIcon,
  RefreshIcon,
} from "@/components/ui/icons";
import { CalendarIcon, ArrowLeftIcon } from "@/assets/icons";
import {
  answerToText,
  getMistake,
  MISTAKE_TAG_LABELS,
  optionEntries,
  prettyDifficulty,
  reviewMistake,
  type MistakeDetail,
  type MistakeReviewFeedback,
  type MistakeReviewResult,
} from "@/lib/api/practice";

// Spaced-repetition ladder used by the backend (practice.service MISTAKE_INTERVALS).
const INTERVALS = [1, 3, 7, 14, 30];

export default function MistakeNotebookEntryPage() {
  return (
    <Suspense fallback={null}>
      <MistakeNotebookEntryContent />
    </Suspense>
  );
}

function MistakeNotebookEntryContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [entry, setEntry] = useState<MistakeDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const error = fetchError ?? (id ? null : "No mistake entry specified.");

  const [phase, setPhase] = useState<"attempt" | "review" | "done">("attempt");
  const [pick, setPick] = useState<string | null>(null);
  const [result, setResult] = useState<MistakeReviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    startedAt.current = Date.now();
    getMistake(id)
      .then((res) => !cancelled && setEntry(res.data))
      .catch(
        (err) =>
          !cancelled &&
          setFetchError(err instanceof Error ? err.message : "Could not load this entry."),
      );
    return () => {
      cancelled = true;
    };
  }, [id]);

  const q = entry?.question ?? null;
  const options = useMemo(() => optionEntries(q?.options), [q]);
  const correctKey = answerToText(entry?.correctAnswer ?? q?.correctAnswer);
  const previousWrong = answerToText(entry?.studentAnswer);
  const freshCorrect = phase !== "attempt" && pick !== null && pick === correctKey;

  const rate = useCallback(
    async (feedback: MistakeReviewFeedback) => {
      if (!id || busy) return;
      setBusy(true);
      const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      try {
        const res = await reviewMistake(id, { feedback, durationSeconds });
        setResult(res.data);
        setPhase("done");
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Could not save your review.");
      } finally {
        setBusy(false);
      }
    },
    [id, busy],
  );

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-h2 text-ink">Entry unavailable</p>
        <p className="max-w-md text-sm text-muted">{error}</p>
        <Button href="/home/mistake-notebook" variant="secondary" size="sm">
          Back to Mistake Notebook
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <Link href="/home/mistake-notebook" aria-label="Back to Mistake Notebook" className="text-ink">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-h1 text-ink">Mistake Review</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {!entry ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <>
          <div className="flex w-full min-w-0 flex-col gap-2">
            <h2 className="text-[20px] font-bold leading-8 text-ink sm:text-[22px] lg:text-[24px]">
              {entry.chapter?.name ?? entry.topic} · {entry.topic}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {entry.mistakeTags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-tint px-3 py-1 text-[12px] font-semibold leading-4 text-ink"
                >
                  {MISTAKE_TAG_LABELS[t]}
                </span>
              ))}
              <span className="text-[12px] font-medium leading-4 text-muted">
                Added {new Date(entry.createdAt).toLocaleDateString()}
              </span>
              {entry.status === "MASTERED" && (
                <span className="rounded-full bg-success-bg px-3 py-1 text-[10px] font-bold uppercase text-success">
                  Mastered
                </span>
              )}
            </div>
          </div>

          {/* Question */}
          <div className="rounded-2xl border border-brand/10 bg-surface p-6 shadow-sm sm:p-8">
            <p className="flex items-center gap-2 text-[18px] font-bold leading-7 text-ink">
              <BookIcon /> {phase === "attempt" ? "Attempt it again" : "Original question"}
            </p>
            <p className="mt-4 text-[16px] leading-[26px] text-body-text">
              {q?.questionText ?? "Question text unavailable."}
            </p>

            {q?.questionImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={q.questionImageUrl}
                alt="Question figure"
                loading="lazy"
                className="mt-3 max-h-72 w-auto rounded-xl border border-brand/10 object-contain"
              />
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {options.map(([key, value]) => {
                const isPick = pick === key;
                const revealRight = phase !== "attempt" && key === correctKey;
                const revealWrongPick = phase !== "attempt" && isPick && key !== correctKey;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={phase !== "attempt"}
                    onClick={() => setPick(key)}
                    className={`flex items-center gap-4 rounded-lg border p-3 text-left transition-colors disabled:cursor-default ${
                      revealRight
                        ? "border-success bg-success/10"
                        : revealWrongPick
                          ? "border-warning bg-warning/10"
                          : isPick
                            ? "border-brand bg-tint"
                            : "border-brand/10 bg-tint-strong/40"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand/15 bg-surface text-[14px] font-bold leading-5 text-muted">
                      {key}
                    </span>
                    <p className="text-[15px] font-medium leading-6 text-body-text">{value}</p>
                  </button>
                );
              })}
            </div>

            {q?.difficulty && (
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Level: {prettyDifficulty(q.difficulty)}
              </p>
            )}

            {phase === "attempt" && (
              <Button
                variant="primary"
                className="mt-5"
                disabled={pick === null}
                onClick={() => setPhase("review")}
              >
                Check answer
              </Button>
            )}
          </div>

          {/* Reveal */}
          {phase !== "attempt" && (
            <>
              <div
                className={`rounded-xl border p-5 ${
                  freshCorrect ? "border-success/50 bg-success-bg" : "border-warning/50 bg-warning-bg"
                }`}
              >
                <p
                  className={`flex items-center gap-2 text-[16px] font-bold leading-6 ${
                    freshCorrect ? "text-success" : "text-warning"
                  }`}
                >
                  {freshCorrect ? <CheckCircleIcon /> : <CircleXIcon />}
                  {freshCorrect ? "Correct this time" : "Still not right"}
                </p>
                <p className="mt-3 text-[14px] leading-5 text-body-text">
                  This attempt: <span className="font-bold text-ink">{pick}</span> · First attempt:{" "}
                  <span className="font-bold text-ink">{previousWrong}</span> · Correct:{" "}
                  <span className="font-bold text-success">{correctKey}</span>
                </p>
              </div>

              {q?.solutionText && (
                <div className="rounded-xl border border-brand/10 bg-surface p-5">
                  <p className="text-[14px] font-bold uppercase tracking-wide text-ink">Solution</p>
                  <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-line text-body-text">
                    {q.solutionText}
                  </p>
                </div>
              )}

              {entry.studentNote && (
                <div className="rounded-xl border border-brand/10 bg-surface p-5">
                  <p className="text-[14px] font-bold text-ink">Your note</p>
                  <p className="mt-2 text-[14px] italic leading-5 text-muted">
                    “{entry.studentNote}”
                  </p>
                </div>
              )}
            </>
          )}

          {/* Rating (PRD 5.6.4) */}
          {phase === "review" && (
            <div className="rounded-2xl border border-brand/10 bg-surface p-6">
              <p className="text-[14px] font-bold uppercase tracking-[1.2px] text-ink">
                How did that feel?
              </p>
              <p className="mt-1 text-[13px] text-muted">
                Hard repeats tomorrow · Medium keeps the interval · Easy doubles it. Three easy in a
                row archives this entry.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {(["HARD", "MEDIUM", "EASY"] as MistakeReviewFeedback[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    disabled={busy}
                    onClick={() => rate(f)}
                    className={`h-12 rounded-xl border text-[15px] font-bold transition-colors disabled:opacity-50 ${
                      f === "HARD"
                        ? "border-warning text-warning hover:bg-warning/10"
                        : f === "MEDIUM"
                          ? "border-brand/30 text-ink hover:bg-tint"
                          : "border-success text-success hover:bg-success/10"
                    }`}
                  >
                    {f[0] + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          {phase === "done" && result && (
            <div className="rounded-2xl border border-brand/10 bg-surface p-6 text-center">
              <p className="flex items-center justify-center gap-2 text-[16px] font-bold text-success">
                <CheckCircleIcon />
                {result.status === "MASTERED" ? "Mastered — archived" : "Review saved"}
              </p>
              <p className="mt-2 text-[14px] text-muted">
                {result.status === "MASTERED"
                  ? "Three easy reviews in a row. This entry won't come back."
                  : `Next review ${new Date(result.nextReviewDate).toLocaleDateString()} · interval ${result.currentIntervalDays} day${result.currentIntervalDays === 1 ? "" : "s"} · reviewed ${result.reviewCount}×`}
              </p>
              <Button href="/home/mistake-notebook" variant="primary" className="mt-4">
                Back to Notebook
              </Button>
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-col items-stretch gap-6 rounded-xl border border-brand/10 bg-surface p-6 sm:flex-row sm:items-center sm:justify-around">
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                <RefreshIcon className="h-4 w-4" /> Review count
              </p>
              <p className="text-[28px] font-extrabold leading-none text-ink">{entry.reviewCount}</p>
            </div>
            <div className="hidden h-12 w-px shrink-0 bg-brand/10 sm:block" />
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
                <CalendarIcon /> Interval
              </p>
              <p className="text-[14px] font-bold text-ink">
                {entry.currentIntervalDays} day{entry.currentIntervalDays === 1 ? "" : "s"}
                {INTERVALS.includes(entry.currentIntervalDays)
                  ? ` (step ${INTERVALS.indexOf(entry.currentIntervalDays) + 1}/${INTERVALS.length})`
                  : ""}
              </p>
            </div>
            <div className="hidden h-12 w-px shrink-0 bg-brand/10 sm:block" />
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                Last reviewed
              </p>
              <p className="text-[14px] font-bold text-ink">
                {entry.lastReviewedAt
                  ? new Date(entry.lastReviewedAt).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
