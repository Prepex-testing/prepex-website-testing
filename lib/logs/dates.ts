/** Local calendar-day helpers for the planner picker (the backend takes `YYYY-MM-DD` in the student's IST day). */

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return dayKey(new Date(y, m - 1, d + days, 12));
}

export interface DayChoice {
  key: string;
  /** "Today", "Tomorrow", "Fri 9 Oct" */
  label: string;
}

export function dayLabel(key: string, now: Date = new Date()): string {
  const today = dayKey(now);
  if (key === today) return "Today";
  if (key === addDaysToKey(today, 1)) return "Tomorrow";
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** The next `count` days starting today. */
export function nextDays(count: number, now: Date = new Date()): DayChoice[] {
  const start = dayKey(now);
  return Array.from({ length: count }, (_, i) => {
    const key = addDaysToKey(start, i);
    return { key, label: dayLabel(key, now) };
  });
}

/** Start of the viewer's local day as an ISO instant (for "today's revisions"). */
export function startOfTodayIso(now: Date = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

/** The window the current local time falls in — a sensible default for "Add to planner". */
export function currentWindow(now: Date = new Date()): "MORNING" | "MIDDAY" | "EVENING" | "NIGHT" {
  const h = now.getHours();
  if (h >= 5 && h < 11) return "MORNING";
  if (h >= 11 && h < 16) return "MIDDAY";
  if (h >= 16 && h < 21) return "EVENING";
  return "NIGHT";
}

/** "5d ago", "today", "never". */
export function agoLabel(daysAgo: number | null): string {
  if (daysAgo === null) return "never";
  if (daysAgo === 0) return "today";
  if (daysAgo === 1) return "yesterday";
  return `${daysAgo}d ago`;
}
