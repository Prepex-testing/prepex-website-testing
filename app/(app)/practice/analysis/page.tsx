"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { BellIcon, CheckIcon, XIcon, AlertTriangleIcon } from "@/components/ui/icons";
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

const ALL_TAGS = Object.keys(MISTAKE_TAG_LABELS) as MistakeTag[];

export default function QuestionAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <QuestionAnalysisContent />
    </Suspense>
  );
}

function QuestionAnalysisContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const solutionsFirst = searchParams.get("solutions") === "1";

  const [session, setSession] = useState<PracticeSessionDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const error = fetchError ?? (sessionId ? null : "No session specified.");

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

  const visible = useMemo(() => {
    const qs = (session?.questions ?? []).filter((q) => q.question);
    return onlyWrong ? qs.filter((q) => q.result === "WRONG") : qs;
  }, [session, onlyWrong]);

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
        <h1 className="text-h1 text-ink">Question Analysis</h1>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-muted">
              {session.correctQuestions}/{session.totalQuestions} correct ·{" "}
              {session.wrongQuestions} in Mistake Notebook
            </p>
            <button
              type="button"
              onClick={() => setOnlyWrong((v) => !v)}
              className={`rounded-full border px-4 py-1.5 text-[13px] font-bold transition-colors ${
                onlyWrong
                  ? "border-[#F59E0B] bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"
                  : "border-brand/20 text-ink hover:bg-tint-strong"
              }`}
            >
              {onlyWrong ? "Showing wrong only" : "Show wrong only"}
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {visible.map((sq) => (
              <QuestionCard key={sq.practiceSessionQuestionId} sq={sq} openSolution={solutionsFirst} />
            ))}
            {visible.length === 0 && (
              <p className="text-sm text-muted">Nothing to show here.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function QuestionCard({
  sq,
  openSolution,
}: {
  sq: PracticeSessionQuestion;
  openSolution: boolean;
}) {
  const q = sq.question!;
  const correctKey = answerToText(sq.correctAnswer ?? q.correctAnswer);
  const yourKey = sq.result === "SKIPPED" ? null : answerToText(sq.studentAnswer);
  const isCorrect = sq.result === "CORRECT";
  const options = optionEntries(q.options);

  const [showSolution, setShowSolution] = useState(openSolution);
  const [tags, setTags] = useState<MistakeTag[]>(sq.mistakeEntry?.mistakeTags ?? []);
  const [note, setNote] = useState(sq.mistakeEntry?.studentNote ?? "");
  const [savedNote, setSavedNote] = useState(sq.mistakeEntry?.studentNote ?? "");
  const [busy, setBusy] = useState(false);
  const mistakeId = sq.mistakeEntry?.id ?? null;

  const toggleTag = async (tag: MistakeTag) => {
    if (!mistakeId || busy) return;
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    setTags(next);
    setBusy(true);
    try {
      await tagMistake(mistakeId, { mistakeTags: next });
    } catch {
      setTags(tags); // revert on failure
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!mistakeId || busy || note === savedNote) return;
    setBusy(true);
    try {
      await tagMistake(mistakeId, { studentNote: note });
      setSavedNote(note);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-brand/10 bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-ink">
          Q.{sq.displayOrder} · {q.topic}
        </p>
        <div className="flex items-center gap-2">
          {q.difficulty && (
            <span className="rounded-full bg-tint px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-ink">
              {prettyDifficulty(q.difficulty)}
            </span>
          )}
          <span
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
              isCorrect
                ? "bg-[rgba(67,176,144,0.1)] text-[#28B485]"
                : sq.result === "WRONG"
                  ? "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"
                  : "bg-tint text-muted"
            }`}
          >
            {isCorrect ? <CheckIcon /> : sq.result === "WRONG" ? <XIcon /> : null}
            {sq.result}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-body-text">{q.questionText}</p>

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
              className={`rounded-xl border p-4 ${
                isRight
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

      {/* Mistake tagging (PRD 5.5.2 / 5.5.3) — only for wrong answers */}
      {mistakeId && (
        <div className="mt-5 rounded-xl border border-ink/10 p-4">
          <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[1.2px] text-ink">
            <AlertTriangleIcon /> Tag this mistake
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ALL_TAGS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  disabled={busy}
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-bold transition-colors disabled:opacity-50 ${
                    active
                      ? "border-[#1A1A4E] bg-[#EEF0F8] text-[#1A1A4E] dark:border-white dark:bg-transparent dark:text-white"
                      : "border-brand/20 text-body-text hover:border-ink/40"
                  }`}
                >
                  {active && <CheckIcon />}
                  {MISTAKE_TAG_LABELS[tag]}
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
            className="mt-3 w-full resize-none rounded-lg border border-brand/20 bg-transparent p-3 text-sm text-ink outline-none focus:border-ink/40"
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
  );
}
