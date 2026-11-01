import { describe, expect, it } from "vitest";
import type { PlanTask } from "@/lib/api/plannerV2";
import { focusSessionHref } from "@/lib/focus/startFocusSession";
import { parseIntentParams } from "@/lib/focus/intent";
import { CONFIDENCE_LABELS, inferMock, mockUrl, plannerFocusIntent, practiceUrl } from "@/lib/planner/cta";
import { daySummaryText, formatClock, formatDuration, formatHoursLong, openTasks, subjectStyle } from "@/lib/planner/format";
import { cleanProps, PLANNER_EVENTS } from "@/lib/telemetry/planner";
import { isEndOfDay } from "@/components/planner/EndOfDay";
import { MODE_CONFIRM } from "@/components/planner/ModeToggle";

const ID = "11111111-1111-4111-8111-111111111111";

const task = (over: Partial<PlanTask> = {}): PlanTask => ({
  id: ID, planId: "p", kind: "lecture", title: "Kinematics lecture", description: null, subjectId: 1, subject: "physics", chapterId: "c1", chapterName: "Kinematics", topic: null,
  startMin: 600, endMin: 660, estimatedMinutes: 60, plannedUnits: 1, questionCount: null, status: "pending", origin: null, contentSource: null, contentSourceLabel: null, generatedBy: "engine",
  fixedSlot: false, weeklyGoalId: null, backlogItemId: null, secondsCompleted: 0, actualMinutes: null, linkedSessionLogId: null, linkedPracticeLogId: null, linkedRevisionLogId: null, linkedMockLogId: null, warning: null, why: null, suggested: false, isProtected: false, locked: false,
  ...over,
});

describe("time wording", () => {
  it("formats a clock on a 12-hour face", () => {
    expect(formatClock(0)).toBe("12:00 AM");
    expect(formatClock(9 * 60 + 5)).toBe("9:05 AM");
    expect(formatClock(12 * 60)).toBe("12:00 PM");
    expect(formatClock(18 * 60 + 30)).toBe("6:30 PM");
  });
  it("formats durations", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(270)).toBe("4h 30m");
    expect(formatDuration(-3)).toBe("0m");
  });
  it("formats long hours", () => {
    expect(formatHoursLong(30)).toBe("30 min");
    expect(formatHoursLong(60)).toBe("1 hour");
    expect(formatHoursLong(150)).toBe("2.5 hours");
  });
  it("writes the day chip", () => {
    expect(daySummaryText(270, 120)).toBe("4h 30m planned • 2h done");
  });
});

describe("subjects and ordering", () => {
  it("colours a subject and falls back for no subject", () => {
    expect(subjectStyle("physics").label).toBe("Physics");
    expect(subjectStyle(null).label).toBe("General");
  });
  it("lists only open tasks, earliest first", () => {
    const list = openTasks([task({ id: "a", startMin: 700 }), task({ id: "b", startMin: 600 }), task({ id: "c", status: "done" }), task({ id: "d", status: "skipped" }), task({ id: "e", status: "in_progress", startMin: 650 })]);
    expect(list.map((t) => t.id)).toEqual(["b", "e", "a"]);
  });
});

describe("hand-off to the focus timer", () => {
  it("a lecture hands the timer the plan task and leaves the type for the server to pick", () => {
    expect(plannerFocusIntent(task())).toEqual({ originSource: "planner", originId: ID, subject: "physics", taskType: undefined, targetMinutes: 60 });
  });
  it("a revision is a revision session", () => {
    expect(plannerFocusIntent(task({ kind: "revision" })).taskType).toBe("revision");
  });
  it("the link round-trips through the timer's own parser", () => {
    const href = focusSessionHref(plannerFocusIntent(task({ kind: "revision", estimatedMinutes: 30 })));
    expect(href.startsWith("/focus/start?origin=planner&id=")).toBe(true);
    expect(parseIntentParams(new URL(href, "https://x.test").searchParams)).toMatchObject({ originSource: "planner", originId: ID, taskType: "revision", targetMinutes: 30 });
  });
  it("a task with no subject sends none", () => {
    expect(plannerFocusIntent(task({ subject: null })).subject).toBeUndefined();
  });
  it("points practice and mock at their own screens with the task id", () => {
    expect(practiceUrl({ id: ID })).toBe(`/practice?taskId=${ID}`);
    expect(mockUrl({ id: ID })).toBe(`/planner/mock?taskId=${ID}`);
  });
  it("labels every confidence from 1 to 5", () => {
    expect(Object.keys(CONFIDENCE_LABELS)).toHaveLength(5);
  });
});

describe("inferMock", () => {
  it("reads the exam and the test type from the title", () => {
    expect(inferMock("Full mock (JEE Advanced)")).toEqual({ testType: "full_mock", examPattern: "jee_advanced" });
    expect(inferMock("Sectional test (NEET)")).toEqual({ testType: "sectional", examPattern: "neet" });
    expect(inferMock("Chapter test")).toEqual({ testType: "chapter_test", examPattern: "jee_main" });
  });
});

describe("telemetry", () => {
  it("has every event the spec lists", () => {
    for (const e of ["planner_view", "planner_regenerate", "planner_task_start", "planner_task_complete", "planner_task_skip", "planner_task_delete", "planner_add_task", "planner_manual_toggle", "weekly_goal_save", "weekly_goal_suggest_accept", "weekly_goal_suggest_reject"]) {
      expect(PLANNER_EVENTS).toContain(e);
    }
  });
  it("sends only small primitives, never anything long or empty", () => {
    const out = cleanProps({ kind: "lecture", minutes: 45, ok: true, none: null, missing: undefined, long: "x".repeat(200) });
    expect(out).toEqual({ kind: "lecture", minutes: 45, ok: true, long: "x".repeat(64) });
  });
});

describe("end of day", () => {
  const studyBlocks = [{ endMin: 1200 }];
  it("is not the end of day for another day", () => {
    expect(isEndOfDay({ isToday: false, nowMin: 1300, tasks: [task({ status: "done" })], studyBlocks })).toBe(false);
  });
  it("is the end when nothing is left", () => {
    expect(isEndOfDay({ isToday: true, nowMin: 600, tasks: [task({ status: "done" }), task({ status: "skipped" })], studyBlocks })).toBe(true);
  });
  it("is the end when the evening has run out with work still open", () => {
    expect(isEndOfDay({ isToday: true, nowMin: 1260, tasks: [task({ status: "pending", endMin: 1100 })], studyBlocks })).toBe(true);
    expect(isEndOfDay({ isToday: true, nowMin: 900, tasks: [task({ status: "pending", endMin: 1100 })], studyBlocks })).toBe(false);
  });
  it("is not the end of an empty day", () => {
    expect(isEndOfDay({ isToday: true, nowMin: 1300, tasks: [], studyBlocks })).toBe(false);
  });
});

describe("manual / auto confirm copy", () => {
  it("says what will happen", () => {
    expect(MODE_CONFIRM.manual.description).toBe("Switching to manual will stop auto-generating future days. Your existing plan stays.");
    expect(MODE_CONFIRM.auto.description).toBe("Switching to auto will generate tomorrow's plan tonight.");
  });
});
