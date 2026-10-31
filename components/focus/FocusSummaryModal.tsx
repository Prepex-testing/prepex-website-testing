"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { PRACTICE_SOURCES, type PracticeSheet, type PracticeSource, type StopFocusInput } from "@/lib/api/focus";
import { FOCUS_FLAGS } from "@/lib/focus/flags";
import type { OriginSource, TaskType } from "@/lib/focus/intent";
import { formatMinutes } from "@/lib/study/format";
import { defaultWasCompleted, previewMinutes } from "@/lib/study/timer";

type Props = {
  open: boolean;
  plannedMinutes: number;
  elapsedSeconds: number;
  interruptions: number;
  taskType?: TaskType;
  originSource?: OriginSource;
  /** The session has a chapter, so a practice log can be filed under it. */
  hasChapter?: boolean;
  busy: boolean;
  error: string | null;
  /** Keep going: close the summary and leave the clock running. */
  onKeepGoing: () => void;
  onSave: (input: StopFocusInput) => void;
};

const MOODS = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
] as const;

const CONFIDENCE = [
  { value: 1, label: "Shaky" },
  { value: 2, label: "Patchy" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Solid" },
  { value: 5, label: "Rock solid" },
] as const;

const LAST_SOURCE_KEY = "prepex.focus.lastPracticeSource";

function initialSource(origin: OriginSource | undefined): PracticeSource {
  try {
    const stored = localStorage.getItem(LAST_SOURCE_KEY);
    const match = PRACTICE_SOURCES.find((s) => s.value === stored);
    if (match) return match.value;
  } catch {
    /* private mode: fall through to the default */
  }
  return origin === "practice_own_content_fallback" || origin === "mistake_notebook" ? "own_notebook" : "coaching_dpp";
}

const toCount = (raw: string): number => {
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) && n > 0 ? Math.min(1000, n) : 0;
};

/** A session this long (focused time) is probably a forgotten timer. Matches the server, which trims only above it. */
const LONG_SESSION_SECONDS = 6 * 60 * 60;

