"use client";

import { useEffect, useState } from "react";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import type { Goal, GoalType, GoalUnit, NewGoal } from "@/lib/api/goals";
import type { SubjectChapters } from "@/lib/api/dashboard";
import { listBacklogItems, type BacklogItem } from "@/lib/api/backlogItems";
import type { GoalDefaults } from "@/lib/api/plannerV2";
import { EXAM_PATTERNS, MOCK_TYPES, defaultUnitMinutes, goalMinutes, weekDays } from "@/lib/goals/v2";
import { GOAL_TYPES, TARGET_RULES, clampTarget, defaultUnit, describeGoal, scopeText } from "@/lib/goals/format";
import { formatDuration } from "@/lib/planner/format";

type Props = {
  subjects: SubjectChapters[];
  /** Goals already set this week, used to stop exact duplicates. */
  existing: Goal[];
  saving: boolean;
  error: string | null;
  onSave: (goals: NewGoal[]) => void | Promise<void>;
  onCancel: () => void;
  /** A goal to start from (a diagnosis chip, or a subject's empty tile): the form opens on it. */
  initial?: NewGoal;
  /** True when `initial` is a finished goal that should already sit in the "Ready to save" list (a diagnosis chip). */
  initialIsDraft?: boolean;
  /** The student's own typical minutes (median of recent sessions); the minutes field starts from these. */
  defaults?: GoalDefaults | null;
  /** The Monday of the week being planned, for the day picker on a fixed mock. */
  weekStart?: string;
};

const FIELD =
  "h-11 rounded-[10px] border border-border-subtle bg-surface-elevated-2 px-3 text-[15px] text-ink outline-none focus:border-border-strong disabled:opacity-50";
const LABEL = "flex flex-col gap-1.5 text-[13px] font-medium text-body-text dark:text-ink";

function sameGoal(a: NewGoal, b: Pick<NewGoal, "type" | "unit" | "subjectId" | "chapterId" | "topic" | "backlogItemId" | "fixedDate" | "fixedStartTime">): boolean {
  return (
    a.type === b.type &&
    a.unit === b.unit &&
    (a.subjectId ?? null) === (b.subjectId ?? null) &&
    (a.chapterId ?? null) === (b.chapterId ?? null) &&
    (a.topic ?? null) === (b.topic ?? null) &&
    (a.backlogItemId ?? null) === (b.backlogItemId ?? null) &&
    (a.fixedDate ?? null) === (b.fixedDate ?? null) &&
    (a.fixedStartTime ?? null) === (b.fixedStartTime ?? null)
  );
}

/** The goal types the form offers: the five from before, plus clearing backlog items. */
const COMPOSER_TYPES: { type: GoalType; label: string }[] = [...GOAL_TYPES.map((t) => ({ type: t.type, label: t.label })), { type: "BACKLOG", label: "Backlog" }];

/** Types that say how long one unit takes. The daily plan needs it to give the goal honest time. */
const TIMED: Partial<Record<GoalType, string>> = {
  LECTURES: "Minutes per lecture",
  QUESTIONS: "Minutes per practice session",
  REVISIONS: "Minutes per revision",
};

type Built = { goals: NewGoal[] } | { error: string };

/**
 * The add-a-goal panel: a compact card (never wider than 640px) that builds one goal or a batch. Pick a type, narrow
 * it to a subject and chapter, set how many and how long, then Save. "Add another" queues the goal and keeps the form
 * open for the next. Save is the screen's one coral button while the panel is open.
 */
