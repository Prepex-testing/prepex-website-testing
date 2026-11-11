"use client";

import Link from "next/link";
import type { RankGpsHomeCard } from "@/lib/api/rankGps";
import { signed } from "@/lib/rankGps/format";
import { COPY, RANK_GPS_HREF } from "@/lib/rankGps/labels";
import { gpsTrigger } from "@/components/pexo/GpsPexo";
import { usePexoLine } from "@/components/pexo/PexoBubble";

/**
 * The compact Rank GPS card for Home and the Dashboard: "Rank GPS 72 ▲2.4 · Top move: ...". It reads the home card the
 * XP summary already carries, so showing it costs no extra request.
 */
export function RankGpsCard({ card, className = "" }: { card: RankGpsHomeCard | null | undefined; className?: string }) {
  // Pexo's Rank GPS line, as text on the card (Home already has its one Pexo bubble)
  const pick = card ? gpsTrigger({ state: card.state, change: card.change, topMove: card.topMove?.name ?? null, daysLeft: card.gate.needActiveDays - card.gate.activeDays }) : null;
  const line = usePexoLine(pick?.trigger ?? null, pick?.context ?? {}, card ? `${card.state}:${card.change}:${card.topMove?.name ?? ""}` : "");
  if (!card) return null;
  const pexoLine = line ? <span className="w-full text-[13px] text-muted" data-testid="rank-gps-card-pexo">{line.text}</span> : null;
  const base = `flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border border-border-subtle/70 bg-surface-elevated px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${className}`;
  if (card.state === "ready" && card.score !== null) {
    return (
      <Link href={RANK_GPS_HREF} className={base} data-testid="rank-gps-card" aria-label={`${COPY.name}: ${Math.round(card.score)}`}>
        <span className="flex items-baseline gap-3">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">{COPY.name}</span>
          <span className="text-[28px] font-extrabold leading-none tabular-nums text-ink" data-testid="rank-gps-card-score">{Math.round(card.score)}</span>
          {card.change !== null && card.change !== 0 && (
            <span className={`text-[13px] font-bold ${card.change > 0 ? "text-success" : "text-danger"}`} data-testid="rank-gps-card-change">
              {card.change > 0 ? "▲" : "▼"} {signed(Math.abs(card.change))}
            </span>
          )}
        </span>
        {card.topMove && <span className="min-w-0 truncate text-[13px] text-body-text dark:text-ink">Top move: <b className="font-semibold">{card.topMove.name}</b></span>}
        {pexoLine}
      </Link>
    );
  }
  const text =
    card.state === "waiting"
      ? "Your first report is ready to be built."
      : `Unlocks after ${card.gate.needDays} days and ${card.gate.needActiveDays} days of study (${Math.min(card.gate.activeDays, card.gate.needActiveDays)}/${card.gate.needActiveDays} so far).`;
  return (
    <Link href={RANK_GPS_HREF} className={base} data-testid="rank-gps-card" data-state={card.state}>
      <span className="flex items-baseline gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">{COPY.name}</span>
        <span className="text-[14px] text-body-text dark:text-ink">{text}</span>
      </span>
      {pexoLine}
    </Link>
  );
}
