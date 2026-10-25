import { beforeEach, describe, expect, it } from "vitest";
import {
  aboutError,
  clearDraft,
  coachingValid,
  defaultExamDateIso,
  displayDateToIso,
  emptyDraft,
  firstIncompleteStep,
  goalValid,
  isoToDisplayDate,
  loadDraft,
  saveDraft,
  timetableValid,
  type OnboardingDraft,
} from "@/lib/onboarding/draft";
import {
  examForOption,
  GOAL_OPTIONS,
  goalOption,
  includesBiology,
  isClassTwelveOnly,
  needsSubjectPick,
  optionForExam,
  targetExamsFor,
} from "@/lib/onboarding/goal";
import { buildCompletePayload } from "@/lib/onboarding/payload";
import { ONBOARDING_STEPS, ONBOARDING_TOTAL_STEPS, stepPath } from "@/lib/onboarding/steps";
import { buildTemplate } from "@/lib/timetable/templates";
import { newKey } from "@/lib/timetable/grid";

const exam = (code: string, name: string) => ({ code, name });

describe("steps", () => {
  it("are five, numbered 1-5, each with its own path", () => {
    expect(ONBOARDING_TOTAL_STEPS).toBe(5);
    expect(ONBOARDING_STEPS.map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(ONBOARDING_STEPS.map((s) => s.path)).size).toBe(5);
    expect(ONBOARDING_STEPS.map((s) => s.name)).toEqual(["goal", "about_you", "coaching", "timetable", "chapters"]);
  });

  it("has no study-hours screen any more", () => {
    expect(ONBOARDING_STEPS.some((s) => s.path.includes("time-selection"))).toBe(false);
    expect(stepPath(99)).toBe(stepPath(1));
  });
});

describe("goal", () => {
  it.each([
    [exam("JEE_MAIN", "JEE Main"), ["JEE_MAIN"]],
    [exam("JEE_MAIN+ADVANCED", "JEE Main + Advanced"), ["JEE_MAIN", "JEE_ADVANCED"]],
    [exam("NEET", "NEET"), ["NEET"]],
    [exam("JEE_AND_NEET", "Both JEE and NEET"), ["JEE_MAIN", "JEE_ADVANCED", "NEET"]],
    [exam("CUET", "CUET"), ["CUET"]],
    [exam("BOARDS", "Class 12 Boards"), ["BOARDS"]],
  ])("%j -> %j", (e, expected) => {
    expect(targetExamsFor(e)).toEqual(expected);
  });

  it("asks for a subject pick only for goals that do not imply their subjects", () => {
    expect(needsSubjectPick(exam("JEE_MAIN", "JEE Main"))).toBe(false);
    expect(needsSubjectPick(exam("NEET", "NEET"))).toBe(false);
    expect(needsSubjectPick(exam("JEE_AND_NEET", "Both JEE and NEET"))).toBe(false);
    expect(needsSubjectPick(exam("CUET", "CUET"))).toBe(true);
    expect(needsSubjectPick(exam("JEE+CUET", "JEE + CUET"))).toBe(true);
    expect(needsSubjectPick(exam("BOARDS", "Boards"))).toBe(true);
    expect(needsSubjectPick(exam("BITSAT", "BITSAT"))).toBe(true);
  });

  it("includes Biology for NEET and for both, not for JEE", () => {
    expect(includesBiology(exam("NEET", "NEET"))).toBe(true);
    expect(includesBiology(exam("JEE_AND_NEET", "Both JEE and NEET"))).toBe(true);
    expect(includesBiology(exam("JEE_MAIN", "JEE Main"))).toBe(false);
  });

  it("locks Boards and CUET to Class 12", () => {
    expect(isClassTwelveOnly(exam("BOARDS", "Boards"))).toBe(true);
    expect(isClassTwelveOnly(exam("CUET", "CUET"))).toBe(true);
    expect(isClassTwelveOnly(exam("NEET", "NEET"))).toBe(false);
    expect(isClassTwelveOnly(null)).toBe(false);
  });

});

