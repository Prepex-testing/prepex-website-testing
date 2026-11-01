"use client";

import { Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Sheet } from "@/components/planner/Sheet";
import { GhostButton } from "@/components/ui/GhostButton";
import { getGoalAssistant, setPushWeek, type Assistant, type Suggestion } from "@/lib/api/goalAssistant";
import type { NewGoal } from "@/lib/api/goals";
import { ApiError } from "@/lib/api/http";
import { METER_TEXT, availableOf, chosenGoals, initialEdits, meterOf, minutesFor, requiredFor, trimsAgainst, type Edits } from "@/lib/goalAssistant/model";
import { formatDuration, subjectStyle } from "@/lib/planner/format";

type Props = {
  /** Monday of the week to plan (YYYY-MM-DD); the current week when left out. */
  weekStart?: string;
  /** Called whenever the student's choices change, so a parent screen can save them in its own way. */
  onChange?: (goals: NewGoal[], push: boolean) => void;
};

const METER_BAR: Record<"green" | "amber" | "red", string> = { green: "bg-[var(--success)]", amber: "bg-warning", red: "bg-danger" };
const METER_CHIP: Record<"green" | "amber" | "red", string> = { green: "bg-[var(--success-bg)] text-[var(--success)]", amber: "bg-warning-bg text-ink", red: "bg-danger-bg text-danger" };

