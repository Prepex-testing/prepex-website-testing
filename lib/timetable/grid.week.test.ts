import { describe, expect, it } from "vitest";
import {
  addBlock,
  collapseToUniform,
  defaultSourceDay,
  hasPlanningTime,
  isUniformWeek,
  matchesDay,
  moveBlock,
  replicateDay,
  resizeBlock,
  shortSleepDays,
  uniformWouldDiscard,
  updateBlock,
  weekSignature,
  weekdayWeekendStudy,
  type GridBlock,
} from "@/lib/timetable/grid";
import { buildTemplate, matchesTemplate } from "@/lib/timetable/templates";

let n = 0;
const block = (dayOfWeek: number, startMin: number, endMin: number, activityType: GridBlock["activityType"], extra: Partial<GridBlock> = {}): GridBlock => ({
  key: `k${n++}`,
  dayOfWeek,
  startMin,
  endMin,
  activityType,
  subjectId: null,
  label: null,
  ...extra,
});
const everyDay = (start: number, end: number, type: GridBlock["activityType"]) => [0, 1, 2, 3, 4, 5, 6].map((d) => block(d, start, end, type));

describe("replicateDay (the \"same every day\" switch)", () => {
  it("copies one day's routine onto all seven and drops what was on the others", () => {
    const monday = [block(0, 360, 540, "SELF_STUDY"), block(0, 600, 660, "MEAL")];
    const sunday = [block(6, 0, 1440, "FAMILY")];
    const out = replicateDay([...monday, ...sunday], 0);
    expect(out).toHaveLength(14);
    expect(isUniformWeek(out)).toBe(true);
    expect(out.some((b) => b.activityType === "FAMILY")).toBe(false);
  });

  it("keeps the source day's blocks as they are and gives the copies fresh keys and no server ids", () => {
    const source = block(2, 360, 540, "SELF_STUDY", { id: "server-id" });
    const out = replicateDay([source], 2);
    expect(out.find((b) => b.key === source.key)).toBe(source);
    const copies = out.filter((b) => b.key !== source.key);
    expect(copies).toHaveLength(6);
    expect(new Set(out.map((b) => b.key)).size).toBe(7);
    expect(copies.every((b) => b.id === undefined)).toBe(true);
    expect(copies.map((b) => b.dayOfWeek).sort()).toEqual([0, 1, 3, 4, 5, 6]);
  });

  it("an empty source day empties the whole week", () => {
    expect(replicateDay([block(3, 0, 60, "SLEEP")], 0)).toEqual([]);
  });
});

describe("isUniformWeek / matchesDay", () => {
  it("is true for identical days and for an empty week", () => {
    expect(isUniformWeek(everyDay(360, 540, "SELF_STUDY"))).toBe(true);
    expect(isUniformWeek([])).toBe(true);
  });
  it("is false when a single day differs, or is missing", () => {
    const week = everyDay(360, 540, "SELF_STUDY");
    expect(isUniformWeek(week.map((b) => (b.dayOfWeek === 6 ? { ...b, endMin: 600 } : b)))).toBe(false);
    expect(isUniformWeek(week.filter((b) => b.dayOfWeek !== 4))).toBe(false);
  });
  it("matchesDay compares against a chosen day", () => {
    const week = [...everyDay(360, 540, "SELF_STUDY").filter((b) => b.dayOfWeek !== 0), block(0, 0, 60, "SLEEP")];
    expect(matchesDay(week, 0)).toBe(false);
    expect(matchesDay(week.filter((b) => b.dayOfWeek !== 0), 1)).toBe(false); // Monday is empty, the rest are not
    expect(matchesDay(everyDay(360, 540, "SELF_STUDY"), 3)).toBe(true);
  });
});

describe("defaultSourceDay", () => {
  it("is the first day that has study time, else Monday", () => {
    expect(defaultSourceDay([block(2, 360, 540, "SELF_STUDY")])).toBe(2);
    expect(defaultSourceDay([block(2, 360, 540, "SLEEP")])).toBe(0);
    expect(defaultSourceDay([])).toBe(0);
  });
});

