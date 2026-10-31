const KEY = "prepex.quicklog.last";

export type LastTarget = { subjectId: number | null; chapterId: string | null };

/** The subject and chapter of the last quick log, so the next one starts there. Wrapped: storage can be blocked. */
export function readLast(): LastTarget | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<LastTarget>;
    return { subjectId: typeof v.subjectId === "number" ? v.subjectId : null, chapterId: typeof v.chapterId === "string" ? v.chapterId : null };
  } catch {
    return null;
  }
}

export function writeLast(target: LastTarget): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(target));
  } catch {
    /* remembering is a convenience */
  }
}

/** Today's IST date as YYYY-MM-DD, whatever the device's own time zone. */
export function istToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 19_800_000).toISOString().slice(0, 10);
}

/** The minute presets the "Studied" quick log offers. */
export const MINUTE_PRESETS = [15, 30, 45, 60, 90, 120] as const;
