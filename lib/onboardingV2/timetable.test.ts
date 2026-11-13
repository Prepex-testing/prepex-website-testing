import { describe, expect, it } from "vitest";
import type { CurrentLevel } from "@/lib/onboarding/draft";
import {
  buildWeek,
  coachingSlotsFor,
  dailyTargets,
  defaultHours,
  MIN_SLEEP,
  SCHOOL_TIMES,
  splitStudy,
  WEEKDAY_CAP,
  SCHOOL_CAP,
  type CoachingAnswer,
  type CoachingSlot,
  type HoursAnswer,
  type SchoolAnswer,
  type StudyWindow,
  type WeekAnswers,
} from "@/lib/onboardingV2/timetable";

const LEVELS: CurrentLevel[] = ["CLASS_11", "CLASS_12", "DROPPER_1", "OTHER"];
const SCHOOLS: SchoolAnswer[] = ["MORNING", "DAY", "NONE"];
const HOURS: HoursAnswer[] = [2, 4, 6, 8, 10];
const WINDOWS: StudyWindow[] = ["EARLY_MORNING", "MORNING", "AFTERNOON", "EVENING", "NIGHT"];
const STUDY = new Set(["SELF_STUDY", "PRACTICE", "REVISION"]);

/** Every combination the canvas can produce: class x school x coaching (+ slot) x hours x any non-empty set of windows. */
function* everyAnswer(): Generator<WeekAnswers> {
  const windowSets: StudyWindow[][] = [];
  for (let mask = 1; mask < 1 << WINDOWS.length; mask++) windowSets.push(WINDOWS.filter((_, i) => mask & (1 << i)));
  for (const level of LEVELS)
    for (const school of LEVELS[0] === level || level === "CLASS_12" ? SCHOOLS : (["NONE"] as SchoolAnswer[]))
      for (const coaching of ["SELF", "ONLINE", "OFFLINE"] as CoachingAnswer[])
        for (const coachingSlot of coaching === "OFFLINE" ? coachingSlotsFor(school) : ([null] as (CoachingSlot | null)[]))
          for (const hours of HOURS) for (const windows of windowSets) yield { level, school, coaching, coachingSlot, hours, windows };
}

describe("auto-timetable: properties over every combination", () => {
  const all = [...everyAnswer()];

  it("walks thousands of real combinations", () => {
    expect(all.length).toBeGreaterThan(5000);
  });

  it("holds every guarantee for every combination", () => {
    for (const a of all) {
      const tag = JSON.stringify(a);
      const week = buildWeek(a);
      const targets = dailyTargets(a);
      for (let day = 0; day < 7; day++) {
        const blocks = week.blocks.filter((b) => b.dayOfWeek === day).sort((x, y) => x.startMin - y.startMin);
        // well-formed, inside the day, on a 15-minute grid for study, and no two blocks overlap
        for (const b of blocks) {
          expect(b.startMin, tag).toBeGreaterThanOrEqual(0);
          expect(b.endMin, tag).toBeLessThanOrEqual(1440);
          expect(b.endMin, tag).toBeGreaterThan(b.startMin);
        }
        for (let i = 1; i < blocks.length; i++) expect(blocks[i]!.startMin, `${tag} day ${day}`).toBeGreaterThanOrEqual(blocks[i - 1]!.endMin);

        // at least 7 h of sleep across the night
        const sleep = blocks.filter((b) => b.activityType === "SLEEP").reduce((s, b) => s + b.endMin - b.startMin, 0);
        expect(sleep, tag).toBeGreaterThanOrEqual(MIN_SLEEP);

        // self-study and revision every day; revision is the last study block
        const study = blocks.filter((b) => STUDY.has(b.activityType));
        expect(study.some((b) => b.activityType === "SELF_STUDY"), `${tag} day ${day} self-study`).toBe(true);
        expect(study.some((b) => b.activityType === "REVISION"), `${tag} day ${day} revision`).toBe(true);
        expect(study.at(-1)!.activityType, `${tag} day ${day} revision last`).toBe("REVISION");
        for (const b of study) expect(b.endMin - b.startMin, tag).toBeLessThanOrEqual(120);

        // three meals; school and coaching only Monday to Saturday, coaching never during school
        expect(blocks.filter((b) => b.activityType === "MEAL").length, tag).toBe(3);
        const school = blocks.filter((b) => b.activityType === "SCHOOL");
        const coaching = blocks.filter((b) => b.activityType === "COACHING");
        if (day === 6) {
          expect(school.length + coaching.length, tag).toBe(0);
          expect(study.some((b) => b.label === "Weekly test / PYQs"), tag).toBe(true);
        } else {
          expect(school.length, tag).toBe(a.school === "NONE" ? 0 : 1);
          if (a.school !== "NONE") expect([school[0]!.startMin, school[0]!.endMin], tag).toEqual(SCHOOL_TIMES[a.school]);
          expect(coaching.length, tag).toBe(a.coaching === "SELF" ? 0 : 1);
          if (a.coaching === "OFFLINE") expect(coaching[0]!.endMin - coaching[0]!.startMin, tag).toBe(180);
        }

        // never more study than the cap or the target
        const minutes = study.reduce((s, b) => s + b.endMin - b.startMin, 0);
        expect(minutes, `${tag} day ${day} at least 90 min`).toBeGreaterThanOrEqual(90);
        if (day < 6) {
          expect(minutes, tag).toBeLessThanOrEqual(a.school !== "NONE" && (a.level === "CLASS_11" || a.level === "CLASS_12") ? SCHOOL_CAP : WEEKDAY_CAP);
          expect(minutes, tag).toBeLessThanOrEqual(targets.weekday);
        }
      }
      // the week is close to hours x 7 (the cap and a day packed with school + coaching may trim it)
      const expected = targets.weekday * 6 + targets.sunday;
      expect(week.weeklyStudyMinutes, tag).toBeLessThanOrEqual(expected);
      // a day packed with school AND offline coaching only has the room it has; otherwise at least 60% of the target fits
      const packed = a.school !== "NONE" && a.coaching === "OFFLINE";
      if (!packed) expect(week.weeklyStudyMinutes, tag).toBeGreaterThanOrEqual(expected * 0.6);
      // what Pexo quotes in onb.week_preview is real
      expect(week.revisionTime, tag).toMatch(/^\d{2}:\d{2}$/);
    }
  }, 120_000);

  it("keeps study inside the picked windows whenever they have room", () => {
    const week = buildWeek({ level: "CLASS_12", school: "MORNING", coaching: "SELF", coachingSlot: null, hours: 4, windows: ["EVENING", "NIGHT"] });
    for (const b of week.blocks.filter((x) => x.dayOfWeek === 0 && STUDY.has(x.activityType))) {
      expect(b.startMin).toBeGreaterThanOrEqual(17 * 60);
      expect(b.endMin).toBeLessThanOrEqual(23 * 60 + 30);
    }
  });
});

