import { describe, expect, it } from "vitest";
import { createSseParser } from "@/lib/diagnosis/sse";
import { formatWhen, planItems, remainingText, splitPlan, toBlocks } from "@/lib/diagnosis/report";
import { mondayAfterWeeks } from "@/lib/diagnosis/format";
import { WEEKS_AHEAD, parsePrefill, prefillHref } from "@/lib/goals/prefill";

describe("createSseParser", () => {
  const collect = () => {
    const events: { event: string; data: unknown }[] = [];
    return { events, parser: createSseParser((event, data) => events.push({ event, data })) };
  };

  it("reads complete events, JSON-parsing the data", () => {
    const { events, parser } = collect();
    parser.push('event: snapshot\ndata: {"report":{"id":"a"}}\n\nevent: text\ndata: {"text":"## STRENGTHS"}\n\n');
    expect(events).toEqual([
      { event: "snapshot", data: { report: { id: "a" } } },
      { event: "text", data: { text: "## STRENGTHS" } },
    ]);
  });

  it("puts an event back together when the network cuts it anywhere, including inside the blank line", () => {
    const { events, parser } = collect();
    const whole = 'event: text\ndata: {"text":"Hello"}\n\nevent: done\ndata: {"report":{}}\n\n';
    for (const piece of [whole.slice(0, 5), whole.slice(5, 30), whole.slice(30, 39), whole.slice(39)]) parser.push(piece);
    expect(events.map((e) => e.event)).toEqual(["text", "done"]);
  });

  it("handles CRLF, ignores comments and events with no data, and survives non-JSON data", () => {
    const { events, parser } = collect();
    parser.push(": ping\n\n");
    parser.push("event: text\r\ndata: {\"text\":\"x\"}\r\n\r\n");
    parser.push("event: weird\ndata: not json\n\n");
    expect(events).toEqual([
      { event: "text", data: { text: "x" } },
      { event: "weird", data: null },
    ]);
  });
});

describe("wording", () => {
  it("remainingText", () => {
    expect(remainingText({ remaining: 2 })).toBe("2 diagnoses left today, resets at midnight IST");
    expect(remainingText({ remaining: 1 })).toBe("1 diagnosis left today, resets at midnight IST");
    expect(remainingText({ remaining: 0 })).toBe("No diagnoses left today. They reset at midnight IST.");
  });

  it("formatWhen is IST whatever the device zone", () => {
    expect(formatWhen("2026-10-19T10:10:00.000Z")).toBe("19 Oct, 3:40 pm");
    expect(formatWhen("2026-10-19T18:40:00.000Z")).toBe("20 Oct, 12:10 am"); // after midnight IST it is already the next day
    expect(formatWhen("nonsense")).toBe("");
  });
});

describe("toBlocks", () => {
  it("makes paragraphs, bullets, numbered items and small headings, and strips bold", () => {
    expect(toBlocks("Intro **bold** line.\n\n- one\n* two\n1. three\n\n### Week 1\nText")).toEqual([
      { kind: "p", text: "Intro bold line." },
      { kind: "ul", items: ["one", "two", "three"] },
      { kind: "h", text: "Week 1" },
      { kind: "p", text: "Text" },
    ]);
  });
});

const CHAPTERS = [
  { id: "c-rot", name: "Rotational Motion" },
  { id: "c-kin", name: "Kinematics" },
  { id: "c-motion", name: "Motion" },
];

const PLAN = `Stay on one front at a time.

Week 1: 6 hours on Rotational Motion, torque first.
Week 2: Kinematics graph problems, about 4.5 hours.
### Week 3
- Mixed practice, no chapter named.
**Week 4:** Two mocks and a review. 2 hrs of analysis.`;

describe("planItems / splitPlan", () => {
  it("one item per week, with the hours as minutes, the chapter the text names, and the right week for the goals page", () => {
    const items = planItems(PLAN, CHAPTERS);
    expect(items.map((i) => i.label)).toEqual(["Week 1", "Week 2", "Week 3", "Week 4"]);
    expect(items[0]).toMatchObject({ minutes: 360, chapterId: "c-rot", chapterName: "Rotational Motion", week: "current" });
    expect(items[1]).toMatchObject({ minutes: 270, chapterId: "c-kin", week: "next" });
    expect(items[2]).toMatchObject({ minutes: 180, chapterId: null, week: "plus2" }); // no hours said: three hours
    expect(items[3]).toMatchObject({ minutes: 120, week: "plus3" });
    expect(items[0]!.text).toContain("torque first");
  });

  it("matches the LONGEST chapter name in the text ('Rotational Motion', not 'Motion')", () => {
    expect(planItems("Week 1: 3 hours on Rotational Motion.", CHAPTERS)[0]!.chapterId).toBe("c-rot");
  });

  it("keeps what comes before Week 1 as the intro, and a plan with no Week lines is left alone", () => {
    const { intro, items } = splitPlan(PLAN, CHAPTERS);
    expect(intro).toBe("Stay on one front at a time.");
    expect(items).toHaveLength(4);
    expect(splitPlan("Just prose.", CHAPTERS)).toEqual({ intro: "Just prose.", items: [] });
  });

  it("a week beyond four has no goal link; the same week twice appears once; minutes are kept sane", () => {
    const items = planItems("Week 5: 2 hours.\nWeek 5: again.\nWeek 1: 500 hours of study.", CHAPTERS);
    expect(items.map((i) => i.label)).toEqual(["Week 5", "Week 1"]);
    expect(items[0]!.week).toBeNull();
    expect(items[1]!.minutes).toBe(6000);
  });
});

describe("goal links for later weeks", () => {
  it("prefillHref carries the week and parsePrefill reads it back (an unknown week falls back to next)", () => {
    for (const week of ["current", "next", "plus2", "plus3"] as const) {
      const href = prefillHref({ type: "HOURS", unit: "MINUTES", target: 180, chapterId: null, week });
      const sp = new URL(href, "https://x.test").searchParams;
      expect(parsePrefill(sp, () => null)!.week).toBe(week);
    }
    expect(parsePrefill(new URLSearchParams("week=plus9&type=HOURS&unit=MINUTES&target=60"), () => null)!.week).toBe("next");
    expect(WEEKS_AHEAD).toEqual({ current: 0, next: 1, plus2: 2, plus3: 3 });
  });

  it("mondayAfterWeeks", () => {
    expect(mondayAfterWeeks("2026-10-19", 0)).toBe("2026-10-19");
    expect(mondayAfterWeeks("2026-10-19", 3)).toBe("2026-11-09");
    expect(mondayAfterWeeks("2026-12-28", 1)).toBe("2027-01-04");
  });
});
