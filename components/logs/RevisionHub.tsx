"use client";

import { useEffect, useState } from "react";
import { GhostButton } from "@/components/ui/GhostButton";
import { getRevisionHub, type Freshness, type HealthTile, type RevisionHub as Hub } from "@/lib/api/revisionLogs";
import { startFocusSession } from "@/lib/focus/startFocusSession";
import { formatMinutes } from "@/lib/study/format";

/** One colour per state, from the app's own tokens. */
const TILE: Record<Freshness, { cls: string; label: string }> = {
  overdue: { cls: "border-[var(--danger)] bg-[var(--danger-bg)] text-[var(--danger)]", label: "Overdue" },
  due: { cls: "border-[var(--warning)] bg-[var(--warning-bg)] text-ink", label: "Due today" },
  soon: { cls: "border-border-strong bg-tint-strong text-ink", label: "Due in 1-2 days" },
  fresh: { cls: "border-[var(--success)] bg-[var(--success-bg)] text-ink", label: "Fresh" },
};

const dayShort = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" });

export function groupBySubject(tiles: HealthTile[]): { subject: string; tiles: HealthTile[] }[] {
  const by = new Map<string, HealthTile[]>();
  for (const t of tiles) by.set(t.subject, [...(by.get(t.subject) ?? []), t]);
  return [...by.entries()].map(([subject, list]) => ({ subject, tiles: list }));
}

function Stat({ label, value, testId, danger }: { label: string; value: string; testId: string; danger?: boolean }) {
  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-border-subtle bg-surface-elevated px-4 py-3" data-testid={testId}>
      <span className={`text-[24px] font-extrabold leading-none ${danger ? "text-[var(--danger)]" : "text-ink"}`}>{value}</span>
      <span className="mt-1 text-[12px] text-muted">{label}</span>
    </div>
  );
}

/**
 * The Revision log's hub: how fresh every completed chapter is, what is due today (2-3 chapters, never a wall of them),
 * the next seven days of load, revision coverage and the overdue count. All of it is the one chapter state, so it agrees
 * with the planner, the syllabus and analytics. Its Start button is a ghost: the tab's one coral button is Start Revision on the
 * first planned card below it.
 */
export function RevisionHub() {
  const [hub, setHub] = useState<Hub | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    getRevisionHub()
      .then((res) => alive && setHub(res.data))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
        We couldn&apos;t load your revision overview. Please try again.
      </p>
    );
  }
  if (!hub) return <div className="h-40 animate-pulse rounded-2xl bg-surface-elevated" aria-hidden data-testid="rev-hub-loading" />;

  const groups = groupBySubject(hub.tiles);
  const peak = Math.max(1, ...hub.load7.map((d) => d.due));

  return (
    <div className="flex flex-col gap-5" data-testid="rev-hub">
      <div className="flex gap-3">
        <Stat testId="rev-hub-coverage" label="Revised on time" value={hub.coverage.percent === null ? "-" : `${hub.coverage.percent}%`} />
        <Stat testId="rev-hub-overdue" label="Overdue" value={String(hub.overdueCount)} danger={hub.overdueCount > 0} />
        <Stat testId="rev-hub-due" label="Due today" value={String(hub.dueTodayCount)} />
      </div>

      <section className="flex flex-col gap-3" data-testid="rev-hub-today">
        <h2 className="text-[18px] font-bold text-ink">Today&apos;s revision</h2>
        {hub.slotMinutesToday === 0 && hub.dueTodayCount > 0 && (
          <p className="rounded-xl border border-[var(--warning)] bg-[var(--warning-bg)] px-3 py-2 text-[13px] text-ink" data-testid="rev-hub-no-slot">
            No revision slot today. Add one in your timetable and these chapters will be planned.
          </p>
        )}
        {hub.todayDue.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border-strong p-5 text-center text-[14px] text-muted" data-testid="rev-hub-today-empty">
            {hub.tiles.length === 0 ? "Chapters you finish show up here for revision, starting the next day." : "Nothing to revise today."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {hub.todayDue.map((d, i) => (
              <li key={d.chapterId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface-elevated px-4 py-3" data-testid="rev-hub-card">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{d.name}</p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {d.subject} · {formatMinutes(d.minutes)}
                    {d.overdueDays > 0 ? ` · ${d.overdueDays} ${d.overdueDays === 1 ? "day" : "days"} late` : ""}
                  </p>
                  <p className="mt-1 text-[12px] text-body-text dark:text-ink">{d.plan}</p>
                </div>
                {i === 0 && (
                  <GhostButton
                    data-testid="rev-hub-start"
                    onClick={() => startFocusSession({ originSource: "revision_tab", subject: d.subject, chapter: d.chapterId, taskType: "revision", targetMinutes: d.minutes })}
                  >
                    Start revision
                  </GhostButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" data-testid="rev-hub-load">
        <h2 className="text-[18px] font-bold text-ink">Next 7 days</h2>
        <ul className="grid grid-cols-7 gap-2">
          {hub.load7.map((d, i) => (
            <li key={d.date} className="flex flex-col items-center gap-1" data-testid="rev-hub-day">
              <span className="text-[12px] font-semibold text-ink">{d.due}</span>
              <span className="flex h-16 w-full items-end rounded-lg bg-tint-strong">
                <span className="w-full rounded-lg bg-brand" style={{ height: `${Math.round((d.due / peak) * 100)}%`, minHeight: d.due > 0 ? 4 : 0 }} />
              </span>
              <span className="text-[11px] text-muted">{i === 0 ? "Today" : dayShort(d.date)}</span>
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-muted">Chapters due each day. Strong, low-weightage chapters are nudged to lighter days so no day piles up.</p>
      </section>

      <section className="flex flex-col gap-3" data-testid="rev-hub-health">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[18px] font-bold text-ink">Chapter health</h2>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted" aria-label="Legend">
            {(Object.keys(TILE) as Freshness[]).map((k) => (
              <li key={k} className="flex items-center gap-1">
                <span className={`inline-block size-3 rounded border ${TILE[k].cls}`} aria-hidden />
                {TILE[k].label}
              </li>
            ))}
          </ul>
        </div>
        {groups.length === 0 ? (
          <p className="text-[13px] text-muted">No completed chapters yet.</p>
        ) : (
          groups.map((g) => (
            <div key={g.subject} className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{g.subject}</h3>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {g.tiles.map((t) => (
                  <li
                    key={t.chapterId}
                    data-testid="rev-hub-tile"
                    data-freshness={t.freshness}
                    title={`${t.name}: ${TILE[t.freshness].label}${t.daysOverdue > 0 ? `, ${t.daysOverdue} days late` : ""}`}
                    className={`flex min-h-12 flex-col justify-center rounded-xl border px-3 py-2 ${TILE[t.freshness].cls}`}
                  >
                    <span className="truncate text-[13px] font-semibold">{t.name}</span>
                    <span className="text-[11px] opacity-80">{t.freshness === "overdue" ? `${t.daysOverdue}d late` : t.freshness === "due" ? "Today" : `Due ${dayShort(t.nextDueOn)}`}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
