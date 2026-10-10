/** Small formatting / grouping helpers shared by the Focus, Study Log and Mistakes screens. */

/** `45` → `45m`, `60` → `1h`, `85` → `1h 25m`, `0` → `0m`. */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`;
}

/** The viewer's local calendar day of an ISO instant, `YYYY-MM-DD`. */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** `Today`, `Yesterday`, or `Mon 5 Oct` for a `YYYY-MM-DD` key, relative to `now`. */
export function dayHeading(key: string, now: Date = new Date()): string {
  const today = localDayKey(now.toISOString());
  const yesterday = localDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12).toISOString());
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export interface DayGroup<T> {
  key: string;
  items: T[];
  /** Sum of `minutesOf` over the group. */
  minutes: number;
}

/** Groups items (already newest-first) by the viewer's local day, keeping order. */
export function groupByDay<T>(items: T[], isoOf: (item: T) => string, minutesOf: (item: T) => number = () => 0): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const key = localDayKey(isoOf(item));
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
      last.minutes += minutesOf(item);
    } else {
      groups.push({ key, items: [item], minutes: minutesOf(item) });
    }
  }
  return groups;
}

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;

/** "silly, Units ,silly" → ["silly", "units"] (trimmed, lower-cased, de-duplicated, capped). */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(/[,\n]/)) {
    const tag = raw.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
    if (tag) seen.add(tag);
    if (seen.size >= MAX_TAGS) break;
  }
  return [...seen];
}

/** Mirrors the server rule: https only, no credentials in the URL. */
export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** `datetime-local` value (`YYYY-MM-DDTHH:mm`) for an instant, in the viewer's timezone. */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A `datetime-local` value back to an ISO instant (the browser parses it as local time). */
export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}
