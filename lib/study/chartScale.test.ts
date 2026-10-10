import { describe, expect, it } from "vitest";
import { axisLabel, minutesScale } from "@/lib/study/chartScale";

describe("minutesScale", () => {
  it("a tiny or empty week still gets a sensible, whole-number axis", () => {
    expect(minutesScale(0)).toEqual({ max: 30, step: 10, ticks: [0, 10, 20, 30] });
    expect(minutesScale(1)).toEqual({ max: 30, step: 10, ticks: [0, 10, 20, 30] });
    expect(minutesScale(Number.NaN).ticks).toEqual([0, 10, 20, 30]);
  });

  it("rounds the top up to a whole step and always has at least three steps", () => {
    expect(minutesScale(45)).toEqual({ max: 45, step: 15, ticks: [0, 15, 30, 45] });
    expect(minutesScale(50)).toEqual({ max: 60, step: 15, ticks: [0, 15, 30, 45, 60] });
    expect(minutesScale(95)).toEqual({ max: 120, step: 30, ticks: [0, 30, 60, 90, 120] });
  });

  it("scales up for long days, and never has more than about six ticks", () => {
    expect(minutesScale(200).step).toBe(60);
    expect(minutesScale(500).step).toBe(120);
    for (const m of [1, 30, 61, 149, 151, 299, 301, 720]) expect(minutesScale(m).ticks.length).toBeLessThanOrEqual(7);
    for (const m of [1, 30, 61, 299, 720]) expect(minutesScale(m).max).toBeGreaterThanOrEqual(m);
  });

  it("labels whole hours as hours, everything else as minutes", () => {
    expect(axisLabel(0)).toBe("0m");
    expect(axisLabel(30)).toBe("30m");
    expect(axisLabel(60)).toBe("1h");
    expect(axisLabel(120)).toBe("2h");
    expect(axisLabel(90)).toBe("90m");
  });
});
