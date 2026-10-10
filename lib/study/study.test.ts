import { describe, expect, it } from "vitest";
import { describeNextReview, RATINGS } from "@/lib/study/mistakeRating";
import {
  clampPlannedMinutes,
  defaultWasCompleted,
  formatClock,
  liveElapsedSeconds,
  previewMinutes,
  remainingSeconds,
  ringProgress,
} from "@/lib/study/timer";
import { dayHeading, formatMinutes, fromLocalInputValue, groupByDay, isHttpsUrl, localDayKey, parseTags, toLocalInputValue } from "@/lib/study/format";
import { makeSubjectLookup, subjectColor } from "@/lib/study/subjects";

describe("timer", () => {
  it("an ACTIVE timer keeps running between server answers; paused and ended ones do not", () => {
    const t0 = 1_000_000;
    expect(liveElapsedSeconds({ status: "ACTIVE", elapsedSeconds: 60 }, t0, t0 + 5_900)).toBe(65);
    expect(liveElapsedSeconds({ status: "PAUSED", elapsedSeconds: 60 }, t0, t0 + 50_000)).toBe(60);
    expect(liveElapsedSeconds({ status: "ENDED", elapsedSeconds: 60 }, t0, t0 + 50_000)).toBe(60);
  });

  it("never runs backwards if the local clock steps back", () => {
    expect(liveElapsedSeconds({ status: "ACTIVE", elapsedSeconds: 10 }, 5_000, 1_000)).toBe(10);
  });

  it("counts down and goes negative in overtime", () => {
    expect(remainingSeconds(25, 0)).toBe(1500);
    expect(remainingSeconds(25, 1500)).toBe(0);
    expect(remainingSeconds(25, 1560)).toBe(-60);
  });

  it("formats the clock: minutes, hours, and a + for overtime", () => {
    expect(formatClock(1500)).toBe("25:00");
    expect(formatClock(243)).toBe("4:03");
    expect(formatClock(3909)).toBe("1:05:09");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-130)).toBe("+2:10");
  });

  it("ring progress is clamped to 0..1", () => {
    expect(ringProgress(25, 0)).toBe(0);
    expect(ringProgress(25, 750)).toBe(0.5);
    expect(ringProgress(25, 99_999)).toBe(1);
    expect(ringProgress(0, 10)).toBe(0);
  });

  it("'was this a win' defaults to yes from 80% of the plan", () => {
    expect(defaultWasCompleted(25, 20 * 60)).toBe(true);
    expect(defaultWasCompleted(25, 19 * 60)).toBe(false);
  });

  it("previews the minutes the server will credit, and clamps the plan length", () => {
    expect(previewMinutes(89)).toBe(1);
    expect(previewMinutes(29)).toBe(0);
    expect(clampPlannedMinutes(0)).toBe(1);
    expect(clampPlannedMinutes(9999)).toBe(480);
    expect(clampPlannedMinutes(25.4)).toBe(25);
    expect(clampPlannedMinutes(Number.NaN)).toBe(25);
  });
});

describe("format", () => {
  it("formats minutes", () => {
    expect(formatMinutes(0)).toBe("0m");
    expect(formatMinutes(45)).toBe("45m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(85)).toBe("1h 25m");
    expect(formatMinutes(-5)).toBe("0m");
  });

  it("groups newest-first items by local day, keeping order and summing minutes", () => {
    const at = (h: number, d = 7) => new Date(2026, 9, d, h, 0).toISOString();
    const rows = [
      { id: "a", at: at(15), m: 30 },
      { id: "b", at: at(9), m: 20 },
      { id: "c", at: at(18, 6), m: 45 },
    ];
    const groups = groupByDay(rows, (r) => r.at, (r) => r.m);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([["a", "b"], ["c"]]);
    expect(groups.map((g) => g.minutes)).toEqual([50, 45]);
    expect(groupByDay([], () => "")).toEqual([]);
  });

  it("names days relative to now", () => {
    const now = new Date(2026, 9, 7, 12, 0);
    expect(dayHeading(localDayKey(now.toISOString()), now)).toBe("Today");
    expect(dayHeading("2026-10-06", now)).toBe("Yesterday");
    expect(dayHeading("2026-10-01", now)).toMatch(/1/);
  });

  it("parses tags: trims, lower-cases, de-duplicates, drops empties, caps the count and length", () => {
    expect(parseTags(" Silly, units ,silly,, \n Calc ")).toEqual(["silly", "units", "calc"]);
    expect(parseTags("")).toEqual([]);
    expect(parseTags(Array.from({ length: 20 }, (_, i) => `t${i}`).join(","))).toHaveLength(10);
    expect(parseTags("x".repeat(50))[0]).toHaveLength(30);
  });

  it("accepts only https links without credentials", () => {
    expect(isHttpsUrl("https://cdn.example.com/a.png")).toBe(true);
    expect(isHttpsUrl("  https://cdn.example.com/a.png  ")).toBe(true);
    for (const bad of ["http://x.test/a.png", "javascript:alert(1)", "data:image/png;base64,AA", "https://u:p@x.test/a", "not a url", ""]) {
      expect(isHttpsUrl(bad), bad).toBe(false);
    }
  });

  it("round-trips the datetime-local value through an instant", () => {
    const d = new Date(2026, 9, 7, 14, 5);
    const local = toLocalInputValue(d);
    expect(local).toBe("2026-10-07T14:05");
    expect(new Date(fromLocalInputValue(local)).getTime()).toBe(d.getTime());
  });
});

describe("mistake ratings", () => {
  it("maps each button to difficulty + remembered", () => {
    expect(RATINGS.map((r) => [r.key, r.difficulty, r.remembered])).toEqual([
      ["hard", 5, false],
      ["good", 3, true],
      ["easy", 1, true],
    ]);
  });

  it("describes the next review in plain words", () => {
    const now = new Date("2026-10-07T06:00:00Z");
    const inDays = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString();
    expect(describeNextReview(inDays(-1), now)).toBe("today");
    expect(describeNextReview(inDays(0.5), now)).toBe("tomorrow");
    expect(describeNextReview(inDays(3), now)).toBe("in 3 days");
    expect(describeNextReview(inDays(90), now)).toBe("in 3 months");
    expect(describeNextReview(null, now)).toBe("never — mastered");
  });
});

describe("subjects", () => {
  it("gives a subject the same colour every time, and wraps the palette", () => {
    expect(subjectColor(1)).toBe(subjectColor(1));
    expect(subjectColor(1)).not.toBe(subjectColor(2));
    expect(subjectColor(8)).toBe(subjectColor(1));
    expect(subjectColor(-3)).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("looks names up, with a fallback for unknown ids", () => {
    const lookup = makeSubjectLookup([
      { subjectId: 1, subjectCode: "PHY", subjectName: "Physics", chapters: [{ id: "c1", name: "Kinematics", sequenceOrder: 1 } as never] },
    ]);
    expect(lookup.subjectName(1)).toBe("Physics");
    expect(lookup.subjectName(9)).toBe("Subject 9");
    expect(lookup.chapterName("c1")).toBe("Kinematics");
    expect(lookup.chapterName("zzz")).toBeNull();
    expect(lookup.chapterName(null)).toBeNull();
  });
});
