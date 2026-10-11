"use client";

import type { DaySummary } from "@/lib/api/calendarView";
import { dateKey, HEAT_LABEL, heatLevel, MOOD_LABEL, monthGrid, type HeatLevel } from "@/lib/insights/heatmap";
import { formatMinutes } from "@/lib/study/format";

const LEVEL_CLASS: Record<HeatLevel, string> = {
  0: "bg-tint-strong text-muted",
  1: "bg-[#6366F133] text-ink",
  2: "bg-[#6366F166] text-ink",
  3: "bg-[#6366F1AA] text-white",
  4: "bg-[#4F46E5] text-white",
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function describe(day: DaySummary): string {
  const parts = [day.totalStudiedMinutes > 0 ? `${formatMinutes(day.totalStudiedMinutes)} studied` : "no study"];
  if (day.plannedMinutes > 0) parts.push(`${formatMinutes(day.plannedMinutes)} planned`);
  if (day.moodScore) parts.push(`mood ${MOOD_LABEL[day.moodScore]}`);
  if (day.mocks > 0) parts.push(`${day.mocks} mock${day.mocks === 1 ? "" : "s"}`);
  if (day.dayType === "NO_STUDY") parts.push("rest day");
  if (day.hasWeeklyDiagnosis) parts.push("weekly review ready");
  return parts.join(", ");
}

type Props = {
  year: number;
  month: number;
  days: DaySummary[];
  todayKey: string;
  selected: string | null;
  onSelect: (key: string) => void;
};

/** The month at a glance: a Monday-first grid, each day shaded by how long you studied. Sundays with a weekly review carry a badge. */
export function MonthHeatmap({ year, month, days, todayKey, selected, onSelect }: Props) {
  const rows = monthGrid(days);
  return (
    <div className="flex flex-col gap-1.5" data-testid="month-heatmap" data-month={`${year}-${String(month).padStart(2, "0")}`}>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[12px] font-bold text-muted" aria-hidden>
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      {rows.map((row, r) => (
        <div key={r} className="grid grid-cols-7 gap-1.5">
          {row.map((cell, c) => {
            if (cell.kind === "blank") return <span key={c} aria-hidden />;
            const { day, dayOfMonth } = cell;
            const level = heatLevel(day.totalStudiedMinutes);
            const isToday = day.date === todayKey;
            const key = dateKey(year, month, dayOfMonth);
            return (
              <button
                key={c}
                type="button"
                data-testid={`cal-day-${key}`}
                data-level={level}
                data-today={isToday || undefined}
                aria-label={`${dayOfMonth} ${new Date(Date.UTC(year, month - 1, dayOfMonth)).toLocaleString("en-US", { month: "long", timeZone: "UTC" })}: ${describe(day)}`}
                aria-pressed={selected === key}
                onClick={() => onSelect(key)}
                className={`relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-lg text-[14px] font-bold transition-transform active:scale-95 ${LEVEL_CLASS[level]} ${isToday ? "ring-2 ring-cta" : ""} ${selected === key ? "outline outline-2 outline-offset-1 outline-ink" : ""}`}
              >
                <span>{dayOfMonth}</span>
                {day.totalStudiedMinutes > 0 && <span className="text-[10px] font-semibold leading-none opacity-90">{formatMinutes(day.totalStudiedMinutes)}</span>}
                {day.hasWeeklyDiagnosis && (
                  <span data-testid={`cal-diagnosis-${key}`} title="Weekly review ready" className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-cta text-[9px] font-extrabold text-white">
                    W
                  </span>
                )}
                {day.mocks > 0 && <span data-testid={`cal-mock-${key}`} aria-hidden className="absolute bottom-0.5 left-1 size-1.5 rounded-full bg-[#10B981]" />}
                {day.dayType === "NO_STUDY" && <span aria-hidden className="absolute bottom-0.5 right-1 text-[9px] font-bold opacity-70">rest</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function HeatLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted" aria-label="Legend" data-testid="heat-legend">
      {([0, 1, 2, 3, 4] as HeatLevel[]).map((l) => (
        <li key={l} className="flex items-center gap-1.5">
          <span className={`size-3 rounded ${LEVEL_CLASS[l].split(" ")[0]}`} aria-hidden />
          {HEAT_LABEL[l]}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="flex size-3.5 items-center justify-center rounded-full bg-cta text-[8px] font-extrabold text-white" aria-hidden>
          W
        </span>
        Weekly review
      </li>
    </ul>
  );
}
