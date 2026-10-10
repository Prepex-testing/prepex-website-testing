"use client";

import { useState } from "react";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { StartFocusInput } from "@/lib/api/focus";
import { PLAN_PRESETS_MINUTES, clampPlannedMinutes } from "@/lib/study/timer";
import { FIELD, LABEL, SubjectChapterFields } from "@/components/study/SubjectChapterFields";

type Props = {
  subjects: SubjectChapters[];
  busy: boolean;
  error: string | null;
  onStart: (input: StartFocusInput) => void;
};

/** What are you working on, and for how long? Then Start. */
export function FocusSetup({ subjects, busy, error, onStart }: Props) {
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [minutes, setMinutes] = useState(25);
  const [deep, setDeep] = useState(false);

  const canStart = subjectId !== null && !busy;

  return (
    <form
      noValidate
      className="flex flex-col gap-5 rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6"
      data-testid="focus-setup"
      onSubmit={(e) => {
        e.preventDefault();
        if (subjectId === null) return;
        onStart({
          subjectId,
          chapterId,
          topic: topic.trim() || null,
          plannedMinutes: clampPlannedMinutes(minutes),
          deepFocusMode: deep,
        });
      }}
    >
      <div>
        <h2 className="text-[18px] font-extrabold text-ink">What are you focusing on?</h2>
        <p className="mt-1 text-[13px] text-muted">Pick a subject, set a length, and start. Your time is logged for you when you finish.</p>
      </div>

      <SubjectChapterFields
        subjects={subjects}
        subjectId={subjectId}
        chapterId={chapterId}
        onChange={(next) => {
          setSubjectId(next.subjectId);
          setChapterId(next.chapterId);
        }}
        disabled={busy}
        idPrefix="focus"
      />

      <label className={LABEL} htmlFor="focus-topic">
        Topic (optional)
        <input
          id="focus-topic"
          className={FIELD}
          maxLength={200}
          placeholder="e.g. Projectile motion"
          value={topic}
          disabled={busy}
          onChange={(e) => setTopic(e.target.value)}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">How long?</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Session length">
          {PLAN_PRESETS_MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={minutes === m}
              data-testid={`preset-${m}`}
              disabled={busy}
              onClick={() => setMinutes(m)}
              className={`min-h-11 min-w-16 rounded-xl border px-4 text-[15px] font-bold transition-colors ${
                minutes === m ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"
              }`}
            >
              {m}m
            </button>
          ))}
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-brand/15 px-3 text-[14px] text-muted">
            Custom
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={480}
              aria-label="Custom minutes"
              data-testid="custom-minutes"
              className="h-9 w-20 rounded-lg border border-input-border bg-surface px-2 text-[16px] text-body-text dark:text-ink"
              value={minutes}
              disabled={busy}
              onChange={(e) => setMinutes(Number(e.target.value))}
              onBlur={() => setMinutes((m) => clampPlannedMinutes(m))}
            />
          </label>
        </div>
      </fieldset>

      <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl bg-tint-strong px-3 py-3 dark:bg-[#FAF7F214]">
        <input type="checkbox" className="mt-1 h-5 w-5" data-testid="deep-focus" checked={deep} disabled={busy} onChange={(e) => setDeep(e.target.checked)} />
        <span>
          <span className="block text-[15px] font-bold text-ink">Deep Focus</span>
          <span className="block text-[12px] leading-snug text-muted">Full screen where your browser allows it, and a warning if you try to leave or close the page.</span>
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        data-testid="start-focus"
        disabled={!canStart}
        className="min-h-14 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white transition-colors hover:bg-[#E8623F] disabled:cursor-not-allowed disabled:border-primary-button-disabled-bg disabled:bg-primary-button-disabled-bg disabled:text-primary-button-disabled-text"
      >
        {busy ? "Starting…" : subjectId === null ? "Choose a subject to start" : `Start ${clampPlannedMinutes(minutes)}-minute focus`}
      </button>
    </form>
  );
}
