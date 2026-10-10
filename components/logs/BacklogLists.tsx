"use client";

import type { BacklogItem } from "@/lib/api/backlogItems";
import { dayLabel } from "@/lib/logs/dates";
import { BACKLOG_SOURCE_LABEL, labelOf, PRIORITIES, WINDOWS } from "@/lib/logs/labels";
import { formatMinutes } from "@/lib/study/format";
import { subjectColor, type SubjectLookup } from "@/lib/study/subjects";

const PRIORITY_STYLE: Record<number, string> = {
  1: "bg-[#EF444426] text-[#DC2626] dark:text-[#F87171]",
  2: "bg-[#F59E0B26] text-[#B45309] dark:text-[#FBBF24]",
  3: "bg-tint-strong text-ink dark:bg-[#FAF7F214]",
  4: "bg-tint-strong text-muted dark:bg-[#FAF7F214]",
  5: "bg-tint-strong text-muted dark:bg-[#FAF7F214]",
};

function Chip({ children, className = "", testId }: { children: React.ReactNode; className?: string; testId?: string }) {
  return (
    <span data-testid={testId} className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-[12px] font-bold ${className}`}>
      {children}
    </span>
  );
}

export function itemTitle(item: BacklogItem, lookup: SubjectLookup): string {
  return (item.chapterId ? lookup.chapterName(item.chapterId) : null) ?? item.topic ?? lookup.subjectName(item.subjectId);
}

type OpenProps = {
  items: BacklogItem[];
  lookup: SubjectLookup;
  hasMore: boolean;
  onLoadMore: () => void;
  onClear: (item: BacklogItem) => void;
  onSchedule: (item: BacklogItem) => void;
  onUnschedule: (item: BacklogItem) => void;
  onEdit: (item: BacklogItem) => void;
  onDrop: (item: BacklogItem) => void;
  busyId: string | null;
};

/** The Open tab: most urgent first. Clear · Schedule · Edit · Drop on every card. */
export function BacklogOpenList({ items, lookup, hasMore, onLoadMore, onClear, onSchedule, onUnschedule, onEdit, onDrop, busyId }: OpenProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl bg-tint-strong px-4 py-8 text-center text-[14px] text-muted dark:bg-[#FAF7F214]" data-testid="backlog-empty">
        Nothing on your backlog. Add what you are behind on, or let the Sunday sweep find it.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3" data-testid="backlog-open-list">
      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const scheduled = item.status === "scheduled";
          const disabled = busyId === item.id;
          return (
            <li key={item.id} data-testid={`backlog-item-${item.id}`} data-status={item.status} className="rounded-2xl border border-brand/10 bg-surface p-4">
              <div className="flex items-start gap-2">
                <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: subjectColor(item.subjectId) }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-extrabold leading-tight text-ink">{itemTitle(item, lookup)}</p>
                  <p className="text-[12px] font-semibold text-muted">
                    {lookup.subjectName(item.subjectId)}
                    {item.topic && item.chapterId ? ` · ${item.topic}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip className={PRIORITY_STYLE[item.priority] ?? PRIORITY_STYLE[3]!} testId={`priority-${item.id}`}>
                  {labelOf(PRIORITIES, item.priority)}
                </Chip>
                {item.deadline && (
                  <Chip className={item.isOverdue ? "bg-[#EF444426] text-[#DC2626] dark:text-[#F87171]" : "bg-tint-strong text-body-text dark:bg-[#FAF7F214] dark:text-ink"}>
                    {item.isOverdue ? "Overdue · " : "Due "}
                    {dayLabel(item.deadline)}
                  </Chip>
                )}
                {item.estimatedMinutes && <Chip className="bg-tint-strong text-body-text dark:bg-[#FAF7F214] dark:text-ink">{formatMinutes(item.estimatedMinutes)}</Chip>}
                {item.source !== "manual" && <Chip className="bg-[#6366F126] text-[#4338CA] dark:text-[#A5B4FC]">{BACKLOG_SOURCE_LABEL[item.source]}</Chip>}
                {scheduled && item.scheduledFor && (
                  <Chip className="bg-[#10B98126] text-[#047857] dark:text-[#34D399]" testId={`scheduled-${item.id}`}>
                    Scheduled · {dayLabel(item.scheduledFor)}
                    {item.scheduledWindow ? ` · ${labelOf(WINDOWS, item.scheduledWindow)}` : ""}
                  </Chip>
                )}
              </div>
              {item.notes && <p className="mt-2 line-clamp-2 text-[13px] text-body-text dark:text-ink">{item.notes}</p>}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button type="button" disabled={disabled} data-testid={`clear-${item.id}`} onClick={() => onClear(item)} className="min-h-11 rounded-lg border border-primary-button-border bg-cta px-3 text-[14px] font-bold text-white hover:bg-[#E8623F] disabled:opacity-60">
                  Clear
                </button>
                {scheduled ? (
                  <button type="button" disabled={disabled} data-testid={`unschedule-${item.id}`} onClick={() => onUnschedule(item)} className="min-h-11 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-3 text-[14px] font-bold text-body-text hover:bg-tint-strong disabled:opacity-60 dark:text-ink">
                    Unschedule
                  </button>
                ) : (
                  <button type="button" disabled={disabled} data-testid={`schedule-${item.id}`} onClick={() => onSchedule(item)} className="min-h-11 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-3 text-[14px] font-bold text-body-text hover:bg-tint-strong disabled:opacity-60 dark:text-ink">
                    Schedule
                  </button>
                )}
                <button type="button" disabled={disabled} data-testid={`edit-${item.id}`} onClick={() => onEdit(item)} className="min-h-11 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-3 text-[14px] font-bold text-body-text hover:bg-tint-strong disabled:opacity-60 dark:text-ink">
                  Edit
                </button>
                <button type="button" disabled={disabled} data-testid={`drop-${item.id}`} onClick={() => onDrop(item)} className="min-h-11 rounded-lg px-3 text-[14px] font-bold text-muted hover:text-danger disabled:opacity-60">
                  Drop
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {hasMore && (
        <button type="button" data-testid="backlog-load-more" onClick={onLoadMore} className="min-h-12 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
          Load more
        </button>
      )}
    </div>
  );
}

