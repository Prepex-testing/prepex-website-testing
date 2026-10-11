"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { axisNumber, countScale, PERCENT_SCALE } from "@/lib/logs/chartScale";

/**
 * Two generic charts for the Phase 4 screens (Recharts, loaded lazily — see LazyCharts). Each is decorative:
 * the same numbers are in a list or table beside it, so the charts are hidden from assistive tech.
 */

const TICK = { fill: "currentColor", fontSize: 12 } as const;

export type SeriesPoint = { label: string; value: number | null };

export type SeriesProps = {
  data: SeriesPoint[];
  /** What the value is: shown in the tooltip, e.g. "%", "min", "marks". */
  unit?: string;
  color?: string;
  /** "percent" fixes the axis at 0-100; "count" picks a clean 0-max scale. */
  scale?: "percent" | "count" | "auto";
  testId: string;
  height?: string;
  /** A reference line (e.g. the average). */
  reference?: number | null;
};

function axisFor(data: SeriesPoint[], scale: NonNullable<SeriesProps["scale"]>) {
  if (scale === "percent") return { domain: [0, PERCENT_SCALE.max] as [number, number], ticks: PERCENT_SCALE.ticks };
  if (scale === "count") {
    const s = countScale(Math.max(0, ...data.map((d) => d.value ?? 0)));
    return { domain: [0, s.max] as [number, number], ticks: s.ticks };
  }
  return { domain: undefined, ticks: undefined };
}

export function SeriesLine({ data, unit = "", color = "#6366F1", scale = "auto", testId, height = "h-52", reference = null }: SeriesProps) {
  const rows = data.map((d) => ({ name: d.label, value: d.value }));
  const axis = axisFor(data, scale);
  return (
    <div className={`${height} w-full text-muted`} aria-hidden data-testid={testId}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={TICK} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={TICK} domain={axis.domain} ticks={axis.ticks} interval={0} width={42} tickFormatter={(v: number) => (scale === "percent" ? `${v}%` : axisNumber(v))} />
          <Tooltip formatter={(v) => (v === null || v === undefined ? "—" : `${v}${unit}`)} contentStyle={{ borderRadius: 12, fontSize: 13 }} />
          {reference !== null && <ReferenceLine y={reference} stroke="currentColor" strokeOpacity={0.4} strokeDasharray="4 4" />}
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SeriesBars({ data, unit = "", color = "#6366F1", scale = "count", testId, height = "h-56" }: SeriesProps) {
  const rows = data.map((d) => ({ name: d.label, value: d.value }));
  const axis = axisFor(data, scale);
  return (
    <div className={`${height} w-full text-muted`} aria-hidden data-testid={testId}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={TICK} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={TICK} domain={axis.domain} ticks={axis.ticks} interval={0} width={42} tickFormatter={(v: number) => (scale === "percent" ? `${v}%` : axisNumber(v))} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.08 }} formatter={(v) => (v === null || v === undefined ? "—" : `${v}${unit}`)} contentStyle={{ borderRadius: 12, fontSize: 13 }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
