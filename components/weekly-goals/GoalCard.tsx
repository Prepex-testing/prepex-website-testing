"use client";

import { EllipsisVertical, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GhostButton } from "@/components/ui/GhostButton";
import { WhiteModal } from "@/components/ui/WhiteModal";
import type { Goal } from "@/lib/api/goals";
import type { TaskType } from "@/lib/focus/intent";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import { goalInstruction } from "@/lib/goals/display";
import { TARGET_RULES, clampTarget, progressText, typeLabel } from "@/lib/goals/format";
import { defaultUnitMinutes } from "@/lib/goals/v2";

type Props = {
  goal: Goal;
  /** The chapter, or "<Subject> general" when the goal covers the whole subject. */
  title: string;
  busy: boolean;
  onWatched: (next: number) => void;
  onToggleDone: () => void;
  onDelete: () => void;
  onEdit: (patch: { target: number; minutesPerUnit?: number }) => void;
  /** Ask the assistant for hours on this goal's chapter (chapter goals only). */
  onSuggest?: () => void;
};

/** What kind of session works towards each kind of goal. */
const GOAL_TASK_TYPE: Record<Goal["type"], TaskType> = {
  LECTURES: "lecture",
  QUESTIONS: "practice",
  REVISIONS: "revision",
  MOCKS: "mock_review",
  HOURS: "self_study",
  BACKLOG: "self_study",
};

const TIMED = new Set<Goal["type"]>(["LECTURES", "QUESTIONS", "REVISIONS"]);

const MENU_ITEM = "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-[14px] font-medium text-ink hover:bg-surface-elevated disabled:opacity-50";
const FIELD = "h-11 rounded-[10px] border border-border-subtle bg-surface-elevated-2 px-3 text-[15px] text-ink outline-none focus:border-border-strong";

/**
 * One weekly goal: what it is, how far along, and a single quiet action. Everything else lives in the ⋮ menu so the
 * card stays clean.
 */
