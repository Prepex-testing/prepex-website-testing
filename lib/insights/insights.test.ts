import { describe, expect, it } from "vitest";
import type { DaySummary } from "@/lib/api/calendarView";
import type { MockShareCard } from "@/lib/api/mocks";
import { drillHref, drillValue, isDrillMetric, isDrillPeriod, latestWeek, streakCaption } from "@/lib/insights/analyticsFormat";
import { dateKey, heatLevel, isoWeekMondayKey, isoWeekOf, monthGrid, monthTitle, shiftMonth, shiftWeek, swipeDirection, weekdayMonday0 } from "@/lib/insights/heatmap";
import { chapterMeta, hoursLabel, strengthKey, weightageLabel } from "@/lib/insights/labels";
import { approxRank, autoTotal, marksProblem, parseMarks, rankLabel, scorePercent, signedPoints } from "@/lib/insights/mockMath";
import { layoutMockCard, mockCardFileName, scoreColor } from "@/lib/insights/mockShareCard";
import { parseTargetRank } from "@/lib/insights/targetRank";

const day = (date: string, studied = 0): DaySummary => ({ date, totalFocusedMinutes: 0, totalStudiedMinutes: studied, plannedMinutes: 0, moodScore: null, hasWeeklyDiagnosis: false, dayType: null, mocks: 0 });
const month = (year: number, m: number, n: number) => Array.from({ length: n }, (_, i) => day(dateKey(year, m, i + 1)));

describe("heat levels", () => {
  it("shades by minutes studied", () => {
    expect([0, 1, 59, 60, 119, 120, 239, 240, 600].map(heatLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
    expect(heatLevel(-5)).toBe(0);
  });
});

describe("month grid", () => {
  it("starts on Monday: October 2026 begins on a Thursday", () => {
    expect(weekdayMonday0("2026-10-01")).toBe(3);
    const rows = monthGrid(month(2026, 10, 31));
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.length === 7)).toBe(true);
    expect(rows[0]!.slice(0, 3).every((c) => c.kind === "blank")).toBe(true);
    expect(rows[0]![3]).toMatchObject({ kind: "day", dayOfMonth: 1 });
    expect(rows[4]!.at(-1)).toMatchObject({ kind: "blank" });
  });

  it("a month that fills exactly four rows has no blank cells", () => {
    const rows = monthGrid(month(2027, 2, 28)); // 1 Feb 2027 is a Monday
    expect(rows).toHaveLength(4);
    expect(rows.flat().every((c) => c.kind === "day")).toBe(true);
  });

  it("a 31-day month can need six rows", () => {
    expect(monthGrid(month(2026, 8, 31))).toHaveLength(6); // 1 Aug 2026 is a Saturday
  });

  it("is empty for no days", () => {
    expect(monthGrid([])).toEqual([]);
  });

  it("shifts across year boundaries", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 10, 14)).toEqual({ year: 2027, month: 12 });
    expect(shiftMonth(2026, 3, -15)).toEqual({ year: 2024, month: 12 });
    expect(monthTitle(2026, 10)).toBe("October 2026");
  });
});

describe("ISO weeks", () => {
  it("maps dates to weeks, Sunday included", () => {
    expect(isoWeekOf("2026-10-05")).toBe("2026-W41");
    expect(isoWeekOf("2026-10-11")).toBe("2026-W41");
    expect(isoWeekOf("2026-10-12")).toBe("2026-W42");
    expect(isoWeekOf("2026-01-01")).toBe("2026-W01");
    expect(isoWeekOf("2025-12-28")).toBe("2025-W52");
  });

  it("round-trips Monday ↔ week and shifts by weeks", () => {
    expect(isoWeekMondayKey("2026-W41")).toBe("2026-10-05");
    expect(isoWeekMondayKey("2026-W01")).toBe("2025-12-29");
    expect(shiftWeek("2026-W41", 1)).toBe("2026-W42");
    expect(shiftWeek("2026-W01", -1)).toBe("2025-W52");
    expect(shiftWeek("2026-W53", 1)).toBe("2027-W01");
  });
});

