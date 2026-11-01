"use client";

import { useState } from "react";
import { GhostButton } from "@/components/ui/GhostButton";
import { applyBacklogFix, getFeasibility, hm, LANE_LABEL, setBacklogLane, setBacklogTarget, type BacklogHub as Hub, type Feasibility, type Fix, type HubItem, type Lane } from "@/lib/api/backlogHub";
import { ApiError } from "@/lib/api/http";

const METER: Record<Feasibility["meter"], { cls: string; label: string }> = {
  green: { cls: "bg-[var(--success)]", label: "Comfortable" },
  amber: { cls: "bg-[var(--warning)]", label: "Tight" },
  red: { cls: "bg-[var(--danger)]", label: "Not enough time" },
};

const LANES: Lane[] = ["must", "smart", "later"];
const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Plain-language names for the one-tap fixes. */
export function fixLabel(fix: Fix): string {
  if (fix.kind === "move_date") return `Move the date to ${shortDate(fix.date)}`;
  if (fix.kind === "smart_path") return `Switch ${fix.itemIds.length} ${fix.itemIds.length === 1 ? "chapter" : "chapters"} to Smart Path (saves ${fix.hoursSaved}h)`;
  return `Park ${fix.itemIds.length} low-weightage ${fix.itemIds.length === 1 ? "item" : "items"} for later (frees ${fix.hoursFreed}h)`;
}

