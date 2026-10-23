import { describe, expect, it } from "vitest";
import {
  countChapters,
  countCompleted,
  filterSections,
  groupByClass,
  keepKnown,
  toggleAll,
  toggleChapter,
  type OnboardingChapter,
  type OnboardingSubject,
} from "@/lib/onboarding/chapters";

let n = 0;
const ch = (subjectId: number, cls: number | null, name: string, sequenceOrder: number): OnboardingChapter => ({
  id: `c${++n}`,
  name,
  class: cls,
  subjectId,
  sequenceOrder,
});

const SUBJECTS: OnboardingSubject[] = [
  { id: 2, code: "CHEM", name: "Chemistry", chapters: [ch(2, 12, "Electrochemistry", 2), ch(2, 11, "Mole Concept", 1)] },
  { id: 3, code: "MATH", name: "Maths", chapters: [ch(3, 11, "Sets and Relations", 1), ch(3, 12, "Integrals", 2)] },
  { id: 1, code: "PHY", name: "Physics", chapters: [ch(1, 11, "Kinematics", 2), ch(1, 11, "Units and Measurements", 1), ch(1, 12, "Optics", 3)] },
  { id: 4, code: "BIO", name: "Biology", chapters: [ch(4, 11, "Cell", 1), ch(4, 12, "Genetics", 2)] },
];

describe("groupByClass", () => {
  const sections = groupByClass(SUBJECTS);

  it("shows Class 11 then Class 12, each with its subjects (Biology included when the server sent it)", () => {
    expect(sections.map((s) => s.label)).toEqual(["Class 11", "Class 12"]);
    expect(sections[0]!.subjects.map((s) => s.subjectName)).toEqual(["Chemistry", "Maths", "Physics", "Biology"]);
    expect(sections[1]!.subjects.map((s) => s.subjectName)).toEqual(["Chemistry", "Maths", "Physics", "Biology"]);
  });

  it("keeps each subject's chapters in syllabus order within the class", () => {
    const physics11 = sections[0]!.subjects.find((s) => s.subjectName === "Physics")!;
    expect(physics11.chapters.map((c) => c.name)).toEqual(["Units and Measurements", "Kinematics"]);
  });

  it("leaves Biology out when the goal has none", () => {
    const withoutBio = groupByClass(SUBJECTS.filter((s) => s.code !== "BIO"));
    expect(withoutBio.flatMap((c) => c.subjects.map((s) => s.subjectName))).not.toContain("Biology");
  });

  it("puts chapters with no class in their own section, last, and drops empty sections", () => {
    const withLoose = groupByClass([{ id: 9, code: "GT", name: "General Test", chapters: [ch(9, null, "Reasoning", 1)] }, ...SUBJECTS]);
    expect(withLoose.map((s) => s.label)).toEqual(["Class 11", "Class 12", "Other chapters"]);
    expect(groupByClass([])).toEqual([]);
  });

  it("counts every chapter once", () => {
    expect(countChapters(sections)).toBe(9);
    expect(countChapters(sections)).toBe(SUBJECTS.reduce((sum, s) => sum + s.chapters.length, 0));
  });
});

describe("filterSections (live search across every class and subject)", () => {
  const sections = groupByClass(SUBJECTS);
  const names = (s: ReturnType<typeof filterSections>) => s.flatMap((c) => c.subjects.flatMap((x) => x.chapters.map((k) => k.name)));

  it("returns everything for an empty search", () => {
    expect(filterSections(sections, "  ")).toBe(sections);
  });

  it("matches a chapter name anywhere, case-insensitively", () => {
    expect(names(filterSections(sections, "KINEM"))).toEqual(["Kinematics"]);
    // "chem" is in the subject name, so the whole subject matches — Class 11 first.
    expect(names(filterSections(sections, "chem"))).toEqual(["Mole Concept", "Electrochemistry"]);
  });

  it("matches on subject and class words too, and needs every word to match", () => {
    expect(names(filterSections(sections, "physics class 12"))).toEqual(["Optics"]);
    expect(names(filterSections(sections, "biology"))).toEqual(["Cell", "Genetics"]);
    expect(names(filterSections(sections, "kinematics zebra"))).toEqual([]);
  });

  it("drops subjects and classes that end up empty", () => {
    const out = filterSections(sections, "genetics");
    expect(out).toHaveLength(1);
    expect(out[0]!.label).toBe("Class 12");
    expect(out[0]!.subjects).toHaveLength(1);
  });
});

describe("tapping", () => {
  it("one tap marks a chapter complete, the next unmarks it — there is no partial state", () => {
    const once = toggleChapter([], "a");
    expect(once).toEqual(["a"]);
    expect(toggleChapter(once, "a")).toEqual([]);
    expect(toggleChapter(["a"], "b")).toEqual(["a", "b"]);
  });

  it("Mark all complete marks every chapter of a subject in one tap, without duplicating ones already done", () => {
    const physics = groupByClass(SUBJECTS)[0]!.subjects.find((s) => s.subjectName === "Physics")!;
    const first = physics.chapters[0]!.id;
    const out = toggleAll([first, "other"], physics.chapters);
    expect(out.filter((id) => id === first)).toHaveLength(1);
    expect(physics.chapters.every((c) => out.includes(c.id))).toBe(true);
    expect(out).toContain("other");
  });

  it("pressing it again undoes it, leaving other subjects alone", () => {
    const physics = groupByClass(SUBJECTS)[0]!.subjects.find((s) => s.subjectName === "Physics")!;
    const marked = toggleAll(["other"], physics.chapters);
    expect(toggleAll(marked, physics.chapters)).toEqual(["other"]);
  });

  it("only touches the chapters it is given (the ones a search left visible)", () => {
    const physics = groupByClass(SUBJECTS)[0]!.subjects.find((s) => s.subjectName === "Physics")!;
    const shown = [physics.chapters[0]!];
    const out = toggleAll([], shown);
    expect(out).toEqual([shown[0]!.id]);
  });

  it("counts a subject's completed chapters", () => {
    const physics = groupByClass(SUBJECTS)[0]!.subjects.find((s) => s.subjectName === "Physics")!;
    expect(countCompleted(physics, new Set([physics.chapters[0]!.id, "zzz"]))).toBe(1);
  });
});

describe("keepKnown", () => {
  it("drops ticks for chapters that are no longer in the syllabus", () => {
    const real = SUBJECTS[0]!.chapters[0]!.id;
    expect(keepKnown([real, "gone"], SUBJECTS)).toEqual([real]);
  });
});
