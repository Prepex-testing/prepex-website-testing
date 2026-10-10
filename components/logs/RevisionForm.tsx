"use client";

import { useState } from "react";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { NewRevision, RevisionType } from "@/lib/api/revisionLogs";
import { AREA, FIELD, LABEL, SubjectChapterFields } from "@/components/study/SubjectChapterFields";
import { REVISION_TYPES } from "@/lib/logs/labels";
import { accuracyOf } from "@/lib/logs/practiceSum";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/study/format";

export const REVISION_MINUTE_PRESETS = [15, 30, 45, 60, 90] as const;
const MAX_MINUTES = 720;

export type RevisionFormInitial = {
  subjectId: number | null;
  chapterId: string | null;
  topic?: string;
  revisionType?: RevisionType;
  minutes?: number;
  questionsSolved?: number | null;
  questionsCorrect?: number | null;
  errors?: string;
  /** ISO instant; omit for "now". */
  loggedAt?: string;
};

type Props = {
  subjects: SubjectChapters[];
  busy: boolean;
  error: string | null;
  submitLabel?: string;
  initial?: RevisionFormInitial;
  /** Always send the "when" (editing); false = omit it unless the student changed it (log = now). */
  alwaysSendWhen?: boolean;
  idPrefix?: string;
  onSubmit: (input: NewRevision) => void;
  onCancel?: () => void;
};

const count = (raw: string): number | null => (raw.trim() === "" ? null : Number(raw));
const isCount = (n: number | null): n is number => n !== null && Number.isInteger(n) && n >= 0 && n <= 1000;