describe("swipe", () => {
  it("left means next month, right means previous", () => {
    expect(swipeDirection({ x: 300, y: 100 }, { x: 150, y: 110 })).toBe("next");
    expect(swipeDirection({ x: 100, y: 100 }, { x: 260, y: 90 })).toBe("prev");
  });

  it("ignores short or mostly-vertical drags (scrolling)", () => {
    expect(swipeDirection({ x: 100, y: 100 }, { x: 130, y: 100 })).toBeNull();
    expect(swipeDirection({ x: 100, y: 100 }, { x: 180, y: 300 })).toBeNull();
    expect(swipeDirection({ x: 100, y: 100 }, { x: 100, y: 100 })).toBeNull();
  });
});

describe("mock marks", () => {
  it("parses integers including negatives", () => {
    expect(parseMarks("42")).toBe(42);
    expect(parseMarks(" -8 ")).toBe(-8);
    expect(parseMarks("")).toBeNaN();
    expect(parseMarks("4.5")).toBeNaN();
    expect(parseMarks("abc")).toBeNaN();
  });

  it("adds the subjects up only when every subject of the pattern has marks", () => {
    expect(autoTotal("jee_main", { physics: "60", chemistry: "70", maths: "50" })).toBe(180);
    expect(autoTotal("jee_main", { physics: "60", chemistry: "70", maths: "" })).toBeNull();
    expect(autoTotal("jee_main", { physics: "60", chemistry: "-10", maths: "5" })).toBe(55);
    expect(autoTotal("neet", { physics: "100", chemistry: "100", biology: "300", maths: "999" })).toBe(500); // maths is not a NEET subject
  });

  it("explains why marks cannot be saved", () => {
    const sub = { physics: "60", chemistry: "70", maths: "50" };
    expect(marksProblem("jee_main", 180, 300, sub)).toBeNull();
    expect(marksProblem("jee_main", 181, 300, sub)).toMatch(/must equal the sum of the subjects \(180\)/);
    expect(marksProblem("jee_main", 301, 300, {})).toMatch(/more than the maximum/);
    expect(marksProblem("jee_main", -301, 300, {})).toMatch(/below -300/);
    expect(marksProblem("jee_main", -40, 300, {})).toBeNull();
    expect(marksProblem("jee_main", 10, 0, {})).toMatch(/maximum marks/);
  });

  it("percent of the paper, ranks and signed points", () => {
    expect(scorePercent(195, 300)).toBe(65);
    expect(scorePercent(-30, 300)).toBe(-10);
    expect(scorePercent(5, 0)).toBe(0);
    expect(rankLabel(1400000)).toBe("14,00,000");
    expect(approxRank(42000)).toBe("~42,000");
    expect(approxRank(null)).toBe("—");
    expect(signedPoints(5)).toBe("+5");
    expect(signedPoints(-5)).toBe("-5");
    expect(signedPoints(0)).toBe("0");
  });
});

describe("target rank storage", () => {
  it("accepts whole numbers in range only", () => {
    expect(parseTargetRank("5000")).toBe(5000);
    expect(parseTargetRank(null)).toBeNull();
    expect(parseTargetRank("0")).toBeNull();
    expect(parseTargetRank("12.5")).toBeNull();
    expect(parseTargetRank("abc")).toBeNull();
    expect(parseTargetRank("9999999")).toBeNull();
  });
});

describe("labels", () => {
  it("weightage is a share of the paper", () => {
    expect(weightageLabel(0.0344)).toBe("3.4%");
    expect(weightageLabel(0.12)).toBe("12%");
    expect(weightageLabel(null)).toBe("—");
  });

  it("hours and chapter meta", () => {
    expect(hoursLabel(0)).toBe("0h");
    expect(hoursLabel(2)).toBe("2h");
    expect(hoursLabel(1.5)).toBe("1.5h");
    expect(chapterMeta({ class: 11, ncertChapterNumber: 3, estimatedHours: 12, progress: { hours: 1.5 } })).toBe("Class 11 · NCERT 3 · 1.5h of ~12h");
    expect(chapterMeta({ class: null, ncertChapterNumber: null, estimatedHours: null, progress: { hours: 0 } })).toBe("0h");
    expect(strengthKey(null)).toBe("unrated");
    expect(strengthKey("weak")).toBe("weak");
  });
});

