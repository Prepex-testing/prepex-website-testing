// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoalFormSheet, type FormSubject } from "@/components/goals/GoalFormSheet";
import { MockGoalCard, SubjectGoalCard } from "@/components/goals/SubjectGoalCard";
import { WeekCapacity } from "@/components/goals/WeekCapacity";
import { WeekSuggestSheet } from "@/components/goals/WeekSuggestSheet";
import type { Goal, NewGoal } from "@/lib/api/goals";
import type { WeekSummary, WeekSuggestion } from "@/lib/api/plannerV2";

vi.mock("@/lib/api/plannerV2", async (orig) => ({ ...(await orig<typeof import("@/lib/api/plannerV2")>()), suggestWeek: vi.fn() }));
import { suggestWeek } from "@/lib/api/plannerV2";

vi.mock("@/lib/api/backlogItems", () => ({ listBacklogItems: vi.fn() }));
import { listBacklogItems } from "@/lib/api/backlogItems";

vi.mock("@/lib/telemetry/planner", () => ({ trackPlanner: vi.fn() }));
import { trackPlanner } from "@/lib/telemetry/planner";

const CH = "11111111-1111-4111-8111-111111111111";
const physics: FormSubject = { subjectId: 1, name: "Physics", chapters: [{ id: CH, subjectId: 1, name: "Kinematics", sequenceOrder: 1, isActive: true }] };

const summary = (over: Partial<WeekSummary> = {}): WeekSummary => ({
  weekStart: "2026-10-26",
  weekEnd: "2026-11-01",
  availableMinutes: 1020,
  perDay: [],
  perStudyDayMinutes: 150,
  allocatedMinutes: 0,
  remainingMinutes: 1020,
  overCommittedMinutes: 0,
  fit: "under",
  defaultTimetable: false,
  bySubject: [],
  ...over,
});

