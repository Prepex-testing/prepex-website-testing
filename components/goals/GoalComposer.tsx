"use client";

import { useState } from "react";
import type { Goal, GoalType, GoalUnit, NewGoal } from "@/lib/api/goals";
import type { SubjectChapters } from "@/lib/api/dashboard";
import {
  GOAL_TYPES,
  TARGET_RULES,
  clampTarget,
  defaultUnit,
  describeGoal,
  scopeText,
} from "@/lib/goals/format";

type Props = {
  subjects: SubjectChapters[];
  /** Goals already set this week — used to stop exact duplicates. */
  existing: Goal[];
  saving: boolean;
  error: string | null;
  onSave: (goals: NewGoal[]) => void | Promise<void>;
};

const FIELD =
  "h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink";

function sameGoal(a: NewGoal, b: Pick<NewGoal, "type" | "unit" | "subjectId" | "chapterId" | "topic">): boolean {
  return (
    a.type === b.type &&
    a.unit === b.unit &&
    (a.subjectId ?? null) === (b.subjectId ?? null) &&
    (a.chapterId ?? null) === (b.chapterId ?? null) &&
    (a.topic ?? null) === (b.topic ?? null)
  );
}

/**
 * Builds a batch of weekly goals: pick what kind of goal, narrow it to a
 * subject/chapter if you like, set the target, add it to the list, repeat — then
 * save the lot in one go. Everything is tap-friendly (44px+ targets).
 */
