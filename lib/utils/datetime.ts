const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** "Aug 12" */
export function formatShortDate(iso: string): string {
  return SHORT_DATE_FORMAT.format(new Date(iso));
}

/** Whole minutes elapsed between an ISO timestamp and now (never negative). */
export function minutesSince(iso: string): number {
  const elapsedMs = Date.now() - new Date(iso).getTime();
  return Math.max(Math.floor(elapsedMs / 60000), 0);
}

/** Whole seconds elapsed between an ISO timestamp and now (never negative). */
export function secondsSince(iso: string): number {
  const elapsedMs = Date.now() - new Date(iso).getTime();
  return Math.max(Math.floor(elapsedMs / 1000), 0);
}

/** "MM:SS" */
export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
