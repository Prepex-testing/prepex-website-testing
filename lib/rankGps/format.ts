import type { ProjectionRange } from "@/lib/rankGps/types";

const IN = new Intl.NumberFormat("en-IN");
export const fmtInt = (n: number) => IN.format(Math.round(n));
export const fmtMarks = (n: number) => (Math.round(n * 10) / 10).toString();
export const fmtPercentile = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
export const signed = (n: number, digits = 1) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n * 10 ** digits) / 10 ** digits)}`;

/** "93.5 to 96.1" */
export const percentileBand = (p: ProjectionRange["percentile"]) => `${fmtPercentile(p.low)} to ${fmtPercentile(p.high)}`;
/** "about 8,200 to 15,400" (best rank first) */
export const rankWords = (r: ProjectionRange["rank"]) => `about ${fmtInt(r.best)} to ${fmtInt(r.worst)}`;
/** "Top 4% to 7%" from a percentile range. */
export const topBand = (p: ProjectionRange["percentile"]) => `Top ${Math.max(0.1, Math.round((100 - p.high) * 10) / 10)}% to ${Math.round((100 - p.low) * 10) / 10}%`;

/** Where a value sits on the 50..100 percentile track, as 0..100. */
export const trackPos = (percentile: number) => Math.min(100, Math.max(0, (percentile - 50) * 2));

export const weekLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
