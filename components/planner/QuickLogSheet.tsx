"use client";

import { useState } from "react";
import { Sheet } from "@/components/planner/Sheet";
import type { CompleteInput, PlanTask } from "@/lib/api/plannerV2";
import { CountStepper, RecallPicker, type Recall } from "@/components/planner/tickParts";
import { CONFIDENCE_LABELS } from "@/lib/planner/cta";
import { EXAM_PATTERN_OPTIONS, MOCK_TYPE_OPTIONS, PRACTICE_SOURCE_OPTIONS, REVISION_TYPE_OPTIONS } from "@/lib/planner/format";

type Props = {
  open: boolean;
  task: Pick<PlanTask, "kind" | "title" | "estimatedMinutes" | "contentSource" | "questionCount" | "chapterId">;
  /** manual = the student marked it done by hand; timer = it comes after a focus session or a mock. */
  origin: "manual" | "timer";
  /** Minutes already known (the timer's). */
  knownMinutes?: number | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  /** The 15-second log. The caller adds the focus session id, if any, and completes the task. */
  onSubmit: (log: Pick<CompleteInput, "actualMinutes" | "confidence" | "recall" | "revision" | "practice" | "mock" | "log">) => void;
};

const FIELD = "h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink";
const LABEL = "flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink";

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/**
 * The 15-second log after a task: practice (questions tried / right / wrong and the source), revision (how sure the
 * student feels, 1-5), a mock (the score), or just the minutes. Fields start filled from the task wherever they can.
 */
