"use client";

import { useState } from "react";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { NewPractice, PracticeDifficulty, PracticeSource } from "@/lib/api/practiceLogs";
import { AREA, FIELD, LABEL, SubjectChapterFields } from "@/components/study/SubjectChapterFields";
import { DIFFICULTIES, PRACTICE_SOURCES } from "@/lib/logs/labels";
import { accuracyOf, checkSum, parseCount } from "@/lib/logs/practiceSum";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/study/format";

const MAX_MINUTES = 720;

export type PracticeFormInitial = {
  subjectId: number | null;
  chapterId: string | null;
  topic?: string;
  source?: PracticeSource;
  sourceDetail?: string;
  attempted?: number;
  correct?: number;
  wrong?: number;
  skipped?: number;
  minutes?: number | null;
  difficulty?: PracticeDifficulty | null;
  notes?: string;
  /** ISO instant; omit for "now". */
  loggedAt?: string;
};

type Props = {
  subjects: SubjectChapters[];
  busy: boolean;
  error: string | null;
  submitLabel?: string;
  initial?: PracticeFormInitial;
  alwaysSendWhen?: boolean;
  idPrefix?: string;
  onSubmit: (input: NewPractice) => void;
  onCancel?: () => void;
};

function Counter({ label, value, onChange, testId, disabled }: { label: string; value: string; onChange: (v: string) => void; testId: string; disabled: boolean }) {
  const n = parseCount(value);
  const step = (delta: number) => onChange(String(Math.max(0, (Number.isNaN(n) ? 0 : n) + delta)));
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={testId} className="text-[14px] font-semibold text-body-text dark:text-ink">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`One fewer ${label.toLowerCase()}`} disabled={disabled} onClick={() => step(-1)} className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand/15 bg-surface text-[20px] font-bold text-body-text dark:text-ink">
          −
        </button>
        <input
          id={testId}
          data-testid={testId}
          type="number"
          inputMode="numeric"
          min={0}
          max={1000}
          className="h-11 w-full min-w-0 rounded-xl border border-input-border bg-surface px-2 text-center text-[16px] text-body-text dark:text-ink"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" aria-label={`One more ${label.toLowerCase()}`} disabled={disabled} onClick={() => step(1)} className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand/15 bg-surface text-[20px] font-bold text-body-text dark:text-ink">
          +
        </button>
      </div>
    </div>
  );
}

