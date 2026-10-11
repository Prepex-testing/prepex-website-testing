"use client";

import { useMemo, useState } from "react";
import type { SubjectChapters } from "@/lib/api/dashboard";

export const MAX_WEAK_CHAPTERS = 30;

type Props = {
  subjects: SubjectChapters[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  idPrefix?: string;
};

/** Multi-select of syllabus chapters ("which chapters did this test show up as weak?"), grouped by subject and searchable. */
export function WeakChapterPicker({ subjects, selected, onChange, disabled = false, idPrefix = "weak" }: Props) {
  const [filter, setFilter] = useState("");
  const names = useMemo(() => new Map(subjects.flatMap((s) => s.chapters.map((c) => [c.id, c.name] as const))), [subjects]);
  const needle = filter.trim().toLowerCase();

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < MAX_WEAK_CHAPTERS) onChange([...selected, id]);
  }

  return (
    <fieldset className="flex flex-col gap-2" data-testid={`${idPrefix}-picker`} disabled={disabled}>
      <legend className="text-[14px] font-semibold text-body-text dark:text-ink">
        Weak chapters <span className="font-normal text-muted">(optional · {selected.length} chosen)</span>
      </legend>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Chosen chapters">
          {selected.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-label={`Remove ${names.get(id) ?? "chapter"}`}
                data-testid={`${idPrefix}-chip-${id}`}
                className="min-h-9 rounded-full border border-brand/20 bg-tint-strong px-3 text-[13px] font-bold text-ink"
              >
                {names.get(id) ?? "Chapter"} ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        type="search"
        aria-label="Search chapters"
        data-testid={`${idPrefix}-search`}
        placeholder="Search chapters"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="h-11 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink"
      />

      <div className="max-h-56 overflow-y-auto rounded-xl border border-brand/10 p-2" data-testid={`${idPrefix}-list`}>
        {subjects.map((s) => {
          const visible = s.chapters.filter((c) => !needle || c.name.toLowerCase().includes(needle)).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
          if (visible.length === 0) return null;
          return (
            <div key={s.subjectId} className="mb-2 last:mb-0">
              <p className="px-1 pb-1 text-[12px] font-bold uppercase tracking-wide text-muted">{s.subjectName}</p>
              <div className="flex flex-wrap gap-2">
                {visible.map((c) => {
                  const on = selected.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      data-testid={`${idPrefix}-chapter-${c.id}`}
                      onClick={() => toggle(c.id)}
                      className={`min-h-11 rounded-xl border px-3 text-[13px] font-bold ${on ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {subjects.every((s) => s.chapters.length === 0) && <p className="p-2 text-[13px] text-muted">No chapters to pick from yet.</p>}
      </div>
      {selected.length >= MAX_WEAK_CHAPTERS && <p className="text-[13px] font-semibold text-muted">That&apos;s the most you can pick ({MAX_WEAK_CHAPTERS}).</p>}
    </fieldset>
  );
}
