import type { Drill, DrillMetric, DrillPeriod, MasterAnalytics } from "@/lib/api/masterAnalytics";
import { formatMinutes } from "@/lib/study/format";

/** Wording for the master dashboard and its drill-downs. */

export const METRIC_TITLE: Record<DrillMetric, string> = {
  hours: "Study time",
  questions: "Questions solved",
  accuracy: "Accuracy",
  speed: "Speed",
  revisions: "Revisions",
};

export const PERIOD_OPTIONS: { value: DrillPeriod; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "13 weeks" },
  { value: "all", label: "All time" },
];

export const GRANULARITY_NOUN = { day: "day", week: "week", month: "month" } as const;

/** A drill value in the metric's own unit: 95 → "1h 35m", 62.5 → "62.5%", 85 → "85s". */
export function drillValue(unit: Drill["unit"], value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  switch (unit) {
    case "minutes":
      return formatMinutes(value);
    case "percent":
      return `${value}%`;
    case "seconds_per_question":
      return `${value}s`;
    case "questions":
      return `${value}`;
    case "revisions":
      return `${value}`;
  }
}

export function isDrillMetric(value: string): value is DrillMetric {
  return value === "hours" || value === "questions" || value === "accuracy" || value === "speed" || value === "revisions";
}

export function isDrillPeriod(value: string | null): value is DrillPeriod {
  return value === "week" || value === "month" || value === "quarter" || value === "all";
}

/** The drill URL a dashboard tile points to. */
export function drillHref(metric: DrillMetric, period: DrillPeriod, subject?: number | null): string {
  const sp = new URLSearchParams({ period });
  if (subject) sp.set("subject", String(subject));
  return `/analytics/drill/${metric}?${sp.toString()}`;
}

/** The most recent week that has a value, or null (for the "latest accuracy / speed" tiles). */
export function latestWeek<T extends { weekStart: string }>(rows: T[], has: (r: T) => boolean): T | null {
  for (let i = rows.length - 1; i >= 0; i--) if (has(rows[i]!)) return rows[i]!;
  return null;
}

export function streakCaption(s: MasterAnalytics["streaks"]): string {
  const best = s.longest > s.current ? `best ${s.longest}` : "your best";
  return `${best}${s.shields.available ? " · shield ready" : ""}`;
}

export function goalUnitLabel(unit: string, value: number): string {
  if (unit === "HOURS") return `${value}h`;
  if (unit === "MINUTES") return formatMinutes(value);
  return String(value);
}
