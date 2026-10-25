"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import type { GoalSuggestion } from "@/lib/api/goalSuggestions";
import { HOURS_STEP, MAX_HOURS, MIN_HOURS, hoursText, parseHours, type SuggestionProblem } from "@/lib/goals/suggestion";

/** The Suggest card, in its states: waiting for the Brain, the suggestion, and the problems. */

/** Grey placeholders while the Brain thinks (about five seconds). */
export function SuggestionSkeleton({ chapterName }: { chapterName: string }) {
  return (
    <div role="status" aria-label={`Working out a goal for ${chapterName}`} className="flex flex-col gap-3 rounded-xl border border-brand/15 bg-tint-strong p-4 dark:bg-[#FAF7F214]" data-testid="suggest-skeleton">
      <p className="text-[13px] font-semibold text-ink">Working out a goal for {chapterName}…</p>
      <div className="h-6 w-1/3 animate-pulse rounded bg-brand/15" />
      <div className="flex flex-col gap-2">
        <div className="h-4 w-4/5 animate-pulse rounded bg-brand/15" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-brand/15" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-brand/15" />
      </div>
    </div>
  );
}

/** Why there is no suggestion: the Brain is resting (Try again) or the hourly limit is used (no retry button). */
export function SuggestionError({ problem, onRetry, onClose }: { problem: SuggestionProblem; onRetry: () => void; onClose: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-brand/15 bg-tint-strong p-4 dark:bg-[#FAF7F214]" data-testid="suggest-error" data-kind={problem.kind}>
      <p className="text-[14px] font-semibold text-ink">{problem.message}</p>
      <div className="flex flex-wrap gap-2">
        {problem.kind === "resting" && (
          <button type="button" data-testid="suggest-retry" onClick={onRetry} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-border-strong bg-transparent px-[18px] py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-elevated-2 disabled:cursor-not-allowed disabled:opacity-50">
            Try again
          </button>
        )}
        <button type="button" data-testid="suggest-close" onClick={onClose} className="min-h-11 rounded-lg border border-brand/20 px-4 text-[14px] font-semibold text-ink hover:bg-tint-strong">
          Close
        </button>
      </div>
    </div>
  );
}

type Props = {
  suggestion: GoalSuggestion;
  /** A response (accept / modify / dismiss) is in flight. */
  busy: boolean;
  /** A problem with the last response (a goal like that already exists…). */
  error: string | null;
  onAccept: () => void;
  onModify: (hours: number) => void;
  onDismiss: () => void;
};

/** The suggestion itself: hours, sub-topics, a PYQ year and the one-line why, with Accept / Modify / Dismiss. */
export function SuggestionCard({ suggestion, busy, error, onAccept, onModify, onDismiss }: Props) {
  const [modifying, setModifying] = useState(false);
  const [raw, setRaw] = useState(String(suggestion.suggestedHours));
  const parsed = parseHours(raw);
  const canGoal = suggestion.chapterId !== null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand/20 bg-tint-strong p-4 dark:bg-[#FAF7F214]" data-testid="suggest-card">
      <div>
        <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-muted">
          <Sparkles className="size-4 shrink-0" aria-hidden />
          Suggested for {suggestion.chapterName}
        </p>
        <p className="mt-1 text-[20px] font-extrabold text-ink" data-testid="suggest-hours">
          {hoursText(suggestion.suggestedHours)} this week
        </p>
      </div>

      <ul className="flex list-disc flex-col gap-1 pl-5 text-[14px] text-body-text dark:text-ink/90" data-testid="suggest-subtopics">
        {suggestion.suggestedSubTopics.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      {suggestion.suggestedPyqYear !== null && (
        <p className="text-[13px] text-body-text dark:text-ink/90" data-testid="suggest-pyq">
          Practise: JEE PYQ <span className="font-semibold">{suggestion.suggestedPyqYear}</span>
        </p>
      )}

      <p className="text-[13px] italic text-muted" data-testid="suggest-why">
        {suggestion.why}
      </p>

      {modifying ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink">
            Hours this week ({MIN_HOURS} to {MAX_HOURS})
            <input
              type="number"
              inputMode="decimal"
              data-testid="suggest-hours-input"
              min={MIN_HOURS}
              max={MAX_HOURS}
              step={HOURS_STEP}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="min-h-12 w-32 rounded-lg border border-brand/25 bg-surface px-3 text-[16px] font-semibold text-ink"
            />
          </label>
          {parsed === null && (
            <p role="alert" className="text-[12px] font-medium text-danger" data-testid="suggest-hours-error">
              Enter a number from {MIN_HOURS} to {MAX_HOURS}.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="suggest-save-modified"
              disabled={busy || parsed === null || !canGoal}
              onClick={() => parsed !== null && onModify(parsed)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-border-strong bg-transparent px-[18px] py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-elevated-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save my version"}
            </button>
            <button type="button" data-testid="suggest-cancel-modify" disabled={busy} onClick={() => setModifying(false)} className="min-h-11 rounded-lg border border-brand/20 px-4 text-[14px] font-semibold text-ink hover:bg-surface disabled:opacity-50">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="suggest-accept"
            disabled={busy || !canGoal}
            onClick={onAccept}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-border-strong bg-transparent px-[18px] py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-elevated-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Adding…" : "Accept"}
          </button>
          <button type="button" data-testid="suggest-modify" disabled={busy || !canGoal} onClick={() => setModifying(true)} className="min-h-11 rounded-lg border border-brand/20 px-4 text-[14px] font-semibold text-ink hover:bg-surface disabled:opacity-50">
            Modify
          </button>
          <button type="button" data-testid="suggest-dismiss" disabled={busy} onClick={onDismiss} className="min-h-11 rounded-lg px-3 text-[14px] font-semibold text-muted underline-offset-2 hover:underline disabled:opacity-50">
            Dismiss
          </button>
        </div>
      )}

      {!canGoal && (
        <p className="text-[12px] text-muted" data-testid="suggest-no-chapter">
          This chapter isn&apos;t in your syllabus list, so it can&apos;t be added as a goal. Pick it from the list to add one.
        </p>
      )}

      {error && (
        <p role="alert" className="text-[12px] font-medium text-danger" data-testid="suggest-respond-error">
          {error}
        </p>
      )}
    </div>
  );
}