export function GoalComposer({ subjects, existing, saving, error, onSave }: Props) {
  const [type, setType] = useState<GoalType>("QUESTIONS");
  const [unit, setUnit] = useState<GoalUnit>("COUNT");
  const [target, setTarget] = useState<number>(TARGET_RULES.QUESTIONS.start);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<NewGoal[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const subjectNames = new Map(subjects.map((s) => [s.subjectId, s.subjectName]));
  const chapterNames = new Map(subjects.flatMap((s) => s.chapters.map((c) => [c.id, c.name] as const)));
  const chapters = subjects.find((s) => s.subjectId === subjectId)?.chapters ?? [];
  const rules = TARGET_RULES[type];
  const step = type === "HOURS" && unit === "MINUTES" ? 30 : rules.step;

  function chooseType(next: GoalType) {
    setType(next);
    setUnit(defaultUnit(next));
    setTarget(TARGET_RULES[next].start);
    setFormError(null);
  }

  function chooseSubject(next: number | null) {
    setSubjectId(next);
    setChapterId(null);
  }

  function addDraft() {
    const goal: NewGoal = { type, unit, target: clampTarget(type, unit, target), subjectId, chapterId };
    if ([...drafts, ...existing].some((g) => sameGoal(goal, g))) {
      setFormError("You already have that goal this week.");
      return;
    }
    setFormError(null);
    setDrafts((d) => [...d, goal]);
  }

  return (
    <section aria-label="Add goals" className="flex flex-col gap-5 rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6" data-testid="goal-composer">
      <div>
        <h2 className="text-[18px] font-extrabold text-ink">Add a goal</h2>
        <p className="mt-1 text-[13px] text-muted">Pick a type, set a target, add it. Then save everything at once.</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">What do you want to get done?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Goal type">
          {GOAL_TYPES.map((t) => {
            const selected = type === t.type;
            return (
              <button
                key={t.type}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`goal-type-${t.type}`}
                onClick={() => chooseType(t.type)}
                className={`flex min-h-14 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-colors ${
                  selected ? "border-[1.5px] border-brand bg-tint-strong shadow-hover dark:border-[#FAF7F2]" : "border-brand/15 bg-surface"
                }`}
              >
                <span className="text-[14px] font-bold text-ink">{t.label}</span>
                <span className="text-[11px] leading-tight text-muted">{t.help}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {type !== "MOCKS" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink">
            Subject
            <select
              data-testid="goal-subject"
              value={subjectId ?? ""}
              onChange={(e) => chooseSubject(e.target.value ? Number(e.target.value) : null)}
              className={FIELD}
            >
              <option value="">Any subject</option>
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectName}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink">
            Chapter (optional)
            <select
              data-testid="goal-chapter"
              value={chapterId ?? ""}
              disabled={subjectId === null}
              onChange={(e) => setChapterId(e.target.value || null)}
              className={`${FIELD} disabled:opacity-50`}
            >
              <option value="">{subjectId === null ? "Pick a subject first" : "Whole subject"}</option>
              {[...chapters]
                .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-semibold text-body-text dark:text-ink">How many?</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Decrease target"
            data-testid="goal-target-minus"
            onClick={() => setTarget((t) => clampTarget(type, unit, t - step))}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-surface text-[22px] font-bold text-ink"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            aria-label="Target"
            data-testid="goal-target"
            value={target}
            min={rules.min}
            onChange={(e) => setTarget(Number(e.target.value))}
            onBlur={() => setTarget((t) => clampTarget(type, unit, Number.isFinite(t) ? t : rules.start))}
            className={`${FIELD} text-center text-[20px] font-extrabold`}
          />
          <button
            type="button"
            aria-label="Increase target"
            data-testid="goal-target-plus"
            onClick={() => setTarget((t) => clampTarget(type, unit, t + step))}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-surface text-[22px] font-bold text-ink"
          >
            +
          </button>
          {type === "HOURS" && (
            <div className="flex shrink-0 overflow-hidden rounded-xl border border-brand/20" role="radiogroup" aria-label="Unit">
              {(["HOURS", "MINUTES"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={unit === u}
                  onClick={() => {
                    setUnit(u);
                    setTarget(u === "HOURS" ? 20 : 600);
                  }}
                  className={`min-h-12 px-3 text-[13px] font-bold ${unit === u ? "bg-brand text-white dark:bg-[#FAF7F2] dark:text-[#0D0D2B]" : "bg-surface text-ink"}`}
                >
                  {u === "HOURS" ? "hours" : "min"}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-[12px] text-muted">
          {type === "LECTURES"
            ? "You'll tick lectures off yourself — Prepex can't see what you watch."
            : "Prepex counts this automatically from what you do in the app."}
        </p>
      </div>

      <button
        type="button"
        data-testid="add-goal"
        onClick={addDraft}
        className="min-h-12 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong"
      >
        + Add this goal
      </button>

      {formError && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {formError}
        </p>
      )}

      {drafts.length > 0 && (
        <div className="flex flex-col gap-2" data-testid="goal-drafts">
          <p className="text-[14px] font-bold text-ink">Ready to save ({drafts.length})</p>
          <ul className="flex flex-col gap-2">
            {drafts.map((g, i) => {
              const scope = scopeText({ subjectId: g.subjectId ?? null, chapterId: g.chapterId ?? null, topic: g.topic ?? null }, subjectNames, chapterNames);
              return (
                <li key={`${g.type}-${i}`} className="flex items-center justify-between gap-3 rounded-xl bg-tint-strong px-3 py-2 dark:bg-[#FAF7F214]">
                  <span className="min-w-0 text-[14px] font-semibold text-ink">
                    {describeGoal(g)}
                    {scope && <span className="block truncate text-[12px] font-normal text-muted">{scope}</span>}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${describeGoal(g)}`}
                    onClick={() => setDrafts((d) => d.filter((_, j) => j !== i))}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[20px] text-muted hover:bg-surface"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        data-testid="save-goals"
        disabled={drafts.length === 0 || saving}
        onClick={async () => {
          await onSave(drafts);
          setDrafts([]);
        }}
        className="min-h-14 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white transition-colors hover:bg-[#E8623F] disabled:cursor-not-allowed disabled:border-primary-button-disabled-bg disabled:bg-primary-button-disabled-bg disabled:text-primary-button-disabled-text"
      >
        {saving ? "Saving…" : drafts.length === 0 ? "Add a goal to save" : `Save ${drafts.length} goal${drafts.length === 1 ? "" : "s"}`}
      </button>
    </section>
  );
}