/** Whole days between creating and clearing an item. */
export function daysToClear(item: Pick<BacklogItem, "createdAt" | "clearedAt">): number | null {
  if (!item.clearedAt) return null;
  return Math.max(0, Math.round((new Date(item.clearedAt).getTime() - new Date(item.createdAt).getTime()) / 86_400_000));
}

export function clearLabel(days: number | null): string {
  if (days === null) return "";
  if (days === 0) return "Cleared the same day";
  return `Cleared in ${days} ${days === 1 ? "day" : "days"}`;
}

type HistoryProps = {
  items: BacklogItem[];
  lookup: SubjectLookup;
  hasMore: boolean;
  onLoadMore: () => void;
  onReopen: (item: BacklogItem) => void;
  busyId: string | null;
};

/** Cleared (with time-to-clear) and dropped items. */
export function BacklogHistory({ items, lookup, hasMore, onLoadMore, onReopen, busyId }: HistoryProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl bg-tint-strong px-4 py-8 text-center text-[14px] text-muted dark:bg-[#FAF7F214]" data-testid="backlog-history-empty">
        Cleared and dropped items show up here.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3" data-testid="backlog-history">
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} data-testid={`history-item-${item.id}`} data-status={item.status} className="flex items-center justify-between gap-3 rounded-xl border border-brand/10 bg-surface px-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-ink">{itemTitle(item, lookup)}</p>
              <p className="text-[12px] font-semibold text-muted">
                {lookup.subjectName(item.subjectId)} · {item.status === "cleared" ? clearLabel(daysToClear(item)) : "Dropped"}
              </p>
            </div>
            <button type="button" disabled={busyId === item.id} data-testid={`reopen-${item.id}`} onClick={() => onReopen(item)} className="min-h-10 shrink-0 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-3 text-[13px] font-bold text-body-text hover:bg-tint-strong disabled:opacity-60 dark:text-ink">
              Reopen
            </button>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button type="button" data-testid="backlog-history-more" onClick={onLoadMore} className="min-h-12 rounded-lg border-[1.5px] border-secondary-button-border bg-surface px-4 text-[15px] font-semibold text-body-text hover:bg-tint-strong dark:text-ink">
          Load more
        </button>
      )}
    </div>
  );
}