/** "I solved N questions from X." Attempted follows the other three until you type your own — and then it is checked. */
export function PracticeForm({ subjects, busy, error, submitLabel = "Log practice", initial, alwaysSendWhen = false, idPrefix = "prac", onSubmit, onCancel }: Props) {
  const [subjectId, setSubjectId] = useState<number | null>(initial?.subjectId ?? null);
  const [chapterId, setChapterId] = useState<string | null>(initial?.chapterId ?? null);
  const [source, setSource] = useState<PracticeSource>(initial?.source ?? "coaching_dpp");
  const [sourceDetail, setSourceDetail] = useState(initial?.sourceDetail ?? "");
  const [correct, setCorrect] = useState(String(initial?.correct ?? 0));
  const [wrong, setWrong] = useState(String(initial?.wrong ?? 0));
  const [skipped, setSkipped] = useState(String(initial?.skipped ?? 0));
  const [attempted, setAttempted] = useState(initial?.attempted !== undefined ? String(initial.attempted) : "");
  const [attemptedTouched, setAttemptedTouched] = useState(initial?.attempted !== undefined);
  const [minutes, setMinutes] = useState(initial?.minutes ? String(initial.minutes) : "");
  const [difficulty, setDifficulty] = useState<PracticeDifficulty | null>(initial?.difficulty ?? null);
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [when, setWhen] = useState(() => toLocalInputValue(initial?.loggedAt ? new Date(initial.loggedAt) : new Date()));
  const [whenTouched, setWhenTouched] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const c = parseCount(correct);
  const w = parseCount(wrong);
  const s = parseCount(skipped);
  const partsValid = ![c, w, s].some(Number.isNaN);
  const sum = partsValid ? c + w + s : 0;
  const shownAttempted = attemptedTouched ? attempted : partsValid && sum > 0 ? String(sum) : "";
  const a = parseCount(shownAttempted);
  const check = partsValid && !Number.isNaN(a) ? checkSum({ attempted: a, correct: c, wrong: w, skipped: s }) : null;
  const livePct = check?.ok ? accuracyOf({ attempted: a, correct: c }) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (subjectId === null) return setLocalError("Choose a subject.");
    if (chapterId === null) return setLocalError("Choose a chapter.");
    if (!partsValid || Number.isNaN(a)) return setLocalError("Question counts must be whole numbers from 0 to 1000.");
    const result = checkSum({ attempted: a, correct: c, wrong: w, skipped: s });
    if (!result.ok) return setLocalError(result.message);
    const m = minutes.trim() === "" ? null : Number(minutes);
    if (m !== null && (!Number.isInteger(m) || m < 1 || m > MAX_MINUTES)) return setLocalError(`Minutes must be a whole number from 1 to ${MAX_MINUTES}.`);
    if (source === "other" && sourceDetail.trim() === "") return setLocalError("Say where the questions came from.");
    setLocalError(null);
    onSubmit({
      subjectId,
      chapterId,
      topic: topic.trim() || null,
      source,
      sourceDetail: source === "other" ? sourceDetail.trim() : null,
      questionsAttempted: a,
      questionsCorrect: c,
      questionsWrong: w,
      questionsSkipped: s,
      durationMinutes: m,
      difficulty,
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
          setLocalError(null);
        }}
        chapterRequired
        disabled={busy}
        idPrefix={idPrefix}
      />

      <label className={LABEL} htmlFor={`${idPrefix}-source`}>
        Where were the questions from?
        <select id={`${idPrefix}-source`} data-testid={`${idPrefix}-source`} className={FIELD} value={source} disabled={busy} onChange={(e) => setSource(e.target.value as PracticeSource)}>
          {PRACTICE_SOURCES.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
      </label>
      {source === "other" && (
        <label className={LABEL} htmlFor={`${idPrefix}-source-detail`}>
          Which one?
          <input id={`${idPrefix}-source-detail`} data-testid={`${idPrefix}-source-detail`} className={FIELD} maxLength={100} value={sourceDetail} disabled={busy} onChange={(e) => setSourceDetail(e.target.value)} />
        </label>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Counter label="Correct" value={correct} onChange={(v) => {
            setCorrect(v);
            setLocalError(null);
          }} testId={`${idPrefix}-correct`} disabled={busy} />
        <Counter label="Wrong" value={wrong} onChange={(v) => {
            setWrong(v);
            setLocalError(null);
          }} testId={`${idPrefix}-wrong`} disabled={busy} />
        <Counter label="Skipped" value={skipped} onChange={(v) => {
            setSkipped(v);
            setLocalError(null);
          }} testId={`${idPrefix}-skipped`} disabled={busy} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-attempted`} className="text-[14px] font-semibold text-body-text dark:text-ink">
          Attempted
        </label>
        <input
          id={`${idPrefix}-attempted`}
          data-testid={`${idPrefix}-attempted`}
          type="number"
          inputMode="numeric"
          min={1}
          max={1000}
          className={`h-12 w-full rounded-xl border bg-surface px-3 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink ${check && !check.ok ? "border-[#DC2626]" : "border-input-border"}`}
          value={shownAttempted}
          disabled={busy}
          onChange={(e) => {
            setAttemptedTouched(true);
            setAttempted(e.target.value);
            setLocalError(null);
          }}
        />
        <p
          data-testid={`${idPrefix}-sum-status`}
          role="status"
          className={`min-h-5 text-[13px] font-semibold ${check?.ok ? "text-[#047857] dark:text-[#34D399]" : check ? "text-[#DC2626] dark:text-[#F87171]" : "text-muted"}`}
        >
          {check?.ok ? `Adds up: ${c} + ${w} + ${s} = ${a}${livePct !== null ? ` · ${livePct}% accuracy` : ""}` : check ? check.message : "Fill in correct, wrong and skipped — attempted fills itself."}
        </p>
        {attemptedTouched && (
          <button
            type="button"
            data-testid={`${idPrefix}-auto-attempted`}
            className="min-h-10 self-start rounded-lg px-2 text-[13px] font-bold text-brand underline dark:text-ink"
            onClick={() => {
              setAttemptedTouched(false);
              setAttempted("");
              setLocalError(null);
            }}
          >
            Add them up for me
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={LABEL} htmlFor={`${idPrefix}-minutes`}>
          Minutes (optional)
          <input id={`${idPrefix}-minutes`} data-testid={`${idPrefix}-minutes`} type="number" inputMode="numeric" min={1} max={MAX_MINUTES} className={FIELD} value={minutes} disabled={busy} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <div role="radiogroup" aria-label="Difficulty" className="flex flex-col gap-1.5">
          <span className="text-[14px] font-semibold text-body-text dark:text-ink">Difficulty (optional)</span>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                role="radio"
                aria-checked={difficulty === d.value}
                data-testid={`${idPrefix}-difficulty-${d.value}`}
                disabled={busy}
                onClick={() => setDifficulty(difficulty === d.value ? null : d.value)}
                className={`min-h-11 rounded-xl border px-3 text-[14px] font-bold ${difficulty === d.value ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
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