export function QuickLogSheet({ open, task, origin, knownMinutes, busy, error, onClose, onSubmit }: Props) {
  const startMinutes = knownMinutes ?? task.estimatedMinutes;
  const [minutes, setMinutes] = useState(String(startMinutes));
  const [confidence, setConfidence] = useState<number | null>(null);
  const [revisionType, setRevisionType] = useState("notes");
  const [source, setSource] = useState(task.contentSource && PRACTICE_SOURCE_OPTIONS.some((o) => o.value === task.contentSource) ? task.contentSource : "own_notebook");
  // A planner tick (manual) starts attempted from the task's own target. Correct starts EMPTY and is required: accuracy feeds the
  // chapter's state, revision and Rank GPS, so a one-tap confirm must never be able to claim a perfect score.
  const tick = origin === "manual";
  const [attempted, setAttempted] = useState(String(task.questionCount ?? (tick ? 10 : "")));
  const [correct, setCorrect] = useState("");
  const [testType, setTestType] = useState("full_mock");
  const [pattern, setPattern] = useState("jee_main");
  const [marks, setMarks] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const kind = task.kind;
  const title =
    kind === "practice" ? "Log your practice" : kind === "revision" ? (tick ? "How well did you recall it?" : "How did the revision go?") : kind === "mock" ? "Log your mock score" : origin === "manual" ? "Add a quick log?" : "Log this session";

  function submit() {
    setLocalError(null);
    const base = { actualMinutes: Math.max(1, num(minutes) || startMinutes), log: true };
    if (kind === "revision" && !tick) {
      if (!confidence) return setLocalError("Pick how confident you feel, from 1 to 5.");
      return onSubmit({ ...base, confidence, revision: { revisionType } });
    }
    if (kind === "practice") {
      const tried = num(attempted);
      const right = Math.min(num(correct), tried);
      if (tried < 1) return setLocalError("Enter how many questions you attempted.");
      if (correct.trim() === "") return setLocalError("Enter how many you got right.");
      if (num(correct) > tried) return setLocalError("Correct can't be more than attempted.");
      return onSubmit({ ...base, practice: { source, questionsAttempted: tried, questionsCorrect: right, questionsWrong: tried - right, questionsSkipped: 0 } });
    }
    if (kind === "mock") {
      const max = EXAM_PATTERN_OPTIONS.find((o) => o.value === pattern)?.maxMarks ?? 300;
      const total = Number(marks);
      if (marks.trim() === "" || !Number.isFinite(total)) return setLocalError("Enter your total marks.");
      if (total > max) return setLocalError(`Total marks cannot be more than ${max} for this exam.`);
      return onSubmit({ ...base, mock: { testType, examPattern: pattern, totalMarks: Math.round(total), maxMarks: max, timeMinutes: base.actualMinutes } });
    }
    return onSubmit(base);
  }

  const wrong = Math.max(0, num(attempted) - Math.min(num(correct), num(attempted)));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={origin === "manual" ? "Optional. Skip it and the task is still marked done." : task.title}
      data-testid="quick-log"
      footer={
        <div className="flex flex-col gap-2">
          {(error || localError) && (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">
              {localError ?? error}
            </p>
          )}
          {!(kind === "revision" && tick) && (
          <button type="button" data-testid="log-save" disabled={busy || (kind === "practice" && correct.trim() === "")} onClick={submit} className="min-h-14 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F] disabled:opacity-60">
            {busy ? "Saving…" : kind === "practice" && tick ? "Confirm" : "Save and finish"}
          </button>
          )}
          {origin === "manual" && (
            <button type="button" data-testid="log-skip" disabled={busy} onClick={() => onSubmit({})} className="min-h-12 rounded-lg px-4 text-[14px] font-semibold text-muted hover:underline">
              No log, just mark it done
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        {!(tick && (kind === "revision" || kind === "practice")) && (
          <label className={LABEL}>
            Minutes spent
            <input data-autofocus inputMode="numeric" className={FIELD} value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/[^\d]/g, ""))} aria-label="Minutes spent" />
          </label>
        )}

        {kind === "revision" && tick && (
          <RecallPicker
            busy={busy}
            onPick={(recall: Recall) => onSubmit({ actualMinutes: Math.max(1, num(minutes) || startMinutes), log: true, recall, revision: { revisionType: "notes" } })}
          />
        )}

        {kind === "revision" && !tick && (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">How confident do you feel about it now?</legend>
              <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Confidence">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={confidence === n}
                    data-testid={`confidence-${n}`}
                    onClick={() => setConfidence(n)}
                    className={`flex min-h-14 flex-col items-center justify-center rounded-xl border text-[18px] font-extrabold ${confidence === n ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
                  >
                    {n}
                    <span className="text-[9px] font-semibold leading-none text-muted">{CONFIDENCE_LABELS[n]}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <label className={LABEL}>
              What did you revise from?
              <select className={FIELD} value={revisionType} onChange={(e) => setRevisionType(e.target.value)}>
                {REVISION_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {kind === "practice" && tick && (
          <>
            <CountStepper label="Attempted" value={num(attempted)} min={1} testId="log-attempted" onChange={(n) => { setAttempted(String(n)); if (correct !== "" && num(correct) > n) setCorrect(String(n)); }} />
            <CountStepper label="Correct" value={correct === "" ? null : Math.min(num(correct), num(attempted))} max={num(attempted)} testId="log-correct" onChange={(n) => setCorrect(String(n))}>
              <p className="text-[12px] text-muted" data-testid="log-wrong">
                {correct === "" ? "Enter how many you got right to confirm." : `${wrong} wrong. Add the tricky ones to your mistake notebook any time.`}
              </p>
            </CountStepper>
            <label className={LABEL}>
              Source
              <select className={FIELD} value={source} onChange={(e) => setSource(e.target.value)} data-testid="log-source">
                {PRACTICE_SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {kind === "practice" && !tick && (
          <>
            <label className={LABEL}>
              Source
              <select className={FIELD} value={source} onChange={(e) => setSource(e.target.value)} data-testid="log-source">
                {PRACTICE_SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={LABEL}>
                Attempted
                <input inputMode="numeric" className={FIELD} value={attempted} onChange={(e) => setAttempted(e.target.value.replace(/[^\d]/g, ""))} data-testid="log-attempted" />
              </label>
              <label className={LABEL}>
                Correct
                <input inputMode="numeric" className={FIELD} value={correct} onChange={(e) => setCorrect(e.target.value.replace(/[^\d]/g, ""))} data-testid="log-correct" />
              </label>
            </div>
            <p className="text-[12px] text-muted" data-testid="log-wrong">
              {num(attempted) > 0 ? `${wrong} wrong. Add the tricky ones to your mistake notebook any time.` : "Wrong answers are worked out from attempted and correct."}
            </p>
          </>
        )}

        {kind === "mock" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className={LABEL}>
                Test type
                <select className={FIELD} value={testType} onChange={(e) => setTestType(e.target.value)}>
                  {MOCK_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={LABEL}>
                Exam pattern
                <select className={FIELD} value={pattern} onChange={(e) => setPattern(e.target.value)}>
                  {EXAM_PATTERN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={LABEL}>
              Total marks
              <input inputMode="numeric" className={FIELD} value={marks} onChange={(e) => setMarks(e.target.value.replace(/[^\d-]/g, ""))} data-testid="log-marks" />
            </label>
          </>
        )}
      </div>
    </Sheet>
  );
}
