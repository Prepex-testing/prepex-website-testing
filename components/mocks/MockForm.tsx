"use client";

import { useState } from "react";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { ExamPattern, MockSubject, NewMock, TestType } from "@/lib/api/mocks";
import { WeakChapterPicker } from "@/components/mocks/WeakChapterPicker";
import { AREA, FIELD, LABEL } from "@/components/study/SubjectChapterFields";
import { DEFAULT_MAX, EXAM_PATTERNS, TEST_TYPES, SUBJECTS_BY_PATTERN, SUBJECT_LABEL, autoTotal, marksProblem, parseMarks } from "@/lib/insights/mockMath";
import { dayKey } from "@/lib/logs/dates";

export type MockFormInitial = {
  testType?: TestType;
  examPattern?: ExamPattern;
  testName?: string;
  dateTaken?: string;
  totalMarks?: number;
  maxMarks?: number;
  subjectMarks?: Partial<Record<MockSubject, number | null>>;
  timeMinutes?: number | null;
  questionsCorrect?: number | null;
  questionsWrong?: number | null;
  questionsSkipped?: number | null;
  weakChapterIds?: string[];
  percentile?: number | null;
  notes?: string;
};

type Props = {
  subjects: SubjectChapters[];
  busy: boolean;
  error: string | null;
  submitLabel?: string;
  initial?: MockFormInitial;
  idPrefix?: string;
  onSubmit: (input: NewMock) => void;
  onCancel?: () => void;
};

const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

/**
 * "I sat a mock." The total adds itself up from the subject marks (until you type your own, and then it is checked
 * against them); the percentile is the one your test platform reported — Prepex projects the rank from it.
 */