const savedGoal = (over: Partial<Goal> = {}): Goal => ({
  id: "g1", weekStart: "2026-10-26", subjectId: 1, chapterId: CH, topic: null, type: "LECTURES", target: 4, unit: "COUNT", status: "ACTIVE", source: "STUDENT",
  progressSelfReport: 1, carriedFromGoalId: null, progress: { current: 1, target: 4, unit: "COUNT", percent: 25, complete: false },
  minutesPerUnit: 60, totalMinutes: 240, practiceSource: null, revisionType: null, targetAccuracy: null, mockType: null, examPattern: null,
  fixedDate: null, fixedStartTime: null, fixedEndTime: null, backlogItemId: null, ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("WeekCapacity", () => {
  it("shows the hours available and per day", () => {
    render(<WeekCapacity summary={summary()} allocatedMinutes={0} unsavedMinutes={0} />);
    expect(screen.getByTestId("capacity-available")).toHaveTextContent("You have 17 hours available this week");
    expect(screen.getByTestId("capacity-per-day")).toHaveTextContent("Roughly 2.5 hours per day");
  });
  it("moves the bar and says 'Perfect fit' when the week is full", () => {
    render(<WeekCapacity summary={summary()} allocatedMinutes={1020} unsavedMinutes={300} />);
    expect(screen.getByTestId("week-capacity")).toHaveAttribute("data-fit", "perfect");
    expect(screen.getByTestId("capacity-perfect")).toHaveTextContent("Perfect fit");
    expect(screen.getByTestId("capacity-allocated")).toHaveTextContent("5 hours not saved yet");
  });
  it("turns amber and says by how much when over-committed", () => {
    render(<WeekCapacity summary={summary()} allocatedMinutes={1200} unsavedMinutes={0} />);
    expect(screen.getByTestId("week-capacity")).toHaveAttribute("data-fit", "over");
    expect(screen.getByTestId("capacity-over")).toHaveTextContent("over-committed by 3 hours");
    expect(screen.getByTestId("capacity-bar").className).toContain("warning");
  });
  it("tells the student when the hours come from a standard day", () => {
    render(<WeekCapacity summary={summary({ defaultTimetable: true })} allocatedMinutes={0} unsavedMinutes={0} />);
    expect(screen.getByTestId("capacity-default-timetable")).toBeInTheDocument();
  });
});

describe("GoalFormSheet", () => {
  const base = { open: true, onClose: vi.fn(), subject: physics, subjects: [physics], weekStart: "2026-10-26", defaults: null, takenBacklogIds: [], busy: false, error: null };

  it("adds lectures with minutes per lecture and shows the time it takes", async () => {
    const onSubmit = vi.fn();
    render(<GoalFormSheet {...base} kind="LECTURES" onSubmit={onSubmit} />);
    expect(screen.getByTestId("gf-minutes")).toHaveValue(60);
    expect(screen.getByText(/most lectures are 40–90 minutes/)).toBeInTheDocument();
    expect(screen.getByTestId("gf-preview")).toHaveTextContent("4h");
    await userEvent.selectOptions(screen.getByTestId("gf-chapter"), CH);
    await userEvent.click(screen.getByTestId("gf-count-plus"));
    await userEvent.click(screen.getByTestId("gf-submit"));
    expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ type: "LECTURES", target: 5, minutesPerUnit: 60, chapterId: CH, subjectId: 1 })]);
  });

  it("uses the student's own median when there is history", () => {
    const defaults = { lectureMinutes: { value: 75, source: "history" as const, samples: 6 }, practiceSessionMinutes: { value: 60, source: "default" as const, samples: 0 }, revisionMinutes: { value: 30, source: "default" as const, samples: 0 }, minutesPerQuestion: { value: 2.5, source: "default" as const, samples: 0 }, selfStudyChunkMinutes: 45 };
    render(<GoalFormSheet {...base} defaults={defaults} kind="LECTURES" onSubmit={vi.fn()} />);
    expect(screen.getByTestId("gf-minutes")).toHaveValue(75);
    expect(screen.getByText(/last week of focus sessions/)).toBeInTheDocument();
  });

  it("builds a practice goal with its source and session minutes", async () => {
    const onSubmit = vi.fn();
    render(<GoalFormSheet {...base} kind="QUESTIONS" onSubmit={onSubmit} />);
    await userEvent.selectOptions(screen.getByTestId("gf-source"), "dc_pandey");
    await userEvent.click(screen.getByTestId("gf-submit"));
    expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ type: "QUESTIONS", target: 100, practiceSource: "dc_pandey", minutesPerUnit: 60 })]);
  });

  it("builds a revision goal with type, optional accuracy and slot minutes", async () => {
    const onSubmit = vi.fn();
    render(<GoalFormSheet {...base} kind="REVISIONS" onSubmit={onSubmit} />);
    await userEvent.selectOptions(screen.getByTestId("gf-revision-type"), "formula_sheet");
    await userEvent.type(screen.getByTestId("gf-accuracy"), "85");
    await userEvent.click(screen.getByTestId("gf-submit"));
    expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ type: "REVISIONS", revisionType: "formula_sheet", targetAccuracy: 85, minutesPerUnit: 30 })]);
  });

  it("gives a mock a fixed day and start time", async () => {
    const onSubmit = vi.fn();
    render(<GoalFormSheet {...base} subject={null} kind="MOCKS" onSubmit={onSubmit} />);
    expect(screen.getByText(/This slot is fixed/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByTestId("gf-day"), "2026-10-31");
    await userEvent.click(screen.getByTestId("gf-submit"));
    expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ type: "MOCKS", fixedDate: "2026-10-31", fixedStartTime: "14:00", examPattern: "jee_main", mockType: "full_mock", target: 1 })]);
  });

  it("lets the student tick backlog items to clear", async () => {
    vi.mocked(listBacklogItems).mockResolvedValue({
      success: true,
      data: { nextCursor: null, items: [{ id: "b1", subjectId: 1, chapterId: CH, topic: null, source: "manual", estimatedMinutes: 50, deadline: null, priority: 2, status: "open", clearedAt: null, scheduledFor: null, scheduledWindow: null, notes: null, ageDays: 9, isOverdue: false, createdAt: "" }] },
    });
    const onSubmit = vi.fn();
    render(<GoalFormSheet {...base} kind="BACKLOG" onSubmit={onSubmit} />);
    await userEvent.click(await screen.findByTestId("gf-backlog-item"));
    await userEvent.click(screen.getByTestId("gf-submit"));
    expect(onSubmit).toHaveBeenCalledWith([expect.objectContaining({ type: "BACKLOG", backlogItemId: "b1", minutesPerUnit: 50, target: 1 })]);
  });

  it("asks for a backlog tick before it adds", async () => {
    vi.mocked(listBacklogItems).mockResolvedValue({ success: true, data: { nextCursor: null, items: [] } });
    const onSubmit = vi.fn();
    render(<GoalFormSheet {...base} kind="BACKLOG" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId("gf-submit"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Tick at least one backlog item.");
  });

  it("edits a saved goal and can remove it", async () => {
    const onSubmit = vi.fn();
    const onDelete = vi.fn();
    render(<GoalFormSheet {...base} kind="LECTURES" editing={savedGoal()} onSubmit={onSubmit} onDelete={onDelete} />);
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Edit lectures");
    expect(screen.getByTestId("gf-count")).toHaveValue(4);
    await userEvent.click(screen.getByTestId("gf-delete"));
    expect(onDelete).toHaveBeenCalled();
  });
});