/** "I revised X from my notes for N minutes." The Log tab and the edit modal. */
export function RevisionForm({ subjects, busy, error, submitLabel = "Log revision", initial, alwaysSendWhen = false, idPrefix = "rev", onSubmit, onCancel }: Props) {
  const [subjectId, setSubjectId] = useState<number | null>(initial?.subjectId ?? null);
  const [chapterId, setChapterId] = useState<string | null>(initial?.chapterId ?? null);
  const [type, setType] = useState<RevisionType>(initial?.revisionType ?? "notes");
  const [minutes, setMinutes] = useState(String(initial?.minutes ?? 30));
  const [withQuestions, setWithQuestions] = useState((initial?.questionsSolved ?? null) !== null);
  const [solved, setSolved] = useState(initial?.questionsSolved != null ? String(initial.questionsSolved) : "");
  const [correct, setCorrect] = useState(initial?.questionsCorrect != null ? String(initial.questionsCorrect) : "");
  const [errors, setErrors] = useState(initial?.errors ?? "");
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [when, setWhen] = useState(() => toLocalInputValue(initial?.loggedAt ? new Date(initial.loggedAt) : new Date()));
  const [whenTouched, setWhenTouched] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const minutesNumber = Number(minutes);
  const solvedN = count(solved);
  const correctN = count(correct);
  const livePct = withQuestions && isCount(solvedN) && isCount(correctN) && correctN <= solvedN ? accuracyOf({ attempted: solvedN, correct: correctN }) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (subjectId === null) return setLocalError("Choose a subject.");
    if (chapterId === null) return setLocalError("Choose a chapter.");
    if (!Number.isInteger(minutesNumber) || minutesNumber < 1 || minutesNumber > MAX_MINUTES) {
      return setLocalError(`Minutes must be a whole number from 1 to ${MAX_MINUTES}.`);
    }
    if (withQuestions) {
      if (!isCount(solvedN)) return setLocalError("Questions solved must be a whole number from 0 to 1000.");
      if (correctN !== null && !isCount(correctN)) return setLocalError("Questions correct must be a whole number from 0 to 1000.");
      if (correctN !== null && correctN > solvedN) return setLocalError("Correct answers can't be more than the questions you solved.");
    }
    setLocalError(null);
    onSubmit({
      subjectId,
      chapterId,
      topic: topic.trim() || null,
      revisionType: type,
      durationMinutes: minutesNumber,
      questionsSolved: withQuestions ? solvedN : null,
      questionsCorrect: withQuestions ? correctN : null,
      errors: errors.trim() || null,
      ...(alwaysSendWhen || whenTouched ? { loggedAt: fromLocalInputValue(when) } : {}),
    });
  }

  const shownError = localError ?? error;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4" data-testid={`${idPrefix}-form`}>
      <SubjectChapterFields
        subjects={subjects}
        subjectId={subjectId}
        chapterId={chapterId}
        onChange={(next) => {
          setSubjectId(next.subjectId);
          setChapterId(next.chapterId);
          setLocalError(null);
        }}
        chapterRequired
        disabled={busy}
        idPrefix={idPrefix}
      />

      <div role="radiogroup" aria-label="How did you revise?" className="flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-body-text dark:text-ink">How did you revise?</span>
        <div className="flex flex-wrap gap-2">
          {REVISION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={type === t.value}
              data-testid={`${idPrefix}-type-${t.value}`}
              disabled={busy}
              onClick={() => setType(t.value)}
              className={`min-h-11 rounded-xl border px-3 text-[14px] font-bold transition-colors ${type === t.value ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-body-text dark:text-ink">How many minutes?</span>
        <div className="flex flex-wrap items-center gap-2">
          {REVISION_MINUTE_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              data-testid={`${idPrefix}-preset-${m}`}
              aria-pressed={minutesNumber === m}
              disabled={busy}
              onClick={() => {
                setMinutes(String(m));
                setLocalError(null);
              }}
              className={`min-h-11 min-w-14 rounded-xl border px-3 text-[15px] font-bold transition-colors ${minutesNumber === m ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
            >
              {m}
            </button>
          ))}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_MINUTES}
            aria-label="Minutes"
            data-testid={`${idPrefix}-minutes`}
            className="h-11 w-24 rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text dark:text-ink"
            value={minutes}
            disabled={busy}
            onChange={(e) => {
              setMinutes(e.target.value);
              setLocalError(null);
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-brand/10 p-3">
        <label className="flex min-h-11 items-center gap-3 text-[14px] font-semibold text-body-text dark:text-ink">
          <input type="checkbox" data-testid={`${idPrefix}-with-questions`} className="size-5" checked={withQuestions} disabled={busy} onChange={(e) => setWithQuestions(e.target.checked)} />
          I also solved questions
        </label>
        {withQuestions && (
          <div className="grid grid-cols-2 gap-3">
            <label className={LABEL} htmlFor={`${idPrefix}-solved`}>
              Solved
              <input id={`${idPrefix}-solved`} data-testid={`${idPrefix}-solved`} type="number" inputMode="numeric" min={0} className={FIELD} value={solved} disabled={busy} onChange={(e) => {
                setSolved(e.target.value);
                setLocalError(null);
              }} />
            </label>
            <label className={LABEL} htmlFor={`${idPrefix}-correct`}>
              Correct
              <input id={`${idPrefix}-correct`} data-testid={`${idPrefix}-correct`} type="number" inputMode="numeric" min={0} className={FIELD} value={correct} disabled={busy} onChange={(e) => {
                setCorrect(e.target.value);
                setLocalError(null);
              }} />
            </label>
            {livePct !== null && (
              <p className="col-span-2 text-[13px] font-semibold text-muted" data-testid={`${idPrefix}-live-accuracy`}>
                That&apos;s {livePct}% accuracy.
              </p>
            )}
          </div>
        )}
      </div>

      <label className={LABEL} htmlFor={`${idPrefix}-errors`}>
        What went wrong? (optional)
        <textarea id={`${idPrefix}-errors`} data-testid={`${idPrefix}-errors`} className={AREA} maxLength={2000} placeholder="Formulas I forgot, silly mistakes, concepts to revisit…" value={errors} disabled={busy} onChange={(e) => setErrors(e.target.value)} />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={LABEL} htmlFor={`${idPrefix}-topic`}>
          Topic (optional)
          <input id={`${idPrefix}-topic`} className={FIELD} maxLength={200} value={topic} disabled={busy} onChange={(e) => setTopic(e.target.value)} />
        </label>
        <label className={LABEL} htmlFor={`${idPrefix}-when`}>
          When
          <input
            id={`${idPrefix}-when`}
            type="datetime-local"
            className={FIELD}
            value={when}
            max={toLocalInputValue(new Date())}
            disabled={busy}
            onChange={(e) => {
              setWhen(e.target.value);
              setWhenTouched(true);
            }}
          />
        </label>
      </div>

      {shownError && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {shownError}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="submit"
          data-testid={`${idPrefix}-submit`}
          disabled={busy}
          className="min-h-14 flex-1 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white transition-colors hover:bg-[#E8623F] disabled:opacity-60"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className="min-h-14 flex-1 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-base font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
