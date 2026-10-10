import { describe, expect, it } from "vitest";
import type { ShareCard } from "@/lib/api/practiceLogs";
import { axisNumber, countScale, PERCENT_SCALE, rateScale } from "@/lib/logs/chartScale";
import { addDaysToKey, agoLabel, currentWindow, dayKey, dayLabel, nextDays, startOfTodayIso } from "@/lib/logs/dates";
import { labelOf, percentLabel, PRACTICE_SOURCES, PRIORITIES, REVISION_TYPES, WINDOWS } from "@/lib/logs/labels";
import { accuracyOf, checkSum, parseCount } from "@/lib/logs/practiceSum";
import { CARD_H, CARD_W, layoutShareCard, shareFileName, wrapText } from "@/lib/logs/shareCard";

describe("checkSum — attempted = correct + wrong + skipped", () => {
  it("accepts numbers that add up", () => {
    expect(checkSum({ attempted: 10, correct: 7, wrong: 2, skipped: 1 })).toEqual({ parts: 10, ok: true, difference: 0, message: "" });
  });

  it("says how many questions are unaccounted for", () => {
    const r = checkSum({ attempted: 12, correct: 7, wrong: 2, skipped: 1 });
    expect(r.ok).toBe(false);
    expect(r.difference).toBe(2);
    expect(r.message).toBe("7 + 2 + 1 = 10, but you attempted 12. 2 questions are not counted as correct, wrong or skipped.");
    expect(checkSum({ attempted: 11, correct: 7, wrong: 2, skipped: 1 }).message).toMatch(/1 question is not counted/);
  });

  it("flags more outcomes than attempts (the attempted=10, correct=11 case)", () => {
    const r = checkSum({ attempted: 10, correct: 11, wrong: 0, skipped: 0 });
    expect(r.ok).toBe(false);
    expect(r.difference).toBe(-1);
    expect(r.message).toBe("11 + 0 + 0 = 11 is 1 more than the 10 you attempted.");
  });

  it("needs at least one question", () => {
    expect(checkSum({ attempted: 0, correct: 0, wrong: 0, skipped: 0 })).toMatchObject({ ok: false, message: "Log at least one question." });
  });
});

describe("parseCount and accuracyOf", () => {
  it("parses whole numbers 0–1000; blank is 0; anything else is NaN", () => {
    expect(parseCount("7")).toBe(7);
    expect(parseCount("")).toBe(0);
    expect(parseCount("  ")).toBe(0);
    expect(parseCount("1000")).toBe(1000);
    for (const bad of ["1001", "-1", "2.5", "abc"]) expect(parseCount(bad), bad).toBeNaN();
  });

  it("accuracy to one decimal; null with nothing attempted", () => {
    expect(accuracyOf({ attempted: 10, correct: 7 })).toBe(70);
    expect(accuracyOf({ attempted: 3, correct: 1 })).toBe(33.3);
    expect(accuracyOf({ attempted: 0, correct: 0 })).toBeNull();
  });
});

describe("local dates for the planner picker", () => {
  const now = new Date(2026, 9, 10, 14, 30); // Sat 10 Oct 2026, 14:30 local

  it("dayKey / addDaysToKey cross month and year ends", () => {
    expect(dayKey(now)).toBe("2026-10-10");
    expect(addDaysToKey("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("nextDays starts today and labels today and tomorrow", () => {
    const days = nextDays(7, now);
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ key: "2026-10-10", label: "Today" });
    expect(days[1]).toEqual({ key: "2026-10-11", label: "Tomorrow" });
    expect(days[6]!.key).toBe("2026-10-16");
    expect(dayLabel("2026-10-14", now)).toMatch(/Wed/);
  });

  it("picks the planner window for the time of day", () => {
    const at = (h: number) => currentWindow(new Date(2026, 9, 10, h, 0));
    expect([4, 5, 10, 11, 15, 16, 20, 21, 23].map(at)).toEqual(["NIGHT", "MORNING", "MORNING", "MIDDAY", "MIDDAY", "EVENING", "EVENING", "NIGHT", "NIGHT"]);
  });

  it("startOfTodayIso is local midnight", () => {
    expect(new Date(startOfTodayIso(now)).getTime()).toBe(new Date(2026, 9, 10).getTime());
  });

  it("agoLabel reads naturally", () => {
    expect([null, 0, 1, 5].map(agoLabel)).toEqual(["never", "today", "yesterday", "5d ago"]);
  });
});

describe("chart scales: whole, repeated-label-free axes", () => {
  it("percent axis is fixed 0–100 in quarters", () => {
    expect(PERCENT_SCALE).toEqual({ max: 100, step: 25, ticks: [0, 25, 50, 75, 100] });
  });

  it("count axis never has fractional ticks, even for tiny values", () => {
    expect(countScale(0).ticks).toEqual([0, 1, 2, 3]);
    expect(countScale(1).ticks).toEqual([0, 1, 2, 3]);
    expect(countScale(7).step).toBe(2);
    expect(countScale(7).max).toBeGreaterThanOrEqual(7);
    for (const m of [0, 1, 2, 4, 5, 9, 11, 30, 80, 200, 999]) {
      const s = countScale(m);
      expect(s.ticks.every(Number.isInteger), `max ${m}`).toBe(true);
      expect(new Set(s.ticks).size).toBe(s.ticks.length);
      expect(s.max).toBeGreaterThanOrEqual(m);
      expect(s.ticks.length).toBeLessThanOrEqual(6);
    }
    expect(countScale(Number.NaN).ticks).toEqual([0, 1, 2, 3]);
  });

  it("rate axis uses halves for slow solving and whole numbers for fast", () => {
    expect(rateScale(0.4).ticks).toEqual([0, 0.5, 1, 1.5]);
    expect(rateScale(2.2).step).toBe(1);
    expect(rateScale(6).step).toBe(2);
    expect(rateScale(12).step).toBe(5);
    expect(rateScale(0.4).ticks.every((t, i, a) => i === 0 || t > a[i - 1]!)).toBe(true);
    expect(axisNumber(0.5)).toBe("0.5");
    expect(axisNumber(2)).toBe("2");
  });
});