describe("goal options", () => {
  // The exam rows the testing API serves today, plus the NEET row that is still to be added.
  const EXAMS = [exam("JEE_MAIN", "JEE Main"), exam("JEE_ADVANCED", "JEE Advanced"), exam("JEE_AND_NEET", "Both JEE and NEET"), exam("NEET", "NEET")];

  it("offers exactly four, in this order, with these labels", () => {
    expect(GOAL_OPTIONS.map((o) => [o.title, o.subtitle])).toEqual([
      ["JEE Main", "NITs, IIITs and GFTIs"],
      ["JEE Advanced", "IITs — includes JEE Main"],
      ["Both JEE Main + Advanced", "The full JEE journey"],
      ["NEET", "AIIMS and medical colleges"],
    ]);
  });

  it("no longer offers Both JEE and NEET", () => {
    expect(GOAL_OPTIONS.some((o) => /neet/i.test(o.title) && /jee/i.test(o.title))).toBe(false);
    expect(GOAL_OPTIONS.some((o) => o.examCodes.includes("JEE_AND_NEET"))).toBe(false);
    expect(optionForExam(exam("JEE_AND_NEET", "Both JEE and NEET"))).toBeNull();
  });

  it("gives JEE Advanced and Both the same target exams: Main + Advanced", () => {
    expect(goalOption("JEE_ADVANCED")?.targetExams).toEqual(["JEE_MAIN", "JEE_ADVANCED"]);
    expect(goalOption("JEE_BOTH")?.targetExams).toEqual(["JEE_MAIN", "JEE_ADVANCED"]);
    expect(goalOption("JEE_MAIN")?.targetExams).toEqual(["JEE_MAIN"]);
    expect(goalOption("NEET")?.targetExams).toEqual(["NEET"]);
  });

  it("serves every option from an exam whose derived target exams are exactly the option's", () => {
    for (const option of GOAL_OPTIONS) {
      const served = examForOption(option, EXAMS);
      expect(served, option.key).not.toBeNull();
      expect(targetExamsFor(served!), option.key).toEqual(option.targetExams);
    }
  });

  it("serves Both from the JEE Advanced exam until a Main + Advanced exam exists, then prefers that", () => {
    const both = goalOption("JEE_BOTH")!;
    expect(examForOption(both, EXAMS)?.code).toBe("JEE_ADVANCED");
    expect(examForOption(both, [...EXAMS, exam("JEE_MAIN+ADVANCED", "JEE Main + Advanced")])?.code).toBe("JEE_MAIN+ADVANCED");
  });

  it("has no exam for NEET until the row exists, rather than guessing one", () => {
    expect(examForOption(goalOption("NEET")!, EXAMS.filter((e) => e.code !== "NEET"))).toBeNull();
  });

  it("matches a saved exam back to its card", () => {
    expect(optionForExam(exam("JEE_MAIN", "JEE Main"))).toBe("JEE_MAIN");
    expect(optionForExam(exam("JEE_ADVANCED", "JEE Advanced"))).toBe("JEE_ADVANCED");
    expect(optionForExam(exam("JEE_MAIN+ADVANCED", "JEE Main + Advanced"))).toBe("JEE_BOTH");
    expect(optionForExam(exam("NEET", "NEET"))).toBe("NEET");
    expect(optionForExam(null)).toBeNull();
  });

  it("shows Physics, Chemistry and Maths for every JEE option and Biology only for NEET", () => {
    for (const key of ["JEE_MAIN", "JEE_ADVANCED", "JEE_BOTH"] as const) {
      expect(includesBiology(examForOption(goalOption(key)!, EXAMS)!), key).toBe(false);
    }
    expect(includesBiology(examForOption(goalOption("NEET")!, EXAMS)!)).toBe(true);
  });
});

describe("dates", () => {
  it("converts between the picker's DD/MM/YYYY and ISO, and refuses impossible dates", () => {
    expect(displayDateToIso("15/05/2027")).toBe("2027-05-15");
    expect(isoToDisplayDate("2027-05-15")).toBe("15/05/2027");
    expect(displayDateToIso("31/02/2027")).toBeNull();
    expect(displayDateToIso("2027-05-15")).toBeNull();
    expect(displayDateToIso("")).toBeNull();
  });

  it("defaults the exam date to mid-May: two years out for Class 11, one for everyone else", () => {
    const now = new Date("2026-10-24T00:00:00Z");
    expect(defaultExamDateIso("CLASS_11", now)).toBe("2028-05-15");
    expect(defaultExamDateIso("CLASS_12", now)).toBe("2027-05-15");
    expect(defaultExamDateIso("DROPPER_1", now)).toBe("2027-05-15");
  });
});

