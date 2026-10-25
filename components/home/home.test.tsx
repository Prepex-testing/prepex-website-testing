// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { quickAccessItems, quickAccessSubtitles, type QuickAccessCounts } from "@/components/home/quickAccess";
import { plannerTaskIntent } from "@/components/home/focusIntent";

const EMOJI = /\p{Extended_Pictographic}/u;
const root = path.resolve(import.meta.dirname, "..", "..");
const counts: QuickAccessCounts = { sessionsToday: 2, questionsThisWeek: 140, revisionsDue: 3, mistakesOpen: 15, mocksThisWeek: 1 };

describe("Quick Access", () => {
  it("shows live counts on the five rows that have one", () => {
    expect(quickAccessSubtitles(counts)).toEqual({ focus: "2 sessions today", practice: "140 questions this week", revision: "3 due today", mistakes: "15 unresolved", mocks: "1 this week" });
  });

  it("falls back to what the row does when a count is missing", () => {
    const s = quickAccessSubtitles({ sessionsToday: null, questionsThisWeek: null, revisionsDue: null, mistakesOpen: null, mocksThisWeek: null });
    expect(s.focus).toBe("Start a session");
    expect(s.mistakes).toBe("Review mistakes");
  });

  it("is exactly nine rows, in order, with no Partner and no Analytics", () => {
    const labels = quickAccessItems(counts).map((i) => i.label);
    expect(labels).toEqual(["Focus", "Practice", "Revision", "Mistakes", "Mocks", "Where to focus next", "Leader Board", "Resource Library", "Weekly Win Journal"]);
    expect(labels).not.toContain("Partner");
    expect(labels).not.toContain("Analytics");
    expect(quickAccessItems(counts).map((i) => i.href ?? "")).not.toContain("/analytics");
    expect(quickAccessItems(counts).map((i) => i.href ?? "")).not.toContain("/home/partner");
  });

  it("gives every row a line icon and no emoji", () => {
    const items = quickAccessItems(counts);
    for (const item of items) {
      const { container, unmount } = render(<div>{item.icon}</div>);
      expect(container.querySelector("svg"), `${item.label} has an svg icon`).not.toBeNull();
      unmount();
    }
    const { container } = render(
      <ul>
        {items.map((i) => (
          <li key={i.key}>
            {i.icon}
            <span>{i.label}</span>
            <span>{i.subtitle}</span>
          </li>
        ))}
      </ul>,
    );
    expect(container.textContent ?? "").not.toMatch(EMOJI);
    expect(within(container).getAllByRole("listitem")).toHaveLength(9);
  });
});

describe("Start hands the focus timer the whole task", () => {
  it("carries the plan task id, subject, chapter, topic, type and minutes", () => {
    expect(plannerTaskIntent({ id: "11111111-1111-4111-8111-111111111111", type: "revision", estimatedMinutes: 45, subjectName: "Physics", chapterId: "22222222-2222-4222-8222-222222222222", topic: "Projectile motion" })).toEqual({
      originSource: "planner",
      originId: "11111111-1111-4111-8111-111111111111",
      subject: "Physics",
      chapter: "22222222-2222-4222-8222-222222222222",
      topic: "Projectile motion",
      taskType: "revision",
      targetMinutes: 45,
    });
  });
});

describe("Home and the full plan", () => {
  const files = [
    "app/(app)/home/page.tsx",
    "app/(app)/planner/page.tsx",
    "components/home/HomePlanSection.tsx",
    "components/home/quickAccess.tsx",
    "components/planner/StudyTaskCard.tsx",
    "components/planner/SlotBand.tsx",
    "components/planner/TimelineRail.tsx",
    "components/planner/PlanExplanation.tsx",
    "components/planner/PlanHeaderActions.tsx",
    "components/planner/PlanSidePanel.tsx",
    "components/planner/PlanSuggestions.tsx",
    "components/planner/WeeklyProgressStrip.tsx",
    "components/planner/EndOfDay.tsx",
    "lib/planner/taskText.ts",
  ];

  it("ship no emoji in any of their source", () => {
    for (const f of files) {
      const text = readFileSync(path.join(root, f), "utf8");
      const hit = text.split("\n").findIndex((line) => EMOJI.test(line));
      expect(hit, `${f} line ${hit + 1} has an emoji`).toBe(-1);
    }
  });

  it("have no solid coral fill on any button in the planner pieces", () => {
    // bg-cta and the hover coral are the filled call-to-action styles; the planner pieces use outlines only.
    for (const f of files.filter((x) => x.includes("planner") || x.includes("HomePlanSection"))) {
      const text = readFileSync(path.join(root, f), "utf8");
      // the Now line on the timeline is a thin coral marker, not a button
      const lines = text.split("\n").filter((l) => /bg-cta|E8623F|D9552F/.test(l) && !l.includes("now-marker") && !/h-px bg-cta|size-2 rounded-full bg-cta/.test(l));
      expect(lines, `${f} fills something with coral`).toEqual([]);
    }
  });
});
