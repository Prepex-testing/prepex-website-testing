"use client";

import { useEffect, useState } from "react";
import { BarRow, PanelSection } from "@/components/logs/LogScreenScaffold";
import { GhostButton } from "@/components/ui/GhostButton";
import { getBacklogAnalytics, listBacklogItems, scheduleBacklogItem, type BacklogAnalytics, type BacklogItem } from "@/lib/api/backlogItems";
import { currentWindow, dayKey } from "@/lib/logs/dates";
import type { SubjectLookup } from "@/lib/study/subjects";

type Props = {
  lookup: SubjectLookup;
  /** Called after items were added to today's plan, so the lists can refresh. */
  onPlanned: (count: number) => void;
};

/** Items per subject, from the open and scheduled items. */
export function countBySubject(items: Pick<BacklogItem, "subjectId">[]): { subjectId: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const i of items) counts.set(i.subjectId, (counts.get(i.subjectId) ?? 0) + 1);
  return [...counts.entries()].map(([subjectId, count]) => ({ subjectId, count })).sort((a, b) => b.count - a.count);
}

/** Backlog's right column: where it piles up, what is oldest, this week's clearance, and a one-tap "plan the oldest three for today". */
export function BacklogSidePanel({ lookup, onPlanned }: Props) {
  const [items, setItems] = useState<BacklogItem[] | null>(null);
  const [analytics, setAnalytics] = useState<BacklogAnalytics | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listBacklogItems({ status: "open", limit: 50 }).then(
      (r) => alive && setItems(r.data.items),
      () => alive && setItems([]),
    );
    getBacklogAnalytics().then(
      (r) => alive && setAnalytics(r.data),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, []);

  const bySubject = items ? countBySubject(items) : [];
  const max = Math.max(1, ...bySubject.map((s) => s.count));
  const oldest = items ? [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, 5) : [];
  const week = analytics?.timeline[analytics.timeline.length - 1];

  async function planNext() {
    const next = oldest.slice(0, 3);
    if (next.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const today = dayKey(new Date());
      const slot = currentWindow();
      for (const item of next) await scheduleBacklogItem(item.id, { date: today, timeSlot: slot });
      onPlanned(next.length);
      setItems((prev) => (prev ?? []).filter((i) => !next.some((n) => n.id === i.id)));
    } catch {
      setError("Couldn't add those to today's plan. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PanelSection title="Backlog by subject" testId="bl-by-subject">
        {items === null ? (
          <p className="text-[13px] text-muted">Loading</p>
        ) : bySubject.length === 0 ? (
          <p className="text-[13px] text-muted">Nothing open. Nice.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bySubject.map((s) => (
              <BarRow key={s.subjectId} label={lookup.subjectName(s.subjectId)} value={s.count} max={max} text={String(s.count)} />
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection title="Oldest open items" testId="bl-oldest">
        {items === null ? (
          <p className="text-[13px] text-muted">Loading</p>
        ) : oldest.length === 0 ? (
          <p className="text-[13px] text-muted">No open items.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {oldest.map((i) => (
              <li key={i.id} className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate text-ink">{lookup.chapterName(i.chapterId) ?? i.topic ?? lookup.subjectName(i.subjectId)}</span>
                <span className="shrink-0 text-[12px] text-muted">{i.ageDays}d</span>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>

      <PanelSection title="This week" testId="bl-week">
        {week ? (
          <p className="text-[14px] text-ink">
            {week.cleared} cleared <span className="text-muted">· {week.added} added</span>
          </p>
        ) : (
          <p className="text-[13px] text-muted">No activity yet this week.</p>
        )}
      </PanelSection>

      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <GhostButton data-testid="bl-plan-three" disabled={busy || oldest.length === 0} onClick={() => void planNext()}>
        {busy ? "Adding…" : "Clear next 3 to today's plan"}
      </GhostButton>
    </>
  );
}