describe("analytics wording", () => {
  it("formats a drill value in its own unit", () => {
    expect(drillValue("minutes", 95)).toBe("1h 35m");
    expect(drillValue("percent", 62.5)).toBe("62.5%");
    expect(drillValue("seconds_per_question", 85)).toBe("85s");
    expect(drillValue("questions", 40)).toBe("40");
    expect(drillValue("revisions", null)).toBe("—");
  });

  it("builds drill links and validates metric and period", () => {
    expect(drillHref("hours", "week")).toBe("/analytics/drill/hours?period=week");
    expect(drillHref("accuracy", "quarter", 2)).toBe("/analytics/drill/accuracy?period=quarter&subject=2");
    expect(isDrillMetric("hours")).toBe(true);
    expect(isDrillMetric("vibes")).toBe(false);
    expect(isDrillPeriod("all")).toBe(true);
    expect(isDrillPeriod("year")).toBe(false);
    expect(isDrillPeriod(null)).toBe(false);
  });

  it("finds the latest week that has a value", () => {
    const rows = [{ weekStart: "a", v: 1 }, { weekStart: "b", v: null }, { weekStart: "c", v: null }];
    expect(latestWeek(rows, (r) => r.v !== null)?.weekStart).toBe("a");
    expect(latestWeek(rows, () => false)).toBeNull();
  });

  it("streak caption", () => {
    expect(streakCaption({ current: 3, longest: 9, shields: { available: true, perWeek: 1 } })).toBe("best 9 · shield ready");
    expect(streakCaption({ current: 9, longest: 9, shields: { available: false, perWeek: 1 } })).toBe("your best");
  });
});

describe("mock share card", () => {
  const card: MockShareCard = {
    aspect: "9:16",
    brand: "Prepex",
    headline: "AITS 7",
    mock: { id: "m1", name: "AITS 7", testType: "full_mock", examPattern: "jee_main", date: "2026-10-05" },
    totalMarks: 195,
    maxMarks: 300,
    scorePercent: 65,
    subjectMarks: { physics: 70, chemistry: 60, maths: 65, biology: null },
    percentile: 96.5,
    projectedRank: 49000,
    candidatePool: 1400000,
    vsPrevious: 8.5,
    weakChapters: ["Kinematics", "Rotational Motion"],
    generatedAt: "2026-10-07T00:00:00Z",
  };
  const measure = (s: string, size: number) => s.length * size * 0.5;

  it("puts the score in the ring and the projection in words", () => {
    const layout = layoutMockCard(card, measure);
    const text = layout.texts.map((t) => t.text);
    expect(layout.ring.fraction).toBe(0.65);
    expect(text).toContain("195");
    expect(text).toContain("out of 300");
    expect(text).toContain("65%");
    expect(text).toContain("96.5 percentile");
    expect(text).toContain("projected rank ~49,000");
    expect(text.some((t) => t.startsWith("+8.5 points"))).toBe(true);
    expect(text.some((t) => t.startsWith("Next: Kinematics"))).toBe(true);
  });

  it("leaves out what is not there", () => {
    const layout = layoutMockCard({ ...card, percentile: null, projectedRank: null, vsPrevious: null, weakChapters: [], subjectMarks: { physics: null, chemistry: null, maths: null, biology: null } }, measure);
    const text = layout.texts.map((t) => t.text).join("|");
    expect(text).not.toMatch(/percentile|projected|points vs|Next:/);
  });

  it("colours by score and names the file", () => {
    expect(scoreColor(80)).toBe("#10B981");
    expect(scoreColor(50)).toBe("#F59E0B");
    expect(scoreColor(10)).toBe("#EF4444");
    expect(mockCardFileName(card)).toBe("prepex-mock-aits-7-2026-10-05.png");
  });
});
