import { describe, expect, it } from "vitest";
import {
  TARGET_RULES,
  clampTarget,
  daysLeftText,
  defaultUnit,
  describeGoal,
  formatWeekRange,
  progressText,
  quantity,
  scopeText,
} from "@/lib/goals/format";
import type { Goal } from "@/lib/api/goals";

const goal = (over: Partial<Goal>): Goal => ({
  id: "g1",
  weekStart: "2026-10-05",
  subjectId: null,
  chapterId: null,
  topic: null,
  type: "QUESTIONS",
  target: 100,
  unit: "COUNT",
  status: "ACTIVE",
  source: "STUDENT",
  progressSelfReport: 0,
  carriedFromGoalId: null,
  progress: { current: 42, target: 100, unit: "COUNT", percent: 42, complete: false },
  ...over,
});

describe("wording", () => {
  it("pluralises quantities", () => {
    expect(quantity("LECTURES", 1, "COUNT")).toBe("1 lecture");
    expect(quantity("LECTURES", 5, "COUNT")).toBe("5 lectures");
    expect(quantity("MOCKS", 1, "COUNT")).toBe("1 mock");
    expect(quantity("HOURS", 1, "HOURS")).toBe("1 hour");
    expect(quantity("HOURS", 20, "HOURS")).toBe("20 hours");
    expect(quantity("HOURS", 300, "MINUTES")).toBe("300 min");
  });

  it("describes a goal as a sentence", () => {
    expect(describeGoal({ type: "LECTURES", target: 5, unit: "COUNT" })).toBe("Watch 5 lectures");
    expect(describeGoal({ type: "QUESTIONS", target: 100, unit: "COUNT" })).toBe("Solve 100 questions");
    expect(describeGoal({ type: "HOURS", target: 20, unit: "HOURS" })).toBe("Study 20 hours");
  });

  it("joins subject, chapter and topic, skipping what is missing", () => {
    const subjects = new Map([[1, "Physics"]]);
    const chapters = new Map([["c1", "Kinematics"]]);
    expect(scopeText(goal({ subjectId: 1, chapterId: "c1" }), subjects, chapters)).toBe("Physics · Kinematics");
    expect(scopeText(goal({ subjectId: 1 }), subjects, chapters)).toBe("Physics");
    expect(scopeText(goal({ topic: "Wave optics" }), subjects, chapters)).toBe("Wave optics");
    expect(scopeText(goal({}), subjects, chapters)).toBe("");
    expect(scopeText(goal({ subjectId: 9 }), subjects, chapters)).toBe("");
  });

  it("reports progress per type", () => {
    expect(progressText(goal({ type: "QUESTIONS" }))).toBe("42 of 100 solved");
    expect(progressText(goal({ type: "LECTURES", progress: { current: 3, target: 5, unit: "COUNT", percent: 60, complete: false } }))).toBe("3 of 5 watched");
    expect(progressText(goal({ type: "HOURS", unit: "HOURS", progress: { current: 6.5, target: 20, unit: "HOURS", percent: 33, complete: false } }))).toBe("6.5 of 20 hours");
    expect(progressText(goal({ type: "HOURS", unit: "MINUTES", progress: { current: 90, target: 300, unit: "MINUTES", percent: 30, complete: false } }))).toBe("90 of 300 min");
  });
});

describe("targets", () => {
  it("every type has a start inside its own bounds", () => {
    for (const rules of Object.values(TARGET_RULES)) {
      expect(rules.start).toBeGreaterThanOrEqual(rules.min);
      expect(rules.start).toBeLessThanOrEqual(rules.max);
    }
  });

  it("clamps and rounds user input", () => {
    expect(clampTarget("QUESTIONS", "COUNT", 0)).toBe(5);
    expect(clampTarget("QUESTIONS", "COUNT", 99999)).toBe(2000);
    expect(clampTarget("LECTURES", "COUNT", 2.6)).toBe(3);
    expect(clampTarget("HOURS", "HOURS", 500)).toBe(100);
    expect(clampTarget("HOURS", "MINUTES", 500)).toBe(500); // minutes allow up to 6000
    expect(clampTarget("HOURS", "MINUTES", 99999)).toBe(6000);
  });

  it("only HOURS goals use hours; everything else counts", () => {
    expect(defaultUnit("HOURS")).toBe("HOURS");
    expect(defaultUnit("LECTURES")).toBe("COUNT");
    expect(defaultUnit("MOCKS")).toBe("COUNT");
  });
});

describe("dates", () => {
  it("formats a Monday–Sunday range", () => {
    expect(formatWeekRange("2026-10-05", "2026-10-11")).toBe("5 – 11 Oct");
    expect(formatWeekRange("2026-10-26", "2026-11-01")).toBe("26 Oct – 1 Nov");
  });
  it("phrases days left", () => {
    expect(daysLeftText(5)).toBe("5 days left");
    expect(daysLeftText(1)).toBe("1 day left");
    expect(daysLeftText(0)).toBe("Last day");
  });
});
