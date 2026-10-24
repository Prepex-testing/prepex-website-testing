import { describe, expect, it } from "vitest";
import type { Goal, NewGoal } from "@/lib/api/goals";
import type { Proposal } from "@/lib/api/plannerV2";
import { chipLabel, fitFor, forSave, goalFocusIntent, goalMinutes, hoursText, mockMinutesFor, proposalToGoal, taskName, weekDays } from "@/lib/goals/v2";

const lectures = (over: Partial<NewGoal> = {}): NewGoal => ({ type: "LECTURES", unit: "COUNT", target: 4, subjectId: 1, minutesPerUnit: 60, ...over });

describe("goalMinutes", () => {
  it("is units x minutes per unit for lectures, revisions and backlog", () => {
    expect(goalMinutes(lectures())).toBe(240);
    expect(goalMinutes(lectures({ type: "REVISIONS", target: 3, minutesPerUnit: 30 }))).toBe(90);
    expect(goalMinutes({ type: "BACKLOG", unit: "COUNT", target: 1, minutesPerUnit: 45, backlogItemId: "b" })).toBe(45);
  });
  it("uses the student's default minutes when the form left it empty", () => {
    expect(goalMinutes(lectures({ minutesPerUnit: null }))).toBe(240);
  });
  it("turns questions into minutes at the student's pace, rounded to 5", () => {
    expect(goalMinutes({ type: "QUESTIONS", unit: "COUNT", target: 100 })).toBe(250);
  });
  it("counts study hours and minutes", () => {
    expect(goalMinutes({ type: "HOURS", unit: "HOURS", target: 3 })).toBe(180);
    expect(goalMinutes({ type: "HOURS", unit: "MINUTES", target: 90 })).toBe(90);
  });
  it("prefers the server's total for a saved goal", () => {
    const saved = { ...lectures(), id: "g", totalMinutes: 999 } as unknown as Goal;
    expect(goalMinutes(saved)).toBe(999);
  });
  it("sizes a mock from its slot, else its type, else its exam", () => {
    expect(mockMinutesFor({ fixedStartTime: "14:00", fixedEndTime: "17:00" })).toBe(180);
    expect(mockMinutesFor({ mockType: "sectional" })).toBe(60);
    expect(mockMinutesFor({ mockType: "full_mock", examPattern: "neet" })).toBe(200);
    expect(mockMinutesFor({})).toBe(180);
  });
});

describe("fitFor", () => {
  it("is empty with nothing allocated", () => {
    expect(fitFor(600, 0).state).toBe("empty");
  });
  it("is under when there is room", () => {
    const f = fitFor(600, 300);
    expect(f.state).toBe("under");
    expect(f.remainingMinutes).toBe(300);
    expect(f.percent).toBe(50);
  });
  it("is a perfect fit within 15 minutes of the week's hours", () => {
    expect(fitFor(600, 600).state).toBe("perfect");
    expect(fitFor(600, 590).state).toBe("perfect");
    expect(fitFor(600, 580).state).toBe("under");
  });
  it("is over, and says by how much, past the week's hours", () => {
    const f = fitFor(600, 780);
    expect(f.state).toBe("over");
    expect(f.overMinutes).toBe(180);
    expect(f.percent).toBe(100);
  });
  it("treats a week with no hours as over once anything is added", () => {
    expect(fitFor(0, 60).state).toBe("over");
  });
});

describe("wording", () => {
  it("formats hours", () => {
    expect(hoursText(60)).toBe("1 hour");
    expect(hoursText(270)).toBe("4.5 hours");
    expect(hoursText(1020)).toBe("17 hours");
  });
  it("makes the chip '{task} — X min'", () => {
    expect(chipLabel("4 lectures", 240)).toBe("4 lectures — 240 min");
    expect(chipLabel(taskName(lectures({ target: 1 })), 60)).toBe("1 lecture — 60 min");
  });
  it("names a practice goal with its source", () => {
    expect(taskName({ type: "QUESTIONS", unit: "COUNT", target: 80, practiceSource: "hcv" })).toBe("80 questions (HCV)");
  });
});

describe("forSave", () => {
  it("drops fields that do not belong to the goal type", () => {
    const out = forSave(lectures({ practiceSource: "hcv", revisionType: "notes", fixedDate: "2026-10-26" }));
    expect(out).toEqual({ type: "LECTURES", unit: "COUNT", target: 4, subjectId: 1, chapterId: null, minutesPerUnit: 60 });
  });
  it("keeps a mock's fixed slot", () => {
    const out = forSave({ type: "MOCKS", unit: "COUNT", target: 1, mockType: "full_mock", examPattern: "jee_main", fixedDate: "2026-10-31", fixedStartTime: "14:00" });
    expect(out.fixedDate).toBe("2026-10-31");
    expect(out.fixedStartTime).toBe("14:00");
    expect(out.examPattern).toBe("jee_main");
  });
});

describe("proposalToGoal", () => {
  it("turns a suggestion into a goal the screen can save", () => {
    const p: Proposal = { id: "p1", source: "weakness", label: "Revise Kinematics", totalMinutes: 90, reason: "r", goal: { type: "REVISIONS", unit: "COUNT", target: 3, subjectId: 1, chapterId: "c1", minutesPerUnit: 30, revisionType: "notes" } };
    expect(proposalToGoal(p)).toMatchObject({ type: "REVISIONS", target: 3, chapterId: "c1", minutesPerUnit: 30, revisionType: "notes" });
  });
});

describe("weekDays", () => {
  it("lists the seven dates from the week's first day", () => {
    const days = weekDays("2026-10-26");
    expect(days).toHaveLength(7);
    expect(days[0]!.date).toBe("2026-10-26");
    expect(days[6]!.date).toBe("2026-11-01");
  });
});

describe("goalFocusIntent", () => {
  const goal = (over: Partial<Goal> = {}) => ({ id: "g1", type: "LECTURES", subjectId: 1, chapterId: "c1", topic: null, backlogItemId: null, ...over }) as unknown as Goal;
  it("starts a weekly-goal session of the right kind", () => {
    expect(goalFocusIntent(goal())).toMatchObject({ originSource: "weekly_goals", originId: "g1", subject: "1", chapter: "c1", taskType: "lecture" });
    expect(goalFocusIntent(goal({ type: "QUESTIONS" })).taskType).toBe("practice");
    expect(goalFocusIntent(goal({ type: "HOURS" })).taskType).toBe("self_study");
  });
  it("a backlog goal starts from the backlog item", () => {
    expect(goalFocusIntent(goal({ type: "BACKLOG", backlogItemId: "b9" }))).toMatchObject({ originSource: "backlog_tab", originId: "b9" });
  });
});
