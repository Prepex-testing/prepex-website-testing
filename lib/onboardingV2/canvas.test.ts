import { describe, expect, it } from "vitest";
import { buildFor, buildPayload, emptyAnswers, matchVoice, nextQuestion, spokenDate, totalSteps, usablePrefill, type CanvasAnswers, type QuestionId } from "@/lib/onboardingV2/canvas";
import { sayLocal } from "@/lib/onboardingV2/lines";

const walk = (a: CanvasAnswers): QuestionId[] => {
  const out: QuestionId[] = [];
  let q: QuestionId | null = "prefs";
  while (q) {
    out.push(q);
    q = nextQuestion(q, a);
  }
  return out;
};
const with_ = (over: Partial<CanvasAnswers>): CanvasAnswers => ({ ...emptyAnswers("Asha"), ...over });

describe("the canvas flow", () => {
  it("Class 11/12 is asked about school; droppers are not", () => {
    expect(walk(with_({ level: "CLASS_12", coaching: "SELF" }))).toEqual(["prefs", "name", "exam", "class", "exam_date", "school", "coaching", "hours", "windows", "week", "chapters"]);
    expect(walk(with_({ level: "DROPPER", coaching: "SELF" }))).not.toContain("school");
  });

  it("offline coaching adds the class time; online and self-study do not", () => {
    expect(walk(with_({ level: "DROPPER", coaching: "OFFLINE" }))).toContain("coaching_time");
    expect(walk(with_({ level: "DROPPER", coaching: "ONLINE" }))).not.toContain("coaching_time");
  });

  it("counts the stairs Pexo climbs, including the goals proposal", () => {
    expect(totalSteps(with_({ level: "CLASS_12", coaching: "OFFLINE" }))).toBe(13);
    expect(totalSteps(with_({ level: "DROPPER", coaching: "SELF" }))).toBe(11);
  });

  it("a Google placeholder name is not used to greet anyone", () => {
    expect(usablePrefill("Student")).toBe("");
    expect(usablePrefill("User")).toBe("");
    expect(usablePrefill("Asha Rao")).toBe("Asha Rao");
  });
});

describe("the payload: the same body the old flow sends", () => {
  const base = with_({
    name: "  Asha Rao ",
    goal: "JEE_BOTH",
    level: "DROPPER",
    coaching: "OFFLINE",
    coachingSlot: "EVENING",
    hours: 8,
    windows: ["MORNING", "NIGHT"],
    examDates: [
      { kind: "JEE_MAIN", label: "JEE Main", date: "2027-01-20", days: 69, isDefault: true },
      { kind: "JEE_ADVANCED", label: "JEE Advanced", date: "2027-05-16", days: 185, isDefault: true },
    ],
    chapters: ["c1", "c2"],
  });

  it("maps every answer, sends defaults as defaults, and marks the flow as v2", () => {
    const p = buildPayload(base, "exam-1");
    expect(p).toMatchObject({
      examId: "exam-1",
      fullName: "Asha Rao",
      targetExamDate: "2027-05-16",
      examDateIsDefault: true,
      currentLevel: "DROPPER_1",
      coachingType: "COACHING",
      completedChapterIds: ["c1", "c2"],
      flowVersion: "v2",
      timetable: { uniformWeek: false, source: "COACHING_TEMPLATE" },
    });
    expect(p.timetable.blocks.some((b) => b.activityType === "SELF_STUDY")).toBe(true);
    expect(p.timetable.blocks.every((b) => !("id" in b))).toBe(true);
    // the dropper with offline evening coaching from the brief: coaching 16:00-19:00 on weekdays
    expect(p.timetable.blocks.filter((b) => b.activityType === "COACHING" && b.dayOfWeek === 0)).toEqual([expect.objectContaining({ startTime: "16:00", endTime: "19:00", mode: "offline" })]);
  });

  it("a changed date is sent per exam; an adjusted week is the student's own", () => {
    const p = buildPayload({ ...base, examDatesChanged: true, weekEdited: true, week: buildFor(base).blocks }, "exam-1");
    expect(p).toMatchObject({ jeeMainDate: "2027-01-20", jeeAdvancedDate: "2027-05-16", timetable: { source: "MANUAL" } });
    expect(p.examDateIsDefault).toBeUndefined();
  });
});

describe("voice answers (English and Hinglish), never a guess", () => {
  it.each([
    ["class", "I am in class twelve", "CLASS_12"],
    ["class", "barahvi mein hoon", "CLASS_12"],
    ["class", "gyarahvi", "CLASS_11"],
    ["class", "main dropper hoon", "DROPPER"],
    ["exam", "JEE main and advanced dono", "JEE_BOTH"],
    ["exam", "sirf mains", "JEE_MAIN"],
    ["exam_date", "haan sahi hai", "YES"],
    ["exam_date", "nahi badlo", "CHANGE"],
    ["school", "subah ka school", "MORNING"],
    ["school", "no school, dummy", "NONE"],
    ["coaching", "offline institute", "OFFLINE"],
    ["coaching", "khud padhta hoon", "SELF"],
    ["coaching_time", "shaam ko", "EVENING"],
    ["hours", "chhe ghante", "6"],
    ["hours", "८ घंटे", "8"],
  ] as const)("%s: %s -> %s", (q, said, expected) => {
    expect(matchVoice(q, said)).toBe(expected);
  });

  it("an unclear answer is no match (the student taps instead)", () => {
    expect(matchVoice("class", "eleven or twelve")).toBeNull();
    expect(matchVoice("hours", "pata nahi")).toBeNull();
    expect(matchVoice("name", "Asha")).toBeNull();
  });
});

describe("Pexo's canvas lines are real and filled", () => {
  it("fills the date confirmation from the configured date, in English and Hinglish", () => {
    const en = sayLocal("onb.exam_date.confirm", { exam: "JEE Main", date: spokenDate("2027-01-20"), days: 69 });
    expect(en?.text).toBe("JEE Main is on 20 Jan 2027. That's 69 days away. Right?");
    expect(sayLocal("onb.exam_date.confirm", { exam: "JEE Main", date: "20 Jan 2027", days: 69 }, "hi")?.text).toContain("69");
  });

  it("says nothing rather than show an unfilled placeholder", () => {
    expect(sayLocal("onb.week_preview", { hours: 4 })).toBeNull();
    expect(sayLocal("onb.goals.proposal", { lectures: 3, questions: 120 })).toBeNull();
  });
});