/** Planned vs actual, how it went, what was practised or how well it is remembered, "was this a win?", then save. */
export function FocusSummaryModal({
  open,
  plannedMinutes,
  elapsedSeconds,
  interruptions,
  taskType = "self_study",
  originSource,
  hasChapter = true,
  busy,
  error,
  onKeepGoing,
  onSave,
}: Props) {
  const [choice, setChoice] = useState<boolean | null>(null);
  // "Partly" and "Not finished" both end the session unfinished; the difference is only how the student sees it
  const [partly, setPartly] = useState(false);
  // a session this long is probably a forgotten timer: "keep all or trim?", and keeping all is the default
  const longSession = elapsedSeconds > LONG_SESSION_SECONDS;
  const [trim, setTrim] = useState(false);
  const [trimMinutes, setTrimMinutes] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [attempted, setAttempted] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [source, setSource] = useState<PracticeSource>(() => initialSource(originSource));
  const [wrongNotes, setWrongNotes] = useState("");
  const win = choice ?? defaultWasCompleted(plannedMinutes, elapsedSeconds);

  const isPractice = taskType === "practice";
  const isRevision = taskType === "revision";

  const attemptedN = toCount(attempted);
  const correctN = toCount(correct);
  const wrongN = toCount(wrong);
  const sheetOverflows = attemptedN > 0 && correctN + wrongN > attemptedN;
  const skippedN = Math.max(0, attemptedN - correctN - wrongN);

  const buildInput = (): StopFocusInput => {
    const input: StopFocusInput = { wasCompleted: win, moodRating: mood };
    const keep = Math.floor(Number(trimMinutes));
    if (longSession && trim && Number.isFinite(keep) && keep >= 0 && keep < Math.round(elapsedSeconds / 60)) input.trimToMinutes = keep;
    if (isRevision) input.confidenceRating = confidence;
    if (isPractice && attemptedN > 0) {
      const notes = FOCUS_FLAGS.mistakeAutofeed && wrongN > 0 ? wrongNotes.split("\n").map((l) => l.trim().slice(0, 300)).filter(Boolean).slice(0, 20) : [];
      const sheet: PracticeSheet = {
        source,
        questionsAttempted: attemptedN,
        questionsCorrect: correctN,
        questionsWrong: wrongN,
        questionsSkipped: skippedN,
        ...(notes.length > 0 ? { wrongQuestions: notes } : {}),
      };
      input.practice = sheet;
      try {
        localStorage.setItem(LAST_SOURCE_KEY, source);
      } catch {
        /* fine */
      }
    }
    return input;
  };

  return (
    <Modal open={open} onClose={busy ? () => undefined : onKeepGoing} ariaLabel="Session summary">
      <div className="flex flex-col gap-5" data-testid="focus-summary">
        <div>
          <h2 className="text-[22px] font-extrabold text-ink">Wrap up this session</h2>
          <p className="mt-1 text-[13px] text-muted">Here&apos;s how it went.</p>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-tint-strong px-2 py-3 dark:bg-[#FAF7F214]">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Planned</dt>
            <dd className="mt-1 text-[18px] font-extrabold text-ink" data-testid="summary-planned">
              {formatMinutes(plannedMinutes)}
            </dd>
          </div>
          <div className="rounded-xl bg-tint-strong px-2 py-3 dark:bg-[#FAF7F214]">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Focused</dt>
            <dd className="mt-1 text-[18px] font-extrabold text-ink" data-testid="summary-actual">
              {formatMinutes(previewMinutes(elapsedSeconds))}
            </dd>
          </div>
          <div className="rounded-xl bg-tint-strong px-2 py-3 dark:bg-[#FAF7F214]">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">Distractions</dt>
            <dd className="mt-1 text-[18px] font-extrabold text-ink">{interruptions}</dd>
          </div>
        </dl>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[15px] font-bold text-ink">How was the session?</legend>
          <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="How was the session?">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mood === m.value}
                aria-label={m.label}
                data-testid={`mood-${m.value}`}
                disabled={busy}
                onClick={() => setMood(mood === m.value ? null : m.value)}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border text-[22px] transition-colors ${
                  mood === m.value ? "border-[1.5px] border-brand bg-tint-strong dark:border-[#FAF7F2]" : "border-brand/15 bg-surface"
                }`}
              >
                <span aria-hidden>{m.emoji}</span>
                <span className="text-[10px] font-bold text-muted">{m.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {isRevision && (
          <fieldset className="flex flex-col gap-2" data-testid="revision-confidence">
            <legend className="mb-1 text-[15px] font-bold text-ink">How well do you remember it now?</legend>
            <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Confidence">
              {CONFIDENCE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={confidence === c.value}
                  data-testid={`conf-${c.value}`}
                  disabled={busy}
                  onClick={() => setConfidence(confidence === c.value ? null : c.value)}
                  className={`min-h-12 rounded-xl border px-1 text-[12px] font-bold transition-colors ${
                    confidence === c.value ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-muted">This decides when the chapter comes back. A shaky one returns tomorrow; a solid one waits longer.</p>
          </fieldset>
        )}

        {isPractice && (
          <fieldset className="flex flex-col gap-3 rounded-2xl border border-brand/10 p-3" data-testid="practice-sheet">
            <legend className="px-1 text-[15px] font-bold text-ink">Log your practice (15 seconds)</legend>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "sheet-attempted", label: "Attempted", value: attempted, set: setAttempted },
                { id: "sheet-correct", label: "Correct", value: correct, set: setCorrect },
                { id: "sheet-wrong", label: "Wrong", value: wrong, set: setWrong },
              ].map((f) => (
                <label key={f.id} className="flex flex-col gap-1 text-[12px] font-semibold text-muted" htmlFor={f.id}>
                  {f.label}
                  <input
                    id={f.id}
                    data-testid={f.id}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={1000}
                    placeholder="0"
                    value={f.value}
                    disabled={busy}
                    onChange={(e) => f.set(e.target.value)}
                    className="h-12 w-full rounded-xl border border-input-border bg-surface px-2 text-center text-[16px] text-body-text outline-none focus:border-brand dark:text-ink"
                  />
                </label>
              ))}
            </div>
            {sheetOverflows && (
              <p role="alert" data-testid="sheet-problem" className="text-[12px] font-medium text-danger">
                Correct and wrong can&apos;t add up to more than the questions you attempted.
              </p>
            )}
            {attemptedN > 0 && !sheetOverflows && skippedN > 0 && <p className="text-[12px] text-muted">{skippedN} skipped.</p>}
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted" htmlFor="sheet-source">
              Where were the questions from?
              <select
                id="sheet-source"
                data-testid="sheet-source"
                value={source}
                disabled={busy}
                onChange={(e) => setSource(e.target.value as PracticeSource)}
                className="h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink"
              >
                {PRACTICE_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            {FOCUS_FLAGS.mistakeAutofeed && wrongN > 0 && (
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted" htmlFor="sheet-wrong-notes">
                Which ones went wrong? One per line, and we&apos;ll add them to your mistake notebook.
                <textarea
                  id="sheet-wrong-notes"
                  data-testid="sheet-wrong-notes"
                  rows={3}
                  maxLength={3000}
                  value={wrongNotes}
                  disabled={busy}
                  placeholder={"Q7, forgot the sign\nQ12, wrong formula"}
                  onChange={(e) => setWrongNotes(e.target.value)}
                  className="w-full rounded-xl border border-input-border bg-surface px-3 py-2 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink"
                />
              </label>
            )}
            {!hasChapter && attemptedN > 0 && (
              <p data-testid="sheet-no-chapter" className="text-[12px] text-muted">
                No chapter was chosen, so this can&apos;t be filed under one. Pick a chapter next time and it will be.
              </p>
            )}
          </fieldset>
        )}

        {longSession && (
          <fieldset className="flex flex-col gap-2 rounded-2xl border border-brand/20 bg-tint-strong p-3" data-testid="away-for-a-while">
            <legend className="px-1 text-[15px] font-bold text-ink">You were away for a while</legend>
            <p className="text-[13px] text-body-text dark:text-ink">{`This session ran ${Math.floor(elapsedSeconds / 3600)}h ${Math.floor((elapsedSeconds % 3600) / 60)}m. Keep all of it, or trim it to when you really studied?`}</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Keep all or trim">
              <button type="button" role="radio" aria-checked={!trim} data-testid="keep-all" disabled={busy} onClick={() => setTrim(false)} className={`min-h-12 rounded-xl border px-3 text-[14px] font-bold ${!trim ? "border-[1.5px] border-brand bg-surface text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}>
                Keep all
              </button>
              <button type="button" role="radio" aria-checked={trim} data-testid="trim" disabled={busy} onClick={() => setTrim(true)} className={`min-h-12 rounded-xl border px-3 text-[14px] font-bold ${trim ? "border-[1.5px] border-brand bg-surface text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}>
                Trim
              </button>
            </div>
            {trim && (
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-body-text dark:text-ink">
                Minutes to keep
                <input inputMode="numeric" data-testid="trim-minutes" value={trimMinutes} onChange={(e) => setTrimMinutes(e.target.value.replace(/[^\d]/g, ""))} className="h-11 rounded-xl border border-input-border bg-surface px-3 text-[16px] text-ink outline-none focus:border-brand" />
              </label>
            )}
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[15px] font-bold text-ink">How did it go?</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="How did it go?">
            {[
              { id: "win-yes", label: "Done", on: win === true, pick: () => { setChoice(true); setPartly(false); } },
              { id: "win-partly", label: "Partly", on: win === false && partly, pick: () => { setChoice(false); setPartly(true); } },
              { id: "win-no", label: "Not finished", on: win === false && !partly, pick: () => { setChoice(false); setPartly(false); } },
            ].map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={o.on}
                data-testid={o.id}
                disabled={busy}
                onClick={o.pick}
                className={`min-h-12 rounded-xl border px-2 text-[14px] font-bold transition-colors ${
                  o.on ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            data-testid="save-session"
            disabled={busy || sheetOverflows}
            onClick={() => onSave(buildInput())}
            className="min-h-14 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save session"}
          </button>
          <button type="button" disabled={busy} onClick={onKeepGoing} className="min-h-12 rounded-lg px-4 text-[14px] font-semibold text-muted underline-offset-2 hover:underline">
            Keep going
          </button>
        </div>
      </div>
    </Modal>
  );
}
