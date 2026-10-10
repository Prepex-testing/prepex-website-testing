"use client";

import type { StudyLogRow } from "@/lib/api/focus";
import { dayHeading, formatMinutes, groupByDay } from "@/lib/study/format";
import { subjectColor, type SubjectLookup } from "@/lib/study/subjects";

type Props = {
  rows: StudyLogRow[];
  lookup: SubjectLookup;
  now?: Date;
  onEdit: (row: StudyLogRow) => void;
  onDelete: (row: StudyLogRow) => void;
};

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/** The study log, newest first, grouped by day with a daily total. */
export function StudyLogList({ rows, lookup, now, onEdit, onDelete }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand/25 p-6 text-center" data-testid="log-empty">
        <p className="text-[16px] font-bold text-ink">Nothing logged yet</p>
        <p className="mt-1 text-[13px] text-muted">Finish a focus session or log the time you studied, and it shows up here.</p>
      </div>
    );
  }

  const groups = groupByDay(rows, (r) => r.loggedAt, (r) => r.durationMinutes);

  return (
    <div className="flex flex-col gap-5" data-testid="log-list">
      {groups.map((group) => (
        <section key={group.key} aria-label={dayHeading(group.key, now)}>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-[14px] font-extrabold text-ink">{dayHeading(group.key, now)}</h3>
            <span className="text-[12px] font-semibold text-muted">{formatMinutes(group.minutes)}</span>
          </div>
          <ul className="flex flex-col gap-2">
            {group.items.map((row) => {
              const chapter = lookup.chapterName(row.chapterId);
              const manual = row.source === "manual";
              return (
                <li key={row.id} className="flex items-start gap-3 rounded-xl border border-brand/10 bg-surface p-3" data-testid="log-row" data-source={row.source}>
                  <span aria-hidden className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ background: subjectColor(row.subjectId) }} />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[15px] font-bold text-ink">
                      {lookup.subjectName(row.subjectId)}
                      {chapter ? <span className="font-semibold text-muted"> · {chapter}</span> : null}
                    </p>
                    {row.topic && <p className="break-words text-[13px] text-body-text dark:text-ink">{row.topic}</p>}
                    {row.notes && <p className="mt-0.5 break-words text-[12px] text-muted">{row.notes}</p>}
                    <p className="mt-1 text-[12px] text-muted">
                      {timeOf(row.loggedAt)} · {manual ? "Logged by you" : "Focus Mode"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[16px] font-extrabold text-ink" data-testid="log-minutes">
                      {formatMinutes(row.durationMinutes)}
                    </span>
                    {manual && (
                      <div className="flex">
                        <button type="button" aria-label="Edit this entry" onClick={() => onEdit(row)} className="flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-[13px] font-semibold text-muted hover:bg-tint-strong">
                          Edit
                        </button>
                        <button type="button" aria-label="Delete this entry" onClick={() => onDelete(row)} className="flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-[13px] font-semibold text-danger hover:bg-danger-bg">
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
