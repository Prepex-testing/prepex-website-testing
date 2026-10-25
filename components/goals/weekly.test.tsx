// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoalComposer } from "@/components/goals/GoalComposer";
import { SmartSuggestion } from "@/components/goals/SmartSuggestion";
import { WeekSuggestSheet } from "@/components/goals/WeekSuggestSheet";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { GoalDefaults, WeekSuggestion } from "@/lib/api/plannerV2";

vi.mock("@/lib/api/plannerV2", async (orig) => ({ ...(await orig<typeof import("@/lib/api/plannerV2")>()), suggestWeek: vi.fn() }));
import { suggestWeek } from "@/lib/api/plannerV2";

vi.mock("@/lib/api/backlogItems", () => ({ listBacklogItems: vi.fn() }));
import { listBacklogItems } from "@/lib/api/backlogItems";

vi.mock("@/lib/telemetry/planner", () => ({ trackPlanner: vi.fn() }));
import { trackPlanner } from "@/lib/telemetry/planner";

const CH = "11111111-1111-4111-8111-111111111111";
const subjects: SubjectChapters[] = [{ subjectId: 1, subjectCode: "PHY", subjectName: "Physics", chapters: [{ id: CH, subjectId: 1, name: "Kinematics", sequenceOrder: 1, isActive: true }] }];

const defaults = (lecture = 60, source: "default" | "history" = "default"): GoalDefaults => ({
  lectureMinutes: { value: lecture, source, samples: source === "history" ? 6 : 0 },
  practiceSessionMinutes: { value: 60, source: "default", samples: 0 },
  revisionMinutes: { value: 30, source: "default", samples: 0 },
  minutesPerQuestion: { value: 2.5, source: "default", samples: 0 },
  selfStudyChunkMinutes: 45,
});

const props = { subjects, existing: [], saving: false, error: null, weekStart: "2026-10-26" };

beforeEach(() => vi.clearAllMocks());

