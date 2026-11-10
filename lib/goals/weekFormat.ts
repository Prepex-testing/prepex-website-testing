/** Week arithmetic and labels for the weekly goals screen (a week is its Monday, "YYYY-MM-DD"). */

export function mondayOfNextWeek(weekStart: string): string {
  return mondayAfterWeeks(weekStart, 1);
}

/** The Monday `weeks` weeks after `weekStart` (a Monday). */
export function mondayAfterWeeks(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7 * weeks);
  return d.toISOString().slice(0, 10);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "5 – 11 Oct" for the week that starts on `weekStart` (a Monday). Month names are fixed: ICU spells September "Sept" in some runtimes. */
export function weekLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const dayMonth = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return start.getUTCMonth() === end.getUTCMonth() ? `${start.getUTCDate()} – ${dayMonth(end)}` : `${dayMonth(start)} – ${dayMonth(end)}`;
}
