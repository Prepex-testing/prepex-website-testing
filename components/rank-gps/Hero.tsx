"use client";

import Link from "next/link";
import { useState } from "react";
import { Gauge } from "@/components/rank-gps/Gauge";
import { HowSheet } from "@/components/rank-gps/HowSheet";
import { PercentileTrack } from "@/components/rank-gps/PercentileTrack";
import { StatCard } from "@/components/stats/StatCard";
import { GhostButton } from "@/components/ui/GhostButton";
import { COMPONENT_LABELS, COPY } from "@/lib/rankGps/labels";
import { fmtMarks, percentileBand, rankWords, signed, topBand } from "@/lib/rankGps/format";
import type { RankGpsReport } from "@/lib/rankGps/types";

export function Hero({ report, change, targetPercentile, onShare }: { report: RankGpsReport; change: number | null; targetPercentile: number | null; onShare?: () => void }) {
  const [how, setHow] = useState(false);
  const p = report.projection;
  return (
    <StatCard padding="p-5 sm:p-6" bodyClassName="mt-0">
      <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)]" data-testid="rank-gps-hero">
        <div className="flex flex-col items-center gap-2">
          <Gauge value={report.readiness.score} />
          <p className="text-[13px] font-bold text-ink">Readiness score</p>
          {change !== null && change !== 0 && (
            <span data-testid="rank-gps-change" className={`rounded-full px-3 py-1 text-[13px] font-bold ${change > 0 ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>
              {change > 0 ? "▲" : "▼"} {signed(Math.abs(change))} since last report
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {p.status === "ready" && p.data ? (
            <>
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.5px] text-muted">{COPY.estimate} · projected percentile</p>
                <p className="mt-1 text-[30px] font-extrabold leading-tight text-ink" data-testid="rank-gps-percentile">{percentileBand(p.data.percentile)}</p>
                <p className="text-[14px] text-body-text dark:text-ink" data-testid="rank-gps-rank">Rank {rankWords(p.data.rank)} · {topBand(p.data.percentile)}</p>
                <p className="mt-1 text-[12px] text-muted">
                  From your last {p.data.mocksUsed} full mock{p.data.mocksUsed === 1 ? "" : "s"}: about {fmtMarks(p.data.marks.low)} to {fmtMarks(p.data.marks.high)} out of {report.paperMax}.
                </p>
              </div>
              <PercentileTrack low={p.data.percentile.low} high={p.data.percentile.high} centre={(p.data.percentile.low + p.data.percentile.high) / 2} target={targetPercentile} />
            </>
          ) : p.status === "needs_mocks" ? (
            <div className="rounded-xl border border-border-subtle p-4" data-testid="hero-needs-mocks">
              <p className="text-[15px] font-bold text-ink">{COPY.needsMocks}</p>
              <p className="mt-1 text-[13px] text-muted">You have {p.mocksHave} of {p.mocksNeed}. The readiness score already works without them.</p>
              <Link href="/logs/mocks" className="mt-2 inline-flex min-h-11 items-center text-[14px] font-bold text-brand underline dark:text-ink">Log a mock</Link>
            </div>
          ) : (
            <div className="rounded-xl border border-border-subtle p-4" data-testid="hero-no-percentile">
              <p className="text-[14px] text-body-text dark:text-ink">{COPY.neetNoPercentile}</p>
            </div>
          )}

          <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2" data-testid="readiness-components">
            {report.readiness.components.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-3 text-[13px]" title={COMPONENT_LABELS[c.key].hint}>
                <span className="text-muted">{COMPONENT_LABELS[c.key].label}</span>
                <span className="font-bold text-ink">{c.hasData ? `${Math.round(c.value)}` : "no data yet"}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <GhostButton onClick={() => setHow(true)} data-testid="how-open">{COPY.how}</GhostButton>
            {onShare && <GhostButton onClick={onShare} data-testid="share-open">{COPY.share}</GhostButton>}
          </div>
        </div>
      </div>
      <HowSheet open={how} onClose={() => setHow(false)} />
    </StatCard>
  );
}
