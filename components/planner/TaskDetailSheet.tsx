"use client";

import { Sheet } from "@/components/planner/Sheet";
import type { PlanTask } from "@/lib/api/plannerV2";
import { STATUS_LABEL, formatClock, formatDuration, meta, subjectStyle } from "@/lib/planner/format";
import type { TaskCardActions } from "@/components/planner/PlanTaskCard";

const ORIGIN_TEXT: Record<string, string> = {
  goal: "From your weekly goals",
  sr: "Spaced revision is due",
  backlog: "From your backlog",
  manual: "Added by you",
  mock: "Your scheduled mock",
  rollover: "Carried over from an earlier day",
};

type Props = Omit<TaskCardActions, "onOpen"> & { task: PlanTask | null; onClose: () => void };

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-brand/10 py-2.5 last:border-0">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="text-right text-[14px] font-semibold text-ink">{value}</dd>
    </div>
  );
}

export function TaskDetailSheet({ task, onClose, onStart, onMarkDone, onSkip, onTomorrow, onDelete }: Props) {
  if (!task) return null;
  const style = subjectStyle(task.subject);
  const open = task.status === "pending" || task.status === "in_progress";
  const act = (run: (t: PlanTask) => void) => () => {
    onClose();
    run(task);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={task.title}
      description={`${style.label} · ${meta(task).label}`}
      data-testid="task-detail"
      footer={
        open ? (
          <div className="flex flex-col gap-2">
            <button type="button" data-testid="detail-start" onClick={act(onStart)} className="min-h-14 rounded-lg border border-primary-button-border bg-cta px-4 text-base font-semibold text-white hover:bg-[#E8623F]">
              {task.status === "in_progress" ? "Resume" : meta(task).cta}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" data-testid="detail-done" onClick={act(onMarkDone)} className="min-h-12 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-3 text-[14px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
                Mark as done
              </button>
              <button type="button" onClick={act(onSkip)} className="min-h-12 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-3 text-[14px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
                Skip
              </button>
              {!task.fixedSlot && (
                <button type="button" onClick={act(onTomorrow)} className="min-h-12 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-3 text-[14px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
                  Do it tomorrow
                </button>
              )}
              <button type="button" onClick={act(onDelete)} className="min-h-12 rounded-lg border-[1.5px] border-danger/40 bg-surface px-3 text-[14px] font-semibold text-danger hover:bg-danger-bg">
                Delete
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
      <dl className="pt-1">
        <Row label="Status" value={STATUS_LABEL[task.status]} />
        <Row label="When" value={task.startMin !== null && task.endMin !== null ? `${formatClock(task.startMin)} to ${formatClock(task.endMin)}` : null} />
        <Row label="Time" value={formatDuration(task.estimatedMinutes)} />
        <Row label="Chapter" value={task.chapterName} />
        <Row label="Topic" value={task.topic} />
        <Row label="Content from" value={task.contentSourceLabel} />
        <Row label="Questions" value={task.questionCount ? String(task.questionCount) : null} />
        <Row label="Why it is here" value={task.origin ? (ORIGIN_TEXT[task.origin] ?? null) : null} />
        <Row label="Time spent" value={task.actualMinutes ? formatDuration(task.actualMinutes) : null} />
        <Row label="Built by" value={task.generatedBy === "ai_polish" ? "Prepex, with an AI tweak" : task.generatedBy === "full_ai" ? "Prepex AI" : task.generatedBy === "manual" ? "You" : "Prepex"} />
      </dl>
      {task.fixedSlot && <p className="mt-3 rounded-lg bg-tint-strong px-3 py-2 text-[13px] text-body-text dark:bg-[#FAF7F214] dark:text-ink">This mock keeps its time and its full length.</p>}
      {task.warning && <p className="mt-3 rounded-lg bg-warning-bg px-3 py-2 text-[13px] font-semibold text-ink">{task.warning}</p>}
    </Sheet>
  );
}