describe("validation helpers", () => {
  it("needs Self-Study or Practice somewhere in the week (Revision alone does not count)", () => {
    expect(hasPlanningTime([])).toBe(false);
    expect(hasPlanningTime([block(0, 0, 60, "REVISION"), block(1, 0, 60, "SLEEP")])).toBe(false);
    expect(hasPlanningTime([block(3, 0, 60, "PRACTICE")])).toBe(true);
    expect(hasPlanningTime([block(3, 0, 60, "SELF_STUDY")])).toBe(true);
  });

  it("flags days with under five hours of sleep", () => {
    const week = everyDay(0, 360, "SLEEP").map((b) => (b.dayOfWeek === 3 ? { ...b, endMin: 240 } : b));
    expect(shortSleepDays(week)).toEqual([3]);
    expect(shortSleepDays([])).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("averages study per weekday and per weekend day", () => {
    const week = [...[0, 1, 2, 3, 4].map((d) => block(d, 600, 780, "SELF_STUDY")), block(5, 600, 900, "PRACTICE"), block(6, 600, 840, "REVISION")];
    expect(weekdayWeekendStudy(week)).toEqual({ weekday: 180, weekend: 270 });
  });
});

describe("the \"from template\" marker", () => {
  const fromTemplate = block(0, 360, 540, "SELF_STUDY", { fromTemplate: true });

  it("goes away as soon as the student changes a block", () => {
    expect(updateBlock([fromTemplate], fromTemplate.key, { label: "Physics" })[0]!.fromTemplate).toBeUndefined();
    expect(moveBlock([fromTemplate], fromTemplate.key, 0, 400).block!.fromTemplate).toBeUndefined();
    expect(resizeBlock([fromTemplate], fromTemplate.key, 600).block!.fromTemplate).toBeUndefined();
  });

  it("stays on blocks the student has not touched, and new blocks never carry it", () => {
    const other = block(1, 0, 60, "SLEEP", { fromTemplate: true });
    expect(updateBlock([fromTemplate, other], fromTemplate.key, { label: "x" })[1]!.fromTemplate).toBe(true);
    expect(addBlock([], { dayOfWeek: 0, startMin: 600, activityType: "BREAK" }).block!.fromTemplate).toBeUndefined();
  });
});

describe("collapseToUniform (switching to \"same every day\")", () => {
  it("makes the chosen day's routine the editable day and copies it to the rest", () => {
    const week = [block(2, 360, 540, "SELF_STUDY"), block(2, 600, 660, "MEAL"), block(0, 0, 1440, "FAMILY"), block(5, 0, 60, "SLEEP")];
    const out = collapseToUniform(week, 2);
    expect(isUniformWeek(out)).toBe(true);
    expect(out).toHaveLength(14);
    expect(out.filter((b) => b.dayOfWeek === 0).map((b) => b.activityType)).toEqual(["SELF_STUDY", "MEAL"]);
    expect(out.some((b) => b.activityType === "FAMILY")).toBe(false);
  });

  it("knows whether that would throw anything away", () => {
    const same = everyDay(360, 540, "SELF_STUDY");
    expect(uniformWouldDiscard(same, 3)).toBe(false);
    expect(uniformWouldDiscard([...same, block(6, 0, 60, "SLEEP")], 3)).toBe(true);
  });
});

describe("weekSignature / matchesTemplate", () => {
  it("ignores keys and ids but notices any real change", () => {
    const a = buildTemplate("SELF_PREP");
    const b = buildTemplate("SELF_PREP");
    expect(weekSignature(a)).toBe(weekSignature(b));
    expect(matchesTemplate(a, "SELF_PREP")).toBe(true);
    expect(matchesTemplate(a, "SCHOOL_COACHING")).toBe(false);
    expect(matchesTemplate(a.slice(1), "SELF_PREP")).toBe(false);
    expect(matchesTemplate(updateBlock(a, a[0]!.key, { label: "x" }), "SELF_PREP")).toBe(false);
  });
});
