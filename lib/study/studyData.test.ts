import { describe, expect, it } from "vitest";
import type { BacklogAnalytics, BacklogItem } from "@/lib/api/backlogItems";
import type { MockAnalytics } from "@/lib/api/mocks";
import type { PracticeAnalytics } from "@/lib/api/practiceLogs";
import type { RevisionOverview } from "@/lib/api/revision";
import type { RevisionAnalytics } from "@/lib/api/revisionLogs";
import type { StudySummary } from "@/lib/api/studyLog";
import { backlogHub, mockHub, practiceHub, revisionHub, summaryStrip } from "@/lib/study/hub";
import { sessionStats } from "@/lib/study/sessionStats";

const NOW = new Date("2026-10-07T06:00:00Z");

describe("revisionHub", () => {
  const overview = (tasks: number, chapters: { nextRevisionAt: string | null }[]): RevisionOverview =>
    ({
      todaysRevisionTasks: { count: tasks, tasks: [] },
      upcomingRevisions: { count: chapters.length, chapters },
      masteredChapters: { count: 0, chapters: [] },
    }) as unknown as RevisionOverview;
  const analytics = { totals: { revisions: 4 }, stale: [1, 2, 3, 4].map((n) => ({ chapterName: `Chapter ${n}`, daysAgo: n * 5 })) } as unknown as RevisionAnalytics;

  it("takes 'due today' from the planner's revision tasks, not from the revision log", () => {
    const hub = revisionHub(overview(3, []), analytics, NOW)!;
    expect(hub.dueToday).toBe(3);
    expect(hub.doneThisWeek).toBe(4);
  });

  it("counts a chapter as overdue only when its next revision date is before today", () => {
    const hub = revisionHub(overview(0, [{ nextRevisionAt: "2026-10-05T00:00:00Z" }, { nextRevisionAt: "2026-10-07T00:00:00Z" }, { nextRevisionAt: null }]), null, NOW)!;
    expect(hub.overdue).toBe(1);
    expect(hub.doneThisWeek).toBeNull();
  });

  it("lists the three stalest chapters and nothing when the overview did not load", () => {
    expect(revisionHub(overview(0, []), analytics, NOW)!.stale).toEqual([
      { name: "Chapter 1", ago: "5d ago" },
      { name: "Chapter 2", ago: "10d ago" },
      { name: "Chapter 3", ago: "15d ago" },
    ]);
    expect(revisionHub(null, analytics, NOW)).toBeNull();
  });
});

describe("backlogHub", () => {
  const analytics = { totals: { open: 3, scheduled: 1 }, redFlags: [{ chapterId: "c1", chapterName: "Kinematics" }] } as unknown as BacklogAnalytics;
  const item = (over: Partial<BacklogItem>): BacklogItem => ({ id: "i", chapterId: null, topic: null, deadline: null, isOverdue: false, ...over }) as BacklogItem;

  it("counts items to clear, overdue ones, and lists the three nearest deadlines", () => {
    const hub = backlogHub(
      analytics,
      [item({ id: "a", topic: "Vectors", deadline: "2026-10-12" }), item({ id: "b", chapterId: "c1", deadline: "2026-10-05", isOverdue: true }), item({ id: "c", deadline: null }), item({ id: "d", deadline: "2026-10-09" })],
      false,
      NOW,
    )!;
    expect(hub.toClear).toBe(4);
    expect(hub.overdue).toEqual({ count: 1, more: false });
    expect(hub.byDeadline.map((b) => b.label)).toEqual(["Kinematics", "Backlog item", "Vectors"]);
    expect(hub.byDeadline[0]!.overdue).toBe(true);
    expect(hub.nextDeadline).not.toBeNull();
  });

  it("has no next deadline when no open item has one", () => {
    expect(backlogHub(analytics, [item({})], false, NOW)!.nextDeadline).toBeNull();
  });
});

describe("practiceHub and mockHub", () => {
  it("practice: accuracy, only the days with questions in the series, the weakest chapter by accuracy", () => {
    const hub = practiceHub({
      totals: { accuracy: 71, attempted: 40 },
      byDay: [{ accuracy: 60 }, { accuracy: null }, { accuracy: 80 }],
      weakness: [
        { chapterName: "Optics", accuracy: 55, attempted: 10 },
        { chapterName: "Kinematics", accuracy: 40, attempted: 5 },
        { chapterName: "Untouched", accuracy: null, attempted: 0 },
      ],
    } as unknown as PracticeAnalytics)!;
    expect(hub.series).toEqual([60, 80]);
    expect(hub.weakest).toEqual({ name: "Kinematics", accuracy: 40 });
  });

  it("mocks: last score with percentile, the last six scores, and the chapter that comes up most", () => {
    const trend = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ date: `2026-09-0${n}`, scorePercent: 40 + n, percentile: n === 7 ? 91.5 : null }));
    const hub = mockHub({
      totals: { mocks: 7 },
      trend: [...trend].reverse(),
      weakChapters: [
        { chapterId: "a", mocks: 2, lastDate: "2026-09-01" },
        { chapterId: "b", mocks: 4, lastDate: "2026-09-02" },
      ],
      weakChapterNames: { a: "Optics", b: "Electrostatics" },
    } as unknown as MockAnalytics)!;
    expect(hub.last).toEqual({ scorePercent: 47, percentile: 91.5 });
    expect(hub.series).toEqual([42, 43, 44, 45, 46, 47]);
    expect(hub.exposing).toEqual({ name: "Electrostatics", mocks: 4 });
  });

  it("returns nothing when a source did not answer", () => {
    expect(practiceHub(null)).toBeNull();
    expect(mockHub(null)).toBeNull();
  });
});

describe("summaryStrip", () => {
  it("rounds hours to one decimal and keeps missing sources as null so their tile is left out", () => {
    expect(summaryStrip({ weekMinutes: 395, sessionCount: 6, questions: null, streak: 4 })).toEqual({ hoursThisWeek: 6.6, sessions: 6, questions: null, streak: 4 });
    expect(summaryStrip({ weekMinutes: null, sessionCount: null, questions: 0, streak: 0 }).hoursThisWeek).toBeNull();
  });
});

describe("sessionStats", () => {
  const summary = (minutes: number[]): StudySummary => ({
    period: "week",
    from: "2026-10-05",
    to: "2026-10-11",
    totalMinutes: minutes.reduce((a, b) => a + b, 0),
    sessionCount: 3,
    bySubject: [],
    byDay: minutes.map((m, i) => ({ date: `2026-10-${String(5 + i).padStart(2, "0")}`, minutes: m, bySubject: {} })),
  });

  it("works out today, the total, the average over the days that have started, and the best day", () => {
    const s = sessionStats(summary([60, 120, 30, 0, 0, 0, 0]), "2026-10-07", NOW);
    expect(s.today).toBe(30);
    expect(s.total).toBe(210);
    expect(s.dailyAverage).toBe(70);
    expect(s.best).toMatchObject({ minutes: 120 });
  });

  it("has no best day when nothing was logged, and no 'today' outside the range", () => {
    const s = sessionStats(summary([0, 0, 0, 0, 0, 0, 0]), "2026-10-20", NOW);
    expect(s.best).toBeNull();
    expect(s.today).toBeNull();
  });
});
