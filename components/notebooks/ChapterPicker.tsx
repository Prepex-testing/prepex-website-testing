"use client";

import { useMemo } from "react";
import type { SubjectChapters } from "@/lib/api/dashboard";

const SELECT = "h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[15px] text-ink outline-none focus:border-brand";

/** Subject, then chapter. Native selects: they work well on a phone and are reachable with a keyboard. */
export function ChapterPicker({ subjects, chapterId, onChange, label = "Chapter" }: { subjects: SubjectChapters[]; chapterId: string | null; onChange: (chapterId: string | null, subjectId: number | null) => void; label?: string }) {
  const current = useMemo(() => subjects.find((s) => s.chapters.some((c) => c.id === chapterId)) ?? null, [subjects, chapterId]);
  const subjectId = current?.subjectId ?? null;
  const chapters = subjects.find((s) => s.subjectId === subjectId)?.chapters ?? [];
  return (
    <div className="grid grid-cols-2 gap-2" data-testid="chapter-picker">
      <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
        Subject
        <select
          className={SELECT}
          value={subjectId ?? ""}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null;
            const first = subjects.find((s) => s.subjectId === id)?.chapters[0];
            onChange(first?.id ?? null, id);
          }}
          data-testid="pick-subject"
        >
          <option value="">Pick a subject</option>
          {subjects.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>
              {s.subjectName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
        {label}
        <select className={SELECT} value={chapterId ?? ""} disabled={chapters.length === 0} onChange={(e) => onChange(e.target.value || null, subjectId)} data-testid="pick-chapter">
          <option value="">{chapters.length === 0 ? "Pick a subject first" : "Pick a chapter"}</option>
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