export function GoalCard({ goal, title, busy, onWatched, onToggleDone, onDelete, onEdit, onSuggest }: Props) {
  const done = goal.status === "DONE";
  const percent = done ? 100 : goal.progress.percent;
  const isLectures = goal.type === "LECTURES";
  const fromPartner = goal.source === "PARTNER";
  const heading = fromPartner ? (goal.topic ?? "Partner goal") : title;

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(goal.target);
  const [minutes, setMinutes] = useState(goal.minutesPerUnit ?? defaultUnitMinutes(goal.type));
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const away = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [menuOpen]);

  const pick = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  const rules = TARGET_RULES[goal.type];

  return (
    <li
      className="flex min-h-[160px] flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-elevated p-4"
      data-testid="goal-card"
      data-goal-type={goal.type}
      data-status={goal.status}
      data-complete={done || goal.progress.complete}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex h-6 items-center rounded-full border border-border-strong px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted" data-testid="goal-type-chip">
          {typeLabel(goal.type)}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Remove goal: ${heading}`}
            data-testid="goal-remove"
            disabled={busy}
            onClick={() => setConfirming(true)}
            className="flex size-11 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-surface-elevated-2 disabled:opacity-50"
          >
            <X className="size-4" aria-hidden />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="Goal options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              data-testid="goal-menu"
              disabled={busy}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex size-11 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-surface-elevated-2 disabled:opacity-50"
            >
              <EllipsisVertical className="size-4" aria-hidden />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-20 mt-1 flex w-56 flex-col rounded-xl border border-border-strong bg-surface-elevated-2 p-1 shadow-modal">
                {isLectures && !fromPartner && (
                  <button type="button" role="menuitem" data-testid="lecture-plus" className={MENU_ITEM} onClick={pick(() => onWatched(goal.progressSelfReport + 1))}>
                    Log one lecture watched
                  </button>
                )}
                {!fromPartner && (
                  <button type="button" role="menuitem" data-testid="goal-edit" className={MENU_ITEM} onClick={pick(() => setEditing(true))}>
                    Edit goal
                  </button>
                )}
                <button type="button" role="menuitem" data-testid="goal-toggle-done" className={MENU_ITEM} onClick={pick(onToggleDone)}>
                  {done ? "Mark as not done" : "Mark as done"}
                </button>
                {isLectures && !fromPartner && goal.progressSelfReport > 0 && (
                  <button type="button" role="menuitem" data-testid="goal-reset" className={MENU_ITEM} onClick={pick(() => onWatched(0))}>
                    Reset progress
                  </button>
                )}
                {onSuggest && (
                  <button type="button" role="menuitem" data-testid="goal-suggest" className={MENU_ITEM} onClick={pick(onSuggest)}>
                    Suggest for this chapter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <h4 className="break-words text-[20px] font-bold leading-tight text-ink">{heading}</h4>
        <p className="mt-1 text-[13px] text-muted" data-testid="goal-instruction">
          {fromPartner ? "From your partner" : goalInstruction(goal)}
          {goal.carriedFromGoalId && " · Carried over"}
        </p>
      </div>

      {editing && (
        <form
          className="flex flex-wrap items-end gap-2"
          data-testid="goal-edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            const next = clampTarget(goal.type, goal.unit, target);
            const mins = Math.max(5, Math.min(480, Math.round(minutes)));
            setEditing(false);
            onEdit({ target: next, ...(TIMED.has(goal.type) ? { minutesPerUnit: mins } : {}) });
          }}
        >
          <label className="flex flex-col gap-1 text-[12px] font-medium text-muted">
            Target
            <input type="number" aria-label="Target" data-testid="goal-edit-target" min={rules.min} max={rules.max} value={target} onChange={(e) => setTarget(Number(e.target.value))} className={`${FIELD} w-24`} />
          </label>
          {TIMED.has(goal.type) && (
            <label className="flex flex-col gap-1 text-[12px] font-medium text-muted">
              Minutes each
              <input type="number" aria-label="Minutes each" data-testid="goal-edit-minutes" min={5} max={480} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={`${FIELD} w-24`} />
            </label>
          )}
          <GhostButton type="submit" data-testid="goal-edit-save" disabled={busy}>
            Save
          </GhostButton>
          <GhostButton onClick={() => setEditing(false)}>Cancel</GhostButton>
        </form>
      )}

      <div className="mt-auto">
        <div className="h-1.5 w-full overflow-hidden rounded-[3px] bg-black/[0.08] dark:bg-white/[0.08]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${heading} progress`}>
          <div className={`h-full rounded-[3px] transition-[width] duration-500 ${percent >= 100 ? "bg-saffron/80" : "bg-slate-700 dark:bg-white/50"}`} style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-[13px] text-muted" data-testid="goal-progress-text">
            {fromPartner ? (done ? "Done" : "Not done yet") : progressText(goal)} · {percent}%
          </p>
          {!isLectures && !fromPartner && <span className="text-[12px] text-muted/70">Counted automatically</span>}
        </div>
      </div>

      {!fromPartner && goal.status === "ACTIVE" && (
        <GhostButton
          data-testid="goal-start-now"
          disabled={busy}
          onClick={() =>
            startFocusSession({
              originSource: "weekly_goals",
              originId: goal.id,
              subject: goal.subjectId !== null ? String(goal.subjectId) : undefined,
              chapter: goal.chapterId ?? undefined,
              topic: goal.topic ?? undefined,
              taskType: GOAL_TASK_TYPE[goal.type],
            })
          }
        >
          Start now
        </GhostButton>
      )}

      <WhiteModal open={confirming} onClose={() => setConfirming(false)} ariaLabel="Remove this goal?">
        <div className="mx-auto flex w-full max-w-[340px] flex-col gap-3 text-center">
          <h2 className="text-[20px] font-extrabold text-ink">Remove this goal?</h2>
          <p className="text-[14px] text-muted">{heading}: {goalInstruction(goal)}. Progress on it this week is lost.</p>
          <div className="flex gap-3 pt-2">
            <GhostButton className="flex-1" onClick={() => setConfirming(false)}>
              Keep it
            </GhostButton>
            <GhostButton
              className="flex-1 !border-danger text-danger"
              data-testid="goal-remove-confirm"
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
            >
              Remove goal
            </GhostButton>
          </div>
        </div>
      </WhiteModal>
    </li>
  );
}
