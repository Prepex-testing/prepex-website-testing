"use client";

import type { SubjectChapters } from "@/lib/api/dashboard";

export const FIELD =
  "h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink";
export const AREA =
  "min-h-24 w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink";
export const LABEL = "flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink";

type Props = {
  subjects: SubjectChapters[];
  subjectId: number | null;
  chapterId: string | null;
  onChange: (next: { subjectId: number | null; chapterId: string | null }) => void;
  /** Allow "Any subject" (filters) instead of requiring one (forms). */
  allowAnySubject?: boolean;
  disabled?: boolean;
  /** The chapter must be chosen (revision and practice logs) rather than optional. */
  chapterRequired?: boolean;
  idPrefix?: string;
};

/** Subject select + optional chapter select. Picking another subject clears the chapter. */
export function SubjectChapterFields({ subjects, subjectId, chapterId, onChange, allowAnySubject = false, disabled = false, chapterRequired = false, idPrefix = "sc" }: Props) {
  const chapters = [...(subjects.find((s) => s.subjectId === subjectId)?.chapters ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className={LABEL} htmlFor={`${idPrefix}-subject`}>
        Subject
        <select
          id={`${idPrefix}-subject`}
          data-testid={`${idPrefix}-subject`}
          className={FIELD}
          disabled={disabled}
          value={subjectId ?? ""}
          onChange={(e) => onChange({ subjectId: e.target.value ? Number(e.target.value) : null, chapterId: null })}
        >
          {allowAnySubject ? <option value="">All subjects</option> : <option value="">Choose a subject</option>}
          {subjects.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>
              {s.subjectName}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL} htmlFor={`${idPrefix}-chapter`}>
        {chapterRequired ? "Chapter" : "Chapter (optional)"}
        <select
          id={`${idPrefix}-chapter`}
          data-testid={`${idPrefix}-chapter`}
          className={`${FIELD} disabled:opacity-50`}
          disabled={disabled || subjectId === null}
          value={chapterId ?? ""}
          onChange={(e) => onChange({ subjectId, chapterId: e.target.value || null })}
        >
          <option value="">{subjectId === null ? "Pick a subject first" : chapterRequired ? "Choose a chapter" : "Whole subject"}</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