describe("SubjectGoalCard", () => {
  it("shows each goal as a '{task} — X min' chip and opens the editor on tap", async () => {
    const onEdit = vi.fn();
    const onWatched = vi.fn();
    const draft: NewGoal & { draftId: string } = { draftId: "d1", type: "QUESTIONS", unit: "COUNT", target: 80, subjectId: 1, practiceSource: "hcv", minutesPerUnit: 60 };
    render(<SubjectGoalCard subject={physics} goals={[savedGoal()]} drafts={[draft]} defaults={null} busyId={null} onAdd={vi.fn()} onEdit={onEdit} onRemoveDraft={vi.fn()} onWatched={onWatched} />);
    expect(screen.getByRole("button", { name: /Edit: 4 lectures, Kinematics — 240 min/ })).toBeInTheDocument();
    expect(screen.getByTestId("draft-chip")).toHaveTextContent("80 questions (HCV) — 200 min");
    expect(screen.getByTestId("draft-chip")).toHaveTextContent("Not saved");
    await userEvent.click(screen.getByRole("button", { name: /Edit: 4 lectures/ }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "g1" }));
    await userEvent.click(screen.getByTestId("lecture-plus"));
    expect(onWatched).toHaveBeenCalledWith(expect.objectContaining({ id: "g1" }), 2);
  });

  it("has an add button for each of the five sections", () => {
    render(<SubjectGoalCard subject={physics} goals={[]} drafts={[]} defaults={null} busyId={null} onAdd={vi.fn()} onEdit={vi.fn()} onRemoveDraft={vi.fn()} onWatched={vi.fn()} />);
    for (const kind of ["LECTURES", "SELF_STUDY", "QUESTIONS", "REVISIONS", "BACKLOG"]) expect(screen.getByTestId(`add-${kind}`)).toBeInTheDocument();
  });
});

describe("MockGoalCard", () => {
  it("shows the fixed day and time on the chip", () => {
    const mock = savedGoal({ id: "m1", type: "MOCKS", subjectId: null, chapterId: null, target: 1, mockType: "full_mock", examPattern: "jee_main", fixedDate: "2026-10-31", fixedStartTime: "14:00", fixedEndTime: "17:00", minutesPerUnit: null, totalMinutes: 180 });
    render(<MockGoalCard goals={[mock]} drafts={[]} defaults={null} onAdd={vi.fn()} onEdit={vi.fn()} onRemoveDraft={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Edit: Full mock · Sat 14:00 — 180 min/ })).toBeInTheDocument();
  });
});

describe("WeekSuggestSheet", () => {
  const suggestion: WeekSuggestion = {
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
  };
  const props = { open: true, onClose: vi.fn(), weekStart: "2026-10-26", subjectNames: new Map([[1, "Physics"]]), chapterNames: new Map([[CH, "Kinematics"]]) };

  it("shows what the suggestions are based on and the rate-limit left", async () => {
    vi.mocked(suggestWeek).mockResolvedValue({ success: true, data: suggestion });
    render(<WeekSuggestSheet {...props} onAccept={vi.fn()} />);
    expect(await screen.findByTestId("suggest-week-basis")).toHaveTextContent("Kinematics is below 60% accuracy");
    expect(screen.getByTestId("suggest-week-basis")).toHaveTextContent("9 of 10 suggestions left this week");
    expect(screen.getAllByTestId("proposal")).toHaveLength(2);
  });

  it("accepts one proposal on its own and records it", async () => {
    vi.mocked(suggestWeek).mockResolvedValue({ success: true, data: suggestion });
    const onAccept = vi.fn();
    render(<WeekSuggestSheet {...props} onAccept={onAccept} />);
    await screen.findByTestId("suggest-week-basis");
    await userEvent.click(screen.getAllByTestId("proposal-accept")[0]!);
    expect(onAccept).toHaveBeenCalledWith([expect.objectContaining({ type: "REVISIONS", target: 3, chapterId: CH })]);
    expect(trackPlanner).toHaveBeenCalledWith("weekly_goal_suggest_accept", expect.objectContaining({ source: "weakness" }));
    expect(screen.getAllByTestId("proposal")[0]).toHaveAttribute("data-state", "accepted");
  });

  it("accepts the rest at once, and rejects them all", async () => {
    vi.mocked(suggestWeek).mockResolvedValue({ success: true, data: suggestion });
    const onAccept = vi.fn();
    const { unmount } = render(<WeekSuggestSheet {...props} onAccept={onAccept} />);
    await screen.findByTestId("suggest-week-basis");
    await userEvent.click(screen.getByTestId("suggest-accept-all"));
    expect(onAccept).toHaveBeenCalledWith([expect.objectContaining({ type: "REVISIONS" }), expect.objectContaining({ type: "QUESTIONS" })]);
    unmount();

    const again = vi.fn();
    render(<WeekSuggestSheet {...props} onAccept={again} />);
    await screen.findByTestId("suggest-week-basis");
    await userEvent.click(screen.getByTestId("suggest-reject-all"));
    expect(again).not.toHaveBeenCalled();
    expect(trackPlanner).toHaveBeenCalledWith("weekly_goal_suggest_reject", expect.objectContaining({ source: "weakness" }));
    expect(trackPlanner).toHaveBeenCalledWith("weekly_goal_suggest_reject", expect.objectContaining({ source: "spaced_repetition" }));
  });

  it("says so when the weekly limit is used", async () => {
    const { ApiError } = await import("@/lib/api/http");
    vi.mocked(suggestWeek).mockRejectedValue(new ApiError(429, "You've used all 10 weekly suggestions. They reset on Monday."));
    render(<WeekSuggestSheet {...props} onAccept={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId("suggest-week-error")).toHaveTextContent("used all 10 weekly suggestions"));
  });
});
