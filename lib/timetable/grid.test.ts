import { describe, expect, it } from "vitest";
import {
  addBlock,
  blocksOnDay,
  copyDay,
  formatClock,
  formatDuration,
  formatRange,
  fromApiBlocks,
  hasOverlap,
  moveBlock,
  newKey,
  parseTime,
  removeBlock,
  resizeBlock,
  resizeBlockStart,
  snap,
  studyMinutes,
  toApiBlocks,
  toTime,
  updateBlock,
  type GridBlock,
} from "@/lib/timetable/grid";

const blk = (dayOfWeek: number, start: string, end: string, activityType: GridBlock["activityType"] = "SELF_STUDY"): GridBlock => ({
  key: newKey(),
  dayOfWeek,
  startMin: parseTime(start),
  endMin: parseTime(end),
  activityType,
  subjectId: null,
  label: null,
});

describe("time helpers", () => {
  it("snaps to 15-minute lines inside the day", () => {
    expect(snap(7)).toBe(0);
    expect(snap(8)).toBe(15);
    expect(snap(547)).toBe(540);
    expect(snap(-30)).toBe(0);
    expect(snap(5000)).toBe(1440);
  });

  it("round-trips HH:MM, including the end-of-day sentinel", () => {
    expect(toTime(0)).toBe("00:00");
    expect(toTime(570)).toBe("09:30");
    expect(toTime(1440)).toBe("24:00");
    expect(parseTime("24:00")).toBe(1440);
    expect(parseTime(toTime(765))).toBe(765);
  });

  it("formats clock times, ranges and durations for display", () => {
    expect(formatClock(0)).toBe("12 AM");
    expect(formatClock(570)).toBe("9:30 AM");
    expect(formatClock(720)).toBe("12 PM");
    expect(formatClock(1440)).toBe("12 AM");
    expect(formatRange(540, 600)).toBe("9 AM – 10 AM");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(150)).toBe("2h 30m");
  });
});

describe("addBlock", () => {
  it("creates a block from a drag, snapped to 15 minutes", () => {
    const r = addBlock([], { dayOfWeek: 1, startMin: 545, endMin: 662, activityType: "SELF_STUDY" });
    expect(r.error).toBeUndefined();
    expect(r.block).toMatchObject({ dayOfWeek: 1, startMin: 540, endMin: 660, activityType: "SELF_STUDY" });
  });

  it("a drop with no drag end is a one-hour block", () => {
    const r = addBlock([], { dayOfWeek: 0, startMin: 600, activityType: "COACHING" });
    expect(r.block).toMatchObject({ startMin: 600, endMin: 660 });
  });

  it("a plain tap (tiny drag) still creates the default hour", () => {
    const r = addBlock([], { dayOfWeek: 0, startMin: 600, endMin: 603, activityType: "SLEEP" });
    expect(r.block!.endMin - r.block!.startMin).toBeGreaterThanOrEqual(15);
  });

  it("dragging upwards works (start/end are ordered)", () => {
    const r = addBlock([], { dayOfWeek: 2, startMin: 720, endMin: 600, activityType: "MEAL" });
    expect(r.block).toMatchObject({ startMin: 600, endMin: 720 });
  });

  it("stops at the next block instead of overlapping it", () => {
    const existing = [blk(0, "10:00", "11:00")];
    const r = addBlock(existing, { dayOfWeek: 0, startMin: 540, endMin: 720, activityType: "PRACTICE" });
    expect(r.block).toMatchObject({ startMin: 540, endMin: 600 });
    expect(hasOverlap(r.blocks, 0, 540, 600, r.block!.key)).toBe(false);
  });

  it("stops at the previous block when dragging up", () => {
    const existing = [blk(0, "09:00", "10:00")];
    const r = addBlock(existing, { dayOfWeek: 0, startMin: 660, endMin: 540, activityType: "PRACTICE" });
    expect(r.block).toMatchObject({ startMin: 600, endMin: 660 });
  });

  it("refuses a press that lands inside an existing block", () => {
    const existing = [blk(0, "09:00", "10:00")];
    const r = addBlock(existing, { dayOfWeek: 0, startMin: 570, endMin: 660, activityType: "PRACTICE" });
    expect(r.error).toBeTruthy();
    expect(r.blocks).toBe(existing);
  });

  it("refuses when the free gap is under 15 minutes", () => {
    const existing = [blk(0, "09:00", "10:00"), blk(0, "10:10", "11:00")];
    // snap(600)=600 is the start of the gap [600,610): only 10 minutes free
    const r = addBlock(existing, { dayOfWeek: 0, startMin: 600, endMin: 660, activityType: "PRACTICE" });
    expect(r.error).toBeTruthy();
  });

  it("never leaves the day", () => {
    const r = addBlock([], { dayOfWeek: 0, startMin: 1425, endMin: 1500, activityType: "SLEEP" });
    expect(r.block!.endMin).toBeLessThanOrEqual(1440);
    expect(r.block!.startMin).toBeLessThan(r.block!.endMin);
  });

  it("allows the same time on different days", () => {
    const first = addBlock([], { dayOfWeek: 0, startMin: 540, endMin: 600, activityType: "SCHOOL" });
    const second = addBlock(first.blocks, { dayOfWeek: 1, startMin: 540, endMin: 600, activityType: "SCHOOL" });
    expect(second.error).toBeUndefined();
    expect(second.blocks).toHaveLength(2);
  });
});

