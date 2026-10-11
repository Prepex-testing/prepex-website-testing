import { describe, expect, it } from "vitest";
import { chipLabel, mondayOfNextWeek, splitSections, waitText, weekLabel } from "@/lib/diagnosis/format";
import { fixToGoalHref, parsePrefill, prefillHref } from "@/lib/goals/prefill";

const CH = "11111111-1111-4111-8111-111111111111";
const params = (qs: string) => new URLSearchParams(qs);
const subjectOf = (id: string) => (id === CH ? 1 : null);

describe("splitSections", () => {
  it("turns the Brain's capital-letter headings into titled sections", () => {
    const sections = splitSections("## WHAT IS WORKING\nKinematics is solid.\n\n## WHAT IS LEAKING\nWednesday was empty.\n\n## TOP 3 FIXES\n1. Do torque.");
    expect(sections.map((s) => s.title)).toEqual(["What is working", "What is leaking", "Top 3 fixes"]);
    expect(sections[0]!.body).toBe("Kinematics is solid.");
    expect(sections[2]!.body).toBe("1. Do torque.");
  });

  it("accepts bold or colon-style headings", () => {
    const sections = splitSections("**WHAT IS WORKING**\nA\nWHAT IS LEAKING:\nB");
    expect(sections.map((s) => s.title)).toEqual(["What is working", "What is leaking"]);
  });

  it("keeps text that comes before the first heading, and never drops a line", () => {
    const sections = splitSections("Intro line.\n## WHAT IS WORKING\nGood.");
    expect(sections[0]).toEqual({ title: "", body: "Intro line." });
    expect(sections[1]).toEqual({ title: "What is working", body: "Good." });
  });

  it("does not mistake ordinary sentences, short caps or numbered items for headings", () => {
    const text = "Rotational Motion is at 38%.\nJEE MAIN\n1. KINEMATICS 90 min\nOK";
    const sections = splitSections(text);
    // "JEE MAIN" is a legitimate all-caps line (a heading); the sentences and the numbered item stay body text
    expect(sections.map((s) => s.title)).toEqual(["", "Jee main"]);
    expect(sections[1]!.body).toContain("1. KINEMATICS 90 min");
  });

  it("an empty diagnosis has no sections", () => {
    expect(splitSections("")).toEqual([]);
  });
});

describe("week helpers", () => {
  it("the next week's Monday is seven days on, across month and year ends", () => {
    expect(mondayOfNextWeek("2026-10-05")).toBe("2026-10-12");
    expect(mondayOfNextWeek("2026-10-26")).toBe("2026-11-02");
    expect(mondayOfNextWeek("2026-12-28")).toBe("2027-01-04");
  });

  it("labels a week the way the goals screen does", () => {
    expect(weekLabel("2026-10-05")).toBe("5 – 11 Oct");
    expect(weekLabel("2026-10-26")).toBe("26 Oct – 1 Nov");
  });

  it("chip label adds the minutes only when the title does not already say it", () => {
    expect(chipLabel({ title: "Torque problems", chapterId: null, chapterName: null, minutes: 90 })).toBe("Torque problems · 90 min");
    expect(chipLabel({ title: "Torque problems, 90 min", chapterId: null, chapterName: null, minutes: 90 })).toBe("Torque problems, 90 min");
    expect(chipLabel({ title: "Study 2 hours of optics", chapterId: null, chapterName: null, minutes: 120 })).toBe("Study 2 hours of optics");
    expect(chipLabel({ title: "Sleep earlier", chapterId: null, chapterName: null, minutes: null })).toBe("Sleep earlier");
  });

  it("rate-limit waits read like a person said them", () => {
    expect(waitText(30)).toBe("about 1 minute");
    expect(waitText(20 * 60)).toBe("about 20 minutes");
    expect(waitText(3600)).toBe("about 1 hour");
    expect(waitText(5 * 3600 + 1)).toBe("about 6 hours");
  });
});

describe("goal pre-fill links", () => {
  it("a diagnosis fix becomes a next-week study-minutes goal for its chapter", () => {
    const href = fixToGoalHref({ chapterId: CH, minutes: 90 });
    expect(href).toBe(`/goals?week=next&type=HOURS&unit=MINUTES&target=90&chapter=${CH}`);
    const parsed = parsePrefill(params(href.split("?")[1]!), subjectOf);
    expect(parsed).toEqual({ week: "next", goal: { type: "HOURS", unit: "MINUTES", target: 90, subjectId: 1, chapterId: CH } });
  });

  it("a fix with no minutes defaults to an hour, and one with no chapter has no scope", () => {
    const parsed = parsePrefill(params(fixToGoalHref({ chapterId: null, minutes: null }).split("?")[1]!), subjectOf);
    expect(parsed?.goal).toEqual({ type: "HOURS", unit: "MINUTES", target: 60, subjectId: null, chapterId: null });
  });

  it("never trusts the link: bad types, junk targets and unknown chapters are neutralised", () => {
    expect(parsePrefill(params("type=DROP_TABLE&target=5"), subjectOf)).toBeNull();
    expect(parsePrefill(params("type=HOURS&target=abc"), subjectOf)).toBeNull();
    expect(parsePrefill(params("type=HOURS&target=-4"), subjectOf)).toBeNull();
    expect(parsePrefill(params("target=5"), subjectOf)).toBeNull();
    // out-of-range target is clamped like the composer would
    expect(parsePrefill(params("type=HOURS&unit=MINUTES&target=999999"), subjectOf)?.goal.target).toBe(6000);
    expect(parsePrefill(params("type=QUESTIONS&target=1"), subjectOf)?.goal.target).toBe(5);
    // a chapter that is not a UUID, or that the student does not have, is dropped
    expect(parsePrefill(params("type=HOURS&target=60&chapter=../../etc"), subjectOf)?.goal.chapterId).toBeNull();
    expect(parsePrefill(params("type=HOURS&target=60&chapter=22222222-2222-4222-8222-222222222222"), subjectOf)?.goal).toMatchObject({ chapterId: null, subjectId: null });
  });

  it("units that do not fit the type fall back to the type's own", () => {
    expect(parsePrefill(params("type=QUESTIONS&unit=MINUTES&target=50"), subjectOf)?.goal.unit).toBe("COUNT");
    expect(parsePrefill(params("type=HOURS&unit=COUNT&target=5"), subjectOf)?.goal.unit).toBe("HOURS");
    expect(parsePrefill(params("type=HOURS&target=5"), subjectOf)?.goal.unit).toBe("HOURS");
  });

  it("defaults to next week; ?week=current is honoured", () => {
    expect(parsePrefill(params("type=MOCKS&target=1"), subjectOf)?.week).toBe("next");
    expect(parsePrefill(params("type=MOCKS&target=1&week=current"), subjectOf)?.week).toBe("current");
    expect(prefillHref({ type: "MOCKS", unit: "COUNT", target: 1, week: "current" })).toBe("/goals?week=current&type=MOCKS&unit=COUNT&target=1");
  });
});
