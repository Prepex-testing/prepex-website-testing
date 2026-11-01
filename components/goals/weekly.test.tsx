// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoalAssistantSheet } from "@/components/goals/GoalAssistant";
import { SmartSuggestion } from "@/components/goals/SmartSuggestion";
import type { Assistant, Suggestion } from "@/lib/api/goalAssistant";

vi.mock("@/lib/api/goalAssistant", async (orig) => ({ ...(await orig<typeof import("@/lib/api/goalAssistant")>()), getGoalAssistant: vi.fn(), setPushWeek: vi.fn().mockResolvedValue({ success: true, data: { weekStart: "2026-11-02", on: true } }) }));
import { getGoalAssistant, setPushWeek } from "@/lib/api/goalAssistant";

beforeEach(() => vi.clearAllMocks());

const sug = (over: Partial<Suggestion> & Pick<Suggestion, "id" | "type" | "label">): Suggestion => ({
  subjectId: 1, subjectName: "Physics", chapterId: null, backlogItemId: null, target: 3, unit: "COUNT", minutesPerUnit: 60, totalMinutes: 180, minTarget: 0, reason: "Your coaching has 3 Physics classes this week.", ...over,
});

const assistant = (over: Partial<Assistant> = {}): Assistant => ({
  weekStart: "2026-11-02",
  hasGoals: false,
  phase: { id: "build", label: "Build" },
  daysToExam: 200,
  capacity: { usableMinutes: 1200, rawSlotMinutes: 1500, factor: 0.85, revisionMinutes: 360 },
  demonstratedMinutes: 1100,
  suggestions: [
    sug({ id: "lectures:1", type: "LECTURES", label: "Physics lectures" }),
    sug({ id: "questions:1", type: "QUESTIONS", label: "Physics questions", target: 120, minutesPerUnit: 3, totalMinutes: 360, minTarget: 0, reason: "120 questions: your practice time at 3 minutes a question." }),
    sug({ id: "backlog:b1", type: "BACKLOG", label: "Thermodynamics", target: 1, minutesPerUnit: 90, totalMinutes: 90, backlogItemId: "b1", chapterId: "c1", reason: "Backlog · Must recover: this week's share of your free self-study time." }),
  ],
  revisionAuto: { chaptersDue: 9, minutes: 360 },
  requiredMinutes: 630,
  meter: "green",
  trims: [],
  push: false,
  ...over,
});

const open = async (a: Assistant, onAccept = vi.fn()) => {
  vi.mocked(getGoalAssistant).mockResolvedValue({ success: true, data: a });
  render(<SmartSuggestion weekStart="2026-11-02" onAccept={onAccept} />);
  await userEvent.click(screen.getByTestId("suggest-week"));
  await screen.findByTestId("goal-assistant");
  return onAccept;
};

