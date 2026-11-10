import { forwardRef } from "react";
import { percentileBand, rankWords, signed } from "@/lib/rankGps/format";
import { RANK_GPS_NAME } from "@/lib/rankGps/labels";

export type ShareFigures = {
  score: number;
  change: number | null;
  /** Only filled when the student switched the percentile on. */
  percentile: { low: number; high: number } | null;
  /** Only filled when the student switched the rank on. */
  rank: { best: number; worst: number } | null;
  topMove: string | null;
  name: string | null;
  week: string;
};

export const SHARE_SIZES = { story: { w: 1080, h: 1920 }, square: { w: 1080, h: 1080 } } as const;
export type ShareFormat = keyof typeof SHARE_SIZES;

const FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

/**
 * The Rank GPS share cards, laid out at exactly their export size. Fixed colours and inline sizes on purpose: the image must
 * look the same on every device and in both themes. Percentile and rank appear only when the student switched them on.
 */
export const ShareCard = forwardRef<HTMLDivElement, { figures: ShareFigures; format: ShareFormat }>(function ShareCard({ figures, format }, ref) {
  const { w, h } = SHARE_SIZES[format];
  const story = format === "story";
  const arc = 2 * Math.PI * 150 * (240 / 360);
  return (
    <div
      ref={ref}
      data-testid={`rank-gps-share-${format}`}
      style={{ width: w, height: h, background: "#0F1115", color: "#FAF7F2", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: story ? 96 : 80, fontFamily: FONT, boxSizing: "border-box" }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span style={{ fontSize: story ? 64 : 56, fontWeight: 800, color: "#FF6B47" }}>Prepex</span>
        <span style={{ fontSize: story ? 52 : 44, color: "#9AA3B2" }}>
          {RANK_GPS_NAME} · {figures.name ? `${figures.name} · ` : ""}{figures.week}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: story ? 40 : 24 }}>
        <div style={{ position: "relative", width: story ? 640 : 460, height: story ? 600 : 430 }}>
          <svg viewBox="0 0 360 330" width="100%" height="100%">
            <path d="M65 257 A150 150 0 1 1 295 257" fill="none" stroke="#2A2F3A" strokeWidth={26} strokeLinecap="round" />
            <path d="M65 257 A150 150 0 1 1 295 257" fill="none" stroke="#8B8BF0" strokeWidth={26} strokeLinecap="round" strokeDasharray={arc} strokeDashoffset={arc * (1 - figures.score / 100)} />
          </svg>
          <div style={{ position: "absolute", left: 0, right: 0, top: story ? 230 : 160, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: story ? 220 : 160, fontWeight: 800, lineHeight: 1 }}>{Math.round(figures.score)}</span>
          </div>
        </div>
        <span style={{ fontSize: story ? 44 : 36, color: "#9AA3B2", marginTop: story ? -40 : -30 }}>readiness, out of 100</span>
        {figures.change !== null && figures.change !== 0 && (
          <span style={{ fontSize: story ? 56 : 44, fontWeight: 700, color: figures.change > 0 ? "#34D399" : "#F87171" }}>
            {figures.change > 0 ? "▲" : "▼"} {signed(Math.abs(figures.change))} this week
          </span>
        )}
        {figures.percentile && <span style={{ fontSize: story ? 64 : 48, fontWeight: 800 }}>{percentileBand(figures.percentile)} percentile</span>}
        {figures.rank && <span style={{ fontSize: story ? 44 : 36, color: "#9AA3B2" }}>Rank {rankWords(figures.rank)}</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "2px solid #2A2F3A", paddingTop: story ? 48 : 32 }}>
        {figures.topMove && (
          <>
            <span style={{ fontSize: story ? 40 : 32, color: "#9AA3B2" }}>Top move this week</span>
            <span style={{ fontSize: story ? 64 : 48, fontWeight: 800 }}>{figures.topMove}</span>
          </>
        )}
        <span style={{ fontSize: story ? 40 : 32, color: "#9AA3B2" }}>prepex.io</span>
      </div>
    </div>
  );
});
