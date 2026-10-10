"use client";

import type { PlannerTask } from "@/lib/api/planner";
import type { RevisionLog } from "@/lib/api/revisionLogs";
import { formatMinutes, groupByDay, dayHeading } from "@/lib/study/format";
import { labelOf, percentLabel, REVISION_TYPES } from "@/lib/logs/labels";
import { subjectColor, type SubjectLookup } from "@/lib/study/subjects";

const WINDOW_LABEL: Record<string, string> = { MORNING: "Morning", MIDDAY: "Midday", EVENING: "Evening", NIGHT: "Night" };

/** Today's planned revisions: tap one to log it. */
export function RevisionToday({
  tasks,
  loading,
  error,
  onLog,
}: {
  tasks: PlannerTask[];
  loading: boolean;
  error: string | null;
  onLog: (task: PlannerTask) => void;
}) {
  if (loading) return <div className="h-32 animate-pulse rounded-xl bg-tint-strong" aria-hidden />;
  return (
    <div className="flex flex-col gap-3" data-testid="revision-today">
      <p className="text-[14px] text-muted">Revisions your planner set for today. Tap one when you have done it to log it.</p>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {tasks.length === 0 ? (
        <p className="rounded-xl bg-tint-strong px-4 py-8 text-center text-[14px] text-muted dark:bg-[#FAF7F214]" data-testid="revision-today-empty">
          No revision planned for today. Log one yourself, or open Analytics to see which chapters are going stale.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((t) => {
            const done = t.status === "COMPLETED";
            return (
              <li key={t.id} data-testid={`today-task-${t.id}`}>
                <button
                  type="button"
                  onClick={() => onLog(t)}
                  className="flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border border-brand/10 bg-surface px-4 py-3 text-left hover:bg-tint-strong"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold text-ink">{t.title}</span>
                    <span className="block text-[12px] font-semibold text-muted">
                      {formatMinutes(t.estimatedMinutes)}
                      {t.suggestedWindow ? ` · ${WINDOW_LABEL[t.suggestedWindow] ?? t.suggestedWindow}` : ""}
                      {done ? " · done in the planner" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-bold text-brand dark:text-ink">Log it</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type HistoryProps = {
  rows: RevisionLog[];
  lookup: SubjectLookup;
  hasMore: boolean;
  onLoadMore: () => void;
  onEdit: (row: RevisionLog) => void;
  onDelete: (row: RevisionLog) => void;
  onPlan: (row: RevisionLog) => void;
};

/** Past revisions, grouped by day. */
export function RevisionHistory({ rows, lookup, hasMore, onLoadMore, onEdit, onDelete, onPlan }: HistoryProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-tint-strong px-4 py-8 text-center text-[14px] text-muted dark:bg-[#FAF7F214]" data-testid="revision-history-empty">
        No revisions logged yet.
      </p>
    );
  }
  const groups = groupByDay(rows, (r) => r.loggedAt, (r) => r.durationMinutes);
  return (
    <div className="flex flex-col gap-4" data-testid="revision-history">
      {groups.map((g) => (
        <section key={g.key} aria-label={dayHeading(g.key)} className="flex flex-col gap-2">
          <h3 className="flex items-baseline justify-between text-[14px] font-extrabold text-ink">
            <span>{dayHeading(g.key)}</span>
            <span className="text-[12px] font-semibold text-muted">{formatMinutes(g.minutes)}</span>
          </h3>
          <ul className="flex flex-col gap-2">
            {g.items.map((r) => (
              <li key={r.id} data-testid={`revision-row-${r.id}`} className="rounded-xl border border-brand/10 bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: subjectColor(r.subjectId) }} />
                      <span className="truncate">{lookup.chapterName(r.chapterId) ?? lookup.subjectName(r.subjectId)}</span>
                    </p>
                    <p className="text-[12px] font-semibold text-muted">
                      {lookup.subjectName(r.subjectId)} · {labelOf(REVISION_TYPES, r.revisionType)} · {formatMinutes(r.durationMinutes)} · revision #{r.revisionNumber}
                    </p>
                  </div>
                  {r.accuracy !== null && (
                    <span className="shrink-0 rounded-lg bg-tint-strong px-2 py-1 text-[13px] font-extrabold text-ink dark:bg-[#FAF7F214]" aria-label={`Accuracy ${percentLabel(r.accuracy)}`}>
                      {percentLabel(r.accuracy)}
                    </span>
                  )}
                </div>
                {r.errors && <p className="mt-2 line-clamp-2 text-[13px] text-body-text dark:text-ink">{r.errors}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onPlan(r)} data-testid={`revision-plan-${r.id}`} className="min-h-10 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-3 text-[13px] font-bold text-body-text hover:bg-tint-strong dark:text-ink">
                    Add to planner
                  </button>
                  <button type="button" onClick={() => onEdit(r)} data-testid={`revision-edit-${r.id}`} className="min-h-10 rounded-lg px-3 text-[13px] font-bold text-muted hover:text-ink">
                    Edit
                  </button>
                  <button type="button" onClick={() => onDelete(r)} data-testid={`revision-delete-${r.id}`} className="min-h-10 rounded-lg px-3 text-[13px] font-bold text-muted hover:text-danger">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {hasMore && (
        <button type="button" data-testid="revision-load-more" onClick={onLoadMore} className="min-h-12 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
          Load more
        </button>
      )}
    </div>
  );
}