/** The burndown: the minutes still on the backlog at the end of each of the last 8 weeks. */
export function Burndown({ points }: { points: Hub["burndown"] }) {
  const w = 320;
  const h = 110;
  const peak = Math.max(60, ...points.map((p) => p.minutes));
  const x = (i: number) => (points.length <= 1 ? 0 : (i / (points.length - 1)) * (w - 8) + 4);
  const y = (m: number) => h - 8 - (m / peak) * (h - 20);
  const line = points.map((p, i) => `${x(i)},${y(p.minutes)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Backlog hours over the last 8 weeks" className="h-28 w-full" data-testid="burndown">
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="text-brand" />
      {points.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={y(p.minutes)} r={i === points.length - 1 ? 4 : 2.5} className="fill-brand" />
      ))}
    </svg>
  );
}

function ItemRow({ item, onLane }: { item: HubItem; onLane: (id: string, lane: Lane | null) => void }) {
  return (
    <li className="flex flex-col gap-1.5 rounded-xl border border-border-subtle bg-surface p-3" data-testid="hub-item" data-lane={item.lane}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-[14px] font-semibold text-ink">
          {item.name}
          {item.subject && <span className="ml-2 text-[12px] font-normal text-muted">{item.subject}</span>}
        </p>
        <span className="text-[13px] font-semibold text-ink">{item.lane === "later" ? `${hm(item.fullMinutes)} parked` : hm(item.minutes)}</span>
      </div>
      <p className="text-[12px] text-muted" data-testid="lane-reason">{item.laneReason}</p>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Lane for ${item.name}`}>
        {LANES.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={item.lane === l}
            data-testid={`lane-${l}`}
            onClick={() => (item.lane === l ? undefined : onLane(item.id, l))}
            className={`min-h-9 rounded-full border px-3 text-[12px] font-semibold ${item.lane === l ? "border-[1.5px] border-brand bg-tint-strong text-ink" : "border-border-subtle bg-surface text-body-text dark:text-ink"}`}
          >
            {LANE_LABEL[l]}
          </button>
        ))}
        {item.laneManual && (
          <button type="button" data-testid="lane-auto" onClick={() => onLane(item.id, null)} className="min-h-9 px-2 text-[12px] font-semibold text-muted underline-offset-2 hover:underline">
            Back to automatic
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * The Backlog log's hub: total hours at the student's own pace, the three lanes with the reason each item is in one, an
 * optional target date with a feasibility meter and one-tap fixes, the burndown, and added vs cleared by week. No guilt copy
 * and no debt numbers: a long list is a list, and Smart Path is how it gets short.
 */
export function BacklogHub({ hub, onChanged }: { hub: Hub; onChanged: () => void }) {
  const [date, setDate] = useState(hub.target.date ?? "");
  const [feas, setFeas] = useState<Feasibility | null>(hub.target.feasibility);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Lane | null>("must");

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await work();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function checkDate(value: string) {
    setDate(value);
    if (!value) return setFeas(null);
    try {
      setFeas(await getFeasibility(value));
    } catch (err) {
      setFeas(null);
      setError(err instanceof ApiError ? err.message : "Pick a date from today on.");
    }
  }

  const last = hub.weekly[hub.weekly.length - 1];
  const peakWeek = Math.max(60, ...hub.weekly.flatMap((w) => [w.addedMinutes, w.clearedMinutes]));
  const empty = hub.items.length === 0;

  return (
    <div className="flex flex-col gap-5" data-testid="backlog-hub">
      <section className="rounded-2xl border border-border-subtle bg-surface-elevated p-5" data-testid="hub-total">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">To do</p>
        <p className="mt-1 text-[32px] font-extrabold leading-none text-ink" data-testid="hub-total-hours">{hm(hub.totalMinutes)}</p>
        <p className="mt-2 text-[13px] text-muted">
          {empty ? "Nothing on your backlog." : `${hub.items.length} ${hub.items.length === 1 ? "item" : "items"}${hub.parkedMinutes > 0 ? `, ${hm(hub.parkedMinutes)} parked for later` : ""}. Estimated at ${hub.pace.source === "own" ? "your own pace" : "typical pace until you have logged more"}.`}
        </p>
        {hub.todayQuotaMinutes > 0 && <p className="mt-1 text-[13px] text-ink" data-testid="hub-quota">Today&apos;s plan sets aside {hm(hub.todayQuotaMinutes)} for it.</p>}
      </section>

      {!empty && (
        <section className="flex flex-col gap-3" data-testid="hub-lanes" aria-label="Lanes">
          {LANES.map((lane) => {
            const items = hub.items.filter((i) => i.lane === lane);
            if (items.length === 0 && lane === "later") return null;
            return (
              <div key={lane} className="rounded-2xl border border-border-subtle bg-surface-elevated">
                <button type="button" aria-expanded={open === lane} data-testid={`lane-head-${lane}`} onClick={() => setOpen(open === lane ? null : lane)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left">
                  <span className="text-[15px] font-bold text-ink">
                    {LANE_LABEL[lane]} <span className="font-normal text-muted">({items.length})</span>
                  </span>
                  <span className="text-[13px] font-semibold text-ink">{lane === "later" ? `${hm(hub.lanes.later.minutes)} parked` : hm(hub.lanes[lane].minutes)}</span>
                </button>
                {open === lane && (
                  <ul className="flex flex-col gap-2 px-3 pb-3">
                    {items.length === 0 ? <li className="px-1 text-[13px] text-muted">Nothing here.</li> : items.map((i) => <ItemRow key={i.id} item={i} onLane={(id, l) => void run(() => setBacklogLane(id, l))} />)}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      )}

      {!empty && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-elevated p-4" data-testid="hub-target">
          <h2 className="text-[16px] font-bold text-ink">Target date (optional)</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" aria-label="Target date" data-testid="target-input" value={date} min={hub.today} onChange={(e) => void checkDate(e.target.value)} className="h-12 rounded-xl border border-input-border bg-surface px-3 text-[15px] text-ink outline-none focus:border-brand" />
            <GhostButton data-testid="target-save" disabled={busy || !date} onClick={() => void run(() => setBacklogTarget(date))}>
              {hub.target.date === date && date ? "Target set" : "Set this date"}
            </GhostButton>
            {hub.target.date && (
              <GhostButton data-testid="target-clear" disabled={busy} onClick={() => void run(async () => { await setBacklogTarget(null); setDate(""); setFeas(null); })}>
                No target
              </GhostButton>
            )}
          </div>
          {!date && <p className="text-[12px] text-muted">With no date, your plan paces the backlog with whatever free self-study time you have.</p>}
          {feas && (
            <div className="flex flex-col gap-2" data-testid="feasibility">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-tint-strong" role="img" aria-label={METER[feas.meter].label}>
                <div className={`h-full rounded-full ${METER[feas.meter].cls}`} style={{ width: `${Math.min(100, feas.availableMinutes > 0 ? Math.round((feas.requiredMinutes / feas.availableMinutes) * 100) : 100)}%` }} />
              </div>
              <p className="text-[13px] text-ink" data-testid="feasibility-text">
                {METER[feas.meter].label}: {hm(feas.requiredMinutes)} of work, {hm(feas.availableMinutes)} of free self-study time before then.
              </p>
              {!feas.feasible && feas.fixes.length > 0 && (
                <ul className="flex flex-col gap-2" aria-label="Ways to make it fit">
                  {feas.fixes.map((f) => (
                    <li key={f.kind}>
                      <GhostButton className="w-full text-left" data-testid={`fix-${f.kind}`} disabled={busy} onClick={() => void run(async () => { await applyBacklogFix(f); setFeas(null); })}>
                        {fixLabel(f)}
                      </GhostButton>
                    </li>
                  ))}
                </ul>
              )}
              {!feas.feasible && feas.fixes.length === 0 && <p className="text-[12px] text-muted">That is more than the free time before the exam. Park some items or add self-study time to your timetable.</p>}
            </div>
          )}
          {hub.target.date && hub.projectedClearDate && (
            <p className="text-[13px] text-muted" data-testid="projected">At your free time it clears by {shortDate(hub.projectedClearDate)}.</p>
          )}
        </section>
      )}

      {!empty && (
        <section className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-elevated p-4" data-testid="hub-burndown">
          <h2 className="text-[16px] font-bold text-ink">Hours left, week by week</h2>
          <Burndown points={hub.burndown} />
        </section>
      )}

      {hub.weekly.some((w) => w.added > 0 || w.cleared > 0) && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-elevated p-4" data-testid="hub-weekly">
          <h2 className="text-[16px] font-bold text-ink">Added and cleared</h2>
          <ul className="grid grid-cols-4 gap-3">
            {hub.weekly.map((w) => (
              <li key={w.weekStart} className="flex flex-col items-center gap-1" data-testid="hub-week">
                <span className="flex h-20 w-full items-end gap-1">
                  <span className="w-1/2 rounded-t-md bg-border-strong" style={{ height: `${Math.round((w.addedMinutes / peakWeek) * 100)}%`, minHeight: w.addedMinutes > 0 ? 4 : 0 }} title={`Added ${hm(w.addedMinutes)}`} />
                  <span className="w-1/2 rounded-t-md bg-brand" style={{ height: `${Math.round((w.clearedMinutes / peakWeek) * 100)}%`, minHeight: w.clearedMinutes > 0 ? 4 : 0 }} title={`Cleared ${hm(w.clearedMinutes)}`} />
                </span>
                <span className="text-[11px] text-muted">{shortDate(w.weekStart)}</span>
              </li>
            ))}
          </ul>
          <p className="flex gap-4 text-[11px] text-muted">
            <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-border-strong" aria-hidden />Added</span>
            <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-brand" aria-hidden />Cleared</span>
          </p>
          {hub.grewThisWeek && last && (
            <p className="rounded-xl bg-tint-strong px-3 py-2 text-[13px] text-ink" data-testid="grew-note">
              The list grew this week ({hm(last.addedMinutes)} added, {hm(last.clearedMinutes)} cleared). Clearing one small item first turns it around.
            </p>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
