"use client";

import { useState } from "react";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { StartFocusInput } from "@/lib/api/focus";
import { ModeTabs } from "@/components/focus/ModeTabs";
import { AppBlockIndicator } from "@/components/focus/AppBlockIndicator";
import { SoundPicker } from "@/components/focus/SoundPicker";
import { FIELD, LABEL, SubjectChapterFields } from "@/components/study/SubjectChapterFields";
import { readBlockedApps, storeBlockedApps, type BlockableAppId } from "@/lib/focus/appBlock";
import { TASK_TYPES, TASK_TYPE_LABELS, type FocusMode, type ResolvedFocusIntent, type TaskType } from "@/lib/focus/intent";
import { clampPomodoro, pomodoroForTarget, pomodoroPlannedMinutes, type PomodoroConfig } from "@/lib/focus/pomodoro";
import { readStoredSound, storeSound, type SoundId } from "@/lib/focus/soundscape";
import { PLAN_PRESETS_MINUTES, clampPlannedMinutes } from "@/lib/study/timer";

/** What the Start press hands back besides the session request: the sound and the block list for this session. */
export type StartExtras = { sound: SoundId; blockedApps: BlockableAppId[] };

type Props = {
  subjects: SubjectChapters[];
  /** Everything the timer opened with, already resolved (from the task, goal, backlog item…). Every field stays editable. */
  initial: ResolvedFocusIntent;
  busy: boolean;
  error: string | null;
  onStart: (input: StartFocusInput, extras: StartExtras) => void;
};

/** Stopwatch has no length; the server just needs a ceiling to cap a forgotten timer against. */
const STOPWATCH_CEILING_MINUTES = 240;

const STEPPER = "h-11 w-full rounded-xl border border-input-border bg-surface px-2 text-center text-[16px] text-body-text outline-none focus:border-brand dark:text-ink";

