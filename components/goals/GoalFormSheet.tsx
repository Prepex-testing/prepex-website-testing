"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/components/planner/Sheet";
import type { Chapter } from "@/lib/api/dashboard";
import type { Goal, GoalType, NewGoal } from "@/lib/api/goals";
import type { GoalDefaults } from "@/lib/api/plannerV2";
import { listBacklogItems, type BacklogItem } from "@/lib/api/backlogItems";
import { formatDuration } from "@/lib/planner/format";
import {
  BACKLOG_ITEM_MINUTES,
  EXAM_PATTERNS,
  FALLBACK_DEFAULTS,
  MOCK_TYPES,
  PRACTICE_SOURCES,
  REVISION_TYPES,
  goalMinutes,
  mockMinutesFor,
  weekDays,
} from "@/lib/goals/v2";

/** What the sheet is adding. "SELF_STUDY" is a study-time goal on a chapter (stored as HOURS). */
export type FormKind = "LECTURES" | "SELF_STUDY" | "QUESTIONS" | "REVISIONS" | "BACKLOG" | "MOCKS";

export type FormSubject = { subjectId: number; name: string; chapters: Chapter[] };

type Props = {
  open: boolean;
  onClose: () => void;
  kind: FormKind;
  /** The subject card the form was opened from (null for mocks, which can cover every subject). */
  subject: FormSubject | null;
  /** Every subject, for a mock that is limited to one. */
  subjects: FormSubject[];
  weekStart: string;
  defaults: GoalDefaults | null;
  /** Editing a saved goal: the form opens on it, and a Remove button shows. */
  editing?: Goal | null;
  /** Backlog items already picked as goals this week (they cannot be picked twice). */
  takenBacklogIds: string[];
  busy: boolean;
  error: string | null;
  onSubmit: (goals: NewGoal[]) => void | Promise<void>;
  onDelete?: () => void;
};

const FIELD = "h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink";
const LABEL = "flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink";

const TITLES: Record<FormKind, string> = {
  LECTURES: "Add lectures",
  SELF_STUDY: "Add study time",
  QUESTIONS: "Add practice goal",
  REVISIONS: "Add revision",
  BACKLOG: "Clear backlog",
  MOCKS: "Add a mock or test",
};

const EDIT_TITLES: Record<FormKind, string> = {
  LECTURES: "Edit lectures",
  SELF_STUDY: "Edit study time",
  QUESTIONS: "Edit practice goal",
  REVISIONS: "Edit revision",
  BACKLOG: "Edit backlog goal",
  MOCKS: "Edit mock",
};

export function kindOfGoal(type: GoalType): FormKind {
  return type === "HOURS" ? "SELF_STUDY" : type;
}

function Stepper({ label, value, onChange, min, max, step, suffix, testId, hint }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step: number; suffix?: string; testId: string; hint?: string }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[14px] font-semibold text-body-text dark:text-ink" id={`${testId}-label`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} data-testid={`${testId}-minus`} onClick={() => onChange(clamp(value - step))} className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-surface text-[22px] font-bold text-ink">
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          aria-labelledby={`${testId}-label`}
          data-testid={testId}
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
          onBlur={() => onChange(clamp(Number.isFinite(value) ? value : min))}
          className={`${FIELD} text-center text-[20px] font-extrabold`}
        />
        <button type="button" aria-label={`Increase ${label.toLowerCase()}`} data-testid={`${testId}-plus`} onClick={() => onChange(clamp(value + step))} className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-surface text-[22px] font-bold text-ink">
          +
        </button>
        {suffix && <span className="w-10 shrink-0 text-[13px] text-muted">{suffix}</span>}
      </div>
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

/**
 * The mini form behind every "Add …" button on the weekly goals screen, and behind tapping a goal chip to edit it.
 * One form, six kinds: the fields change with the kind, the minutes-per-unit field is always there (the planner cannot
 * allocate time without it), and a live line says how many minutes the goal will take.
 */
