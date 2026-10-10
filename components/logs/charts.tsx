"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BacklogAnalytics } from "@/lib/api/backlogItems";
import type { PracticeAnalytics } from "@/lib/api/practiceLogs";
import type { SubjectComparison } from "@/lib/api/revisionLogs";
import { axisNumber, countScale, PERCENT_SCALE, rateScale } from "@/lib/logs/chartScale";
import { labelOf, PRACTICE_SOURCES } from "@/lib/logs/labels";
import { SOURCE_PALETTE } from "@/lib/logs/palette";

/**
 * The Phase 3 charts (Recharts). Loaded lazily by the screens, like the study-log chart.
 * Each is decorative: the same numbers are in a text list or table next to it.
 */

const TICK = { fill: "currentColor", fontSize: 12 } as const;
const COLORS = { revision: "#6366F1", practice: "#F59E0B", mock: "#10B981", added: "#6366F1", cleared: "#10B981", line: "#6366F1" } as const;

function shortWeek(weekStart: string): string {
  const [, m, d] = weekStart.split("-");
  return `${Number(d)}/${Number(m)}`;
}

/** Revision vs practice vs mock accuracy, per subject. */
export function AccuracyBars({ data }: { data: SubjectComparison[] }) {
  const rows = data.map((d) => ({ name: d.subjectName ?? `Subject ${d.subjectId}`, Revision: d.revision, Practice: d.practice, Mock: d.mock }));
  return (
    <div className="h-64 w-full text-muted" aria-hidden data-testid="accuracy-bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={TICK} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={TICK} domain={[0, PERCENT_SCALE.max]} ticks={PERCENT_SCALE.ticks} interval={0} tickFormatter={(v: number) => `${v}%`} width={42} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.08 }} formatter={(v) => (v === null || v === undefined ? "—" : `${v}%`)} contentStyle={{ borderRadius: 12, fontSize: 13 }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Revision" fill={COLORS.revision} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="Practice" fill={COLORS.practice} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="Mock" fill={COLORS.mock} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Backlog items in and out per week. */
export function BacklogTimeline({ data }: { data: BacklogAnalytics["timeline"] }) {
  const rows = data.map((w) => ({ week: shortWeek(w.weekStart), Added: w.added, Cleared: w.cleared }));
  const scale = countScale(Math.max(0, ...data.map((w) => Math.max(w.added, w.cleared))));
  return (
    <div className="h-56 w-full text-muted" aria-hidden data-testid="backlog-timeline">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tick={TICK} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={TICK} domain={[0, scale.max]} ticks={scale.ticks} interval={0} width={32} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.08 }} contentStyle={{ borderRadius: 12, fontSize: 13 }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Added" fill={COLORS.added} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="Cleared" fill={COLORS.cleared} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Accuracy by week. */
export function WeeklyAccuracyLine({ data }: { data: PracticeAnalytics["byWeek"] }) {
  const rows = data.map((w) => ({ week: shortWeek(w.weekStart), Accuracy: w.accuracy }));
  return (
    <div className="h-52 w-full text-muted" aria-hidden data-testid="weekly-accuracy">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tick={TICK} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={TICK} domain={[0, PERCENT_SCALE.max]} ticks={PERCENT_SCALE.ticks} interval={0} tickFormatter={(v: number) => `${v}%`} width={42} />
          <Tooltip formatter={(v) => (v === null || v === undefined ? "—" : `${v}%`)} contentStyle={{ borderRadius: 12, fontSize: 13 }} />
          <Line type="monotone" dataKey="Accuracy" stroke={COLORS.line} strokeWidth={3} dot={{ r: 4 }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Questions per minute, by week. */
export function SpeedLine({ data }: { data: PracticeAnalytics["speedTrend"] }) {
  const rows = data.map((w) => ({ week: shortWeek(w.weekStart), "Questions / min": w.questionsPerMinute }));
  const scale = rateScale(Math.max(0, ...data.map((w) => w.questionsPerMinute ?? 0)));
  return (
    <div className="h-52 w-full text-muted" aria-hidden data-testid="speed-line">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tick={TICK} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={TICK} domain={[0, scale.max]} ticks={scale.ticks} interval={0} tickFormatter={axisNumber} width={36} />
          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
          <Line type="monotone" dataKey="Questions / min" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Where the questions came from. */
export function SourceDonut({ data }: { data: PracticeAnalytics["bySource"] }) {
  const rows = data.map((s) => ({ name: labelOf(PRACTICE_SOURCES, s.source as never, s.source), value: s.attempted }));
  return (
    <div className="h-56 w-full" aria-hidden data-testid="source-donut">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} isAnimationActive={false} stroke="none">
            {rows.map((_, i) => (
              <Cell key={i} fill={SOURCE_PALETTE[i % SOURCE_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