describe("labels", () => {
  it("has every revision type, the ten practice sources, four windows and five priorities", () => {
    expect(REVISION_TYPES.map((t) => t.value)).toEqual(["notes", "short_notes", "handwritten", "formula_sheet", "mixed"]);
    expect(PRACTICE_SOURCES).toHaveLength(10);
    expect(PRACTICE_SOURCES.at(-1)).toEqual({ value: "other", label: "Other" });
    expect(WINDOWS.map((w) => w.value)).toEqual(["MORNING", "MIDDAY", "EVENING", "NIGHT"]);
    expect(PRIORITIES.map((p) => p.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it("labelOf falls back, percentLabel prints whole numbers plainly", () => {
    expect(labelOf(PRACTICE_SOURCES, "hcv")).toBe("HC Verma");
    expect(labelOf(PRACTICE_SOURCES, "nope" as never, "nope")).toBe("nope");
    expect(percentLabel(70)).toBe("70%");
    expect(percentLabel(33.3)).toBe("33.3%");
    expect(percentLabel(null)).toBe("—");
  });
});

describe("share card", () => {
  const measure = (s: string, size: number) => s.length * size * 0.5;
  const card = (over: Partial<ShareCard> = {}): ShareCard => ({
    aspect: "9:16",
    brand: "Prepex",
    period: "week",
    periodLabel: "This week",
    scope: { subjectId: 1, subjectName: "Physics", chapterId: null, chapterName: null },
    headline: "Physics · this week",
    hasData: true,
    questions: 40,
    correct: 30,
    accuracy: 75,
    band: "yellow",
    sessions: 4,
    minutes: 95,
    activeDays: 3,
    topSource: { source: "hcv", share: 60 },
    strongestChapter: { chapterName: "Kinematics", accuracy: 90 },
    weakestChapter: { chapterName: "Laws of Motion", accuracy: 40 },
    generatedAt: "2026-10-10T10:00:00.000Z",
    ...over,
  });

  it("wraps words onto at most N lines and ellipsises the overflow", () => {
    const m = (s: string) => s.length * 10;
    expect(wrapText(m, "one two three four", 90, 3)).toEqual(["one two", "three", "four"]);
    const two = wrapText(m, "alpha beta gamma delta epsilon", 80, 2);
    expect(two).toHaveLength(2);
    expect(two[1]!.endsWith("…")).toBe(true);
    expect(wrapText(m, "", 100, 2)).toEqual([]);
  });

  it("lays out a 1080 × 1920 card with the headline, the accuracy ring and the stats", () => {
    const l = layoutShareCard(card(), measure);
    expect([l.width, l.height]).toEqual([CARD_W, CARD_H]);
    expect(CARD_H / CARD_W).toBeCloseTo(16 / 9, 5);
    const texts = l.texts.map((t) => t.text);
    expect(texts).toContain("Physics · this week");
    expect(texts).toContain("75%");
    expect(texts).toContain("30 / 40 questions correct");
    expect(texts.some((t) => t.startsWith("Strongest · Kinematics 90%"))).toBe(true);
    expect(texts.some((t) => t.startsWith("Needs work · Laws of Motion 40%"))).toBe(true);
    expect(texts).toContain("Mostly HC Verma");
    expect(l.ring).toMatchObject({ fraction: 0.75, color: "#F59E0B" });
    for (const t of l.texts) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(CARD_H);
    }
  });

  it("colours the ring by band and handles an empty card", () => {
    expect(layoutShareCard(card({ accuracy: 30, band: "red" }), measure).ring.color).toBe("#EF4444");
    expect(layoutShareCard(card({ accuracy: 90, band: "green" }), measure).ring.color).toBe("#10B981");
    const empty = layoutShareCard(card({ hasData: false, questions: 0, correct: 0, accuracy: null, band: null, topSource: null, strongestChapter: null, weakestChapter: null }), measure);
    expect(empty.texts.map((t) => t.text)).toContain("No practice logged yet");
    expect(empty.ring.fraction).toBe(0);
  });

  it("names the file after the chapter or subject and the period", () => {
    expect(shareFileName(card())).toBe("prepex-physics-week.png");
    expect(shareFileName(card({ period: "month", scope: { subjectId: 1, subjectName: "Physics", chapterId: "c", chapterName: "Work, Energy & Power" } }))).toBe("prepex-work-energy-power-month.png");
    expect(shareFileName(card({ scope: { subjectId: null, subjectName: null, chapterId: null, chapterName: null } }))).toBe("prepex-practice-week.png");
  });
});
