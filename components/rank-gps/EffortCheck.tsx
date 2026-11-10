import { StatCard } from "@/components/stats/StatCard";
import { fmtMarks, weekLabel } from "@/lib/rankGps/format";
import { COPY, TASK_KIND_LABELS } from "@/lib/rankGps/labels";
import type { Effort, TaskKind } from "@/lib/rankGps/types";

const KINDS: TaskKind[] = ["lecture", "practice", "revision", "backlog", "mock"];
const COLOUR: Record<TaskKind, string> = {
  lecture: "bg-[#6366F1]",
  practice: "bg-[#10B981]",
  revision: "bg-[#F59E0B]",
  backlog: "bg-[#94A3B8]",
  mock: "bg-[#0EA5E9]",
};

/** Eight weeks of hours, stacked by what you did, with one plain sentence about the pattern. */
export function EffortCheck({ effort }: { effort: Effort }) {
  const totals = effort.weeks.map((w) => KINDS.reduce((a, k) => a + (w.hours[k] ?? 0), 0));
  const max = Math.max(1, ...totals);
  return (
    <StatCard title={COPY.effort} subtitle="LAST 8 WEEKS, HOURS BY KIND OF WORK">
      <div className="flex flex-col gap-4" data-testid="rank-gps-effort">
        <p className="text-[15px] font-semibold text-ink" data-testid="effort-primary">{effort.primary.text}</p>
        {effort.secondary && <p className="text-[13px] text-muted" data-testid="effort-secondary">{effort.secondary.text}</p>}
        <div className="flex h-36 items-end gap-2" role="img" aria-label="Hours per week, stacked by kind of work">
          {effort.weeks.map((w, i) => (
            <div key={w.weekStart} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <div className="flex w-full flex-col-reverse overflow-hidden rounded-md" style={{ height: `${(totals[i]! / max) * 100}%`, minHeight: totals[i]! > 0 ? 3 : 0 }} title={`${weekLabel(w.weekStart)}: ${fmtMarks(totals[i]!)} h`}>
                {KINDS.map((k) => (w.hours[k] ?? 0) > 0 ? <span key={k} className={COLOUR[k]} style={{ height: `${((w.hours[k] ?? 0) / totals[i]!) * 100}%` }} /> : null)}
              </div>
              <span className="text-[10px] text-muted">{weekLabel(w.weekStart)}</span>
            </div>
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          {KINDS.map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span aria-hidden className={`size-2.5 rounded-sm ${COLOUR[k]}`} />
              {TASK_KIND_LABELS[k]} {fmtMarks(effort.split[k] ?? 0)} h
            </li>
          ))}
        </ul>
      </div>
    </StatCard>
  );
}
