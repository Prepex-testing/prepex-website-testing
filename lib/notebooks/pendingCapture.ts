/**
 * Photos picked or pasted on one screen and finished on the capture screen. A File cannot go through the address bar, so it waits
 * here for the one navigation. Lives in memory only: a refresh clears it, which is what a half-finished capture should do.
 */
let pending: File[] = [];

export function setPending(files: File[]): void {
  pending = files;
}

export function takePending(): File[] {
  const out = pending;
  pending = [];
  return out;
}

const KEY = "prepex.notebooks.last";

export type LastUsed = { chapterId: string | null; subjectId: number | null; source: string | null };

/** The chapter and source of the last capture, kept in this browser so the next one needs one tap less. Never throws. */
export function readLast(): LastUsed {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<LastUsed> | null;
    return { chapterId: v?.chapterId ?? null, subjectId: v?.subjectId ?? null, source: v?.source ?? null };
  } catch {
    return { chapterId: null, subjectId: null, source: null };
  }
}

export function writeLast(v: LastUsed): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* a blocked store only costs the shortcut */
  }
}
