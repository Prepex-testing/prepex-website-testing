"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Sheet } from "@/components/planner/Sheet";
import { useSubjects } from "@/components/study/useSubjects";
import { ApiError } from "@/lib/api/http";
import { addPlanTask, getGoalDefaults, type GoalDefaults, type PlanTask, type TaskKind } from "@/lib/api/plannerV2";
import { ADD_KINDS, dateKey, dayTabLabel, formatClock, shiftDate, subjectStyle } from "@/lib/planner/format";
import { trackPlanner } from "@/lib/telemetry/planner";

type Props = {
  open: boolean;
  onClose: () => void;
  /** The day the plan screen is showing (YYYY-MM-DD); "Add to today" adds to this day. */
  date: string;
  onAdded: (task: PlanTask, warning: string | null) => void;
};

const STEP = 15;
const MIN = 5;
const MAX = 480;
const SLOTS = [
  { id: "next_free", label: "Next free slot" },
  { id: "now", label: "Right now" },
  { id: "specific", label: "Specific time" },
] as const;

/** The usual minutes for a kind when there is no history to learn from. */
export function defaultMinutes(kind: TaskKind, defaults: GoalDefaults | null): number {
  if (kind === "lecture") return defaults?.lectureMinutes.value ?? 60;
  if (kind === "practice") return defaults?.practiceSessionMinutes.value ?? 60;
  if (kind === "revision") return defaults?.revisionMinutes.value ?? 30;
  if (kind === "mock") return 180;
  if (kind === "backlog") return 45;
  return 30;
}

const FIELD = "h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-body-text outline-none focus:border-brand dark:text-ink";
const CHIP = "min-h-11 rounded-full border px-4 text-[14px] font-semibold transition-colors";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

/**
 * The quick-add sheet: type, subject, Add. "Next free slot" is the default, so a task is four taps from a blank screen.
 * A chip choice moves on to the next field by itself; Enter does too.
 */
