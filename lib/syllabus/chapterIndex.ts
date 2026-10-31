import { getSyllabus } from "@/lib/api/syllabus";

export type ChapterInfo = { id: string; name: string; subjectId: number; theory: "not_started" | "learning" | "studied" };

let cached: Promise<Map<string, ChapterInfo>> | null = null;

/** Every chapter of the syllabus by id, loaded once per page load, so chips can show names for the ids the API sends. */
export function loadChapterIndex(): Promise<Map<string, ChapterInfo>> {
  if (!cached) {
    cached = getSyllabus()
      .then((r) => {
        const map = new Map<string, ChapterInfo>();
        for (const subject of r.data.subjects) for (const c of subject.chapters) map.set(c.chapterId, { id: c.chapterId, name: c.name, subjectId: c.subjectId, theory: c.progress.theoryStatus });
        return map;
      })
      .catch((err: unknown) => {
        cached = null; // let the next caller retry
        throw err;
      });
  }
  return cached;
}

export function resetChapterIndex(): void {
  cached = null;
}
