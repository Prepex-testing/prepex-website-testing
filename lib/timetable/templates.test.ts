import { describe, expect, it } from "vitest";
import { TEMPLATE_OPTIONS, buildTemplate, pickTemplateId } from "@/lib/timetable/templates";
import { DAY_COUNT, blocksOnDay, hasOverlap, isUniformWeek, shortSleepDays, studyMinutes, toApiBlocks } from "@/lib/timetable/grid";

describe.each(TEMPLATE_OPTIONS.map((t) => t.id))("template %s", (id) => {
  const blocks = buildTemplate(id);

  it("has no overlapping blocks on any day", () => {
    for (let day = 0; day < DAY_COUNT; day++) {
      for (const b of blocksOnDay(blocks, day)) {
        expect(hasOverlap(blocks, day, b.startMin, b.endMin, b.key), `${id} day ${day} ${b.startMin}-${b.endMin}`).toBe(false);
      }
    }
  });

  it("stays inside the day, aligned to 15 minutes", () => {
    for (const b of blocks) {
      expect(b.startMin).toBeGreaterThanOrEqual(0);
      expect(b.endMin).toBeLessThanOrEqual(1440);
      expect(b.endMin).toBeGreaterThan(b.startMin);
      expect(b.startMin % 15).toBe(0);
      expect(b.endMin % 15).toBe(0);
    }
  });

  it("fills every day of the week", () => {
    for (let day = 0; day < DAY_COUNT; day++) expect(blocksOnDay(blocks, day).length).toBeGreaterThan(3);
  });

  it("leaves real study time every day, and sleep", () => {
    for (let day = 0; day < DAY_COUNT; day++) {
      expect(studyMinutes(blocks, day)).toBeGreaterThanOrEqual(120);
      expect(blocksOnDay(blocks, day).some((b) => b.activityType === "SLEEP")).toBe(true);
    }
  });

  it("serialises to blocks the API will accept (HH:MM, end after start)", () => {
    for (const b of toApiBlocks(blocks)) {
      expect(b.startTime).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(b.endTime).toMatch(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/);
      expect(b.endTime > b.startTime).toBe(true);
    }
  });

  it("returns fresh keys on every call (templates can be applied twice)", () => {
    const again = buildTemplate(id);
    expect(new Set([...blocks, ...again].map((b) => b.key)).size).toBe(blocks.length + again.length);
  });
});

describe("template content", () => {
  it("School + Coaching has school on weekdays and coaching Mon–Sat", () => {
    const b = buildTemplate("SCHOOL_COACHING");
    expect(blocksOnDay(b, 0).some((x) => x.activityType === "SCHOOL")).toBe(true);
    expect(blocksOnDay(b, 6).some((x) => x.activityType === "SCHOOL")).toBe(false);
    expect(blocksOnDay(b, 5).some((x) => x.activityType === "COACHING")).toBe(true);
  });

  it("Self-Prep has no school or coaching at all", () => {
    const b = buildTemplate("SELF_PREP");
    expect(b.some((x) => x.activityType === "SCHOOL" || x.activityType === "COACHING")).toBe(false);
  });

  it("Dropper + Coaching has no school but a long coaching block", () => {
    const b = buildTemplate("DROPPER_COACHING");
    expect(b.some((x) => x.activityType === "SCHOOL")).toBe(false);
    const coaching = blocksOnDay(b, 0).find((x) => x.activityType === "COACHING")!;
    expect(coaching.endMin - coaching.startMin).toBeGreaterThanOrEqual(240);
  });
});

describe("every template is a sane starting week", () => {
  it.each(TEMPLATE_OPTIONS.map((t) => t.id))("%s gives at least five hours of sleep a day, so it never opens with a warning", (id) => {
    expect(shortSleepDays(buildTemplate(id))).toEqual([]);
  });

  it.each(TEMPLATE_OPTIONS.map((t) => t.id))("%s marks every block as coming from the template", (id) => {
    expect(buildTemplate(id).every((b) => b.fromTemplate === true)).toBe(true);
  });

  it("only Self-Prep is the same on all seven days", () => {
    expect(isUniformWeek(buildTemplate("SELF_PREP"))).toBe(true);
    expect(isUniformWeek(buildTemplate("SCHOOL_COACHING"))).toBe(false);
    expect(isUniformWeek(buildTemplate("DROPPER_COACHING"))).toBe(false);
  });
});

describe("pickTemplateId: the coaching answer decides which week is waiting", () => {
  it.each([
    ["COACHING", "CLASS_11", "SCHOOL_COACHING"],
    ["COACHING", "CLASS_12", "SCHOOL_COACHING"],
    ["COACHING", "DROPPER_1", "DROPPER_COACHING"],
    ["COACHING", "DROPPER_2", "DROPPER_COACHING"],
    ["COACHING", "OTHER", "DROPPER_COACHING"],
    ["ONLINE_SELF_PREP", "CLASS_12", "SCHOOL_COACHING"],
    ["ONLINE_SELF_PREP", "DROPPER_1", "DROPPER_COACHING"],
    ["SELF_PREP", "CLASS_11", "SELF_PREP"],
    ["SELF_PREP", "CLASS_12", "SELF_PREP"],
    ["SELF_PREP", "DROPPER_1", "SELF_PREP"],
    ["SELF_PREP", "OTHER", "SELF_PREP"],
  ] as const)("%s + %s -> %s", (coaching, level, expected) => {
    expect(pickTemplateId(coaching, level)).toBe(expected);
  });
});