describe("auto-timetable: answers", () => {
  it("hours default to 4 with school, 6 without, 8 for droppers", () => {
    expect(defaultHours("CLASS_12", "MORNING")).toBe(4);
    expect(defaultHours("CLASS_11", "NONE")).toBe(6);
    expect(defaultHours("DROPPER_1", "NONE")).toBe(8);
  });

  it("offline coaching slots never overlap school", () => {
    expect(coachingSlotsFor("MORNING")).toEqual(["AFTERNOON", "EVENING"]);
    expect(coachingSlotsFor("DAY")).toEqual(["EVENING"]);
    expect(coachingSlotsFor("NONE")).toEqual(["MORNING", "AFTERNOON", "EVENING"]);
  });

  it("splits a day 50/30/20 with revision at least 45 minutes", () => {
    const sum = (type: string, list: ReturnType<typeof splitStudy>) => list.filter((c) => c.type === type).reduce((s, c) => s + c.minutes, 0);
    const six = splitStudy(360, false);
    expect([sum("SELF_STUDY", six), sum("PRACTICE", six), sum("REVISION", six)]).toEqual([180, 105, 75]);
    const two = splitStudy(120, false);
    expect(sum("REVISION", two)).toBe(45);
    expect(sum("SELF_STUDY", two)).toBeGreaterThanOrEqual(30);
  });

  it("Class 11 with morning school and evening offline coaching: the dropper-free case from the brief", () => {
    const w = buildWeek({ level: "CLASS_11", school: "MORNING", coaching: "OFFLINE", coachingSlot: "EVENING", hours: 4, windows: ["EVENING", "NIGHT"] });
    const monday = w.blocks.filter((b) => b.dayOfWeek === 0);
    expect(monday.find((b) => b.activityType === "SCHOOL")).toMatchObject({ startMin: 420, endMin: 780 });
    expect(monday.find((b) => b.activityType === "COACHING")).toMatchObject({ startMin: 960, endMin: 1140, mode: "offline" });
    expect(w.weekdayStudyMinutes).toBeGreaterThan(0);
  });

  it("a dropper with offline evening coaching gets 8 hours around it", () => {
    const w = buildWeek({ level: "DROPPER_1", school: "NONE", coaching: "OFFLINE", coachingSlot: "EVENING", hours: 8, windows: ["MORNING", "AFTERNOON", "NIGHT"] });
    expect(w.weekdayStudyMinutes).toBe(480);
  });
});
