import type { StudySummary } from "@/lib/api/studyLog";
import { dayLabel } from "@/lib/logs/dates";

export type SessionStats = {
  /** Minutes studied today; null when today is not inside the summary's range. */
  today: number | null;
  total: number;
  /** Average per day over the days of the period that have started (today included). */
  dailyAverage: number;
  best: { minutes: number; label: string } | null;
};

/**
 * The numbers beside the chart, all worked out from the summary's zero-filled day list. The weekly-goal hours
 * comparison is not here on purpose: there is no weekly hours goal in the backend, so there is nothing true to compare.
 */
export function sessionStats(summary: StudySummary, todayKey: string, now: Date = new Date()): SessionStats {
  const started = summary.byDay.filter((d) => d.date <= todayKey);
  const today = summary.byDay.find((d) => d.date === todayKey);
  const best = summary.byDay.reduce<{ minutes: number; date: string } | null>((acc, d) => (d.minutes > (acc?.minutes ?? 0) ? { minutes: d.minutes, date: d.date } : acc), null);
  return {
    today: today ? today.minutes : null,
    total: summary.totalMinutes,
    dailyAverage: started.length > 0 ? Math.round(started.reduce((n, d) => n + d.minutes, 0) / started.length) : 0,
    best: best ? { minutes: best.minutes, label: dayLabel(best.date, now) } : null,
  };
}
