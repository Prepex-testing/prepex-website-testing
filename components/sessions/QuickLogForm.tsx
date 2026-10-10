"use client";

import { useState } from "react";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { NewStudySession } from "@/lib/api/studyLog";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/study/format";
import { AREA, FIELD, LABEL, SubjectChapterFields } from "@/components/study/SubjectChapterFields";

export const LOG_MINUTE_PRESETS = [15, 30, 45, 60, 90] as const;
const MAX_MINUTES = 720;

export type LogFormInitial = {
  subjectId: number | null;
  chapterId: string | null;
  topic: string;
  minutes: number;
  /** ISO instant; omit for "now". */
  loggedAt?: string;
  notes: string;
};

type Props = {
  subjects: SubjectChapters[];
  busy: boolean;
  error: string | null;
  submitLabel?: string;
  initial?: LogFormInitial;
  /** Always send the "when" (editing); false = omit it unless the student changed it (quick log = now). */
  alwaysSendWhen?: boolean;
  idPrefix?: string;
  onSubmit: (input: NewStudySession) => void;
  onCancel?: () => void;
};

/** "I studied X for N minutes." Used for the quick log and for editing a manual entry. */
export function QuickLogForm({ subjects, busy, error, submitLabel = "Log it", initial, alwaysSendWhen = false, idPrefix = "log", onSubmit, onCancel }: Props) {
  const [subjectId, setSubjectId] = useState<number | null>(initial?.subjectId ?? null);
  const [chapterId, setChapterId] = useState<string | null>(initial?.chapterId ?? null);
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [minutes, setMinutes] = useState<string>(initial ? String(initial.minutes) : "30");
  const [when, setWhen] = useState(() => toLocalInputValue(initial?.loggedAt ? new Date(initial.loggedAt) : new Date()));
  const [whenTouched, setWhenTouched] = useState(false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const minutesNumber = Number(minutes);
  const minutesValid = Number.isInteger(minutesNumber) && minutesNumber >= 1 && minutesNumber <= MAX_MINUTES;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (subjectId === null) return setLocalError("Choose a subject.");
    if (!minutesValid) return setLocalError(`Minutes must be a whole number from 1 to ${MAX_MINUTES}.`);
    setLocalError(null);
    onSubmit({
      subjectId,
      chapterId,
      topic: topic.trim() || null,
      durationMinutes: minutesNumber,
      notes: notes.trim() || null,
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
        }}
        disabled={busy}
        idPrefix={idPrefix}
      />

      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-body-text dark:text-ink">How many minutes?</span>
        <div className="flex flex-wrap items-center gap-2">
          {LOG_MINUTE_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              data-testid={`${idPrefix}-preset-${m}`}
              aria-pressed={minutesNumber === m}
              disabled={busy}
              onClick={() => setMinutes(String(m))}
              className={`min-h-11 min-w-14 rounded-xl border px-3 text-[15px] font-bold transition-colors ${
                minutesNumber === m ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"
              }`}
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
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
      </div>

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

      <label className={LABEL} htmlFor={`${idPrefix}-notes`}>
        Notes (optional)
        <textarea id={`${idPrefix}-notes`} className={AREA} maxLength={1000} value={notes} disabled={busy} onChange={(e) => setNotes(e.target.value)} />
      </label>

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