function Stepper({ s, value, onChange }: { s: Suggestion; value: number; onChange: (n: number) => void }) {
  const step = s.type === "QUESTIONS" ? 5 : 1;
  const btn = "flex size-11 items-center justify-center rounded-lg border border-secondary-button-border text-ink hover:bg-tint-strong disabled:opacity-40";
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={`Target for ${s.label}`}>
      <button type="button" className={btn} aria-label={`Fewer ${s.label}`} data-testid={`less-${s.id}`} disabled={value - step < s.minTarget} onClick={() => onChange(Math.max(s.minTarget, value - step))}>
        <Minus className="size-4" aria-hidden />
      </button>
      <span className="min-w-10 text-center text-[16px] font-extrabold tabular-nums text-ink" data-testid={`target-${s.id}`}>
        {value}
      </span>
      <button type="button" className={btn} aria-label={`More ${s.label}`} data-testid={`more-${s.id}`} onClick={() => onChange(value + step)}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/**
 * The Goal Assistant: the week's goals suggested from the hours the timetable really gives and the share of them the
 * student really completes, each with its reason, and every one editable. Revision is not a goal: it is planned automatically,
 * and the screen says how much of the week it takes. Used inside a sheet on Weekly goals and as a step of the Sunday review.
 */
export function GoalAssistantBody({ weekStart, onChange }: Props) {
  const [data, setData] = useState<Assistant | null>(null);
  const [edits, setEdits] = useState<Edits>({ included: {}, targets: {} });
  const [push, setPush] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (withPush: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const res = await getGoalAssistant(weekStart, withPush);
        setData(res.data);
        setEdits(initialEdits(res.data.suggestions));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "We couldn't work out your week right now. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [weekStart],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- builds the suggestions when the screen opens
    void load(false);
  }, [load]);

  const available = data ? availableOf(data) : 0;
  const required = data ? requiredFor(data.suggestions, edits) : 0;
  const meter = meterOf(required, available);
  const trims = data ? trimsAgainst(data.suggestions, edits, available) : [];
  const goals = data ? chosenGoals(data.suggestions, edits) : [];

  const goalsKey = JSON.stringify(goals);
  useEffect(() => {
    if (data) onChange?.(JSON.parse(goalsKey) as NewGoal[], push);
  }, [data, goalsKey, push, onChange]);

  async function togglePush(on: boolean) {
    setPush(on);
    await load(on);
    if (data) void setPushWeek(data.weekStart, on).catch(() => undefined);
  }

  if (loading && !data) {
    return (
      <div role="status" className="flex flex-col gap-3" data-testid="assistant-loading">
        <p className="text-[14px] font-semibold text-ink">Looking at your week…</p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-tint-strong dark:bg-[#FAF7F214]" />
        ))}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-xl bg-danger-bg p-4" data-testid="assistant-error">
        <p className="text-[14px] font-semibold text-danger">{error ?? "We couldn't work out your week right now."}</p>
        <GhostButton className="self-start" onClick={() => void load(push)}>
          Try again
        </GhostButton>
      </div>
    );
  }

  const percent = available > 0 ? Math.min(100, Math.round((required / available) * 100)) : 100;

  return (
    <div className="flex flex-col gap-4 pt-1" data-testid="goal-assistant" data-meter={meter} aria-busy={loading}>
      <div className="rounded-xl bg-tint-strong px-3 py-3 text-[13px] leading-snug text-body-text dark:bg-[#FAF7F214] dark:text-ink" data-testid="assistant-basis">
        <p className="font-bold text-ink">
          Your week holds about {formatDuration(available)} of study time{push ? " in a push week" : " at your usual pace"}.
        </p>
        <p className="mt-1">
          {data.phase.label} phase, {data.daysToExam} days to the exam. Revision ({data.revisionAuto.chaptersDue} {data.revisionAuto.chaptersDue === 1 ? "chapter" : "chapters"} due, about {formatDuration(data.revisionAuto.minutes)}) is planned for you automatically, so it is not a goal.
        </p>
      </div>

      <div className="flex flex-col gap-2" data-testid="assistant-meter">
        <div className="flex items-baseline justify-between gap-3">
          <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${METER_CHIP[meter]}`}>{METER_TEXT[meter].title}</span>
          <span className="text-[12px] text-muted" data-testid="assistant-fit">
            {formatDuration(required)} of {formatDuration(available)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-tint-strong dark:bg-[#FAF7F214]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="How much of the week the goals fill">
          <div className={`h-full rounded-full ${METER_BAR[meter]}`} style={{ width: `${percent}%` }} />
        </div>
        <p className="text-[12px] text-muted">{METER_TEXT[meter].line}</p>
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-brand/15 bg-surface p-3" data-testid="assistant-push">
        <input type="checkbox" className="mt-0.5 size-5" checked={push} disabled={loading} onChange={(e) => void togglePush(e.target.checked)} />
        <span className="text-[13px] leading-snug text-body-text dark:text-ink">
          <span className="block font-bold text-ink">Push week</span>
          Aim 10% above what you have been completing{data.demonstratedMinutes ? ` (about ${formatDuration(data.demonstratedMinutes)} a week)` : ""}. Finish every goal and earn 100 XP.
        </span>
      </label>

      {data.suggestions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand/25 p-4 text-center text-[14px] text-muted" data-testid="assistant-empty">
          Your timetable has no study time left this week, so there is nothing to suggest.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.suggestions.map((s) => {
            const on = edits.included[s.id] !== false;
            const style = subjectStyle((s.subjectName ?? "").toLowerCase().replace("mathematics", "maths"));
            const target = edits.targets[s.id] ?? s.target;
            return (
              <li key={s.id} data-testid="suggestion" data-type={s.type} data-included={on} className={`flex flex-col gap-2 rounded-xl border p-3 ${on ? "border-brand/15 bg-surface" : "border-brand/10 opacity-60"}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1 size-5" aria-label={`Include ${s.label}`} checked={on} onChange={(e) => setEdits((cur) => ({ ...cur, included: { ...cur.included, [s.id]: e.target.checked } }))} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[15px] font-bold leading-snug text-ink">
                      {s.subjectName && <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: style.color }} />}
                      {s.label}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-snug text-muted" data-testid="suggestion-reason">
                      {s.reason}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold text-muted" data-testid="suggestion-minutes">
                    {formatDuration(minutesFor(s, edits))}
                  </span>
                </div>
                {on && s.type !== "BACKLOG" && (
                  <div className="flex justify-end">
                    <Stepper s={s} value={target} onChange={(n) => setEdits((cur) => ({ ...cur, targets: { ...cur.targets, [s.id]: n } }))} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {trims.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl bg-warning-bg p-3" data-testid="assistant-trims">
          <p className="text-[13px] font-semibold text-ink">That is more than the week holds. These changes make it fit:</p>
          <ul className="flex flex-col gap-1 text-[13px] text-ink">
            {trims.map((t) => (
              <li key={t.suggestionId}>
                {t.label}: {(edits.targets[t.suggestionId] ?? 0)} to {t.newTarget}
              </li>
            ))}
          </ul>
          <GhostButton data-testid="apply-trims" className="self-start" onClick={() => setEdits((cur) => ({ ...cur, targets: { ...cur.targets, ...Object.fromEntries(trims.map((t) => [t.suggestionId, t.newTarget])) } }))}>
            Apply these changes
          </GhostButton>
        </div>
      )}

      <p className="text-[12px] text-muted">
        Something missing? Add a goal yourself from the Weekly goals screen, or{" "}
        <Link href="/logs/backlog" className="font-semibold underline">
          add a backlog item
        </Link>{" "}
        and it joins the next suggestion.
      </p>
    </div>
  );
}

/** The assistant in a sheet, with one button that adds the chosen goals. */
export function GoalAssistantSheet({ open, onClose, weekStart, onAccept }: { open: boolean; onClose: () => void; weekStart?: string; onAccept: (goals: NewGoal[]) => void | Promise<void> }) {
  const [goals, setGoals] = useState<NewGoal[]>([]);
  const onChange = useCallback((g: NewGoal[]) => setGoals(g), []);
  const [busy, setBusy] = useState(false);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Suggested goals for the week"
      description="Built from your timetable, how much you complete, the classes you have, your weak subjects and your backlog."
      data-testid="goal-assistant-sheet"
      footer={
        <GhostButton
          data-testid="assistant-accept"
          className="w-full"
          disabled={goals.length === 0 || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onAccept(goals);
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          {goals.length === 0 ? "Nothing chosen" : `Add ${goals.length} ${goals.length === 1 ? "goal" : "goals"}`}
        </GhostButton>
      }
    >
      {open && <GoalAssistantBody {...(weekStart ? { weekStart } : {})} onChange={onChange} />}
    </Sheet>
  );
}
