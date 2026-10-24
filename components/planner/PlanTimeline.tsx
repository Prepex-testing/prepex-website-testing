"use client";

import { useMemo } from "react";
import { PlanTaskCard, type TaskCardActions } from "@/components/planner/PlanTaskCard";
import type { Band, PlanTask } from "@/lib/api/plannerV2";
import { formatClock, formatDuration } from "@/lib/planner/format";

const BAND_LABEL: Record<string, string> = {
  school: "School",
  coaching: "Coaching",
  sleep: "Sleep",
  meal: "Meal",
  break: "Break",
  prayer: "Prayer",
  family: "Family time",
  exercise: "Exercise",
};

type Row =
  | { type: "task"; at: number; task: PlanTask }
  | { type: "band"; at: number; band: Band }
  | { type: "now"; at: number };

/** Orders the day's tasks and its muted bands on one rail. Exported for tests. */
export function buildRows(tasks: PlanTask[], bands: Band[], nowMin: number | null): { rows: Row[]; floating: PlanTask[] } {
  const timed = tasks.filter((t) => t.startMin !== null && t.status !== "rolled_over");
  const floating = tasks.filter((t) => t.startMin === null && t.status !== "rolled_over");
  const rows: Row[] = [
    ...timed.map((task) => ({ type: "task" as const, at: task.startMin!, task })),
    // sleep before the first task or after the last one only crowds the screen: the rail covers the waking day
    ...bands.filter((b) => b.chip !== "sleep").map((band) => ({ type: "band" as const, at: band.startMin, band })),
  ];
  if (nowMin !== null) rows.push({ type: "now", at: nowMin });
  rows.sort((a, b) => a.at - b.at || (a.type === "band" ? -1 : 1));
  return { rows, floating };
}

type Props = TaskCardActions & {
  tasks: PlanTask[];
  bands: Band[];
  /** Minutes since midnight, only for today. */
  nowMin: number | null;
  highlightId?: string | null;
};

export function PlanTimeline({ tasks, bands, nowMin, highlightId, ...actions }: Props) {
  const { rows, floating } = useMemo(() => buildRows(tasks, bands, nowMin), [tasks, bands, nowMin]);

  return (
    <ol className="relative flex flex-col" aria-label="Your day" data-testid="timeline">
      <span aria-hidden className="absolute bottom-2 left-[58px] top-2 w-px bg-brand/15" />
      {rows.map((row) => {
        if (row.type === "now") {
          return (
            <li key="now" className="relative grid grid-cols-[52px_1fr] items-center gap-3 py-1" data-testid="now-marker">
              <span className="text-right text-[11px] font-extrabold text-cta">Now</span>
              <span className="relative h-px bg-cta">
                <span aria-hidden className="absolute -left-[5px] -top-[4px] size-2 rounded-full bg-cta" />
              </span>
            </li>
          );
        }
        if (row.type === "band") {
          const { band } = row;
          return (
            <li key={`band-${band.chip}-${band.startMin}`} className="grid grid-cols-[52px_1fr] items-center gap-3 py-1" data-testid="band">
              <span className="text-right text-[11px] font-semibold text-muted">{formatClock(band.startMin)}</span>
              <span className="relative flex min-h-8 items-center rounded-lg bg-tint-strong px-3 text-[12px] font-semibold text-muted dark:bg-[#FAF7F20f]">
                <span aria-hidden className="absolute -left-[16px] size-2 rounded-full bg-brand/25" />
                {BAND_LABEL[band.chip] ?? band.chip} · {formatDuration(band.endMin - band.startMin)}
              </span>
            </li>
          );
        }
        const { task } = row;
        return (
          <li key={task.id} className="grid grid-cols-[52px_1fr] items-start gap-3 py-1.5">
            <span className="pt-4 text-right text-[11px] font-extrabold text-ink">{formatClock(task.startMin!)}</span>
            <div className={`relative ${highlightId === task.id ? "animate-pulse" : ""}`}>
              <span aria-hidden className="absolute -left-[16px] top-5 size-2.5 rounded-full border-2 border-background bg-brand" />
              <PlanTaskCard task={task} {...actions} />
            </div>
          </li>
        );
      })}
      {floating.map((task) => (
        <li key={task.id} className="grid grid-cols-[52px_1fr] items-start gap-3 py-1.5">
          <span className="pt-4 text-right text-[11px] font-semibold text-muted">Any time</span>
          <PlanTaskCard task={task} {...actions} />
        </li>
      ))}
    </ol>
  );
}
