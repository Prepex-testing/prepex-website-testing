"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarClock, Check, Clock, MoreVertical, Moon, Sun, Sunset } from "lucide-react";
import type { PlanTask } from "@/lib/api/plannerV2";
import { chapterResourcesHref } from "@/lib/revision/resourceLinks";
import { STATUS_LABEL, SUBJECT_STYLE, formatClock, formatDuration, meta, subjectStyle } from "@/lib/planner/format";
import { TYPE_CHIP, energyOf, taskInstruction, type Energy } from "@/lib/planner/taskText";

export type StudyTaskActions = {
  onStart: (task: PlanTask) => void;
  onMarkDone: (task: PlanTask) => void;
  onSkip: (task: PlanTask) => void;
  onTomorrow: (task: PlanTask) => void;
  onDelete: (task: PlanTask) => void;
};

const ENERGY_ICON: Record<Energy, typeof Sun> = { Morning: Sun, Afternoon: Sun, Evening: Sunset, Night: Moon };

const STATUS_STYLE: Record<PlanTask["status"], string> = {
  pending: "bg-tint-strong text-muted dark:bg-[#FAF7F214]",
  in_progress: "bg-warning-bg text-ink",
  done: "bg-[var(--success-bg)] text-[var(--success)]",
  skipped: "bg-tint-strong text-muted dark:bg-[#FAF7F214]",
  rolled_over: "bg-tint-strong text-muted dark:bg-[#FAF7F214]",
};

/** Outlined, never filled: the call to action on every study card. Resume is the one with a saffron hint. */
const CTA = "min-h-11 shrink-0 whitespace-nowrap rounded-[10px] border bg-transparent px-5 py-2.5 text-[14px] font-medium transition-colors hover:bg-tint-strong";
const CTA_DEFAULT = "border-secondary-button-border text-ink";
const CTA_RESUME = "border-warning/60 text-warning";

/**
 * One study task, with everything the student needs to know what to do: subject, kind of task and where it stands;
 * the chapter; exactly what to do; how long, when in the day and where the time falls; and the resource for the
 * chapter. Used on Home and on the full plan, so a change here shows up in both.
 */
export function StudyTaskCard({ task, coachAnchor, onStart, onMarkDone, onSkip, onTomorrow, onDelete }: { task: PlanTask; /** data-coach anchor for the Start button (the first card on Home). */ coachAnchor?: string } & StudyTaskActions) {
  const [menu, setMenu] = useState(false);
  const root = useRef<HTMLElement>(null);
  const style = subjectStyle(task.subject);
  const open = task.status === "pending" || task.status === "in_progress";
  const done = task.status === "done";
  const energy = energyOf(task.startMin);
  const EnergyIcon = energy ? ENERGY_ICON[energy] : null;
  const subjectLabel = task.subject ? (SUBJECT_STYLE[task.subject]?.label ?? task.subject) : null;
  const heading = task.chapterName ?? task.title;
  const resource = subjectLabel && task.chapterName ? chapterResourcesHref(subjectLabel, task.chapterName) : null;

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

  const items = [
    { id: "done", label: "Mark done", run: onMarkDone },
    { id: "skip", label: "Skip", run: onSkip },
    ...(task.fixedSlot ? [] : [{ id: "tomorrow", label: "Reschedule to tomorrow", run: onTomorrow }]),
    { id: "delete", label: "Delete", run: onDelete },
  ];

  return (
    <article
      ref={root}
      data-testid="study-task"
      data-task-id={task.id}
      data-status={task.status}
      aria-label={`${heading}, ${TYPE_CHIP[task.kind]}, ${formatDuration(task.estimatedMinutes)}, ${STATUS_LABEL[task.status]}`}
      className={`flex flex-col gap-3 rounded-2xl border border-brand/10 bg-surface p-4 shadow-hover sm:p-5 ${open ? "" : "opacity-80"}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {subjectLabel && (
          <span data-testid="chip-subject" className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink" style={{ background: `${style.color}26` }}>
            <span aria-hidden className="size-2 rounded-full" style={{ background: style.color }} />
            {subjectLabel}
          </span>
        )}
        <span data-testid="chip-type" className="rounded-full border border-brand/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-body-text dark:text-ink">
          {TYPE_CHIP[task.kind]}
        </span>
        <span data-testid="chip-status" className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLE[task.status]}`}>
          {STATUS_LABEL[task.status]}
        </span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 basis-60">
          <h3 data-testid="task-chapter" className="break-words text-[18px] font-extrabold leading-snug text-ink">
            {heading}
          </h3>
          <p data-testid="task-instruction" className="mt-1 break-words text-[13px] leading-snug text-body-text/85 dark:text-ink/75">
            {taskInstruction(task)}
          </p>
          {task.warning && <p className="mt-1 text-[12px] font-semibold text-warning">{task.warning}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">
            <span className="flex items-center gap-1.5" data-testid="meta-duration">
              <Clock className="size-3.5" aria-hidden /> {formatDuration(task.estimatedMinutes)}
            </span>
            {energy && EnergyIcon && (
              <span className="flex items-center gap-1.5" data-testid="meta-energy">
                <EnergyIcon className="size-3.5" aria-hidden /> {energy}
              </span>
            )}
            {task.startMin !== null && task.endMin !== null && (
              <span className="flex items-center gap-1.5" data-testid="meta-range">
                <CalendarClock className="size-3.5" aria-hidden /> {formatClock(task.startMin)} – {formatClock(task.endMin)}
              </span>
            )}
            {/* TODO(resources): wire to the resource-library window's chapter entry once it exposes an id. */}
            {resource && (
              <Link href={resource} data-testid="meta-resource" className="flex items-center gap-1.5 font-semibold text-body-text hover:underline dark:text-ink">
                <BookOpen className="size-3.5" aria-hidden /> Resource
              </Link>
            )}
          </div>
          {done && task.actualMinutes !== null && <p className="mt-2 text-[12px] font-semibold text-[var(--success)]">Done in {formatDuration(task.actualMinutes)}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {open && (
            <button type="button" data-testid="task-cta" {...(coachAnchor ? { "data-coach": coachAnchor } : {})} onClick={() => onStart(task)} className={`${CTA} ${task.status === "in_progress" ? CTA_RESUME : CTA_DEFAULT}`}>
              {task.status === "in_progress" ? resumeLabel(task) : meta(task).cta}
            </button>
          )}
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={done ? `${heading} is done` : `Mark ${heading} as done`}
            data-testid="task-check"
            disabled={!open}
            onClick={() => onMarkDone(task)}
            className={`flex size-11 shrink-0 items-center justify-center rounded-lg border ${done ? "border-[var(--success)] bg-[var(--success-bg)] text-[var(--success)]" : "border-secondary-button-border text-transparent hover:bg-tint-strong"} disabled:cursor-default`}
          >
            <Check className="size-5" aria-hidden />
          </button>
          {open && (
            <div className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={menu} aria-label={`More actions for ${heading}`} data-testid="task-menu" onClick={() => setMenu((v) => !v)} className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-tint-strong">
                <MoreVertical className="size-5" aria-hidden />
              </button>
              {menu && (
                <ul role="menu" className="absolute right-0 top-12 z-20 w-56 overflow-hidden rounded-xl border border-brand/10 bg-surface py-1 shadow-modal">
                  {items.map((item) => (
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
      </div>
    </article>
  );
}

function resumeLabel(task: Pick<PlanTask, "kind">): string {
  return meta(task).cta.replace(/^Start /, "Resume ");
}
