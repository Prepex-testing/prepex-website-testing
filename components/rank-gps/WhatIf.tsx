"use client";

import { useMemo, useState } from "react";
import { StatCard } from "@/components/stats/StatCard";
import { fmtMarks, percentileBand, rankWords } from "@/lib/rankGps/format";
import { marksToPercentile, marksToRank } from "@/lib/rankGps/percentile";
import { COPY } from "@/lib/rankGps/labels";
import type { ProjectionData, WhatIf as WhatIfData } from "@/lib/rankGps/types";

type Lift = { acc: number; cov: number };

/** What the projection would be if you raised accuracy or coverage in a subject, using the same model the report used. */
export function whatIfCentre(w: WhatIfData, lifts: Record<number, Lift>, paperMax: number): number {
  let delta = 0;
  for (const s of w.subjects) {
    const l = lifts[s.subjectId] ?? { acc: 0, cov: 0 };
    const acc = Math.max(0.05, s.accuracy);
    const cov = Math.max(0.05, s.coverage);
    const next = s.modelMarks * (Math.min(1, acc + l.acc / 100) / acc) * (Math.min(1, cov + l.cov / 100) / cov);
    delta += Math.min(next, paperMax) - s.modelMarks;
  }
  return Math.min(paperMax, Math.max(0, w.baseCentre + delta * w.k));
}

export function WhatIf({ whatIf, projection, paperMax }: { whatIf: WhatIfData; projection: ProjectionData; paperMax: number }) {
  const [lifts, setLifts] = useState<Record<number, Lift>>({});
  const centre = useMemo(() => whatIfCentre(whatIf, lifts, paperMax), [whatIf, lifts, paperMax]);
  const down = projection.marks.centre - projection.marks.low;
  const up = projection.marks.high - projection.marks.centre;
  const low = Math.max(0, centre - down);
  const high = Math.min(paperMax, centre + up);
  const p = { low: marksToPercentile(low), high: marksToPercentile(high) };
  const r = { best: marksToRank(high), worst: marksToRank(low) };
  const set = (id: number, key: keyof Lift, v: number) => setLifts((m) => ({ ...m, [id]: { ...(m[id] ?? { acc: 0, cov: 0 }), [key]: v } }));

  return (
    <StatCard title={COPY.whatIf} subtitle={COPY.whatIfSub.toUpperCase()}>
      <div className="flex flex-col gap-4" data-testid="rank-gps-whatif">
        <div className="rounded-xl bg-tint-strong p-3" data-testid="whatif-result">
          <p className="text-[12px] font-bold uppercase tracking-[0.5px] text-muted">If you did this</p>
          <p className="text-[22px] font-extrabold text-ink">{percentileBand(p)} percentile</p>
          <p className="text-[13px] text-body-text dark:text-ink">Rank {rankWords(r)} · about {fmtMarks(low)} to {fmtMarks(high)} marks</p>
        </div>
        {whatIf.subjects.map((s) => (
          <fieldset key={s.subjectId} className="flex flex-col gap-2 rounded-xl border border-border-subtle p-3">
            <legend className="px-1 text-[14px] font-bold text-ink">{s.name}</legend>
            <label className="flex items-center gap-3 text-[13px] text-body-text dark:text-ink">
              <span className="w-28 shrink-0">Accuracy +{lifts[s.subjectId]?.acc ?? 0} pts</span>
              <input type="range" min={0} max={30} step={1} value={lifts[s.subjectId]?.acc ?? 0} onChange={(e) => set(s.subjectId, "acc", Number(e.target.value))} aria-label={`${s.name} accuracy points`} className="min-h-11 flex-1 accent-brand" />
            </label>
            <label className="flex items-center gap-3 text-[13px] text-body-text dark:text-ink">
              <span className="w-28 shrink-0">Coverage +{lifts[s.subjectId]?.cov ?? 0} pts</span>
              <input type="range" min={0} max={30} step={1} value={lifts[s.subjectId]?.cov ?? 0} onChange={(e) => set(s.subjectId, "cov", Number(e.target.value))} aria-label={`${s.name} coverage points`} className="min-h-11 flex-1 accent-brand" />
            </label>
          </fieldset>
        ))}
      </div>
    </StatCard>
  );
}
