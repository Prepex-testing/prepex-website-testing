import type { ChapterRow, SyllabusOverview } from "@/lib/api/syllabus";

/** A started chapter nobody has touched for this long counts as stale. */
export const STALE_AFTER_DAYS = 14;
const DAY = 86_400_000;

export type Attention = { chapter: ChapterRow; subjectName: string; reason: string };

const daysSince = (iso: string, now: Date) => Math.floor((now.getTime() - new Date(iso).getTime()) / DAY);

/**
 * The chapters that need a look: the weakest by accuracy (lowest first), and the stale ones (started, last studied the
 * longest ago, not already listed as weak). Three of each.
 */
export function attentionChapters(subjects: SyllabusOverview["subjects"], now: Date = new Date(), perKind = 3): { weak: Attention[]; stale: Attention[] } {
  const all = subjects.flatMap((s) => s.chapters.map((chapter) => ({ chapter, subjectName: s.name })));
  const weak = all
    .filter((c) => c.chapter.progress.strengthLabel === "weak")
    .sort((a, b) => (a.chapter.progress.accuracy ?? 101) - (b.chapter.progress.accuracy ?? 101) || a.chapter.name.localeCompare(b.chapter.name))
    .slice(0, perKind)
    .map((c) => ({ ...c, reason: c.chapter.progress.accuracy !== null ? `${Math.round(c.chapter.progress.accuracy)}% accuracy` : "weak" }));
  const weakIds = new Set(weak.map((w) => w.chapter.chapterId));
  const stale = all
    .filter((c) => !weakIds.has(c.chapter.chapterId) && c.chapter.progress.theoryStatus !== "not_started" && c.chapter.progress.lastStudiedAt !== null && daysSince(c.chapter.progress.lastStudiedAt, now) >= STALE_AFTER_DAYS)
    .sort((a, b) => (a.chapter.progress.lastStudiedAt ?? "").localeCompare(b.chapter.progress.lastStudiedAt ?? ""))
    .slice(0, perKind)
    .map((c) => ({ ...c, reason: `${daysSince(c.chapter.progress.lastStudiedAt!, now)} days since you studied it` }));
  return { weak, stale };
}

/** The chapter "Suggest next chapter" asks about: the weakest, else the stalest, else the first one not started. */
export function nextChapterToSuggest(subjects: SyllabusOverview["subjects"], now: Date = new Date()): ChapterRow | null {
  const { weak, stale } = attentionChapters(subjects, now, 1);
  if (weak[0]) return weak[0].chapter;
  if (stale[0]) return stale[0].chapter;
  return subjects.flatMap((s) => s.chapters).find((c) => c.progress.theoryStatus === "not_started") ?? null;
}
