import type { DaySummary } from "@/lib/api/calendarView";

/** Month-grid maths for the calendar heatmap. Dates are `YYYY-MM-DD` keys throughout (no timezone arithmetic). */

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/** How hot a day is, from the minutes studied: none, under an hour, under two, under four, four or more. */
export function heatLevel(studiedMinutes: number): HeatLevel {
  if (studiedMinutes <= 0) return 0;
  if (studiedMinutes < 60) return 1;
  if (studiedMinutes < 120) return 2;
  if (studiedMinutes < 240) return 3;
  return 4;
}

export const HEAT_LABEL: Record<HeatLevel, string> = {
  0: "No study",
  1: "Under 1 hour",
  2: "1 to 2 hours",
  3: "2 to 4 hours",
  4: "4 hours or more",
};

export type GridCell = { kind: "blank" } | { kind: "day"; day: DaySummary; dayOfMonth: number };

const pad = (n: number) => String(n).padStart(2, "0");

export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 0 = Monday … 6 = Sunday for a date key. */
export function weekdayMonday0(key: string): number {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Monday-first rows of seven cells: leading blanks to the first weekday, trailing blanks to a full last row. */
export function monthGrid(days: DaySummary[]): GridCell[][] {
  if (days.length === 0) return [];
  const cells: GridCell[] = Array.from({ length: weekdayMonday0(days[0]!.date) }, () => ({ kind: "blank" as const }));
  for (const day of days) cells.push({ kind: "day", day, dayOfMonth: Number(day.date.slice(8, 10)) });
  while (cells.length % 7 !== 0) cells.push({ kind: "blank" });
  const rows: GridCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function monthTitle(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** The ISO 8601 week (`2026-W41`) a date key falls in. */
export function isoWeekOf(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  const thursday = new Date(date.getTime() + (3 - weekdayMonday0(key)) * 86_400_000);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Monday = new Date(jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * 86_400_000);
  const week = Math.round((thursday.getTime() - 3 * 86_400_000 - week1Monday.getTime()) / (7 * 86_400_000)) + 1;
  return `${year}-W${pad(week)}`;
}

/** A horizontal swipe long enough, and flat enough, to mean "other month". Swiping left goes forward. */
export function swipeDirection(start: { x: number; y: number }, end: { x: number; y: number }, minDistance = 60): "prev" | "next" | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < minDistance || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx < 0 ? "next" : "prev";
}

export const MOOD_LABEL: Record<number, string> = { 1: "Drained", 2: "Heavy", 3: "Steady", 4: "Good", 5: "Strong" };

/** The Monday (date key) of an ISO week such as "2026-W41". */
export function isoWeekMondayKey(isoWeek: string): string {
  const [yearPart, weekPart] = isoWeek.split("-W");
  const year = Number(yearPart);
  const week = Number(weekPart);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4.getTime() + (-((jan4.getUTCDay() + 6) % 7) + (week - 1) * 7) * 86_400_000);
  return monday.toISOString().slice(0, 10);
}

/** The ISO week that many weeks away. */
export function shiftWeek(isoWeek: string, delta: number): string {
  const monday = isoWeekMondayKey(isoWeek);
  const [y, m, d] = monday.split("-").map(Number) as [number, number, number];
  const moved = new Date(Date.UTC(y, m - 1, d + delta * 7));
  return isoWeekOf(moved.toISOString().slice(0, 10));
}

export function dayHeadingOf(key: string): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}
