"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Archive, BookOpen, ListChecks, MoreVertical, PenLine, RotateCcw, Trophy } from "lucide-react";
import type { PlanTask, TaskKind } from "@/lib/api/plannerV2";
import { STATUS_LABEL, formatClock, formatDuration, meta, subjectStyle, taskSubline } from "@/lib/planner/format";

export const KIND_ICON: Record<TaskKind, typeof BookOpen> = {
  lecture: BookOpen,
  self_study: BookOpen,
  practice: PenLine,
  revision: RotateCcw,
  mock: Trophy,
  backlog: Archive,
  other: ListChecks,
};

export type TaskCardActions = {
  onStart: (task: PlanTask) => void;
  onOpen: (task: PlanTask) => void;
  onMarkDone: (task: PlanTask) => void;
  onSkip: (task: PlanTask) => void;
  onTomorrow: (task: PlanTask) => void;
  onDelete: (task: PlanTask) => void;
};

type Props = TaskCardActions & {
  task: PlanTask;
  /** Compact = the home screen's card: no menu, no gestures. */
  compact?: boolean;
};

const LONG_PRESS_MS = 650;
const SWIPE_PX = 80;

const STATUS_STYLE: Record<PlanTask["status"], string> = {
  pending: "bg-tint-strong text-muted dark:bg-[#FAF7F214]",
  in_progress: "bg-warning-bg text-ink",
  done: "bg-[var(--success-bg)] text-[var(--success)]",
  skipped: "bg-tint-strong text-muted dark:bg-[#FAF7F214]",
  rolled_over: "bg-tint-strong text-muted dark:bg-[#FAF7F214]",
};

/**
 * One task on the timeline: a subject-coloured stripe, the task and where its content comes from, the minutes and a
 * status chip, and a full-width call to action. Tap anywhere else for the details. Long-press deletes, swipe left
 * moves it to tomorrow, and the three-dot menu does the same for anyone who cannot do either.
 */
export function PlanTaskCard({ task, compact = false, onStart, onOpen, onMarkDone, onSkip, onTomorrow, onDelete }: Props) {
  const [menu, setMenu] = useState(false);
  const [dx, setDx] = useState(0);
  const press = useRef<{ x: number; y: number; timer: number | null; moved: boolean } | null>(null);
  const root = useRef<HTMLElement>(null);
  const style = subjectStyle(task.subject);
  const Icon = KIND_ICON[task.kind] ?? ListChecks;
  const m = meta(task);
  const open = task.status === "pending" || task.status === "in_progress";
  const sub = taskSubline(task);

  useEffect(() => {
    if (!menu) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setMenu(false);
    };
    const esc = (event: KeyboardEvent) => event.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const clearPress = () => {
    if (press.current?.timer) window.clearTimeout(press.current.timer);
    press.current = null;
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (compact || !open || (event.target as HTMLElement).closest("button")) return;
    const timer = window.setTimeout(() => {
      if (press.current && !press.current.moved) {
        press.current = null;
        onDelete(task);
      }
    }, LONG_PRESS_MS);
    press.current = { x: event.clientX, y: event.clientY, timer, moved: false };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const p = press.current;
    if (!p) return;
    const mx = event.clientX - p.x;
    const my = event.clientY - p.y;
    if (Math.abs(mx) > 8 || Math.abs(my) > 8) {
      p.moved = true;
      if (p.timer) window.clearTimeout(p.timer);
    }
    if (Math.abs(my) < 30 && mx < 0) setDx(Math.max(mx, -140));
  };

  const onPointerUp = () => {
    const swiped = dx <= -SWIPE_PX;
    setDx(0);
    clearPress();
    if (swiped) onTomorrow(task);
  };

  return (
    <article
      ref={root}
      data-testid="plan-task"
      data-task-id={task.id}
      data-status={task.status}
      aria-label={`${task.title}, ${formatDuration(task.estimatedMinutes)}, ${STATUS_LABEL[task.status]}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        setDx(0);
        clearPress();
      }}
      style={{ transform: dx ? `translateX(${dx}px)` : undefined, touchAction: compact ? undefined : "pan-y" }}
      className={`relative flex overflow-visible rounded-2xl border border-brand/10 bg-surface shadow-hover transition-transform ${open ? "" : "opacity-75"}`}
    >
      <span aria-hidden className="w-1.5 shrink-0 rounded-l-2xl" style={{ background: style.color }} />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3.5">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => onOpen(task)} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-label={`Open details for ${task.title}`}>
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${style.color}1f`, color: style.color }}>
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-extrabold leading-tight text-ink" title={task.title}>
                {task.title}
              </span>
              <span className="mt-0.5 block truncate text-[12px] leading-snug text-muted">
                {style.label}
                {sub ? ` · ${sub}` : ""}
              </span>
              {task.warning && <span className="mt-1 block text-[11px] font-semibold text-warning">{task.warning}</span>}
            </span>
          </button>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="text-[13px] font-extrabold text-ink">{formatDuration(task.estimatedMinutes)}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[task.status]}`} data-testid="task-status">
              {STATUS_LABEL[task.status]}
            </span>
          </div>
          {!compact && open && (
            <div className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={menu} aria-label={`More actions for ${task.title}`} data-testid="task-menu" onClick={() => setMenu((v) => !v)} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-tint-strong">
                <MoreVertical className="size-5" aria-hidden />
              </button>
              {menu && (
                <ul role="menu" className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-xl border border-brand/10 bg-surface py-1 shadow-modal">
                  {[
                    { label: "Mark as done", run: onMarkDone, id: "done" },
                    { label: "Skip", run: onSkip, id: "skip" },
                    ...(task.fixedSlot ? [] : [{ label: "Reschedule to tomorrow", run: onTomorrow, id: "tomorrow" }]),
                    { label: "Delete", run: onDelete, id: "delete" },
                  ].map((item) => (
                    <li key={item.id} role="none">
                      <button
                        type="button"
                        role="menuitem"
                        data-testid={`menu-${item.id}`}
                        onClick={() => {
                          setMenu(false);
                          item.run(task);
                        }}
                        className={`flex min-h-11 w-full items-center px-4 text-left text-[14px] font-semibold hover:bg-tint-strong ${item.id === "delete" ? "text-danger" : "text-ink"}`}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {open && (
          <button
            type="button"
            data-testid="task-cta"
            onClick={() => onStart(task)}
            className="min-h-12 w-full rounded-xl border border-primary-button-border bg-cta px-4 text-[15px] font-semibold text-white hover:bg-[#E8623F] active:bg-[#D9552F]"
          >
            {task.status === "in_progress" ? "Resume" : m.cta}
          </button>
        )}
        {task.status === "done" && task.actualMinutes !== null && <p className="text-[12px] font-semibold text-[var(--success)]">Done in {formatDuration(task.actualMinutes)}</p>}
        {task.startMin !== null && task.endMin !== null && !compact && (
          <p className="sr-only">
            {formatClock(task.startMin)} to {formatClock(task.endMin)}
          </p>
        )}
      </div>
    </article>
  );
}
