"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StudySummary } from "@/lib/api/studyLog";
import { axisLabel, minutesScale } from "@/lib/study/chartScale";
import { formatMinutes } from "@/lib/study/format";
import { subjectColor, type SubjectLookup } from "@/lib/study/subjects";

type Props = {
  summary: StudySummary;
  lookup: SubjectLookup;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function tickLabel(date: string, period: StudySummary["period"]): string {
  const d = new Date(`${date}T12:00:00`);
  return period === "month" ? String(d.getDate()) : (WEEKDAYS[d.getDay()] ?? date);
}

/** Stacked bars per day, one colour per subject. Chart is decorative; the list below it is the accessible version. */
export default function WeekChart({ summary, lookup }: Props) {
  const subjectIds = summary.bySubject.map((s) => s.subjectId);
  const data = summary.byDay.map((day) => ({
    label: tickLabel(day.date, summary.period),
    date: day.date,
    ...Object.fromEntries(subjectIds.map((id) => [`s${id}`, day.bySubject[String(id)] ?? 0])),
  }));

  const scale = minutesScale(Math.max(0, ...summary.byDay.map((d) => d.minutes)));

  return (
    <div data-testid="week-chart">
      <div className="h-56 w-full text-muted" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.15} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "currentColor", fontSize: 12 }} interval={summary.period === "month" ? 2 : 0} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "currentColor", fontSize: 12 }}
              // a tidy whole-minute scale, so one short session does not produce fractional or repeated labels
              domain={[0, scale.max]}
              ticks={scale.ticks}
              interval={0}
              tickFormatter={axisLabel}
              width={40}
            />
            <Tooltip
              cursor={{ fill: "currentColor", fillOpacity: 0.08 }}
              formatter={(value, name) => [formatMinutes(Number(value)), lookup.subjectName(Number(String(name).slice(1)))]}
              labelFormatter={(_, payload) => String(payload?.[0]?.payload?.date ?? "")}
              contentStyle={{ borderRadius: 12, fontSize: 13 }}
            />
            {subjectIds.map((id) => (
              <Bar key={id} dataKey={`s${id}`} stackId="day" fill={subjectColor(id)} radius={[0, 0, 0, 0]} isAnimationActive={false} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {summary.bySubject.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-semibold text-body-text dark:text-ink" data-testid="chart-legend">
          {summary.bySubject.map((s) => (
            <li key={s.subjectId} className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: subjectColor(s.subjectId) }} />
              {lookup.subjectName(s.subjectId)} · {formatMinutes(s.minutes)}
            </li>
          ))}
        </ul>
      )}

      <ul className="sr-only">
        {summary.byDay.map((d) => (
          <li key={d.date}>
            {d.date}: {formatMinutes(d.minutes)}
          </li>
        ))}
      </ul>
    </div>
  );
}
