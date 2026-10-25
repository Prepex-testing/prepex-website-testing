"use client";

import { useMemo, type ReactNode } from "react";
import { SlotBand } from "@/components/planner/SlotBand";
import type { Band, PlanTask } from "@/lib/api/plannerV2";
import { formatClock } from "@/lib/planner/format";

export type BandMode = "none" | "between" | "all";

export type Row =
  | { type: "task"; at: number; task: PlanTask }
  | { type: "band"; at: number; band: Band }
  | { type: "now"; at: number };

/**
 * Orders the day on one rail. Sleep never shows. `bands` says how much of the rest of the day sits around the study
 * tasks: "all" is the whole waking day (the full plan), "between" is only what falls between the first and last study
 * task (Home), "none" is the study tasks alone. Exported for tests.
 */
export function buildTimeline(tasks: PlanTask[], bands: Band[], nowMin: number | null, mode: BandMode): { rows: Row[]; floating: PlanTask[] } {
  const live = tasks.filter((t) => t.status !== "rolled_over");
  const timed = live.filter((t) => t.startMin !== null);
  const floating = live.filter((t) => t.startMin === null);

  const awake = bands.filter((b) => b.chip !== "sleep");
  let shown: Band[] = [];
  if (mode === "all") shown = awake;
  else if (mode === "between" && timed.length > 0) {
    const first = Math.min(...timed.map((t) => t.startMin!));
    const last = Math.max(...timed.map((t) => t.endMin ?? t.startMin!));
    shown = awake.filter((b) => b.startMin >= first && b.endMin <= last);
  }

  const rows: Row[] = [
    ...timed.map((task) => ({ type: "task" as const, at: task.startMin!, task })),
    ...shown.map((band) => ({ type: "band" as const, at: band.startMin, band })),
  ];
  if (nowMin !== null) rows.push({ type: "now", at: nowMin });
  rows.sort((a, b) => a.at - b.at || (a.type === "band" ? -1 : 1));
  return { rows, floating };
}

type Props = {
  tasks: PlanTask[];
  bands: Band[];
  bandMode: BandMode;
  /** Minutes since midnight; only passed for today, which is when the Now line shows. */
  nowMin: number | null;
  renderTask: (task: PlanTask) => ReactNode;
  highlightId?: string | null;
};

/** The day as a vertical rail: time labels on the left, study cards and dim slot bands on the right. */
export function TimelineRail({ tasks, bands, bandMode, nowMin, renderTask, highlightId }: Props) {
  const { rows, floating } = useMemo(() => buildTimeline(tasks, bands, nowMin, bandMode), [tasks, bands, nowMin, bandMode]);

  return (
    <ol className="relative flex flex-col" aria-label="Your day" data-testid="timeline">
      <span aria-hidden className="absolute bottom-2 left-[68px] top-2 w-px bg-brand/15" />
      {rows.map((row) => {
        if (row.type === "now") {
          return (
            <li key="now" className="grid grid-cols-[60px_1fr] items-center gap-4 py-1.5" data-testid="now-marker">
              <span className="text-right text-[11px] font-extrabold text-cta">Now</span>
              <span className="relative h-px bg-cta">
                <span aria-hidden className="absolute -left-[5px] -top-[4px] size-2 rounded-full bg-cta" />
              </span>
            </li>
          );
        }
        if (row.type === "band") {
          return (
            <li key={`band-${row.band.chip}-${row.band.startMin}`} className="grid grid-cols-[60px_1fr] items-center gap-4 py-1">
              <span className="text-right text-[11px] font-medium text-slate-500 dark:text-slate-400">{formatClock(row.band.startMin)}</span>
              <div className="relative">
                <span aria-hidden className="absolute -left-[11px] top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-brand/25" />
                <SlotBand band={row.band} />
              </div>
            </li>
          );
        }
        return (
          <li key={row.task.id} className="grid grid-cols-[60px_1fr] items-start gap-4 py-2">
            <span className="pt-5 text-right text-[11px] font-extrabold text-ink">{formatClock(row.task.startMin!)}</span>
            <div className={`relative min-w-0 ${highlightId === row.task.id ? "animate-pulse" : ""}`}>
              <span aria-hidden className="absolute -left-[13px] top-6 size-2.5 rounded-full border-2 border-background bg-brand" />
              {renderTask(row.task)}
            </div>
          </li>
        );
      })}
      {floating.map((task) => (
        <li key={task.id} className="grid grid-cols-[60px_1fr] items-start gap-4 py-2">
          <span className="pt-5 text-right text-[11px] font-semibold text-muted">Any time</span>
          <div className="min-w-0">{renderTask(task)}</div>
        </li>
      ))}
    </ol>
  );
}
