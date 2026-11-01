"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/planner/Sheet";
import { ClassCoverageCard } from "@/components/rituals/ClassCoverageCard";
import { TomorrowPreview } from "@/components/rituals/TomorrowPreview";
import { CountUp } from "@/components/study/CountUp";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import { completeDayClose, type DayCloseReward, type DayCloseState } from "@/lib/api/rituals";
import { ApiError } from "@/lib/api/http";
import { defaultChoices, gapLine, keptLine, MOODS, movedLine, needsChapterPick, summaryLine, toDecisions, type Choice } from "@/lib/rituals/dayClose";
import { loadChapterIndex, type ChapterInfo } from "@/lib/syllabus/chapterIndex";
import { refreshXp } from "@/lib/rewards/events";
import { intensity } from "@/components/focus/SessionWrap";

const CHOICES: { value: Choice; label: string }[] = [
  { value: "tomorrow", label: "Tomorrow" },
  { value: "backlog", label: "Backlog" },
  { value: "drop", label: "Drop" },
];

function Flame({ lit }: { lit: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-10 ${lit ? "text-[#FF6B47]" : "text-muted"}`} aria-hidden>
      <path fill="currentColor" d="M12 2c1 3-1 4.5-2.5 6.5C8 10.5 7 12 7 14.5A5 5 0 0 0 12 20a5 5 0 0 0 5-5.5c0-2-1-3.3-2-4.5-.4 1-1 1.7-1.7 2 .4-3-.2-6.5-1.3-10z" />
    </svg>
  );
}

/**
 * The evening ritual in one sheet, about 45 seconds: today at a glance, any class still unanswered, each unfinished task
 * as Tomorrow / Backlog / Drop, how the day felt, an optional win, then the reward: XP, the streak flame, today's tile
 * and where the student stands today and this month.
 */
export function DayCloseFlow({ state, open, onClose, onDone }: { state: DayCloseState; open: boolean; onClose: () => void; onDone: () => void }) {
  const reduce = useReducedMotion();
  const [choices, setChoices] = useState<Record<string, Choice>>(() => defaultChoices(state.unfinished));
  // the chapter chip tapped for a task that has none of its own, and the names to show on the chips
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Map<string, ChapterInfo>>(new Map());
  useEffect(() => {
    if (!state.unfinished.some(needsChapterPick)) return;
    let alive = true;
    void loadChapterIndex().then((m) => alive && setNames(m)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [state.unfinished]);
  const [mood, setMood] = useState<number | null>(null);
  const [win, setWin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reward, setReward] = useState<DayCloseReward | null>(null);

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const r = await completeDayClose({ decisions: toDecisions(choices, picks), ...(mood ? { mood } : {}), ...(win.trim() ? { win: win.trim() } : {}) });
      setReward(r);
      void refreshXp();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't close your day. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (reward) {
    const moved = movedLine(reward.moved);
    const kept = keptLine(reward.moved);
    return (
      <Sheet open={open} onClose={() => { onDone(); onClose(); }} title="Day closed" description={state.date} data-testid="day-close-reward" footer={<CoralButton data-testid="day-close-finish" onClick={() => { onDone(); onClose(); }}>Done</CoralButton>}>
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <p className="text-[40px] font-extrabold leading-none text-ink" data-testid="reward-xp">
            <CountUp value={reward.xpEarned} format={(n) => `+${n} XP`} />
          </p>
          <div className="flex items-center gap-3">
            <motion.div initial={reduce ? false : { scale: 0.5, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
              <Flame lit={reward.streak.countsToday} />
            </motion.div>
            <p className="text-left text-[18px] font-extrabold text-ink" data-testid="reward-streak">
              {reward.streak.current} day streak
              <span className="block text-[12px] font-semibold text-muted">Level {reward.xp.level}, {reward.xp.title}</span>
            </p>
            <motion.div data-testid="reward-tile" initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 18 }} className={`size-12 rounded-xl border border-border-subtle ${["bg-surface-elevated-2", "bg-[#3B6BFF]/30", "bg-[#3B6BFF]/50", "bg-[#3B6BFF]/75", "bg-[#3B6BFF]"][intensity(reward.xp.todayStudyMinutes)]}`} aria-label="Today in your study calendar" />
          </div>
          <dl className="grid w-full grid-cols-2 gap-3 text-left">
            {[
              { id: "today", label: "Today", rank: reward.rankToday },
              { id: "month", label: "This month", rank: reward.rankMonth },
            ].map((r) => (
              <div key={r.id} className="rounded-xl border border-border-subtle bg-surface-elevated p-3">
                <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted">{r.label}</dt>
                <dd className="text-[22px] font-extrabold text-ink" data-testid={`rank-${r.id}`}>{r.rank.rank === null ? "No XP yet" : `#${r.rank.rank}`}</dd>
                {gapLine(r.rank) && <dd className="text-[12px] text-muted">{gapLine(r.rank)}</dd>}
              </div>
            ))}
          </dl>
          <TomorrowPreview />
          {moved && <p className="text-[13px] text-muted" data-testid="reward-moved">{moved}</p>}
          {kept && <p role="status" className="rounded-xl bg-tint-strong px-3 py-2 text-[13px] font-medium text-ink" data-testid="reward-kept">{kept}</p>}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Close your day"
      description={summaryLine(state.summary)}
      data-testid="day-close-flow"
      footer={
        <div className="flex flex-col gap-2">
          {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">{error}</p>}
          <CoralButton data-testid="day-close-submit" disabled={busy} onClick={() => void finish()}>
            {busy ? "Closing…" : "Close the day"}
          </CoralButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pt-1">
        <dl className="grid grid-cols-4 gap-2 text-center" data-testid="day-summary">
          {[
            { label: "Studied", value: `${Math.floor(state.summary.minutes / 60)}h ${state.summary.minutes % 60}m` },
            { label: "Tasks", value: `${state.summary.tasksDone}/${state.summary.tasksTotal}` },
            { label: "Questions", value: String(state.summary.questions) },
            { label: "Revisions", value: String(state.summary.revisions) },
          ].map((t) => (
            <div key={t.label} className="rounded-xl border border-border-subtle bg-surface-elevated px-1 py-2">
              <dd className="text-[16px] font-extrabold text-ink">{t.value}</dd>
              <dt className="text-[11px] text-muted">{t.label}</dt>
            </div>
          ))}
        </dl>

        {state.coverage.length > 0 && <ClassCoverageCard prompts={state.coverage} />}

        {state.unfinished.length > 0 && (
          <fieldset className="flex flex-col gap-3" data-testid="unfinished">
            <legend className="mb-1 text-[15px] font-bold text-ink">What about the rest?</legend>
            {state.unfinished.map((t) => (
              <div key={t.id} className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-elevated p-3">
                <p className="text-[14px] font-semibold text-ink">{t.title}</p>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={`What to do with ${t.title}`}>
                  {CHOICES.map((c) => {
                    return (
                      <button key={c.value} type="button" role="radio" aria-checked={choices[t.id] === c.value} data-testid={`choice-${c.value}`} onClick={() => setChoices((prev) => ({ ...prev, [t.id]: c.value }))} className={`min-h-11 rounded-lg border px-2 text-[13px] font-semibold ${choices[t.id] === c.value ? "border-[1.5px] border-brand bg-tint-strong text-ink" : "border-border-subtle bg-surface text-body-text dark:text-ink"}`}>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                {choices[t.id] === "backlog" && needsChapterPick(t) && (
                  <div className="flex flex-col gap-2" data-testid="backlog-chapter-pick">
                    <p className="text-[12px] text-muted">{picks[t.id] ? "Goes to your backlog under this chapter." : "Pick the chapter it belongs to. Without one it stays on tomorrow."}</p>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Chapter for the backlog">
                      {t.candidateChapterIds.slice(0, 8).map((id) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={picks[t.id] === id}
                          data-testid="backlog-chip"
                          onClick={() => setPicks((prev) => (prev[t.id] === id ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== t.id)) : { ...prev, [t.id]: id }))}
                          className={`min-h-11 rounded-full border px-4 text-[13px] font-semibold ${picks[t.id] === id ? "border-[1.5px] border-brand bg-tint-strong text-ink" : "border-border-subtle bg-surface text-ink"}`}
                        >
                          {names.get(id)?.name ?? "Chapter"}
                        </button>
                      ))}
                      {t.candidateChapterIds.length === 0 && <p className="text-[12px] text-muted">No chapters in progress yet, so this one stays on tomorrow.</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[15px] font-bold text-ink">How did today feel?</legend>
          <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="How did today feel?">
            {MOODS.map((m) => (
              <button key={m.value} type="button" role="radio" aria-checked={mood === m.value} aria-label={m.label} data-testid={`mood-${m.value}`} onClick={() => setMood(m.value)} className={`flex min-h-14 flex-col items-center justify-center rounded-xl border text-[24px] ${mood === m.value ? "border-[1.5px] border-brand bg-tint-strong" : "border-border-subtle bg-surface"}`}>
                <span aria-hidden>{m.face}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-body-text dark:text-ink">
          One win from today (optional)
          <input data-testid="day-win" value={win} maxLength={200} onChange={(e) => setWin(e.target.value)} className="h-12 w-full rounded-xl border border-input-border bg-surface px-3 text-[16px] text-ink outline-none focus:border-brand" />
        </label>
        <GhostButton data-testid="day-close-later" onClick={onClose}>
          Not now
        </GhostButton>
      </div>
    </Sheet>
  );
}