export function GoalFormSheet({ open, onClose, kind, subject, subjects, weekStart, defaults, editing, takenBacklogIds, busy, error, onSubmit, onDelete }: Props) {
  const d = defaults ?? FALLBACK_DEFAULTS;
  const [chapterId, setChapterId] = useState<string>("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(1);
  const [unitMinutes, setUnitMinutes] = useState(60);
  const [studyMinutes, setStudyMinutes] = useState(120);
  const [source, setSource] = useState<string>("coaching_dpp");
  const [revisionType, setRevisionType] = useState<string>("notes");
  const [accuracy, setAccuracy] = useState<string>("");
  const [mockType, setMockType] = useState<string>("full_mock");
  const [pattern, setPattern] = useState<string>("jee_main");
  const [mockSubject, setMockSubject] = useState<string>("");
  const [day, setDay] = useState<string>("");
  const [start, setStart] = useState("14:00");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [items, setItems] = useState<BacklogItem[] | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  // Reset the fields every time the sheet opens, from the goal being edited or from the student's own defaults.
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- the form re-seeds each time it opens */
    setFormError(null);
    setPicked({});
    const g = editing;
    setChapterId(g?.chapterId ?? "");
    setTopic(g?.topic ?? "");
    if (g) {
      setCount(g.type === "HOURS" ? 1 : g.target);
      setUnitMinutes(g.minutesPerUnit ?? (kind === "REVISIONS" ? d.revisionMinutes.value : kind === "QUESTIONS" ? d.practiceSessionMinutes.value : d.lectureMinutes.value));
      setStudyMinutes(g.unit === "HOURS" ? g.target * 60 : g.target);
      setSource(g.practiceSource ?? "coaching_dpp");
      setRevisionType(g.revisionType ?? "notes");
      setAccuracy(g.targetAccuracy != null ? String(g.targetAccuracy) : "");
      setMockType(g.mockType ?? "full_mock");
      setPattern(g.examPattern ?? "jee_main");
      setMockSubject(g.subjectId ? String(g.subjectId) : "");
      setDay(g.fixedDate ?? "");
      setStart(g.fixedStartTime ?? "14:00");
    } else {
      setCount(kind === "QUESTIONS" ? 100 : kind === "REVISIONS" ? 2 : kind === "LECTURES" ? 4 : 1);
      setUnitMinutes(kind === "REVISIONS" ? d.revisionMinutes.value : kind === "QUESTIONS" ? d.practiceSessionMinutes.value : kind === "BACKLOG" ? BACKLOG_ITEM_MINUTES : d.lectureMinutes.value);
      setStudyMinutes(120);
      setSource("coaching_dpp");
      setRevisionType("notes");
      setAccuracy("");
      setMockType("full_mock");
      setPattern("jee_main");
      setMockSubject("");
      setDay(days[5]?.date ?? "");
      setStart("14:00");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seeded when it opens, not on every defaults refresh
  }, [open, editing?.id, kind]);

  // Re-seed the minutes once the student's real defaults arrive, if they have not touched the field.
  useEffect(() => {
    if (!open || editing) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- applying the late-arriving defaults
    setUnitMinutes(kind === "REVISIONS" ? d.revisionMinutes.value : kind === "QUESTIONS" ? d.practiceSessionMinutes.value : kind === "BACKLOG" ? BACKLOG_ITEM_MINUTES : d.lectureMinutes.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults]);

  useEffect(() => {
    if (!open || kind !== "BACKLOG" || !subject) return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading the backlog when the sheet opens
    setItems(null);
    setItemsError(null);
    listBacklogItems({ status: "open", subjectId: subject.subjectId, limit: 50 }).then(
      (res) => live && setItems(res.data.items),
      () => live && setItemsError("We couldn't load your backlog. Please try again."),
    );
    return () => {
      live = false;
    };
  }, [open, kind, subject]);

  const chapters = useMemo(() => [...(subject?.chapters ?? [])].sort((a, b) => a.sequenceOrder - b.sequenceOrder), [subject]);
  const available = (items ?? []).filter((i) => !takenBacklogIds.includes(i.id) || i.id === editing?.backlogItemId);
  const pickedItems = available.filter((i) => picked[i.id]);

  function build(): NewGoal[] | string {
    const base = { subjectId: kind === "MOCKS" ? (mockSubject ? Number(mockSubject) : null) : (subject?.subjectId ?? null), chapterId: chapterId || null, topic: topic.trim() || null };
    if (!Number.isFinite(count) || !Number.isFinite(unitMinutes)) return "Enter a number for each field.";
    switch (kind) {
      case "LECTURES":
        return [{ ...base, type: "LECTURES", unit: "COUNT", target: count, minutesPerUnit: unitMinutes }];
      case "SELF_STUDY":
        if (!Number.isFinite(studyMinutes)) return "Enter how long you want to study.";
        return [{ ...base, type: "HOURS", unit: "MINUTES", target: studyMinutes }];
      case "QUESTIONS":
        return [{ ...base, type: "QUESTIONS", unit: "COUNT", target: count, minutesPerUnit: unitMinutes, practiceSource: source }];
      case "REVISIONS": {
        const acc = accuracy === "" ? null : Number(accuracy);
        if (acc !== null && (!Number.isFinite(acc) || acc < 0 || acc > 100)) return "Target accuracy must be between 0 and 100.";
        return [{ ...base, type: "REVISIONS", unit: "COUNT", target: count, minutesPerUnit: unitMinutes, revisionType, targetAccuracy: acc }];
      }
      case "BACKLOG":
        if (editing) return [{ ...base, type: "BACKLOG", unit: "COUNT", target: 1, minutesPerUnit: unitMinutes, backlogItemId: editing.backlogItemId }];
        if (pickedItems.length === 0) return "Tick at least one backlog item.";
        return pickedItems.map((i) => ({
          type: "BACKLOG" as const,
          unit: "COUNT" as const,
          target: 1,
          subjectId: i.subjectId,
          chapterId: i.chapterId,
          topic: i.topic,
          minutesPerUnit: i.estimatedMinutes ?? unitMinutes,
          backlogItemId: i.id,
        }));
      case "MOCKS":
        if (!day) return "Pick the day for the mock.";
        if (!/^\d{2}:\d{2}$/.test(start)) return "Pick a start time.";
        return [{ ...base, type: "MOCKS", unit: "COUNT", target: 1, mockType, examPattern: pattern, fixedDate: day, fixedStartTime: start }];
    }
  }

  const previewGoals = (() => {
    const built = build();
    return typeof built === "string" ? [] : built;
  })();
  const previewMinutes = previewGoals.reduce((sum, g) => sum + goalMinutes(g, d), 0);

  function submit() {
    const built = build();
    if (typeof built === "string") {
      setFormError(built);
      return;
    }
    setFormError(null);
    void onSubmit(built);
  }

  const mockEnd = kind === "MOCKS" && /^\d{2}:\d{2}$/.test(start) ? (() => {
    const total = Number(start.slice(0, 2)) * 60 + Number(start.slice(3)) + mockMinutesFor({ mockType, examPattern: pattern });
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  })() : null;

  const chapterField = (
    <label className={LABEL}>
      Chapter {kind === "LECTURES" || kind === "SELF_STUDY" ? "" : "(optional)"}
      <select data-testid="gf-chapter" value={chapterId} onChange={(e) => setChapterId(e.target.value)} className={FIELD}>
        <option value="">Whole subject</option>
        {chapters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );

  const topicField = (
    <label className={LABEL}>
      Topic (optional)
      <input data-testid="gf-topic" type="text" value={topic} maxLength={150} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Projectile motion" className={FIELD} />
    </label>
  );

  const lectureHint = d.lectureMinutes.source === "history" ? `Based on your last week of focus sessions (median ${d.lectureMinutes.value} min). Change it if this lecture is different.` : "You can change this; most lectures are 40–90 minutes.";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? EDIT_TITLES[kind] : TITLES[kind]}
      description={subject && kind !== "MOCKS" ? subject.name : kind === "MOCKS" ? "A mock gets a fixed slot. The planner never moves it or makes it shorter." : undefined}
      data-testid="goal-form"
      footer={
        <div className="flex flex-col gap-2">
          {(formError || error) && (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">
              {formError ?? error}
            </p>
          )}
          <button type="button" data-testid="gf-submit" disabled={busy} onClick={submit} className="min-h-14 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F] disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Saving…" : editing ? "Save changes" : kind === "BACKLOG" && pickedItems.length > 1 ? `Add ${pickedItems.length} goals` : "Add goal"}
          </button>
          {editing && onDelete && (
            <button type="button" data-testid="gf-delete" disabled={busy} onClick={onDelete} className="min-h-12 rounded-lg px-4 text-[14px] font-semibold text-danger hover:bg-danger-bg disabled:opacity-60">
              Remove this goal
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        {(kind === "LECTURES" || kind === "SELF_STUDY" || kind === "QUESTIONS" || kind === "REVISIONS") && chapterField}
        {(kind === "LECTURES" || kind === "SELF_STUDY") && topicField}

        {kind === "LECTURES" && (
          <>
            <Stepper label="Number of lectures" value={count} onChange={setCount} min={1} max={100} step={1} testId="gf-count" />
            <Stepper label="Minutes per lecture" value={unitMinutes} onChange={setUnitMinutes} min={5} max={480} step={5} suffix="min" testId="gf-minutes" hint={lectureHint} />
          </>
        )}

        {kind === "SELF_STUDY" && (
          <Stepper label="Study time" value={studyMinutes} onChange={setStudyMinutes} min={30} max={6000} step={30} suffix="min" testId="gf-study" hint={`That is ${formatDuration(Number.isFinite(studyMinutes) ? studyMinutes : 0)} of reading or self-study this week.`} />
        )}

        {kind === "QUESTIONS" && (
          <>
            <Stepper label="Number of questions" value={count} onChange={setCount} min={5} max={2000} step={10} testId="gf-count" />
            <label className={LABEL}>
              Source
              <select data-testid="gf-source" value={source} onChange={(e) => setSource(e.target.value)} className={FIELD}>
                {PRACTICE_SOURCES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <Stepper label="Minutes per session" value={unitMinutes} onChange={setUnitMinutes} min={15} max={180} step={5} suffix="min" testId="gf-minutes" hint={d.practiceSessionMinutes.source === "history" ? `Based on your recent practice (median ${d.practiceSessionMinutes.value} min).` : "A practice session is usually about an hour."} />
          </>
        )}

        {kind === "REVISIONS" && (
          <>
            <Stepper label="Number of revisions" value={count} onChange={setCount} min={1} max={50} step={1} testId="gf-count" />
            <label className={LABEL}>
              Revision type
              <select data-testid="gf-revision-type" value={revisionType} onChange={(e) => setRevisionType(e.target.value)} className={FIELD}>
                {REVISION_TYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Target accuracy % (optional)
              <input data-testid="gf-accuracy" type="number" inputMode="numeric" min={0} max={100} value={accuracy} onChange={(e) => setAccuracy(e.target.value)} placeholder="e.g. 85" className={FIELD} />
            </label>
            <Stepper label="Minutes per slot" value={unitMinutes} onChange={setUnitMinutes} min={10} max={120} step={5} suffix="min" testId="gf-minutes" hint={d.revisionMinutes.source === "history" ? `Based on your recent revisions (median ${d.revisionMinutes.value} min).` : "A revision slot is usually about 30 minutes."} />
          </>
        )}

        {kind === "BACKLOG" && !editing && (
          <div className="flex flex-col gap-2" data-testid="gf-backlog">
            <p className="text-[14px] font-semibold text-body-text dark:text-ink">Tick the items you will clear this week</p>
            {itemsError && (
              <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">
                {itemsError}
              </p>
            )}
            {items === null && !itemsError && <p className="text-[13px] text-muted">Loading your backlog…</p>}
            {items !== null && available.length === 0 && <p className="rounded-xl bg-tint-strong px-3 py-3 text-[13px] text-muted dark:bg-[#FAF7F214]">Nothing open in your {subject?.name ?? "subject"} backlog. Nice.</p>}
            <ul className="flex flex-col gap-2">
              {available.map((i) => {
                const name = subject?.chapters.find((c) => c.id === i.chapterId)?.name ?? i.topic ?? "Backlog item";
                return (
                  <li key={i.id}>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-brand/15 bg-surface px-3 py-2">
                      <input type="checkbox" data-testid="gf-backlog-item" checked={!!picked[i.id]} onChange={(e) => setPicked((p) => ({ ...p, [i.id]: e.target.checked }))} className="size-5 shrink-0 accent-[var(--cta)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-ink">{name}</span>
                        <span className="block text-[12px] text-muted">
                          {i.ageDays}d old{i.isOverdue ? " · overdue" : ""} · about {i.estimatedMinutes ?? unitMinutes} min
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {kind === "BACKLOG" && editing && <Stepper label="Estimated minutes" value={unitMinutes} onChange={setUnitMinutes} min={5} max={480} step={5} suffix="min" testId="gf-minutes" />}

        {kind === "MOCKS" && (
          <>
            <label className={LABEL}>
              Test type
              <select data-testid="gf-mock-type" value={mockType} onChange={(e) => setMockType(e.target.value)} className={FIELD}>
                {MOCK_TYPES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Exam pattern
              <select data-testid="gf-pattern" value={pattern} onChange={(e) => setPattern(e.target.value)} className={FIELD}>
                {EXAM_PATTERNS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            {mockType !== "full_mock" && (
              <label className={LABEL}>
                Subject (optional)
                <select data-testid="gf-mock-subject" value={mockSubject} onChange={(e) => setMockSubject(e.target.value)} className={FIELD}>
                  <option value="">All subjects</option>
                  {subjects.map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className={LABEL}>
              Day
              <select data-testid="gf-day" value={day} onChange={(e) => setDay(e.target.value)} className={FIELD}>
                {days.map((x) => (
                  <option key={x.date} value={x.date}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Start time
              <input data-testid="gf-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className={FIELD} />
              {mockEnd && (
                <span className="text-[12px] font-normal text-muted">
                  Runs {formatDuration(mockMinutesFor({ mockType, examPattern: pattern }))}, until {mockEnd}. This slot is fixed.
                </span>
              )}
            </label>
          </>
        )}

        {previewGoals.length > 0 && (
          <p className="rounded-xl bg-tint-strong px-3 py-2.5 text-[13px] font-semibold text-ink dark:bg-[#FAF7F214]" data-testid="gf-preview">
            This takes about {formatDuration(previewMinutes)} of your week.
          </p>
        )}
      </div>
    </Sheet>
  );
}
