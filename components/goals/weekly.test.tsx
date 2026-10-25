// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SmartSuggestion } from "@/components/goals/SmartSuggestion";
import { WeekSuggestSheet } from "@/components/goals/WeekSuggestSheet";
import type { WeekSuggestion } from "@/lib/api/plannerV2";

vi.mock("@/lib/api/plannerV2", async (orig) => ({ ...(await orig<typeof import("@/lib/api/plannerV2")>()), suggestWeek: vi.fn() }));
import { suggestWeek } from "@/lib/api/plannerV2";

vi.mock("@/lib/telemetry/planner", () => ({ trackPlanner: vi.fn() }));
import { trackPlanner } from "@/lib/telemetry/planner";

const CH = "11111111-1111-4111-8111-111111111111";

beforeEach(() => vi.clearAllMocks());

const suggestion = (): WeekSuggestion => ({
  weekStart: "2026-10-26",
  availableMinutes: 1020,
  alreadyAllocatedMinutes: 0,
  budgetMinutes: 1020,
  proposedMinutes: 180,
  basis: ["You studied 12 hours in the last two weeks", "Kinematics is below 60% accuracy"],
  usage: { kind: "weekly_suggest", used: 1, limit: 10, remaining: 9, resetsAt: "2026-11-02T00:00:00.000Z" },
  proposals: [
    { id: "p1", source: "weakness", label: "Revise Kinematics", totalMinutes: 90, reason: "Accuracy is 48% over 12 questions.", goal: { type: "REVISIONS", unit: "COUNT", target: 3, subjectId: 1, chapterId: CH, minutesPerUnit: 30 } },
    { id: "p2", source: "spaced_repetition", label: "Practice Optics", totalMinutes: 90, reason: "Due this week.", goal: { type: "QUESTIONS", unit: "COUNT", target: 40, subjectId: 1, minutesPerUnit: 60 } },
  ],
});
const names = { subjectNames: new Map([[1, "Physics"]]), chapterNames: new Map([[CH, "Kinematics"]]) };

describe("Smart Suggestion", () => {
  it("the button is in the header and, when pressed, asks the suggest endpoint and shows the proposals", async () => {
    vi.mocked(suggestWeek).mockResolvedValue({ success: true, data: suggestion() });
    render(<SmartSuggestion weekStart="2026-10-26" {...names} onAccept={vi.fn()} />);
    await userEvent.click(screen.getByTestId("suggest-week"));
    expect(suggestWeek).toHaveBeenCalledWith("2026-10-26");
    expect(await screen.findByTestId("suggest-week-basis")).toHaveTextContent("Kinematics is below 60% accuracy");
    expect(screen.getAllByTestId("proposal")).toHaveLength(2);
    expect(screen.getByText("Revise Kinematics")).toBeInTheDocument();
  });

  it("an accepted proposal reaches the page as a goal with its minutes per unit", async () => {
    vi.mocked(suggestWeek).mockResolvedValue({ success: true, data: suggestion() });
    const onAccept = vi.fn();
    render(<SmartSuggestion weekStart="2026-10-26" {...names} onAccept={onAccept} />);
    await userEvent.click(screen.getByTestId("suggest-week"));
    await screen.findByTestId("suggest-week-basis");
    await userEvent.click(screen.getAllByTestId("proposal-accept")[0]!);
    expect(onAccept).toHaveBeenCalledWith([expect.objectContaining({ type: "REVISIONS", target: 3, chapterId: CH, minutesPerUnit: 30 })]);
    expect(trackPlanner).toHaveBeenCalledWith("weekly_goal_suggest_accept", expect.objectContaining({ source: "weakness" }));
  });
});

describe("WeekSuggestSheet", () => {
  const base = { open: true, onClose: vi.fn(), weekStart: "2026-10-26", ...names };

  it("accepts the rest at once, and rejects them all", async () => {
    vi.mocked(suggestWeek).mockResolvedValue({ success: true, data: suggestion() });
    const onAccept = vi.fn();
    const { unmount } = render(<WeekSuggestSheet {...base} onAccept={onAccept} />);
    await screen.findByTestId("suggest-week-basis");
    await userEvent.click(screen.getByTestId("suggest-accept-all"));
    expect(onAccept).toHaveBeenCalledWith([expect.objectContaining({ type: "REVISIONS" }), expect.objectContaining({ type: "QUESTIONS" })]);
    unmount();

    const again = vi.fn();
    render(<WeekSuggestSheet {...base} onAccept={again} />);
    await screen.findByTestId("suggest-week-basis");
    await userEvent.click(screen.getByTestId("suggest-reject-all"));
    expect(again).not.toHaveBeenCalled();
    expect(trackPlanner).toHaveBeenCalledWith("weekly_goal_suggest_reject", expect.objectContaining({ source: "weakness" }));
  });

  it("says so when the weekly limit is used", async () => {
    const { ApiError } = await import("@/lib/api/http");
    vi.mocked(suggestWeek).mockRejectedValue(new ApiError(429, "You've used all 10 weekly suggestions. They reset on Monday."));
    render(<WeekSuggestSheet {...base} onAccept={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId("suggest-week-error")).toHaveTextContent("used all 10 weekly suggestions"));
  });
});

describe("Weekly goals keep the old restraint", () => {
  const root = path.resolve(import.meta.dirname, "..", "..");
  const EMOJI = /\p{Extended_Pictographic}/u;

  it("what this screen adds has no solid coral fill: the Smart Suggestion button and its sheet render none", async () => {
    vi.mocked(suggestWeek).mockResolvedValue({ success: true, data: suggestion() });
    const { baseElement } = render(<SmartSuggestion weekStart="2026-10-26" {...names} onAccept={vi.fn()} />);
    await userEvent.click(screen.getByTestId("suggest-week"));
    await screen.findAllByTestId("proposal");
    const filled = [...baseElement.querySelectorAll("button, a")].filter((el) => /(^|\s)bg-cta(\s|$)/.test(el.className));
    expect(filled).toHaveLength(0);
    for (const f of ["components/goals/SmartSuggestion.tsx", "components/goals/WeekSuggestSheet.tsx"]) expect(readFileSync(path.join(root, f), "utf8")).not.toMatch(/bg-cta|E8623F/);
  });

  it("ships no emoji in the goals screen or its components", () => {
    const files = ["app/(app)/goals/page.tsx", "components/weekly-goals/AddGoalPanel.tsx", "components/weekly-goals/GoalCard.tsx", "components/weekly-goals/SubjectSection.tsx", "components/weekly-goals/WeeklyCapacityHeader.tsx", "components/goals/NewSuggestion.tsx", "components/goals/SuggestionCard.tsx", "components/goals/SuggestPanel.tsx", "components/goals/SmartSuggestion.tsx", "components/goals/WeekSuggestSheet.tsx", "lib/goals/v2.ts", "lib/goals/format.ts"];
    for (const f of files) {
      const hit = readFileSync(path.join(root, f), "utf8").split("\n").findIndex((line) => EMOJI.test(line));
      expect(hit, `${f} line ${hit + 1} has an emoji`).toBe(-1);
    }
  });
});
