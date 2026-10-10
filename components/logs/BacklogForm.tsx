"use client";

import { useState } from "react";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { NewBacklogItem } from "@/lib/api/backlogItems";
import { AREA, FIELD, LABEL, SubjectChapterFields } from "@/components/study/SubjectChapterFields";
import { dayKey } from "@/lib/logs/dates";
import { PRIORITIES } from "@/lib/logs/labels";

export const BACKLOG_MINUTE_PRESETS = [30, 45, 60, 90] as const;

export type BacklogFormInitial = {
  subjectId: number | null;
  chapterId: string | null;
  topic?: string;
  estimatedMinutes?: number | null;
  /** `YYYY-MM-DD` */
  deadline?: string | null;
  priority?: number;
  notes?: string;
};

type Props = {
  subjects: SubjectChapters[];
  busy: boolean;
  error: string | null;
  submitLabel?: string;
  initial?: BacklogFormInitial;
  idPrefix?: string;
  onSubmit: (input: NewBacklogItem) => void;
  onCancel?: () => void;
};

/** "I'm behind on X": subject, chapter, how long it will take, by when, and how urgent it is. */
export function BacklogForm({ subjects, busy, error, submitLabel = "Add to backlog", initial, idPrefix = "bl", onSubmit, onCancel }: Props) {
  const [subjectId, setSubjectId] = useState<number | null>(initial?.subjectId ?? null);
  const [chapterId, setChapterId] = useState<string | null>(initial?.chapterId ?? null);
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [minutes, setMinutes] = useState(initial?.estimatedMinutes ? String(initial.estimatedMinutes) : "");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [priority, setPriority] = useState(initial?.priority ?? 3);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const today = dayKey(new Date());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (subjectId === null) return setLocalError("Choose a subject.");
    if (chapterId === null) return setLocalError("Choose a chapter.");
    const m = minutes.trim() === "" ? null : Number(minutes);
    if (m !== null && (!Number.isInteger(m) || m < 1 || m > 480)) return setLocalError("Estimated minutes must be a whole number from 1 to 480.");
    if (deadline && deadline < today && deadline !== initial?.deadline) return setLocalError("The deadline can't be in the past.");
    setLocalError(null);
    onSubmit({
      subjectId,
      chapterId,
      topic: topic.trim() || null,
      estimatedMinutes: m,
      deadline: deadline || null,
      priority,
      notes: notes.trim() || null,
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
        chapterRequired
        disabled={busy}
        idPrefix={idPrefix}
      />

      <label className={LABEL} htmlFor={`${idPrefix}-topic`}>
        Topic (optional)
        <input id={`${idPrefix}-topic`} data-testid={`${idPrefix}-topic`} className={FIELD} maxLength={200} value={topic} disabled={busy} onChange={(e) => setTopic(e.target.value)} />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-body-text dark:text-ink">How long will it take? (optional)</span>
        <div className="flex flex-wrap items-center gap-2">
          {BACKLOG_MINUTE_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              data-testid={`${idPrefix}-preset-${m}`}
              aria-pressed={minutes === String(m)}
              disabled={busy}
              onClick={() => setMinutes(String(m))}
              className={`min-h-11 min-w-14 rounded-xl border px-3 text-[15px] font-bold ${minutes === String(m) ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
            >
              {m}m
            </button>
          ))}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={480}
            aria-label="Estimated minutes"
            data-testid={`${idPrefix}-minutes`}
            className="h-11 w-24 rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text dark:text-ink"
            value={minutes}
            disabled={busy}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
      </div>

      <div role="radiogroup" aria-label="How urgent is it?" className="flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-body-text dark:text-ink">How urgent is it?</span>
        <div className="flex flex-wrap gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={priority === p.value}
              data-testid={`${idPrefix}-priority-${p.value}`}
              disabled={busy}
              onClick={() => setPriority(p.value)}
              className={`min-h-11 rounded-xl border px-3 text-[14px] font-bold ${priority === p.value ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <label className={LABEL} htmlFor={`${idPrefix}-deadline`}>
        Deadline (optional)
        <input id={`${idPrefix}-deadline`} data-testid={`${idPrefix}-deadline`} type="date" className={FIELD} min={today} value={deadline} disabled={busy} onChange={(e) => setDeadline(e.target.value)} />
      </label>

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