describe("moveBlock", () => {
  it("moves a block, keeping its length and snapping", () => {
    const [b] = [blk(0, "09:00", "10:30")];
    const r = moveBlock([b!], b!.key, 2, 14 * 60 + 5);
    expect(r.block).toMatchObject({ dayOfWeek: 2, startMin: 14 * 60, endMin: 14 * 60 + 90 });
  });

  it("clamps so the block never runs past midnight", () => {
    const b = blk(0, "09:00", "11:00");
    const r = moveBlock([b], b.key, 0, 1430);
    expect(r.block!.endMin).toBe(1440);
    expect(r.block!.endMin - r.block!.startMin).toBe(120);
  });

  it("refuses to move onto another block and leaves everything unchanged", () => {
    const a = blk(0, "09:00", "10:00");
    const c = blk(0, "11:00", "12:00");
    const r = moveBlock([a, c], a.key, 0, 11 * 60 + 30);
    expect(r.error).toBeTruthy();
    expect(r.blocks.find((x) => x.key === a.key)!.startMin).toBe(540);
  });

  it("can move into the slot it just vacated", () => {
    const a = blk(0, "09:00", "10:00");
    const r = moveBlock([a], a.key, 0, 9 * 60 + 15);
    expect(r.error).toBeUndefined();
    expect(r.block!.startMin).toBe(555);
  });

  it("unknown block → error", () => {
    expect(moveBlock([], "nope", 0, 0).error).toBeTruthy();
  });
});

describe("resizeBlock / resizeBlockStart", () => {
  it("extends the end in 15-minute steps up to the next block", () => {
    const a = blk(0, "09:00", "10:00");
    const c = blk(0, "11:00", "12:00");
    expect(resizeBlock([a, c], a.key, 10 * 60 + 40).block!.endMin).toBe(10 * 60 + 45);
    expect(resizeBlock([a, c], a.key, 13 * 60).block!.endMin).toBe(11 * 60); // blocked by c
  });

  it("never shrinks below 15 minutes", () => {
    const a = blk(0, "09:00", "10:00");
    expect(resizeBlock([a], a.key, 500).block!.endMin).toBe(555);
  });

  it("moves the start up to the previous block, and not past its own end", () => {
    const p = blk(0, "08:00", "09:00");
    const a = blk(0, "10:00", "11:00");
    expect(resizeBlockStart([p, a], a.key, 8 * 60).block!.startMin).toBe(9 * 60); // blocked by p
    expect(resizeBlockStart([p, a], a.key, 9 * 60 + 30).block!.startMin).toBe(9 * 60 + 30);
    expect(resizeBlockStart([p, a], a.key, 11 * 60).block!.startMin).toBe(10 * 60 + 45);
  });
});

describe("update / remove / copy", () => {
  it("updates activity, subject and label without touching the time", () => {
    const a = blk(0, "09:00", "10:00");
    const [u] = updateBlock([a], a.key, { activityType: "PRACTICE", subjectId: 2, label: "PYQs" });
    expect(u).toMatchObject({ activityType: "PRACTICE", subjectId: 2, label: "PYQs", startMin: 540, endMin: 600 });
  });

  it("removes a block", () => {
    const a = blk(0, "09:00", "10:00");
    expect(removeBlock([a], a.key)).toEqual([]);
  });

  it("copies a day onto others, replacing what was there, with fresh keys and no server ids", () => {
    const mon1 = blk(0, "09:00", "10:00", "SCHOOL");
    const mon2 = blk(0, "16:00", "17:00", "COACHING");
    const tueOld = blk(1, "07:00", "08:00", "SLEEP");
    const withId = { ...mon1, id: "server-id" };
    const out = copyDay([withId, mon2, tueOld], 0, [1, 2, 0]);
    expect(blocksOnDay(out, 1).map((b) => b.activityType)).toEqual(["SCHOOL", "COACHING"]);
    expect(blocksOnDay(out, 2)).toHaveLength(2);
    expect(blocksOnDay(out, 0)).toHaveLength(2); // source untouched (0 in the target list is ignored)
    const copies = out.filter((b) => b.dayOfWeek !== 0);
    expect(copies.every((b) => b.id === undefined)).toBe(true);
    expect(new Set(out.map((b) => b.key)).size).toBe(out.length);
  });
});

describe("studyMinutes", () => {
  it("counts only self-study, practice and revision, optionally per day", () => {
    const blocks = [
      blk(0, "09:00", "10:00", "SELF_STUDY"),
      blk(0, "10:00", "10:30", "PRACTICE"),
      blk(0, "12:00", "13:00", "MEAL"),
      blk(1, "09:00", "11:00", "REVISION"),
      blk(1, "14:00", "15:00", "SCHOOL"),
    ];
    expect(studyMinutes(blocks)).toBe(60 + 30 + 120);
    expect(studyMinutes(blocks, 0)).toBe(90);
    expect(studyMinutes(blocks, 3)).toBe(0);
  });
});

describe("API conversion", () => {
  it("round-trips, sorts by day then time, trims labels and keeps server ids", () => {
    const api = [
      { id: "b2", dayOfWeek: 1, startTime: "09:00", endTime: "10:00", activityType: "SCHOOL" as const, subjectId: null, label: null },
      { id: "b1", dayOfWeek: 0, startTime: "22:00", endTime: "24:00", activityType: "SLEEP" as const, subjectId: null, label: "  night  " },
    ];
    const grid = fromApiBlocks(api);
    expect(grid[1]).toMatchObject({ id: "b1", startMin: 1320, endMin: 1440, label: "  night  " });
    const back = toApiBlocks(grid);
    expect(back.map((b) => b.id)).toEqual(["b1", "b2"]);
    expect(back[0]).toMatchObject({ startTime: "22:00", endTime: "24:00", label: "night" });
  });

  it("omits ids for new blocks and turns blank labels into null", () => {
    const [b] = toApiBlocks([{ ...blk(0, "09:00", "10:00"), label: "   " }]);
    expect(b).not.toHaveProperty("id");
    expect(b!.label).toBeNull();
  });
});
