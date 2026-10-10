"use client";

import { useState } from "react";
import { MathText } from "@/components/ui/MathText";
import type { Mistake } from "@/lib/api/mistakes";
import { RATINGS, type Rating } from "@/lib/study/mistakeRating";
import type { SubjectLookup } from "@/lib/study/subjects";

type Props = {
  mistake: Mistake;
  lookup: SubjectLookup;
  busy: boolean;
  error?: string | null;
  /** e.g. "3 of 12" in the Due Today queue. */
  position?: string;
  onRate: (rating: Rating) => void;
  onMaster: () => void;
  onSkip?: () => void;
};

/** One mistake, one card: the question first; tap to reveal the answer; then say how it went. */
export function ReviewCard({ mistake, lookup, busy, error, position, onRate, onMaster, onSkip }: Props) {
  const [revealed, setRevealed] = useState(false);
  const chapter = lookup.chapterName(mistake.chapterId);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6" data-testid="review-card" aria-label="Mistake to review">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-muted">
        <span className="rounded-full bg-tint-strong px-2.5 py-1 text-ink dark:bg-[#FAF7F214]">{lookup.subjectName(mistake.subjectId)}</span>
        {chapter && <span>{chapter}</span>}
        {mistake.topic && <span>{mistake.topic}</span>}
        {position && <span className="ml-auto" data-testid="queue-position">{position}</span>}
      </header>

      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Question</p>
        <div className="whitespace-pre-wrap break-words text-[17px] font-semibold leading-snug text-ink" data-testid="review-question">
          <MathText source={mistake.questionText} />
        </div>
        {mistake.imageUrl && (
          // A student-supplied https link: no referrer is sent, and it is only ever shown as an image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mistake.imageUrl} alt="Question" referrerPolicy="no-referrer" loading="lazy" className="mt-3 max-h-64 w-full rounded-lg object-contain" />
        )}
      </div>

      {!revealed ? (
        <button
          type="button"
          data-testid="reveal-answer"
          onClick={() => setRevealed(true)}
          className="min-h-14 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-base font-semibold text-body-text hover:bg-tint-strong dark:text-ink"
        >
          Show answer
        </button>
      ) : (
        <>
          <dl className="flex flex-col gap-3" data-testid="review-answer">
            <div className="rounded-xl bg-[var(--success-bg)] px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-[var(--success)]">Correct answer</dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-[15px] font-semibold text-ink">
                <MathText source={mistake.correctAnswer} />
              </dd>
            </div>
            <div className="rounded-xl bg-danger-bg px-3 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-danger">Your answer</dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-[15px] text-ink">
                <MathText source={mistake.studentAnswer} />
              </dd>
            </div>
            {mistake.explanation && (
              <div className="rounded-xl bg-tint-strong px-3 py-2.5 dark:bg-[#FAF7F214]">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">Why</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words text-[14px] text-body-text dark:text-ink">
                  <MathText source={mistake.explanation} />
                </dd>
              </div>
            )}
          </dl>

          {error && (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2" role="group" aria-label="How did it go?">
            {RATINGS.map((rating) => (
              <button
                key={rating.key}
                type="button"
                data-testid={`rate-${rating.key}`}
                disabled={busy}
                onClick={() => onRate(rating)}
                className="min-h-14 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-2 text-[14px] font-bold text-body-text hover:bg-tint-strong disabled:opacity-60 dark:text-ink"
              >
                {rating.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-testid="rate-mastered"
            disabled={busy}
            onClick={onMaster}
            className="min-h-12 rounded-lg border border-primary-button-border bg-cta px-4 text-[15px] font-semibold text-white hover:bg-[#E8623F] disabled:opacity-60"
          >
            Mastered — stop asking me
          </button>
        </>
      )}

      {onSkip && !revealed && (
        <button type="button" onClick={onSkip} className="min-h-11 self-center rounded-lg px-4 text-[13px] font-semibold text-muted underline-offset-2 hover:underline">
          Skip for now
        </button>
      )}
    </article>
  );
}
