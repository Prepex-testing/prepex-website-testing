/**
 * Pure logic behind the chapter screen: regroup the server's subject lists by class, search them, and count.
 * No React, so the rules (sections, search, "mark all") are unit-tested.
 */

export type OnboardingChapter = { id: string; name: string; class: number | null; subjectId: number; sequenceOrder: number | null };
export type OnboardingSubject = { id: number; code: string; name: string; chapters: OnboardingChapter[] };

export type SubjectSection = { key: string; subjectId: number; subjectName: string; chapters: OnboardingChapter[] };
export type ClassSection = { key: string; label: string; subjects: SubjectSection[] };

/** Class 11 first, then Class 12, then chapters that belong to no class (CUET and the like). */
const CLASS_ORDER = [11, 12, null] as const;

const classLabel = (cls: number | null) => (cls === null ? "Other chapters" : `Class ${cls}`);

/** Subjects keep the order the server sent them in (A to Z), with each chapter in syllabus order. */
export function groupByClass(subjects: OnboardingSubject[]): ClassSection[] {
  return CLASS_ORDER.map((cls) => {
    const sections: SubjectSection[] = subjects
      .map((subject) => ({
        key: `${cls ?? "x"}-${subject.id}`,
        subjectId: subject.id,
        subjectName: subject.name,
        chapters: subject.chapters
          .filter((c) => (c.class ?? null) === cls)
          .sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0)),
      }))
      .filter((section) => section.chapters.length > 0);
    return { key: String(cls ?? "x"), label: classLabel(cls), subjects: sections };
  }).filter((section) => section.subjects.length > 0);
}

/** Keeps the chapters whose name contains every word of the query; sections left empty disappear. */
export function filterSections(sections: ClassSection[], query: string): ClassSection[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return sections;
  return sections
    .map((cls) => ({
      ...cls,
      subjects: cls.subjects
        .map((subject) => ({
          ...subject,
          chapters: subject.chapters.filter((c) => {
            const hay = `${c.name} ${subject.subjectName} ${classLabel(c.class)}`.toLowerCase();
            return words.every((w) => hay.includes(w));
          }),
        }))
        .filter((subject) => subject.chapters.length > 0),
    }))
    .filter((cls) => cls.subjects.length > 0);
}

export const countChapters = (sections: ClassSection[]) =>
  sections.reduce((sum, cls) => sum + cls.subjects.reduce((s, subject) => s + subject.chapters.length, 0), 0);

export const countCompleted = (subject: SubjectSection, completed: ReadonlySet<string>) =>
  subject.chapters.filter((c) => completed.has(c.id)).length;

/** Toggles one chapter. */
export function toggleChapter(completed: readonly string[], id: string): string[] {
  return completed.includes(id) ? completed.filter((x) => x !== id) : [...completed, id];
}

/**
 * "Mark all complete" on a subject header. If every chapter shown is already done it un-marks them instead,
 * so the same control also undoes itself. Chapters hidden by a search are left alone.
 */
export function toggleAll(completed: readonly string[], chapters: OnboardingChapter[]): string[] {
  const ids = chapters.map((c) => c.id);
  const allDone = ids.length > 0 && ids.every((id) => completed.includes(id));
  if (allDone) return completed.filter((id) => !ids.includes(id));
  return [...completed, ...ids.filter((id) => !completed.includes(id))];
}

/** Drops ids that are no longer in the syllabus (the goal changed after a draft was saved). */
export function keepKnown(completed: readonly string[], subjects: OnboardingSubject[]): string[] {
  const known = new Set(subjects.flatMap((s) => s.chapters.map((c) => c.id)));
  return completed.filter((id) => known.has(id));
}