describe("validation: Next stays off until a screen is valid", () => {
  const base = emptyDraft();

  it("goal needs an exam, and subjects when the goal asks for them", () => {
    expect(goalValid(base, false)).toBe(false);
    const picked: OnboardingDraft = { ...base, goal: { ...base.goal, examId: "x" } };
    expect(goalValid(picked, false)).toBe(true);
    expect(goalValid(picked, true)).toBe(false);
    expect(goalValid({ ...picked, goal: { ...picked.goal, subjectIds: [3] } }, true)).toBe(true);
  });

  it("about needs a name; a phone number and an exam date are optional but must be well-formed when given", () => {
    const about = { ...base.about, fullName: "Rohan" };
    expect(aboutError(base.about)).toMatch(/name/i);
    expect(aboutError(about)).toBeNull();
    expect(aboutError({ ...about, phoneNumber: "12345" })).toMatch(/10-digit/);
    expect(aboutError({ ...about, phoneNumber: "9876543210" })).toBeNull();
    expect(aboutError({ ...about, examDate: "soon" })).toMatch(/DD\/MM\/YYYY/);
    expect(aboutError({ ...about, examDate: "15/05/2027" })).toBeNull();
  });

  it("coaching needs a coaching name only when the student attends coaching", () => {
    expect(coachingValid({ type: "SELF_PREP", name: "", batch: "" })).toBe(true);
    expect(coachingValid({ type: "ONLINE_SELF_PREP", name: "", batch: "" })).toBe(true);
    expect(coachingValid({ type: "COACHING", name: "", batch: "" })).toBe(false);
    expect(coachingValid({ type: "COACHING", name: "Allen Career Institute", batch: "" })).toBe(true);
  });

  it("the week needs a Self-Study or Practice block", () => {
    const blocks = buildTemplate("SELF_PREP");
    expect(timetableValid(blocks)).toBe(true);
    expect(timetableValid([])).toBe(false);
    expect(timetableValid(blocks.filter((b) => b.activityType !== "SELF_STUDY" && b.activityType !== "PRACTICE"))).toBe(false);
  });

  it("firstIncompleteStep sends a direct visit to the first screen that is missing something", () => {
    let d = emptyDraft();
    expect(firstIncompleteStep(d, false)).toBe(1);
    d = { ...d, goal: { ...d.goal, examId: "x" } };
    expect(firstIncompleteStep(d, false)).toBe(2);
    d = { ...d, about: { ...d.about, fullName: "Rohan" } };
    // Self-prep is the starting answer on the coaching screen, so it is already valid; the empty week is next.
    expect(firstIncompleteStep(d, false)).toBe(4);
    expect(firstIncompleteStep({ ...d, coaching: { type: "COACHING", name: "", batch: "" } }, false)).toBe(3);
    d = { ...d, timetable: { ...d.timetable, blocks: buildTemplate("SELF_PREP") } };
    expect(firstIncompleteStep(d, false)).toBe(5);
  });
});

describe("draft storage (survives a reload, never crosses students)", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => void store.set(k, v),
          removeItem: (k: string) => void store.delete(k),
        },
      },
    });
  });

  it("round-trips what was saved", () => {
    const d = emptyDraft();
    d.about.fullName = "Rohan Sharma";
    d.coaching = { type: "COACHING", name: "FIITJEE", batch: "Evening Batch" };
    d.timetable.blocks = buildTemplate("SELF_PREP");
    d.chapters.completedIds = ["a", "b"];
    saveDraft("student-1", d);

    const back = loadDraft("student-1")!;
    expect(back.about.fullName).toBe("Rohan Sharma");
    expect(back.coaching).toEqual({ type: "COACHING", name: "FIITJEE", batch: "Evening Batch" });
    expect(back.timetable.blocks).toHaveLength(d.timetable.blocks.length);
    expect(back.chapters.completedIds).toEqual(["a", "b"]);
  });

  it("keeps one student's answers away from another's", () => {
    const d = emptyDraft();
    d.about.fullName = "Rohan";
    saveDraft("student-1", d);
    expect(loadDraft("student-2")).toBeNull();
  });

  it("ignores a draft from another version or a corrupt one, and forgets on clear", () => {
    window.localStorage.setItem("prepex_onboarding_draft_v1:s", JSON.stringify({ version: 0 }));
    expect(loadDraft("s")).toBeNull();
    window.localStorage.setItem("prepex_onboarding_draft_v1:s", "{not json");
    expect(loadDraft("s")).toBeNull();
    saveDraft("s", emptyDraft());
    expect(loadDraft("s")).not.toBeNull();
    clearDraft("s");
    expect(loadDraft("s")).toBeNull();
  });

  it("fills in fields an older draft did not have", () => {
    window.localStorage.setItem("prepex_onboarding_draft_v1:s", JSON.stringify({ version: 1, step: 3, about: { fullName: "Rohan" } }));
    const d = loadDraft("s")!;
    expect(d.step).toBe(3);
    expect(d.about.fullName).toBe("Rohan");
    expect(d.about.currentLevel).toBe("CLASS_11");
    expect(d.timetable.uniformWeek).toBe(true);
    expect(d.chapters.completedIds).toEqual([]);
    expect(d.goal.option).toBeNull();
  });
});

