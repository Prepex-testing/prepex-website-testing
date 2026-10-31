"use client";

import { useEffect, useState } from "react";
import { GhostButton } from "@/components/ui/GhostButton";
import { loadChapterIndex, type ChapterInfo } from "@/lib/syllabus/chapterIndex";

type Props = {
  title: string;
  hint?: string;
  chapterIds: string[];
  busy?: boolean;
  onPick: (pick: { chapterId: string; lectureNumber: number | null }) => void;
  onSkip?: () => void;
  testId?: string;
};

/**
 * "What did class cover?": the student's current chapters as chips and an optional lecture number. One tap on a chip
 * saves it, and that moves the chapter from Not started to In progress so the revision and planner engines can use it.
 */
export function CoverageChips({ title, hint, chapterIds, busy = false, onPick, onSkip, testId = "coverage" }: Props) {
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [lecture, setLecture] = useState("");

  useEffect(() => {
    let alive = true;
    void loadChapterIndex()
      .then((index) => {
        if (alive) setChapters(chapterIds.map((id) => index.get(id)).filter((c): c is ChapterInfo => Boolean(c)));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [chapterIds]);

  const number = Number(lecture);
  const lectureNumber = lecture.trim() !== "" && Number.isInteger(number) && number > 0 ? number : null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-elevated p-4" data-testid={testId} aria-label={title}>
      <div>
        <h3 className="text-[16px] font-extrabold text-ink">{title}</h3>
        {hint && <p className="text-[13px] text-muted">{hint}</p>}
      </div>
      {chapters.length === 0 ? (
        <p className="text-[13px] text-muted">No current chapters yet. Mark a chapter as in progress in your syllabus.</p>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Chapters">
          {chapters.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={busy}
              data-testid={`${testId}-chip`}
              onClick={() => onPick({ chapterId: c.id, lectureNumber })}
              className="min-h-11 rounded-full border border-border-subtle bg-surface px-4 text-[14px] font-semibold text-ink transition hover:border-brand active:scale-[0.98] disabled:opacity-60"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-[13px] text-muted">
          Lecture number (optional)
          <input
            inputMode="numeric"
            aria-label="Lecture number"
            data-testid={`${testId}-lecture`}
            value={lecture}
            onChange={(e) => setLecture(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
            className="h-10 w-16 rounded-lg border border-input-border bg-surface px-2 text-center text-[15px] font-semibold text-ink outline-none focus:border-brand"
          />
        </label>
        {onSkip && (
          <GhostButton className="ml-auto" data-testid={`${testId}-skip`} disabled={busy} onClick={onSkip}>
            Not now
          </GhostButton>
        )}
      </div>
    </section>
  );
}
