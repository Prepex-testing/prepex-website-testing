"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import type { SubjectChapters } from "@/lib/api/dashboard";
import { getStudentChapters } from "@/lib/api/onboarding";
import { SuggestPanel } from "@/components/goals/SuggestPanel";

type Props = {
  subjects: SubjectChapters[];
  weekStartDate?: string | undefined;
  targetRank?: number | null | undefined;
  onAdded: (message: string) => void;
};

/** "+ Suggest new goal": pick a chapter, and the assistant proposes this week's hours, sub-topics and a PYQ year for it. */
export function NewSuggestion({ subjects: ownClass, weekStartDate, targetRank, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  // JEE students also work on the other class's chapters (class 12 revising class 11), so once the picker is opened it
  // lists every class's chapters; the page's own list (the student's class) is what shows until that arrives.
  const [allClasses, setAllClasses] = useState<SubjectChapters[] | null>(null);
  const subjects = allClasses ?? ownClass;
  const [chapterId, setChapterId] = useState("");
  const [asked, setAsked] = useState<{ id: string; name: string; key: number } | null>(null);

  const chapterName = (id: string) => subjects.flatMap((s) => s.chapters).find((c) => c.id === id)?.name ?? "";

  if (!open) {
    return (
      <button
        type="button"
        data-testid="suggest-new"
        onClick={() => {
          setOpen(true);
          if (allClasses === null) {
            getStudentChapters({ allClasses: true }).then(
              (res) => setAllClasses(res.data),
              () => undefined, // keep the student's own class list
            );
          }
        }}
        className="flex min-h-12 items-center justify-center gap-2 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong"
      >
        <Sparkles className="size-4 shrink-0" aria-hidden />
        Suggest new goal
      </button>
    );
  }

  return (
    <section aria-label="Suggest a goal" className="flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4" data-testid="suggest-new-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[15px] font-bold text-ink">
            <Sparkles className="size-4 shrink-0" aria-hidden />
            Suggest a goal
          </p>
          <p className="mt-0.5 text-[12px] text-muted">Pick a chapter. Prepex looks at your recent practice and mistakes on it and proposes hours for this week.</p>
        </div>
        <button
          type="button"
          aria-label="Close suggestions"
          data-testid="suggest-new-close"
          onClick={() => {
            setOpen(false);
            setAsked(null);
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[20px] text-muted hover:bg-tint-strong"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] font-semibold text-ink">
          Chapter
          <select
            data-testid="suggest-chapter"
            value={chapterId}
            onChange={(e) => {
              setChapterId(e.target.value);
              setAsked(null);
            }}
            className="min-h-12 rounded-lg border border-brand/25 bg-surface px-3 text-[15px] font-medium text-ink"
          >
            <option value="">Choose a chapter…</option>
            {subjects.map((s) => (
              <optgroup key={s.subjectId} label={s.subjectName}>
                {s.chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button
          type="button"
          data-testid="suggest-go"
          disabled={chapterId === ""}
          onClick={() => setAsked((prev) => ({ id: chapterId, name: chapterName(chapterId), key: (prev?.key ?? 0) + 1 }))}
          className="flex min-h-12 items-center gap-1.5 rounded-lg border border-primary-button-border bg-cta px-4 text-[15px] font-semibold text-white hover:bg-[#E8623F] disabled:cursor-not-allowed disabled:border-primary-button-disabled-bg disabled:bg-primary-button-disabled-bg disabled:text-primary-button-disabled-text"
        >
          <Sparkles className="size-4 shrink-0" aria-hidden />
          Suggest
        </button>
      </div>

      {asked && (
        <SuggestPanel
          key={asked.key}
          chapterId={asked.id}
          chapterName={asked.name}
          weekStartDate={weekStartDate}
          targetRank={targetRank}
          onAdded={onAdded}
          onClose={() => setAsked(null)}
        />
      )}
    </section>
  );
}
