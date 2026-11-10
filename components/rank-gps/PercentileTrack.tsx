import { fmtPercentile, trackPos } from "@/lib/rankGps/format";

const TICKS = [50, 75, 90, 95, 99, 100];

/** A track from the 50th to the 100th percentile, with the projected range as a band, the centre as a dot and the target as a line. */
export function PercentileTrack({ low, high, centre, target }: { low: number; high: number; centre?: number; target?: number | null }) {
  const left = trackPos(low);
  const width = Math.max(1.5, trackPos(high) - left);
  return (
    <div className="w-full pt-4" data-testid="percentile-track">
      <div className="relative h-3 rounded-full bg-tint-strong" role="img" aria-label={`Projected percentile ${fmtPercentile(low)} to ${fmtPercentile(high)}${target ? `, target ${fmtPercentile(target)}` : ""}`}>
        <div className="absolute top-0 h-3 rounded-full bg-brand/80" style={{ left: `${left}%`, width: `${width}%` }} />
        {centre !== undefined && <div className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brand" style={{ left: `${trackPos(centre)}%` }} />}
        {target != null && (
          <div className="absolute -top-2 h-7 border-l-2 border-dashed border-ink" style={{ left: `${trackPos(target)}%` }} data-testid="track-target">
            <span className="absolute -top-4 left-1 whitespace-nowrap text-[11px] font-bold text-ink">Target</span>
          </div>
        )}
      </div>
      <div className="relative mt-2 h-4 text-[11px] text-muted">
        {TICKS.map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${trackPos(t)}%` }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
