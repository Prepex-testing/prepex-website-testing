const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "10:00 AM" */
export function formatClockTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

/** "10:00 AM - 10:30 AM" */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatClockTime(startIso)} - ${formatClockTime(endIso)}`;
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