/** What are you working on, and for how long? Then the big Start button. */
export function FocusSetup({ subjects, initial, busy, error, onStart }: Props) {
  const [subjectId, setSubjectId] = useState<number | null>(initial.subjectId);
  const [chapterId, setChapterId] = useState<string | null>(initial.chapterId);
  const [topic, setTopic] = useState(initial.topic);
  const [taskType, setTaskType] = useState<TaskType>(initial.taskType);
  const [mode, setMode] = useState<FocusMode>(initial.mode);
  const [minutes, setMinutes] = useState(initial.targetMinutes);
  const [pomodoro, setPomodoro] = useState<PomodoroConfig>(() => pomodoroForTarget(initial.targetMinutes));
  const [deep, setDeep] = useState(false);
  const [sound, setSound] = useState<SoundId>(() => readStoredSound());
  const [blocked, setBlocked] = useState<BlockableAppId[]>(() => readBlockedApps());

  const canStart = subjectId !== null && !busy;

  const planned = mode === "pomodoro" ? pomodoroPlannedMinutes(pomodoro) : mode === "stopwatch" ? STOPWATCH_CEILING_MINUTES : clampPlannedMinutes(minutes);

  const changeMode = (next: FocusMode) => {
    setMode(next);
    // Switching to Pomodoro fits the rhythm to the length already chosen instead of throwing it away.
    if (next === "pomodoro") setPomodoro((p) => clampPomodoro({ ...p, cycles: Math.max(1, Math.round(clampPlannedMinutes(minutes) / p.studyMinutes)) }));
  };

  const pickLength = (m: number) => {
    setMinutes(m);
    if (mode === "pomodoro") setPomodoro((p) => clampPomodoro({ ...p, cycles: Math.max(1, Math.round(m / p.studyMinutes)) }));
  };

  const setPom = (patch: Partial<PomodoroConfig>) => setPomodoro((p) => clampPomodoro({ ...p, ...patch }));

  const startLabel = busy ? "Starting…" : subjectId === null ? "Choose a subject to start" : "Start focus";

  return (
    <form
      noValidate
      id="focus-setup-form"
      className="flex flex-col gap-5"
      data-testid="focus-setup"
      onSubmit={(e) => {
        e.preventDefault();
        if (subjectId === null) return;
        storeSound(sound);
        storeBlockedApps(blocked);
        onStart(
          {
            subjectId,
            chapterId,
            topic: topic.trim() || null,
            plannedMinutes: planned,
            deepFocusMode: deep,
            originSource: initial.originSource,
            originId: initial.originId,
            taskType,
            mode,
            pomodoro: mode === "pomodoro" ? pomodoro : null,
          },
          { sound, blockedApps: blocked },
        );
      }}
    >
      {initial.notice && (
        <p role="note" data-testid="focus-notice" className="rounded-xl bg-tint-strong px-3 py-2.5 text-[13px] font-semibold text-ink dark:bg-[#FAF7F214]">
          {initial.notice}
        </p>
      )}

      {initial.originSource === "standalone" && (
        <p className="text-[13px] text-muted" data-testid="standalone-hint">
          Starting a focus session from scratch. Fill in what you&apos;re working on.
        </p>
      )}

      <section aria-label="What are you working on" className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-4">
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
          <input id="focus-topic" className={FIELD} maxLength={200} placeholder="e.g. Projectile motion" value={topic} disabled={busy} onChange={(e) => setTopic(e.target.value)} />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">What kind of session?</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Session type">
            {TASK_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={taskType === t}
                data-testid={`type-${t}`}
                disabled={busy}
                onClick={() => setTaskType(t)}
                className={`min-h-11 rounded-full border px-4 text-[14px] font-bold transition-colors ${
                  taskType === t ? "border-[1.5px] border-brand bg-tint-strong text-ink dark:border-[#FAF7F2]" : "border-brand/15 bg-surface text-body-text dark:text-ink"
                }`}
              >
                {TASK_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <section aria-label="How to time it" className="flex flex-col gap-4 rounded-2xl border border-brand/10 bg-surface p-4">
        <ModeTabs value={mode} onChange={changeMode} disabled={busy} />

        {mode !== "stopwatch" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">{mode === "pomodoro" ? "About how long?" : "How long?"}</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Session length">
              {PLAN_PRESETS_MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={minutes === m}
                  data-testid={`preset-${m}`}
                  disabled={busy}
                  onClick={() => pickLength(m)}
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
                  onBlur={() => pickLength(clampPlannedMinutes(minutes))}
                />
              </label>
            </div>
          </fieldset>
        )}

        {mode === "pomodoro" && (
          <fieldset className="flex flex-col gap-2" data-testid="pomodoro-settings">
            <legend className="mb-1 text-[14px] font-semibold text-body-text dark:text-ink">Pomodoro rhythm</legend>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
                Study (min)
                <input type="number" inputMode="numeric" min={1} max={180} data-testid="pomodoro-study" className={STEPPER} value={pomodoro.studyMinutes} disabled={busy} onChange={(e) => setPom({ studyMinutes: Number(e.target.value) })} />
              </label>
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
                Break (min)
                <input type="number" inputMode="numeric" min={1} max={60} data-testid="pomodoro-break" className={STEPPER} value={pomodoro.breakMinutes} disabled={busy} onChange={(e) => setPom({ breakMinutes: Number(e.target.value) })} />
              </label>
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
                Rounds
                <input type="number" inputMode="numeric" min={1} max={12} data-testid="pomodoro-cycles" className={STEPPER} value={pomodoro.cycles} disabled={busy} onChange={(e) => setPom({ cycles: Number(e.target.value) })} />
              </label>
            </div>
            <p className="text-[12px] text-muted" data-testid="pomodoro-total">
              {pomodoro.cycles} × {pomodoro.studyMinutes} min of study, with {pomodoro.breakMinutes}-minute breaks. {planned} min of focus in total. Breaks are not counted as study time.
            </p>
          </fieldset>
        )}

        {mode === "stopwatch" && <p className="text-[13px] text-muted">The stopwatch counts up. Stop it whenever you&apos;re done.</p>}
      </section>

      <details className="rounded-2xl border border-brand/10 bg-surface p-4" data-testid="focus-options">
        <summary className="min-h-11 cursor-pointer text-[14px] font-bold text-ink">Sound, distractions and Deep Focus</summary>
        <div className="mt-3 flex flex-col gap-4">
          <SoundPicker value={sound} onChange={setSound} />
          <AppBlockIndicator
            blocked={blocked}
            disabled={busy}
            onToggle={(id) => setBlocked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))}
          />
          <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl bg-tint-strong px-3 py-3 dark:bg-[#FAF7F214]">
            <input type="checkbox" className="mt-1 h-5 w-5" data-testid="deep-focus" checked={deep} disabled={busy} onChange={(e) => setDeep(e.target.checked)} />
            <span>
              <span className="block text-[15px] font-bold text-ink">Deep Focus</span>
              <span className="block text-[12px] leading-snug text-muted">Full screen where your browser allows it, and a warning if you try to leave or close the page.</span>
            </span>
          </label>
        </div>
      </details>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-col items-center gap-2 bg-gradient-to-t from-background via-background to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6">
        <button
          type="submit"
          data-testid="start-focus"
          disabled={!canStart}
          aria-label={startLabel}
          className="flex size-[88px] items-center justify-center rounded-full border border-primary-button-border bg-cta text-[18px] font-extrabold text-white shadow-modal transition-transform hover:bg-[#E8623F] active:scale-95 disabled:cursor-not-allowed disabled:border-primary-button-disabled-bg disabled:bg-primary-button-disabled-bg disabled:text-primary-button-disabled-text disabled:shadow-none"
        >
          {busy ? "…" : "Start"}
        </button>
        <p className="min-h-5 text-center text-[12px] font-semibold text-muted" data-testid="start-hint">
          {subjectId === null ? "Choose a subject to start" : `${mode === "stopwatch" ? "Stopwatch" : `${planned} min ${mode === "pomodoro" ? "Pomodoro" : "countdown"}`}${deep ? " · Deep Focus" : ""}`}
        </p>
      </div>
    </form>
  );
}
