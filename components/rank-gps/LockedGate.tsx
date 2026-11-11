import { PexoEmpty } from "@/components/pexo/PexoEmpty";
import { Check } from "lucide-react";
import { StatCard } from "@/components/stats/StatCard";
import { COPY } from "@/lib/rankGps/labels";
import type { GateState } from "@/lib/rankGps/types";

const R = 44;
const C = 2 * Math.PI * R;

/** The unlock state: a progress ring and a two-line checklist, so a new student sees exactly what is left. */
export function LockedGate({ gate }: { gate: GateState }) {
  const daysDone = Math.min(gate.needDays, gate.daysSinceSignup);
  const activeDone = Math.min(gate.needActiveDays, gate.activeDays);
  const fraction = (daysDone / gate.needDays + activeDone / gate.needActiveDays) / 2;
  const rows = [
    { done: gate.daysSinceSignup >= gate.needDays, text: `${gate.needDays} days since you joined`, progress: `${daysDone}/${gate.needDays}` },
    { done: gate.activeDays >= gate.needActiveDays, text: `${gate.needActiveDays} days with real study`, progress: `${activeDone}/${gate.needActiveDays}` },
  ];
  return (
    <StatCard title={COPY.lockedTitle} subtitle={COPY.lockedSub.toUpperCase()}>
      <PexoEmpty trigger="empty.rank_gps.locked">{null}</PexoEmpty>
      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row" data-testid="rank-gps-locked">
        <div className="relative size-28 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
            <circle cx={50} cy={50} r={R} fill="none" strokeWidth={9} className="stroke-tint-strong" />
            <circle cx={50} cy={50} r={R} fill="none" strokeWidth={9} strokeLinecap="round" className="stroke-brand" strokeDasharray={C} strokeDashoffset={C * (1 - fraction)} style={{ transition: "stroke-dashoffset var(--dur-emphasis) var(--ease-out)" }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[20px] font-extrabold text-ink" data-testid="locked-progress">{activeDone}/{gate.needActiveDays}</span>
        </div>
        <ul className="flex w-full flex-col gap-3">
          {rows.map((r) => (
            <li key={r.text} className="flex items-center justify-between gap-3 text-[14px]">
              <span className="flex items-center gap-2 text-body-text dark:text-ink">
                <span aria-hidden className={`flex size-5 items-center justify-center rounded-full ${r.done ? "bg-success text-white" : "border border-border-strong"}`}>{r.done && <Check size={12} strokeWidth={3} />}</span>
                {r.text}
              </span>
              <span className="font-bold text-ink">{r.progress}</span>
            </li>
          ))}
          <li className="text-[13px] text-muted">Study with the timer, log a practice set or finish a plan task. Each counts as a day.</li>
        </ul>
      </div>
    </StatCard>
  );
}