export function AddTaskSheet({ open, onClose, date, onAdded }: Props) {
  const subjects = useSubjects();
  const [kind, setKind] = useState<TaskKind | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [chapterQuery, setChapterQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [typedMinutes, setMinutes] = useState(60);
  const [minutesTouched, setMinutesTouched] = useState(false);
  const [slot, setSlot] = useState<(typeof SLOTS)[number]["id"]>("next_free");
  const [time, setTime] = useState("18:00");
  const [defaults, setDefaults] = useState<GoalDefaults | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderWarning, setOrderWarning] = useState<string | null>(null);
  const [dayMenu, setDayMenu] = useState(false);
  const subjectRow = useRef<HTMLDivElement>(null);
  const chapterInput = useRef<HTMLInputElement>(null);

  const today = dateKey();

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a fresh form each time the sheet opens
    setKind(null);
    setSubjectId(null);
    setChapterId(null);
    setChapterQuery("");
    setTopic("");
    setMinutes(60);
    setMinutesTouched(false);
    setSlot("next_free");
    setError(null);
    setOrderWarning(null);
    setDayMenu(false);
  }, [open]);

  // The student's own pace for this subject (median of their recent sessions) sets the starting minutes.
  useEffect(() => {
    if (!open || subjectId === null) return;
    let alive = true;
    getGoalDefaults(subjectId)
      .then((res) => alive && setDefaults(res.data))
      .catch(() => alive && setDefaults(null));
    return () => {
      alive = false;
    };
  }, [open, subjectId]);

  // Until the student changes it, the minutes follow the kind and their own pace.
  const minutes = kind && !minutesTouched ? defaultMinutes(kind, defaults) : typedMinutes;

  const chapters = useMemo(() => subjects.subjects.find((s) => s.subjectId === subjectId)?.chapters ?? [], [subjects.subjects, subjectId]);
  const matches = useMemo(() => {
    const q = chapterQuery.trim().toLowerCase();
    if (chapterId || q.length === 0) return [];
    return chapters.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [chapters, chapterQuery, chapterId]);

  const canAdd = kind !== null && subjectId !== null && !busy;
  const days = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => shiftDate(today, n));

  async function add(targetDate: string, override = false) {
    if (kind === null || subjectId === null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await addPlanTask({
        kind,
        subjectId,
        minutes,
        slot,
        date: targetDate,
        ...(chapterId ? { chapterId } : {}),
        ...(topic.trim() ? { topic: topic.trim() } : {}),
        ...(slot === "specific" ? { startMin: toMinutes(time) } : {}),
        ...(override ? { override: true } : {}),
      });
      trackPlanner("planner_add_task", { kind, slot, tomorrow: targetDate !== today, minutes, has_chapter: Boolean(chapterId) });
      onAdded(res.data.task, res.data.warning);
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't add that. Please try again.";
      if (err instanceof ApiError && err.status === 409 && /Add it anyway\?/.test(message)) setOrderWarning(message.replace(/\s*Add it anyway\?$/, ""));
      else setError(message);
    } finally {
      setBusy(false);
    }
  }

  const primaryLabel = date === today ? "Add to today" : `Add to ${dayTabLabel(date, today).toLowerCase()}`;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a task"
      description="Pick a type and a subject. Prepex finds the time."
      data-testid="add-task-sheet"
      footer={
        <div className="flex flex-col gap-2">
          {orderWarning && (
            <div role="alert" data-testid="order-warning" className="rounded-lg bg-warning-bg px-3 py-2 text-[13px] font-semibold text-ink">
              {orderWarning}
              <button type="button" data-testid="add-anyway" disabled={busy} onClick={() => void add(date, true)} className="ml-2 underline">
                Add anyway
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">
              {error}
            </p>
          )}
          <div className="relative flex">
            <button type="button" data-testid="add-submit" disabled={!canAdd} onClick={() => void add(date)} className="min-h-14 flex-1 rounded-l-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F] disabled:border-primary-button-disabled-bg disabled:bg-primary-button-disabled-bg disabled:text-primary-button-disabled-text">
              {busy ? "Adding…" : primaryLabel}
            </button>
            <button type="button" aria-label="Choose another day" aria-haspopup="menu" aria-expanded={dayMenu} data-testid="add-day-menu" disabled={!canAdd} onClick={() => setDayMenu((v) => !v)} className="flex min-h-14 w-14 items-center justify-center rounded-r-lg border border-l-white/30 border-primary-button-border bg-cta text-white hover:bg-[#E8623F] disabled:border-primary-button-disabled-bg disabled:bg-primary-button-disabled-bg disabled:text-primary-button-disabled-text">
              <ChevronDown className="size-5" aria-hidden />
            </button>
            {dayMenu && (
              <ul role="menu" className="absolute bottom-16 right-0 z-10 w-56 overflow-hidden rounded-xl border border-brand/10 bg-surface py-1 shadow-modal">
                {days.map((d) => (
                  <li key={d} role="none">
                    <button type="button" role="menuitem" onClick={() => void add(d)} className="flex min-h-11 w-full items-center px-4 text-left text-[14px] font-semibold text-ink hover:bg-tint-strong">
                      Add to {dayTabLabel(d, today).toLowerCase()}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      }
    >
      <form
        className="flex flex-col gap-5 pt-1"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (canAdd) void add(date);
        }}
      >
        <fieldset>
          <legend className="mb-2 text-[14px] font-semibold text-body-text dark:text-ink">What are you adding?</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Task type">
            {ADD_KINDS.map((k, i) => (
              <button
                key={k.kind}
                type="button"
                role="radio"
                aria-checked={kind === k.kind}
                data-autofocus={i === 0 ? "" : undefined}
                data-testid={`add-kind-${k.kind}`}
                onClick={() => {
                  setKind(k.kind);
                  setOrderWarning(null);
                  subjectRow.current?.querySelector<HTMLElement>("button")?.focus();
                }}
                className={`${CHIP} ${kind === k.kind ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[14px] font-semibold text-body-text dark:text-ink">Subject</legend>
          <div ref={subjectRow} className="flex flex-wrap gap-2" role="radiogroup" aria-label="Subject">
            {subjects.subjects.map((s) => {
              const key = s.subjectName.toLowerCase().startsWith("math") ? "maths" : s.subjectName.toLowerCase().split(/\s/)[0];
              const style = subjectStyle(key);
              return (
                <button
                  key={s.subjectId}
                  type="button"
                  role="radio"
                  aria-checked={subjectId === s.subjectId}
                  data-testid={`add-subject-${s.subjectId}`}
                  onClick={() => {
                    setSubjectId(s.subjectId);
                    setChapterId(null);
                    setChapterQuery("");
                    setOrderWarning(null);
                    chapterInput.current?.focus();
                  }}
                  className={`${CHIP} inline-flex items-center gap-2 ${subjectId === s.subjectId ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}
                >
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: style.color }} />
                  {s.subjectName}
                </button>
              );
            })}
            {subjects.status === "loading" && <span className="text-[13px] text-muted">Loading your subjects…</span>}
            {subjects.status === "error" && <span className="text-[13px] text-danger">Couldn&apos;t load your subjects.</span>}
          </div>
        </fieldset>

        <div className="relative">
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink">
            Chapter <span className="font-normal text-muted">(optional)</span>
            <input
              ref={chapterInput}
              role="combobox"
              aria-expanded={matches.length > 0}
              aria-controls="add-chapter-list"
              aria-autocomplete="list"
              data-testid="add-chapter"
              disabled={subjectId === null}
              className={`${FIELD} disabled:opacity-60`}
              placeholder={subjectId === null ? "Pick a subject first" : "Type to search chapters"}
              value={chapterQuery}
              onChange={(e) => {
                setChapterQuery(e.target.value);
                setChapterId(null);
              }}
            />
          </label>
          {matches.length > 0 && (
            <ul id="add-chapter-list" role="listbox" className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-xl border border-brand/10 bg-surface shadow-modal">
              {matches.map((c) => (
                <li key={c.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    data-testid="add-chapter-option"
                    onClick={() => {
                      setChapterId(c.id);
                      setChapterQuery(c.name);
                    }}
                    className="flex min-h-11 w-full items-center px-4 text-left text-[14px] text-ink hover:bg-tint-strong"
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink">
          Topic <span className="font-normal text-muted">(optional)</span>
          <input className={FIELD} value={topic} maxLength={200} onChange={(e) => setTopic(e.target.value)} placeholder="For example: projectile motion" />
        </label>

        <div className="flex flex-col gap-1.5">
          <span id="add-minutes-label" className="text-[14px] font-semibold text-body-text dark:text-ink">
            Minutes
          </span>
          <div className="flex items-center gap-2" role="group" aria-labelledby="add-minutes-label">
            <button type="button" aria-label="15 minutes less" data-testid="minutes-down" onClick={() => { setMinutesTouched(true); setMinutes(Math.max(MIN, minutes - STEP)); }} className="flex size-12 items-center justify-center rounded-xl border border-brand/15 bg-surface text-xl font-bold text-ink">
              −15
            </button>
            <output data-testid="minutes-value" className="flex h-12 flex-1 items-center justify-center rounded-xl bg-tint-strong text-[18px] font-extrabold text-ink dark:bg-[#FAF7F214]">
              {minutes} min
            </output>
            <button type="button" aria-label="15 minutes more" data-testid="minutes-up" onClick={() => { setMinutesTouched(true); setMinutes(Math.min(MAX, minutes + STEP)); }} className="flex size-12 items-center justify-center rounded-xl border border-brand/15 bg-surface text-xl font-bold text-ink">
              +15
            </button>
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-[14px] font-semibold text-body-text dark:text-ink">When?</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Time slot">
            {SLOTS.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={slot === s.id} data-testid={`slot-${s.id}`} onClick={() => setSlot(s.id)} className={`${CHIP} ${slot === s.id ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"}`}>
                {s.label}
              </button>
            ))}
          </div>
          {slot === "specific" && (
            <label className="mt-3 flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink">
              Start time
              <input type="time" step={300} className={FIELD} value={time} onChange={(e) => setTime(e.target.value)} data-testid="slot-time" />
              <span className="text-[12px] font-normal text-muted">{formatClock(toMinutes(time))}</span>
            </label>
          )}
        </fieldset>
      </form>
    </Sheet>
  );
}