describe("buildCompletePayload", () => {
  function filled(): OnboardingDraft {
    const d = emptyDraft();
    return {
      ...d,
      goal: { examId: "exam-1", examCode: "JEE_ADVANCED", examName: "JEE Advanced", subjectIds: [], option: "JEE_BOTH" },
      about: { fullName: "  Rohan Sharma ", city: " Bhopal ", phoneNumber: "", examDate: "15/05/2027", currentLevel: "CLASS_12" },
      coaching: { type: "COACHING", name: "Allen Career Institute", batch: "Evening Batch" },
      timetable: { uniformWeek: false, blocks: buildTemplate("SCHOOL_COACHING").map((b) => ({ ...b, id: "server-id" })), templateId: "SCHOOL_COACHING", templateFor: "x", edited: false },
      chapters: { completedIds: ["c1", "c2"] },
    };
  }

  it("sends all five steps in one body, trimmed", () => {
    const p = buildCompletePayload(filled(), false);
    expect(p).toMatchObject({
      examId: "exam-1",
      fullName: "Rohan Sharma",
      city: "Bhopal",
      targetExamDate: "2027-05-15",
      currentLevel: "CLASS_12",
      coachingType: "COACHING",
      coachingName: "Allen Career Institute",
      batchName: "Evening Batch",
      completedChapterIds: ["c1", "c2"],
    });
    expect(p.timetable.uniformWeek).toBe(false);
    expect(p.timetable.blocks.length).toBeGreaterThan(20);
    expect("subjectIds" in p).toBe(false);
  });

  it("leaves out a blank phone number rather than sending an empty string", () => {
    expect("phoneNumber" in buildCompletePayload(filled(), false)).toBe(false);
    expect(buildCompletePayload({ ...filled(), about: { ...filled().about, phoneNumber: "9876543210" } }, false).phoneNumber).toBe("9876543210");
  });

  it("records the template when it is untouched and a manual week once it was changed", () => {
    expect(buildCompletePayload(filled(), false).timetable.source).toBe("COACHING_TEMPLATE");
    const edited = filled();
    edited.timetable.edited = true;
    expect(buildCompletePayload(edited, false).timetable.source).toBe("MANUAL");
    const own = filled();
    own.timetable.templateId = null;
    expect(buildCompletePayload(own, false).timetable.source).toBe("MANUAL");
  });

  it("drops server ids from the blocks and sends valid HH:MM times", () => {
    const { blocks } = buildCompletePayload(filled(), false).timetable;
    expect(blocks.every((b) => !("id" in b))).toBe(true);
    expect(blocks.every((b) => /^\d\d:\d\d$/.test(b.startTime) && /^(\d\d:\d\d)$/.test(b.endTime))).toBe(true);
  });

  it("drops the coaching name and batch for a self-prep student, and falls back to the usual exam date", () => {
    const d = filled();
    d.coaching = { type: "SELF_PREP", name: "Allen Career Institute", batch: "x" };
    d.about.examDate = "";
    const p = buildCompletePayload(d, false);
    expect("coachingName" in p).toBe(false);
    expect("batchName" in p).toBe(false);
    expect(p.targetExamDate).toMatch(/^\d{4}-05-15$/);
  });

  it("sends the subject pick only when the goal needs one", () => {
    const d = filled();
    d.goal.subjectIds = [3, 1];
    expect(buildCompletePayload(d, true).subjectIds).toEqual([3, 1]);
    expect("subjectIds" in buildCompletePayload(d, false)).toBe(false);
  });

  it("gives every block a fresh key at the source so two payloads never share state", () => {
    expect(newKey()).not.toBe(newKey());
  });
});