describe("GoalComposer (the restored form)", () => {
  it("saving a lecture goal writes minutesPerUnit, from the student's own median when there is one", async () => {
    const onSave = vi.fn();
    render(<GoalComposer {...props} defaults={defaults(75, "history")} onSave={onSave} />);
    await userEvent.click(screen.getByTestId("goal-type-LECTURES"));
    expect(screen.getByTestId("goal-minutes")).toHaveValue(75);
    expect(screen.getByTestId("goal-minutes-help")).toHaveTextContent("Based on your last week of focus sessions.");
    await userEvent.click(screen.getByTestId("add-goal"));
    await userEvent.click(screen.getByTestId("save-goals"));
    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ type: "LECTURES", unit: "COUNT", target: 5, minutesPerUnit: 75 })]);
  });

  it("starts from 60 for lectures and practice and 30 for revision, and the student can change it", async () => {
    const onSave = vi.fn();
    render(<GoalComposer {...props} onSave={onSave} />);
    // practice is the form's first type
    expect(screen.getByTestId("goal-minutes")).toHaveValue(60);
    await userEvent.click(screen.getByTestId("goal-type-LECTURES"));
    expect(screen.getByTestId("goal-minutes")).toHaveValue(60);
    expect(screen.getByTestId("goal-minutes-help")).toHaveTextContent("Most lectures are 40–90 minutes.");
    await userEvent.click(screen.getByTestId("goal-type-REVISIONS"));
    expect(screen.getByTestId("goal-minutes")).toHaveValue(30);
    await userEvent.clear(screen.getByTestId("goal-minutes"));
    await userEvent.type(screen.getByTestId("goal-minutes"), "45");
    await userEvent.click(screen.getByTestId("add-goal"));
    await userEvent.click(screen.getByTestId("save-goals"));
    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ type: "REVISIONS", minutesPerUnit: 45 })]);
  });

  it("shows how long the goal takes in the list that is ready to save", async () => {
    render(<GoalComposer {...props} onSave={vi.fn()} />);
    await userEvent.click(screen.getByTestId("goal-type-LECTURES"));
    await userEvent.click(screen.getByTestId("add-goal"));
    expect(screen.getByTestId("goal-drafts")).toHaveTextContent("Watch 5 lectures");
    expect(screen.getByTestId("goal-drafts")).toHaveTextContent("about 5h");
  });

  it("has no minutes field for study hours or mocks, which already carry their own time", async () => {
    render(<GoalComposer {...props} onSave={vi.fn()} />);
    await userEvent.click(screen.getByTestId("goal-type-HOURS"));
    expect(screen.queryByTestId("goal-minutes")).toBeNull();
    await userEvent.click(screen.getByTestId("goal-type-MOCKS"));
    expect(screen.queryByTestId("goal-minutes")).toBeNull();
  });

  it("a mock can take a fixed day and time, and is then one test", async () => {
    const onSave = vi.fn();
    render(<GoalComposer {...props} onSave={onSave} />);
    await userEvent.click(screen.getByTestId("goal-type-MOCKS"));
    await userEvent.selectOptions(screen.getByTestId("goal-mock-day"), "2026-10-31");
    expect(screen.getByText("This mock gets a fixed slot. The planner never moves it or makes it shorter.")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("add-goal"));
    await userEvent.click(screen.getByTestId("save-goals"));
    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ type: "MOCKS", target: 1, fixedDate: "2026-10-31", fixedStartTime: "14:00", mockType: "full_mock", examPattern: "jee_main" })]);
  });

  it("a mock with no day is just a count, as before", async () => {
    const onSave = vi.fn();
    render(<GoalComposer {...props} onSave={onSave} />);
    await userEvent.click(screen.getByTestId("goal-type-MOCKS"));
    await userEvent.click(screen.getByTestId("add-goal"));
    await userEvent.click(screen.getByTestId("save-goals"));
    const goal = onSave.mock.calls[0]![0][0];
    expect(goal).toMatchObject({ type: "MOCKS", target: 1 });
    expect(goal.fixedDate).toBeUndefined();
  });

  it("backlog items are ticked from the student's own list and each becomes a goal with its minutes", async () => {
    vi.mocked(listBacklogItems).mockResolvedValue({
      success: true,
      data: { nextCursor: null, items: [{ id: "b1", subjectId: 1, chapterId: CH, topic: null, source: "manual", estimatedMinutes: 50, deadline: null, priority: 2, status: "open", clearedAt: null, scheduledFor: null, scheduledWindow: null, notes: null, ageDays: 9, isOverdue: false, progressPercent: 0, createdAt: "" }] },
    });
    const onSave = vi.fn();
    render(<GoalComposer {...props} onSave={onSave} />);
    await userEvent.click(screen.getByTestId("goal-type-BACKLOG"));
    await userEvent.click(await screen.findByTestId("goal-backlog-item"));
    await userEvent.click(screen.getByTestId("add-goal"));
    await userEvent.click(screen.getByTestId("save-goals"));
    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ type: "BACKLOG", unit: "COUNT", target: 1, backlogItemId: "b1", minutesPerUnit: 50, chapterId: CH })]);
  });

  it("asks for a backlog tick before it adds", async () => {
    vi.mocked(listBacklogItems).mockResolvedValue({ success: true, data: { nextCursor: null, items: [] } });
    render(<GoalComposer {...props} onSave={vi.fn()} />);
    await userEvent.click(screen.getByTestId("goal-type-BACKLOG"));
    await userEvent.click(screen.getByTestId("add-goal"));
    expect(screen.getByRole("alert")).toHaveTextContent("Tick at least one backlog item.");
  });

  it("offers the five original types and Backlog, nothing else", () => {
    render(<GoalComposer {...props} onSave={vi.fn()} />);
    const ids = screen.getAllByRole("radio").map((r) => r.getAttribute("data-testid")).filter((id): id is string => !!id?.startsWith("goal-type-"));
    expect(ids).toEqual(["goal-type-LECTURES", "goal-type-QUESTIONS", "goal-type-REVISIONS", "goal-type-MOCKS", "goal-type-HOURS", "goal-type-BACKLOG"]);
  });
});

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

  it("the new fields in the composer (minutes, backlog, mock slot) add no coral; only the original Save button keeps its fill", () => {
    const text = readFileSync(path.join(root, "components/goals/GoalComposer.tsx"), "utf8");
    const coral = text.split("\n").filter((l) => /bg-cta/.test(l));
    expect(coral).toHaveLength(1);
    expect(coral[0]).toContain("min-h-14");
  });

  it("ships no emoji in the goals screen or its components", () => {
    const files = ["app/(app)/goals/page.tsx", "components/goals/GoalComposer.tsx", "components/goals/GoalCard.tsx", "components/goals/NewSuggestion.tsx", "components/goals/SuggestionCard.tsx", "components/goals/SuggestPanel.tsx", "components/goals/SmartSuggestion.tsx", "components/goals/WeekSuggestSheet.tsx", "lib/goals/v2.ts", "lib/goals/format.ts"];
    for (const f of files) {
      const hit = readFileSync(path.join(root, f), "utf8").split("\n").findIndex((line) => EMOJI.test(line));
      expect(hit, `${f} line ${hit + 1} has an emoji`).toBe(-1);
    }
  });
});
