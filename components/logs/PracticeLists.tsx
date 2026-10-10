"use client";

import type { PracticeLog } from "@/lib/api/practiceLogs";
import { BAND_STYLE, labelOf, percentLabel, PRACTICE_SOURCES } from "@/lib/logs/labels";
import { dayHeading, formatMinutes, groupByDay } from "@/lib/study/format";
import { subjectColor, type SubjectLookup } from "@/lib/study/subjects";

export function bandOf(accuracy: number | null): "red" | "yellow" | "green" | null {
  if (accuracy === null) return null;
  return accuracy < 50 ? "red" : accuracy > 75 ? "green" : "yellow";
}

export function sourceText(row: Pick<PracticeLog, "source" | "sourceDetail">): string {
  return row.source === "other" && row.sourceDetail ? row.sourceDetail : labelOf(PRACTICE_SOURCES, row.source, row.source);
}

type Props = {
  rows: PracticeLog[];
  lookup: SubjectLookup;
  hasMore: boolean;
  onLoadMore: () => void;
  onEdit: (row: PracticeLog) => void;
  onDelete: (row: PracticeLog) => void;
  onPlan: (row: PracticeLog) => void;
};

/** Practice sessions, grouped by day, each with its score, source, and a follow-up button. */
export function PracticeSessions({ rows, lookup, hasMore, onLoadMore, onEdit, onDelete, onPlan }: Props) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-tint-strong px-4 py-8 text-center text-[14px] text-muted dark:bg-[#FAF7F214]" data-testid="practice-empty">
        No practice logged yet.
      </p>
    );
  }
  const groups = groupByDay(rows, (r) => r.loggedAt, (r) => r.questionsAttempted);
  return (
    <div className="flex flex-col gap-4" data-testid="practice-sessions">
      {groups.map((g) => (
        <section key={g.key} aria-label={dayHeading(g.key)} className="flex flex-col gap-2">
          <h3 className="flex items-baseline justify-between text-[14px] font-extrabold text-ink">
            <span>{dayHeading(g.key)}</span>
            <span className="text-[12px] font-semibold text-muted">{g.minutes} questions</span>
          </h3>
          <ul className="flex flex-col gap-2">
            {g.items.map((r) => {
              const band = bandOf(r.accuracy);
              return (
                <li key={r.id} data-testid={`practice-row-${r.id}`} className="rounded-xl border border-brand/10 bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
                        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: subjectColor(r.subjectId) }} />
                        <span className="truncate">{lookup.chapterName(r.chapterId) ?? lookup.subjectName(r.subjectId)}</span>
                      </p>
                      <p className="text-[12px] font-semibold text-muted">
                        {lookup.subjectName(r.subjectId)} · {sourceText(r)}
                        {r.durationMinutes ? ` · ${formatMinutes(r.durationMinutes)}` : ""}
                        {r.difficulty ? ` · ${r.difficulty}` : ""}
                      </p>
                    </div>
                    <div className={`shrink-0 rounded-lg px-2 py-1 text-right ${band ? BAND_STYLE[band].bg : "bg-tint-strong"}`} data-testid={`practice-score-${r.id}`}>
                      <p className="text-[14px] font-extrabold text-ink">
                        {r.questionsCorrect}/{r.questionsAttempted}
                      </p>
                      <p className={`text-[11px] font-bold ${band ? BAND_STYLE[band].fg : "text-muted"}`}>{percentLabel(r.accuracy)}</p>
                    </div>
                  </div>
                  <p className="mt-1 text-[12px] text-muted">
                    {r.questionsWrong} wrong · {r.questionsSkipped} skipped
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => onPlan(r)} data-testid={`practice-plan-${r.id}`} className="min-h-10 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-3 text-[13px] font-bold text-body-text hover:bg-tint-strong dark:text-ink">
                      Plan a follow-up
                    </button>
                    <button type="button" onClick={() => onEdit(r)} data-testid={`practice-edit-${r.id}`} className="min-h-10 rounded-lg px-3 text-[13px] font-bold text-muted hover:text-ink">
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(r)} data-testid={`practice-delete-${r.id}`} className="min-h-10 rounded-lg px-3 text-[13px] font-bold text-muted hover:text-danger">
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {hasMore && (
        <button type="button" data-testid="practice-load-more" onClick={onLoadMore} className="min-h-12 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
          Load more
        </button>
      )}
    </div>
  );
}
