"use client";

import { useState } from "react";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { Mistake, NewMistake } from "@/lib/api/mistakes";
import { MAX_TAGS, isHttpsUrl, parseTags } from "@/lib/study/format";
import { AREA, FIELD, LABEL, SubjectChapterFields } from "@/components/study/SubjectChapterFields";

type Props = {
  subjects: SubjectChapters[];
  busy: boolean;
  error: string | null;
  /** When editing, the mistake being changed. */
  initial?: Mistake;
  submitLabel?: string;
  onSubmit: (input: NewMistake) => void;
  onCancel: () => void;
};

const DIFFICULTY_LABELS = ["Easy", "Fairly easy", "Medium", "Hard", "Very hard"];

/** Add (or edit) a mistake: the question, the right answer, what you wrote, and why. */
export function MistakeForm({ subjects, busy, error, initial, submitLabel = "Save mistake", onSubmit, onCancel }: Props) {
  const [subjectId, setSubjectId] = useState<number | null>(initial?.subjectId ?? null);
  const [chapterId, setChapterId] = useState<string | null>(initial?.chapterId ?? null);
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [questionText, setQuestionText] = useState(initial?.questionText ?? "");
  const [correctAnswer, setCorrectAnswer] = useState(initial?.correctAnswer ?? "");
  const [studentAnswer, setStudentAnswer] = useState(initial?.studentAnswer ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 3);
  const [localError, setLocalError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (subjectId === null) return setLocalError("Choose a subject.");
    if (!questionText.trim()) return setLocalError("Write the question.");
    if (!correctAnswer.trim()) return setLocalError("Write the correct answer.");
    if (!studentAnswer.trim()) return setLocalError("Write what you answered (or \"left blank\").");
    if (imageUrl.trim() && !isHttpsUrl(imageUrl)) return setLocalError("The image link must start with https://");
    setLocalError(null);
    onSubmit({
      subjectId,
      chapterId,
      topic: topic.trim() || null,
      questionText: questionText.trim(),
      correctAnswer: correctAnswer.trim(),
      studentAnswer: studentAnswer.trim(),
      explanation: explanation.trim() || null,
      imageUrl: imageUrl.trim() || null,
      tags: parseTags(tags),
      difficulty,
    });
  }

  const shownError = localError ?? error;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4" data-testid="mistake-form">
      <SubjectChapterFields
        subjects={subjects}
        subjectId={subjectId}
        chapterId={chapterId}
        onChange={(next) => {
          setSubjectId(next.subjectId);
          setChapterId(next.chapterId);
        }}
        disabled={busy}
        idPrefix="mistake"
      />

      <label className={LABEL} htmlFor="mistake-question">
        Question
        <textarea id="mistake-question" data-testid="mistake-question" className={AREA} maxLength={5000} value={questionText} disabled={busy} onChange={(e) => setQuestionText(e.target.value)} placeholder="Type the question. Use $x^2$ for maths." />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={LABEL} htmlFor="mistake-correct">
          Correct answer
          <textarea id="mistake-correct" data-testid="mistake-correct" className={`${AREA} min-h-20`} maxLength={2000} value={correctAnswer} disabled={busy} onChange={(e) => setCorrectAnswer(e.target.value)} />
        </label>
        <label className={LABEL} htmlFor="mistake-mine">
          What I answered
          <textarea id="mistake-mine" data-testid="mistake-mine" className={`${AREA} min-h-20`} maxLength={2000} value={studentAnswer} disabled={busy} onChange={(e) => setStudentAnswer(e.target.value)} />
        </label>
      </div>

      <label className={LABEL} htmlFor="mistake-why">
        Why I got it wrong (optional)
        <textarea id="mistake-why" className={`${AREA} min-h-20`} maxLength={5000} value={explanation} disabled={busy} onChange={(e) => setExplanation(e.target.value)} />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={LABEL} htmlFor="mistake-topic">
          Topic (optional)
          <input id="mistake-topic" className={FIELD} maxLength={200} value={topic} disabled={busy} onChange={(e) => setTopic(e.target.value)} />
        </label>
        <label className={LABEL} htmlFor="mistake-tags">
          Tags (comma separated, up to {MAX_TAGS})
          <input id="mistake-tags" data-testid="mistake-tags" className={FIELD} value={tags} disabled={busy} onChange={(e) => setTags(e.target.value)} placeholder="silly, units" />
        </label>
      </div>

      <label className={LABEL} htmlFor="mistake-image">
        Image link (optional, https only)
        <input id="mistake-image" type="url" inputMode="url" className={FIELD} maxLength={2048} value={imageUrl} disabled={busy} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">How hard was it? <span className="font-normal text-muted">({DIFFICULTY_LABELS[difficulty - 1]})</span></legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Difficulty">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={difficulty === n}
              aria-label={`${n} — ${DIFFICULTY_LABELS[n - 1]}`}
              disabled={busy}
              onClick={() => setDifficulty(n)}
              className={`min-h-11 flex-1 rounded-xl border text-[15px] font-bold ${difficulty === n ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      {shownError && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {shownError}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button type="submit" data-testid="mistake-submit" disabled={busy} className="min-h-14 flex-1 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F] disabled:opacity-60">
          {busy ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="min-h-14 flex-1 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-base font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}