describe("Goal Assistant", () => {
  it("opens from the header button, asks for the week, and shows capacity, the meter and every suggestion with its reason", async () => {
    await open(assistant());
    expect(getGoalAssistant).toHaveBeenCalledWith("2026-11-02", false);
    expect(screen.getByTestId("assistant-basis")).toHaveTextContent("20h of study time at your usual pace");
    expect(screen.getByTestId("assistant-basis")).toHaveTextContent("Revision (9 chapters due, about 6h) is planned for you automatically");
    expect(screen.getByTestId("assistant-meter")).toHaveTextContent("Fits your week");
    expect(screen.getAllByTestId("suggestion")).toHaveLength(3);
    expect(screen.getAllByTestId("suggestion-reason")[0]).toHaveTextContent("Your coaching has 3 Physics classes");
  });

  it("adds the chosen goals: the question goal is sent without minutes (the server uses the student's own pace), a backlog item whole", async () => {
    const onAccept = await open(assistant());
    await userEvent.click(screen.getByTestId("assistant-accept"));
    await waitFor(() => expect(onAccept).toHaveBeenCalled());
    const goals = onAccept.mock.calls[0]![0] as Record<string, unknown>[];
    expect(goals).toEqual([
      { type: "LECTURES", unit: "COUNT", target: 3, subjectId: 1, minutesPerUnit: 60 },
      { type: "QUESTIONS", unit: "COUNT", target: 120, subjectId: 1 },
      { type: "BACKLOG", unit: "COUNT", target: 1, subjectId: 1, chapterId: "c1", backlogItemId: "b1" },
    ]);
  });

  it("every number is editable: the stepper moves a target by 5 questions, the meter follows, and an unticked goal is not added", async () => {
    const onAccept = await open(assistant());
    await userEvent.click(screen.getByTestId("more-questions:1"));
    expect(screen.getByTestId("target-questions:1")).toHaveTextContent("125");
    expect(screen.getByTestId("assistant-fit")).toHaveTextContent("10h 45m of 20h");
    await userEvent.click(screen.getByLabelText("Include Physics lectures"));
    await userEvent.click(screen.getByTestId("assistant-accept"));
    const goals = onAccept.mock.calls[0]![0] as { type: string; target: number }[];
    expect(goals.map((g) => g.type)).toEqual(["QUESTIONS", "BACKLOG"]);
    expect(goals[0]!.target).toBe(125);
  });

  it("a week that does not fit turns red, says so, and offers changes that make it fit with one tap", async () => {
    await open(assistant({ capacity: { usableMinutes: 500, rawSlotMinutes: 600, factor: 0.85, revisionMinutes: 360 } }));
    expect(screen.getByTestId("goal-assistant")).toHaveAttribute("data-meter", "red");
    expect(screen.getByTestId("assistant-meter")).toHaveTextContent("More than your week holds");
    const trims = screen.getByTestId("assistant-trims");
    expect(trims).toHaveTextContent("Physics questions: 120 to");
    await userEvent.click(screen.getByTestId("apply-trims"));
    expect(screen.getByTestId("goal-assistant")).not.toHaveAttribute("data-meter", "red");
    expect(screen.queryByTestId("assistant-trims")).toBeNull();
  });

  it("push week asks again with push on and tells the server", async () => {
    await open(assistant());
    vi.mocked(getGoalAssistant).mockResolvedValue({ success: true, data: assistant({ push: true, demonstratedMinutes: 1300 }) });
    await userEvent.click(screen.getByLabelText(/Push week/));
    await waitFor(() => expect(getGoalAssistant).toHaveBeenLastCalledWith("2026-11-02", true));
    expect(await screen.findByTestId("assistant-basis")).toHaveTextContent("in a push week");
    expect(setPushWeek).toHaveBeenCalledWith("2026-11-02", true);
  });

  it("says plainly when the timetable leaves nothing to suggest", async () => {
    await open(assistant({ suggestions: [], requiredMinutes: 0 }));
    expect(screen.getByTestId("assistant-empty")).toBeInTheDocument();
    expect(screen.getByTestId("assistant-accept")).toBeDisabled();
  });

  it("a failed load shows a calm retry, not a crash", async () => {
    vi.mocked(getGoalAssistant).mockRejectedValue(new Error("down"));
    render(<GoalAssistantSheet open onClose={vi.fn()} weekStart="2026-11-02" onAccept={vi.fn()} />);
    expect(await screen.findByTestId("assistant-error")).toBeInTheDocument();
  });
});

describe("Weekly goals keep the old restraint", () => {
  const root = path.resolve(import.meta.dirname, "..", "..");
  const EMOJI = /\p{Extended_Pictographic}/u;

  it("what this screen adds has no solid coral fill: the button and the assistant render none", async () => {
    await open(assistant());
    const filled = [...document.body.querySelectorAll("button, a")].filter((el) => /(^|\s)bg-cta(\s|$)/.test(el.className));
    expect(filled).toHaveLength(0);
    for (const f of ["components/goals/SmartSuggestion.tsx", "components/goals/GoalAssistant.tsx"]) expect(readFileSync(path.join(root, f), "utf8")).not.toMatch(/bg-cta|E8623F/);
  });

  it("ships no emoji in the goals screen or its components", () => {
    const files = ["app/(app)/goals/page.tsx", "components/weekly-goals/AddGoalPanel.tsx", "components/weekly-goals/GoalCard.tsx", "components/weekly-goals/SubjectSection.tsx", "components/weekly-goals/WeeklyCapacityHeader.tsx", "components/goals/SmartSuggestion.tsx", "components/goals/GoalAssistant.tsx", "lib/goals/v2.ts", "lib/goals/format.ts", "lib/goalAssistant/model.ts"];
    for (const f of files) {
      const hit = readFileSync(path.join(root, f), "utf8").split("\n").findIndex((line) => EMOJI.test(line));
      expect(hit, `${f} line ${hit + 1} has an emoji`).toBe(-1);
    }
  });
});
