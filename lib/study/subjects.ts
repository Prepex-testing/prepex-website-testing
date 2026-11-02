import type { SubjectChapters } from "@/lib/api/dashboard";
import type { MasterAnalytics } from "@/lib/api/masterAnalytics";

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

/** Subject names for the analytics dashboard. The syllabus lists every subject; the study split only those studied this
 * month, so a subject with no time yet would otherwise show as "Subject 2". */
export function masterSubjectNames(data: Pick<MasterAnalytics, "bySubject" | "syllabus"> | null): (id: number) => string {
  const names = new Map<number, string>();
  for (const s of data?.syllabus?.bySubject ?? []) names.set(s.subjectId, s.name);
  for (const s of data?.bySubject ?? []) if (s.subjectId !== null) names.set(s.subjectId, s.name);
  return (id) => names.get(id) ?? `Subject ${id}`;
}