export function MockForm({ subjects, busy, error, submitLabel = "Log mock", initial, idPrefix = "mock", onSubmit, onCancel }: Props) {
  const [testType, setTestType] = useState<TestType>(initial?.testType ?? "full_mock");
  const [pattern, setPattern] = useState<ExamPattern>(initial?.examPattern ?? "jee_main");
  const [name, setName] = useState(initial?.testName ?? "");
  const [date, setDate] = useState(initial?.dateTaken ?? dayKey(new Date()));
  const [marks, setMarks] = useState<Partial<Record<MockSubject, string>>>({
    physics: str(initial?.subjectMarks?.physics),
    chemistry: str(initial?.subjectMarks?.chemistry),
    maths: str(initial?.subjectMarks?.maths),
    biology: str(initial?.subjectMarks?.biology),
  });
  const [total, setTotal] = useState(str(initial?.totalMarks));
  const [totalTouched, setTotalTouched] = useState(initial?.totalMarks !== undefined);
  const [max, setMax] = useState(str(initial?.maxMarks ?? DEFAULT_MAX[initial?.examPattern ?? "jee_main"]));
  const [maxTouched, setMaxTouched] = useState(initial?.maxMarks !== undefined);
  const [minutes, setMinutes] = useState(str(initial?.timeMinutes));
  const [correct, setCorrect] = useState(str(initial?.questionsCorrect));
  const [wrong, setWrong] = useState(str(initial?.questionsWrong));
  const [skipped, setSkipped] = useState(str(initial?.questionsSkipped));
  const [percentile, setPercentile] = useState(str(initial?.percentile));
  const [weak, setWeak] = useState<string[]>(initial?.weakChapterIds ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const auto = autoTotal(pattern, marks);
  const shownTotal = totalTouched ? total : auto !== null ? String(auto) : total;
  const totalN = parseMarks(shownTotal);
  const maxN = parseMarks(max);
  const problem = !Number.isNaN(totalN) && !Number.isNaN(maxN) ? marksProblem(pattern, totalN, maxN, marks) : null;
  const subjectList = SUBJECTS_BY_PATTERN[pattern];

  function changePattern(next: ExamPattern) {
    setPattern(next);
    if (!maxTouched) setMax(String(DEFAULT_MAX[next]));
    setLocalError(null);
  }

  function optionalInt(raw: string, label: string, lo: number, hi: number): number | null | "bad" {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < lo || n > hi) {
      setLocalError(`${label} must be a whole number from ${lo} to ${hi}.`);
      return "bad";
    }
    return n;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.length > 120) return setLocalError("The test name can be at most 120 characters.");
    if (!date) return setLocalError("Pick the date you took the test.");
    if (date > dayKey(new Date())) return setLocalError("A mock can't be dated in the future.");
    if (Number.isNaN(maxN)) return setLocalError("The maximum marks must be a whole number.");
    if (Number.isNaN(totalN)) return setLocalError("Enter your total marks (or all the subject marks and we'll add them).");
    const bad = marksProblem(pattern, totalN, maxN, marks);
    if (bad) return setLocalError(bad);

    const subjectMarks: Partial<Record<MockSubject, number | null>> = {};
    for (const s of subjectList) {
      const m = parseMarks(marks[s] ?? "");
      if ((marks[s] ?? "").trim() !== "" && Number.isNaN(m)) return setLocalError(`${SUBJECT_LABEL[s]} marks must be a whole number.`);
      subjectMarks[s] = Number.isNaN(m) ? null : m;
    }
    const time = optionalInt(minutes, "Time taken", 1, 720);
    const c = optionalInt(correct, "Correct", 0, 1000);
    const w = optionalInt(wrong, "Wrong", 0, 1000);
    const sk = optionalInt(skipped, "Skipped", 0, 1000);
    if (time === "bad" || c === "bad" || w === "bad" || sk === "bad") return;
    let pct: number | null = null;
    if (percentile.trim() !== "") {
      pct = Number(percentile);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100 || Math.abs(pct * 100 - Math.round(pct * 100)) > 1e-6) return setLocalError("Percentile must be between 0 and 100, with at most two decimals.");
    }
    setLocalError(null);
    onSubmit({
      testType,
      examPattern: pattern,
      testName: name.trim() || null,
      dateTaken: date,
      totalMarks: totalN,
      maxMarks: maxN,
      physicsMarks: subjectMarks.physics ?? null,
      chemistryMarks: subjectMarks.chemistry ?? null,
      mathsMarks: subjectMarks.maths ?? null,
      biologyMarks: subjectMarks.biology ?? null,
      timeMinutes: time,
      questionsCorrect: c,
      questionsWrong: w,
      questionsSkipped: sk,
      weakChapterIds: weak,
      percentile: pct,
      notes: notes.trim() || null,
    });
  }

  const shownError = localError ?? error;
  const numberField = "h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink";

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4" data-testid={`${idPrefix}-form`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={LABEL} htmlFor={`${idPrefix}-type`}>
          Type of test
          <select id={`${idPrefix}-type`} data-testid={`${idPrefix}-type`} className={FIELD} value={testType} disabled={busy} onChange={(e) => setTestType(e.target.value as TestType)}>
            {TEST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL} htmlFor={`${idPrefix}-pattern`}>
          Exam pattern
          <select id={`${idPrefix}-pattern`} data-testid={`${idPrefix}-pattern`} className={FIELD} value={pattern} disabled={busy} onChange={(e) => changePattern(e.target.value as ExamPattern)}>
            {EXAM_PATTERNS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={LABEL} htmlFor={`${idPrefix}-name`}>
          Test name (optional)
          <input id={`${idPrefix}-name`} data-testid={`${idPrefix}-name`} className={FIELD} maxLength={120} placeholder="AITS 4, Part Test 2…" value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={LABEL} htmlFor={`${idPrefix}-date`}>
          Date taken
          <input id={`${idPrefix}-date`} data-testid={`${idPrefix}-date`} type="date" className={FIELD} value={date} max={dayKey(new Date())} disabled={busy} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {subjectList.map((s) => (
          <label key={s} className={LABEL} htmlFor={`${idPrefix}-marks-${s}`}>
            {SUBJECT_LABEL[s]} marks
            <input
              id={`${idPrefix}-marks-${s}`}
              data-testid={`${idPrefix}-marks-${s}`}
              inputMode="numeric"
              className={numberField}
              value={marks[s] ?? ""}
              disabled={busy}
              onChange={(e) => {
                setMarks({ ...marks, [s]: e.target.value });
                setLocalError(null);
              }}
            />
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={LABEL} htmlFor={`${idPrefix}-total`}>
          Total marks
          <input
            id={`${idPrefix}-total`}
            data-testid={`${idPrefix}-total`}
            inputMode="numeric"
            className={`${numberField} ${problem ? "!border-[#DC2626]" : ""}`}
            value={shownTotal}
            disabled={busy}
            onChange={(e) => {
              setTotalTouched(true);
              setTotal(e.target.value);
              setLocalError(null);
            }}
          />
        </label>
        <label className={LABEL} htmlFor={`${idPrefix}-max`}>
          Out of
          <input
            id={`${idPrefix}-max`}
            data-testid={`${idPrefix}-max`}
            inputMode="numeric"
            className={numberField}
            value={max}
            disabled={busy}
            onChange={(e) => {
              setMaxTouched(true);
              setMax(e.target.value);
              setLocalError(null);
            }}
          />
        </label>
      </div>
      <p
        data-testid={`${idPrefix}-total-status`}
        role="status"
        className={`-mt-2 min-h-5 text-[13px] font-semibold ${problem ? "text-[#DC2626] dark:text-[#F87171]" : auto !== null && !totalTouched ? "text-[#047857] dark:text-[#34D399]" : "text-muted"}`}
      >
        {problem ?? (auto !== null && !totalTouched ? `Added up from your subjects: ${auto}.` : "Marks can be negative — JEE has negative marking.")}
      </p>
      {totalTouched && auto !== null && (
        <button
          type="button"
          data-testid={`${idPrefix}-auto-total`}
          className="-mt-2 min-h-10 self-start rounded-lg px-2 text-[13px] font-bold text-brand underline dark:text-ink"
          onClick={() => {
            setTotalTouched(false);
            setTotal("");
            setLocalError(null);
          }}
        >
          Add the subjects up for me
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className={LABEL} htmlFor={`${idPrefix}-minutes`}>
          Minutes
          <input id={`${idPrefix}-minutes`} data-testid={`${idPrefix}-minutes`} inputMode="numeric" className={numberField} value={minutes} disabled={busy} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <label className={LABEL} htmlFor={`${idPrefix}-correct`}>
          Correct
          <input id={`${idPrefix}-correct`} data-testid={`${idPrefix}-correct`} inputMode="numeric" className={numberField} value={correct} disabled={busy} onChange={(e) => setCorrect(e.target.value)} />
        </label>
        <label className={LABEL} htmlFor={`${idPrefix}-wrong`}>
          Wrong
          <input id={`${idPrefix}-wrong`} data-testid={`${idPrefix}-wrong`} inputMode="numeric" className={numberField} value={wrong} disabled={busy} onChange={(e) => setWrong(e.target.value)} />
        </label>
        <label className={LABEL} htmlFor={`${idPrefix}-skipped`}>
          Skipped
          <input id={`${idPrefix}-skipped`} data-testid={`${idPrefix}-skipped`} inputMode="numeric" className={numberField} value={skipped} disabled={busy} onChange={(e) => setSkipped(e.target.value)} />
        </label>
      </div>

      <label className={LABEL} htmlFor={`${idPrefix}-percentile`}>
        Percentile from your test platform (optional)
        <input id={`${idPrefix}-percentile`} data-testid={`${idPrefix}-percentile`} inputMode="decimal" placeholder="e.g. 96.5" className={numberField} value={percentile} disabled={busy} onChange={(e) => setPercentile(e.target.value)} />
        <span className="text-[12px] font-normal text-muted">We project your rank from this. We never turn marks into a percentile ourselves.</span>
      </label>

      <WeakChapterPicker subjects={subjects} selected={weak} onChange={setWeak} disabled={busy} idPrefix={`${idPrefix}-weak`} />

      <label className={LABEL} htmlFor={`${idPrefix}-notes`}>
        Notes (optional)
        <textarea id={`${idPrefix}-notes`} className={AREA} maxLength={1000} value={notes} disabled={busy} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {shownError && (
        <p role="alert" data-testid={`${idPrefix}-error`} className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {shownError}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="submit"
          data-testid={`${idPrefix}-submit`}
          disabled={busy}
          className="min-h-14 flex-1 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white transition-colors hover:bg-[#E8623F] disabled:opacity-60"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className="min-h-14 flex-1 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-base font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
