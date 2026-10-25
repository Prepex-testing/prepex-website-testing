"use client";

import Link from "next/link";
import { useState } from "react";
import { CoralButton } from "@/components/ui/CoralButton";
import type { SubjectChapters } from "@/lib/api/dashboard";
import { GHOST_CLASSES } from "@/components/ui/GhostButton";
import { PRACTICE_SOURCES } from "@/lib/logs/labels";

const DIFFICULTIES = ["Easy", "Medium", "Hard", "Mixed"] as const;

type Props = {
  subjects: SubjectChapters[];
  /** Switches to the Log tab. */
  onLog: () => void;
};

function Chip({ active, children, onClick, testId }: { active: boolean; children: React.ReactNode; onClick: () => void; testId?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-testid={testId}
      onClick={onClick}
      className={`h-8 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${active ? "border-saffron bg-surface-elevated-2 text-saffron" : "border-border-strong bg-transparent text-ink hover:bg-surface-elevated-2"}`}
    >
      {children}
    </button>
  );
}

/**
 * Practice: where a student starts solving. Until the question bank ships, the chapter tests below are placeholders
 * and the way to record practice is to log a session from any source.
 * TODO(practice): wire chapter-wise tests once the question-bank window merges.
 */
export function PracticeTab({ subjects, onLog }: Props) {
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterQuery, setChapterQuery] = useState("");
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const chapters = subjects
    .filter((s) => subjectId === null || s.subjectId === subjectId)
    .flatMap((s) => s.chapters.map((c) => ({ id: c.id, name: c.name, subject: s.subjectName, order: c.sequenceOrder })))
    .filter((c) => c.name.toLowerCase().includes(chapterQuery.trim().toLowerCase()))
    .sort((a, b) => a.order - b.order);
  const shown = chapters.slice(0, 6);

  return (
    <div className="flex flex-col gap-5" data-testid="practice-tab">
      <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-elevated p-5">
        <h2 className="text-[18px] font-bold text-ink">Practice questions by chapter</h2>

        <div className="flex flex-col gap-3" data-testid="practice-filters">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Subject">
            <Chip active={subjectId === null} onClick={() => setSubjectId(null)}>
              All subjects
            </Chip>
            {subjects.map((s) => (
              <Chip key={s.subjectId} active={subjectId === s.subjectId} onClick={() => setSubjectId(s.subjectId)} testId={`practice-subject-${s.subjectId}`}>
                {s.subjectName}
              </Chip>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-body-text dark:text-ink">
            Chapter
            <input
              type="search"
              list="practice-chapter-list"
              data-testid="practice-chapter-search"
              value={chapterQuery}
              onChange={(e) => setChapterQuery(e.target.value)}
              placeholder="Search chapters"
              className="h-11 w-full max-w-sm rounded-[10px] border border-border-subtle bg-surface-elevated-2 px-3 text-[15px] text-ink outline-none focus:border-border-strong"
            />
            <datalist id="practice-chapter-list">
              {chapters.slice(0, 30).map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Difficulty">
            {DIFFICULTIES.map((d) => (
              <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)}>
                {d}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Source">
            {PRACTICE_SOURCES.slice(0, 7).map((s) => (
              <Chip key={s.value} active={source === s.value} onClick={() => setSource(source === s.value ? null : s.value)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </div>

        <p className="rounded-[10px] border border-border-subtle bg-surface-elevated-2 px-3 py-2.5 text-[13px] text-body-text dark:text-ink" data-testid="practice-notice">
          Question bank is loading. For now, use Log Sessions → +Add to log your own practice from any source.
        </p>
      </section>

      <section className="flex flex-col gap-3" data-testid="practice-tests">
        <h3 className="text-[16px] font-bold text-ink">Chapter tests</h3>
        {shown.length === 0 ? (
          <p className="text-[13px] text-muted">No chapters match.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 rounded-2xl border border-border-subtle bg-surface-elevated p-4" data-testid="practice-test-card">
                <p className="text-[15px] font-semibold text-ink">{c.name}</p>
                <p className="text-[12px] text-muted">{c.subject} · test coming soon</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <CoralButton data-testid="practice-log-session" onClick={onLog}>
          + Log a practice session
        </CoralButton>
        <Link href="/practice/sessions" data-testid="practice-open-prepex" className={GHOST_CLASSES}>
          Open today&apos;s Prepex practice
        </Link>
      </div>
    </div>
  );
}
