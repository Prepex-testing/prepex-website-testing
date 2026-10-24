"use client";

import { useId, useState } from "react";
import { CheckIcon } from "@/components/ui/icons";
import {
  countCompleted,
  toggleAll,
  toggleChapter,
  type ClassSection,
  type SubjectSection,
} from "@/lib/onboarding/chapters";

type Props = {
  sections: ClassSection[];
  completed: readonly string[];
  onChange: (completed: string[]) => void;
  /** While a search is active every subject is opened so no match is hidden behind a closed header. */
  expandAll?: boolean;
};

/**
 * Class -> Subject -> Chapter. A chapter is either done or not: one tap toggles it. Each subject header stays
 * pinned while you scroll through its chapters and carries a "Mark all complete" switch for the student who
 * finished a whole subject. Every tap target is at least 44px tall.
 */
export function ChapterPicker({ sections, completed, onChange, expandAll = false }: Props) {
  const done = new Set(completed);
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const first = sections[0]?.subjects[0]?.key;
    return first ? { [first]: true } : {};
  });

  return (
    <div className="flex flex-col gap-6" data-testid="chapter-picker">
      {sections.map((cls) => (
        <section key={cls.key} aria-label={cls.label} className="flex flex-col gap-3">
          <h2 className="text-[18px] font-extrabold text-ink">{cls.label}</h2>
          {cls.subjects.map((subject) => (
            <SubjectBlock
              key={subject.key}
              subject={subject}
              done={done}
              isOpen={expandAll || open[subject.key] === true}
              onToggleOpen={() => setOpen((o) => ({ ...o, [subject.key]: !(expandAll || o[subject.key]) }))}
              onChange={onChange}
              completed={completed}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function SubjectBlock({
  subject,
  done,
  completed,
  isOpen,
  onToggleOpen,
  onChange,
}: {
  subject: SubjectSection;
  done: ReadonlySet<string>;
  completed: readonly string[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onChange: (completed: string[]) => void;
}) {
  const panelId = useId();
  const count = countCompleted(subject, done);
  const allDone = subject.chapters.length > 0 && count === subject.chapters.length;

  return (
    <div className="rounded-xl border border-brand/10 bg-surface dark:border-white/10" data-testid={`subject-${subject.key}`}>
      {/* Pinned while this subject scrolls past. */}
      <div className="sticky top-0 z-10 flex items-center gap-2 rounded-t-xl bg-accordion-open-bg px-3 py-1 dark:bg-[#FAF7F214]">
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex min-h-11 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <span aria-hidden className={`text-ink transition-transform ${isOpen ? "rotate-90" : ""}`}>
            ▸
          </span>
          <span className="flex flex-col">
            <span className="text-[16px] font-bold text-ink">{subject.subjectName}</span>
            <span className="text-[12px] font-semibold text-muted" data-testid="subject-count">
              {count} of {subject.chapters.length} complete
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChange(toggleAll(completed, subject.chapters))}
          aria-pressed={allDone}
          data-testid="mark-all"
          className={`min-h-11 shrink-0 rounded-full border px-3.5 text-[13px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
            allDone ? "border-[#15803d] bg-[#15803d] text-white" : "border-brand/25 bg-surface text-ink dark:border-white/25"
          }`}
        >
          {allDone ? "All complete" : "Mark all complete"}
        </button>
      </div>

      {isOpen && (
        <ul id={panelId} className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
          {subject.chapters.map((chapter) => {
            const isDone = done.has(chapter.id);
            return (
              <li key={chapter.id}>
                <button
                  type="button"
                  aria-pressed={isDone}
                  data-testid="chapter-chip"
                  onClick={() => onChange(toggleChapter(completed, chapter.id))}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                    isDone
                      ? "border-[#15803d] bg-[#15803d] text-white"
                      : "border-brand/20 bg-surface text-body-text hover:border-brand/40 dark:border-white/20 dark:text-ink"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      isDone ? "border-white bg-white/20 text-white" : "border-brand/25 text-transparent dark:border-white/30"
                    }`}
                  >
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  <span className="flex-1">{chapter.name}</span>
                  <span className="sr-only">{isDone ? "Complete" : "Not complete"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
