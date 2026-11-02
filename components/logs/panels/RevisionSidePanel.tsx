"use client";

import { useEffect, useState } from "react";
import { PanelSection } from "@/components/logs/LogScreenScaffold";
import { GhostButton } from "@/components/ui/GhostButton";
import { getRevisionAnalytics, listRevisions, type RevisionLog, type StaleChapter } from "@/lib/api/revisionLogs";
import { addDaysToKey, dayKey } from "@/lib/logs/dates";
import type { SubjectLookup } from "@/lib/study/subjects";

const STALE_DAYS = 14;

/** Consecutive days with at least one revision, counting back from today (or from yesterday if today has none yet). */
export function revisionStreak(rows: Pick<RevisionLog, "loggedAt">[], now: Date = new Date()): number {
  const days = new Set(rows.map((r) => dayKey(new Date(r.loggedAt))));
  let cursor = dayKey(now);
  if (!days.has(cursor)) cursor = addDaysToKey(cursor, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDaysToKey(cursor, -1);
  }
  return streak;
}

/** The chapter revised most often since Monday, with its count. */
export function mostRevisedThisWeek(rows: Pick<RevisionLog, "loggedAt" | "chapterId">[], now: Date = new Date()): { chapterId: string; count: number } | null {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const counts = new Map<string, number>();
  for (const r of rows) if (new Date(r.loggedAt) >= monday) counts.set(r.chapterId, (counts.get(r.chapterId) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? { chapterId: top[0], count: top[1] } : null;
}

type Props = {
  lookup: SubjectLookup;
  onSeeAll: () => void;
  onAddTask: (chapter: StaleChapter) => void;
};

/** Revision's right column: the streak, the chapter revised most this week, what has gone stale, and a shortcut to plan one. */
export function RevisionSidePanel({ lookup, onSeeAll, onAddTask }: Props) {
  const [rows, setRows] = useState<RevisionLog[] | null>(null);
  const [stale, setStale] = useState<StaleChapter[] | null>(null);

  useEffect(() => {
    let alive = true;
    const from = new Date();
    from.setDate(from.getDate() - 30);
    // the list API returns at most 50 a page, so a busy month is read page by page (bounded at 4 pages)
    void (async () => {
      const all: RevisionLog[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 4; page += 1) {
        const r = await listRevisions({ from: from.toISOString(), limit: 50, cursor });
        all.push(...r.data.items);
        cursor = r.data.nextCursor;
        if (!cursor) break;
      }
      return all;
    })().then(
      (items) => alive && setRows(items),
      () => alive && setRows([]),
    );
    getRevisionAnalytics("all").then(
      (r) => alive && setStale(r.data.stale.filter((c) => c.daysAgo === null || c.daysAgo >= STALE_DAYS)),
      () => alive && setStale([]),
    );
    return () => {
      alive = false;
    };
  }, []);

  const streak = rows ? revisionStreak(rows) : null;
  const top = rows ? mostRevisedThisWeek(rows) : null;
  const shown = (stale ?? []).slice(0, 3);

  return (
    <>
      <PanelSection title="Revision streak" testId="rev-streak">
        <p className="text-[28px] font-bold leading-none text-ink">{streak === null ? "…" : streak}</p>
        <p className="text-[13px] text-muted">{streak === null ? "Loading" : streak === 1 ? "day in a row" : "days in a row"}</p>
      </PanelSection>

      <PanelSection title="Most revised this week" testId="rev-top">
        {rows === null ? (
          <p className="text-[13px] text-muted">Loading</p>
        ) : top ? (
          <p className="text-[14px] text-ink">
            {lookup.chapterName(top.chapterId) ?? "A chapter"} <span className="text-muted">· {top.count} {top.count === 1 ? "time" : "times"}</span>
          </p>
        ) : (
          <p className="text-[13px] text-muted">Nothing revised yet this week.</p>
        )}
      </PanelSection>

      <PanelSection title={`Not revised in ${STALE_DAYS}+ days`} testId="rev-stale">
        {stale === null ? (
          <p className="text-[13px] text-muted">Loading</p>
        ) : shown.length === 0 ? (
          <p className="text-[13px] text-muted">Every chapter is fresh.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {shown.map((c) => (
              <li key={c.chapterId} className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate text-ink">{c.chapterName ?? "Chapter"}</span>
                <span className="shrink-0 text-[12px] text-muted">{c.daysAgo === null ? "never" : `${c.daysAgo}d ago`}</span>
              </li>
            ))}
          </ul>
        )}
        {(stale?.length ?? 0) > 3 && (
          <button type="button" data-testid="rev-see-all" onClick={onSeeAll} className="self-start text-[13px] font-medium text-ink underline underline-offset-2">
            See all {stale!.length}
          </button>
        )}
      </PanelSection>

      <GhostButton data-testid="rev-add-task" disabled={shown.length === 0} onClick={() => shown[0] && onAddTask(shown[0])}>
        Add revision task to today
      </GhostButton>
    </>
  );
}