export function AddGoalPanel({ subjects, existing, saving, error, onSave, onCancel, initial, initialIsDraft = false, defaults = null, weekStart }: Props) {
  const [type, setType] = useState<GoalType>(initial?.type ?? "QUESTIONS");
  const [unit, setUnit] = useState<GoalUnit>(initial?.unit ?? "COUNT");
  const [target, setTarget] = useState<number>(initial?.target ?? TARGET_RULES[initial?.type ?? "QUESTIONS"].start);
  const [subjectId, setSubjectId] = useState<number | null>(initial?.subjectId ?? null);
  const [chapterId, setChapterId] = useState<string | null>(initial?.chapterId ?? null);
  const [drafts, setDrafts] = useState<NewGoal[]>(initial && initialIsDraft ? [initial] : []);
  const [formError, setFormError] = useState<string | null>(null);
  const [unitMinutes, setUnitMinutes] = useState<number>(defaultUnitMinutes(initial?.type ?? "QUESTIONS", defaults ?? undefined));
  const [items, setItems] = useState<BacklogItem[] | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [mockType, setMockType] = useState("full_mock");
  const [pattern, setPattern] = useState("jee_main");
  const [day, setDay] = useState("");
  const [start, setStart] = useState("14:00");

  const subjectNames = new Map(subjects.map((s) => [s.subjectId, s.subjectName]));
  const chapterNames = new Map(subjects.flatMap((s) => s.chapters.map((c) => [c.id, c.name] as const)));
  const chapters = subjects.find((s) => s.subjectId === subjectId)?.chapters ?? [];
  const rules = TARGET_RULES[type];
  const step = type === "HOURS" && unit === "MINUTES" ? 30 : rules.step;
  const timedLabel = TIMED[type];
  const singular = timedLabel ? timedLabel.replace("Minutes per ", "") : "";
  const days = weekStart ? weekDays(weekStart) : [];

  // The student's open backlog items, for the Backlog type.
  useEffect(() => {
    if (type !== "BACKLOG") return;
    let live = true;
    listBacklogItems({ status: "open", ...(subjectId !== null ? { subjectId } : {}), limit: 50 }).then(
      (res) => live && setItems(res.data.items),
      () => live && setItems([]),
    );
    return () => {
      live = false;
    };
  }, [type, subjectId]);

  function chooseType(next: GoalType) {
    setType(next);
    setUnit(defaultUnit(next));
    setTarget(TARGET_RULES[next].start);
    setUnitMinutes(defaultUnitMinutes(next, defaults ?? undefined));
    setPicked({});
    setItems(null);
    setFormError(null);
  }

  function chooseSubject(next: number | null) {
    setSubjectId(next);
    setChapterId(null);
  }

  const minutesNow = Number.isFinite(unitMinutes) ? unitMinutes : 0;

  /** The goal(s) the form describes right now, or why it can't be built. Duplicates of saved goals are refused. */
  function build(): Built {
    const minutes = Math.max(5, Math.min(480, Math.round(Number.isFinite(unitMinutes) ? unitMinutes : defaultUnitMinutes(type, defaults ?? undefined))));
    let goals: NewGoal[];
    if (type === "BACKLOG") {
      const chosen = (items ?? []).filter((i) => picked[i.id]);
      if (chosen.length === 0) return { error: "Tick at least one backlog item." };
      goals = chosen.map((i) => ({ type: "BACKLOG", unit: "COUNT", target: 1, subjectId: i.subjectId, chapterId: i.chapterId, topic: i.topic, minutesPerUnit: i.estimatedMinutes ?? minutes, backlogItemId: i.id }));
    } else if (type === "MOCKS") {
      const fixed = day !== "";
      if (fixed && !/^\d{2}:\d{2}$/.test(start)) return { error: "Pick a start time for the mock." };
      goals = [{ type, unit, target: fixed ? 1 : clampTarget(type, unit, target), subjectId: null, chapterId: null, mockType, examPattern: pattern, ...(fixed ? { fixedDate: day, fixedStartTime: start } : {}) }];
    } else {
      goals = [{ type, unit, target: clampTarget(type, unit, target), subjectId, chapterId, ...(timedLabel ? { minutesPerUnit: minutes } : {}) }];
    }
    if (goals.some((goal) => existing.some((g) => sameGoal(goal, g)))) return { error: "You already have that goal this week." };
    return { goals };
  }

  function addAnother() {
    const built = build();
    if ("error" in built) {
      setFormError(built.error);
      return;
    }
    if (built.goals.some((goal) => drafts.some((g) => sameGoal(goal, g)))) {
      setFormError("You already have that goal this week.");
      return;
    }
    setFormError(null);
    setDrafts((d) => [...d, ...built.goals]);
    setPicked({});
  }

  async function save() {
    const built = build();
    const fresh = "goals" in built ? built.goals.filter((goal) => !drafts.some((g) => sameGoal(goal, g))) : [];
    const toSave = [...drafts, ...fresh];
    if (toSave.length === 0) {
      setFormError("error" in built ? built.error : "Add a goal to save.");
      return;
    }
    setFormError(null);
    await onSave(toSave);
    setDrafts([]);
  }

  const total = timedLabel && minutesNow > 0 ? goalMinutes({ type, unit, target: clampTarget(type, unit, target), minutesPerUnit: minutesNow }, defaults ?? undefined) : null;

  return (
    <section aria-label="Add goals" className="mx-auto flex w-full max-w-[640px] flex-col gap-4 rounded-2xl border border-border-strong bg-surface-elevated p-6" data-testid="goal-composer">
      <h2 className="text-[18px] font-bold text-ink">Add a goal</h2>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Goal type">
        {COMPOSER_TYPES.map((t) => {
          const selected = type === t.type;
          return (
            <button
              key={t.type}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`goal-type-${t.type}`}
              onClick={() => chooseType(t.type)}
              className={`h-8 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                selected ? "border-saffron bg-surface-elevated-2 text-saffron" : "border-border-strong bg-transparent text-ink hover:bg-surface-elevated-2"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {type !== "MOCKS" && (
        <div className={`grid grid-cols-1 gap-3 ${type === "BACKLOG" ? "" : "sm:grid-cols-2"}`}>
          <label className={LABEL}>
            Subject
            <select data-testid="goal-subject" value={subjectId ?? ""} onChange={(e) => chooseSubject(e.target.value ? Number(e.target.value) : null)} className={`${FIELD} w-full`}>
              <option value="">Any subject</option>
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectName}
                </option>
              ))}
            </select>
          </label>
          {type !== "BACKLOG" && (
            <label className={LABEL}>
              Chapter (optional)
              <select data-testid="goal-chapter" value={chapterId ?? ""} disabled={subjectId === null} onChange={(e) => setChapterId(e.target.value || null)} className={`${FIELD} w-full`}>
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
          )}
        </div>
      )}

      {type === "BACKLOG" ? (
        <div className="flex flex-col gap-2" data-testid="goal-backlog">
          <span className="text-[13px] font-medium text-body-text dark:text-ink">Tick the items you will clear this week</span>
          {items === null && <p className="text-[13px] text-muted">Loading your backlog…</p>}
          {items !== null && items.length === 0 && <p className="rounded-[10px] bg-surface-elevated-2 px-3 py-3 text-[13px] text-muted">Nothing open in your backlog.</p>}
          <ul className="flex flex-col gap-2">
            {(items ?? [])
              .filter((i) => !existing.some((g) => g.backlogItemId === i.id) && !drafts.some((g) => g.backlogItemId === i.id))
              .map((i) => (
                <li key={i.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border border-border-subtle bg-surface-elevated-2 px-3 py-2">
                    <input type="checkbox" data-testid="goal-backlog-item" checked={!!picked[i.id]} onChange={(e) => setPicked((p) => ({ ...p, [i.id]: e.target.checked }))} className="size-5 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink">{chapterNames.get(i.chapterId ?? "") ?? i.topic ?? "Backlog item"}</span>
                      <span className="block text-[12px] text-muted">
                        {i.ageDays} days old · about {i.estimatedMinutes ?? Math.round(minutesNow)} min
                      </span>
                    </span>
                  </label>
                </li>
              ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-body-text dark:text-ink">How many?</span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex w-[220px] items-center gap-2">
              <button
                type="button"
                aria-label="Decrease target"
                data-testid="goal-target-minus"
                onClick={() => setTarget((t) => clampTarget(type, unit, t - step))}
                className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border-strong bg-transparent text-[20px] font-semibold text-ink hover:bg-surface-elevated-2"
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
                className={`${FIELD} w-[100px] px-2 text-center text-[18px] font-bold`}
              />
              <button
                type="button"
                aria-label="Increase target"
                data-testid="goal-target-plus"
                onClick={() => setTarget((t) => clampTarget(type, unit, t + step))}
                className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border-strong bg-transparent text-[20px] font-semibold text-ink hover:bg-surface-elevated-2"
              >
                +
              </button>
            </div>
            {type === "HOURS" && (
              <div className="flex shrink-0 overflow-hidden rounded-[10px] border border-border-strong" role="radiogroup" aria-label="Unit">
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
                    className={`h-11 px-3 text-[13px] font-medium ${unit === u ? "bg-surface-elevated-2 text-saffron" : "bg-transparent text-ink"}`}
                  >
                    {u === "HOURS" ? "hours" : "min"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-[12px] text-muted">
            {type === "LECTURES" ? "You'll tick lectures off yourself. Prepex can't see what you watch." : "Prepex counts this automatically from what you do in the app."}
          </p>
        </div>
      )}

      {timedLabel && (
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-3 text-[14px] font-medium text-body-text dark:text-ink">
            {timedLabel}:
            <input
              type="number"
              inputMode="numeric"
              data-testid="goal-minutes"
              aria-label={timedLabel}
              min={5}
              max={480}
              step={5}
              value={Number.isFinite(unitMinutes) ? unitMinutes : ""}
              onChange={(e) => setUnitMinutes(e.target.value === "" ? Number.NaN : Number(e.target.value))}
              onBlur={() => setUnitMinutes((m) => (Number.isFinite(m) ? Math.min(480, Math.max(5, Math.round(m))) : defaultUnitMinutes(type, defaults ?? undefined)))}
              className={`${FIELD} w-[64px] px-2 text-center`}
            />
          </label>
          <span className="text-[12px] text-muted" data-testid="goal-minutes-help">
            {total !== null ? `${formatDuration(total)} of your week. ` : ""}
            {type === "LECTURES"
              ? defaults?.lectureMinutes.source === "history"
                ? "Based on your last week of focus sessions."
                : "Most lectures are 40–90 minutes."
              : `The daily plan uses this to size each ${singular}.`}
          </span>
        </div>
      )}

      {type === "MOCKS" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="goal-mock">
          <label className={LABEL}>
            Test type
            <select data-testid="goal-mock-type" value={mockType} onChange={(e) => setMockType(e.target.value)} className={`${FIELD} w-full`}>
              {MOCK_TYPES.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className={LABEL}>
            Exam pattern
            <select data-testid="goal-mock-pattern" value={pattern} onChange={(e) => setPattern(e.target.value)} className={`${FIELD} w-full`}>
              {EXAM_PATTERNS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {days.length > 0 && (
            <>
              <label className={LABEL}>
                Day (optional)
                <select data-testid="goal-mock-day" value={day} onChange={(e) => setDay(e.target.value)} className={`${FIELD} w-full`}>
                  <option value="">Any day</option>
                  {days.map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={LABEL}>
                Start time
                <input data-testid="goal-mock-start" type="time" value={start} disabled={day === ""} onChange={(e) => setStart(e.target.value)} className={`${FIELD} w-full`} />
              </label>
            </>
          )}
          <p className="text-[12px] text-muted sm:col-span-2">{day ? "This mock gets a fixed slot. The planner never moves it or makes it shorter." : "Pick a day and time to give the mock a fixed slot, or leave it and Prepex finds one."}</p>
        </div>
      )}

      {formError && (
        <p role="alert" className="rounded-[10px] bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {formError}
        </p>
      )}

      {drafts.length > 0 && (
        <div className="flex flex-col gap-2" data-testid="goal-drafts">
          <p className="text-[13px] font-semibold text-ink">Ready to save ({drafts.length})</p>
          <ul className="flex flex-col gap-2">
            {drafts.map((g, i) => {
              const scope = scopeText({ subjectId: g.subjectId ?? null, chapterId: g.chapterId ?? null, topic: g.topic ?? null }, subjectNames, chapterNames);
              const minutes = Math.round(goalMinutes(g, defaults ?? undefined));
              return (
                <li key={`${g.type}-${i}`} className="flex items-center justify-between gap-3 rounded-[10px] border border-border-subtle bg-surface-elevated-2 px-3 py-2">
                  <span className="min-w-0 text-[14px] font-semibold text-ink">
                    {describeGoal(g)}
                    <span className="block truncate text-[12px] font-normal text-muted">
                      {scope ? `${scope} · ` : ""}
                      {minutes > 0 ? `about ${formatDuration(minutes)}` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${describeGoal(g)}`}
                    onClick={() => setDrafts((d) => d.filter((_, j) => j !== i))}
                    className="flex size-11 shrink-0 items-center justify-center rounded-[10px] text-[20px] text-muted hover:bg-surface-elevated"
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
        <p role="alert" className="rounded-[10px] bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <GhostButton data-testid="cancel-goal" className="w-full sm:w-auto" disabled={saving} onClick={onCancel}>
          Cancel
        </GhostButton>
        <GhostButton data-testid="add-goal" className="w-full sm:w-auto" disabled={saving} onClick={addAnother}>
          + Add another
        </GhostButton>
        <CoralButton data-testid="save-goals" className="w-full sm:w-auto" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save goal"}
        </CoralButton>
      </div>
    </section>
  );
}
