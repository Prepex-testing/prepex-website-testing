import type { SubjectChapters } from "@/lib/api/dashboard";

/** A fixed palette, chosen to read on both the light and the dark theme. */
const PALETTE = ["#6366F1", "#F59E0B", "#10B981", "#EC4899", "#06B6D4", "#8B5CF6", "#EF4444"] as const;

/** Stable colour for a subject id (the same subject is the same colour on every screen). */
export function subjectColor(subjectId: number): string {
  return PALETTE[Math.abs(Math.trunc(subjectId)) % PALETTE.length]!;
}

export interface SubjectLookup {
  subjectName(id: number): string;
  chapterName(id: string | null): string | null;
}

export function makeSubjectLookup(subjects: SubjectChapters[]): SubjectLookup {
  const subjectNames = new Map(subjects.map((s) => [s.subjectId, s.subjectName]));
  const chapterNames = new Map(subjects.flatMap((s) => s.chapters.map((c) => [c.id, c.name] as const)));
  return {
    subjectName: (id) => subjectNames.get(id) ?? `Subject ${id}`,
    chapterName: (id) => (id ? (chapterNames.get(id) ?? null) : null),
  };
}
