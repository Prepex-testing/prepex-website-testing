// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LightDayPrompt } from "@/components/planner/LightDayPrompt";
import { NoGoalsBanner } from "@/components/planner/NoGoalsPrompt";
import { loadMeter } from "@/components/planner/PlanLoadHeader";
import { StudyTaskCard } from "@/components/planner/StudyTaskCard";
import type { PlanDay, PlanTask } from "@/lib/api/plannerV2";

vi.mock("@/lib/api/plannerV2", async (orig) => ({ ...(await orig<typeof import("@/lib/api/plannerV2")>()), setLightDay: vi.fn().mockResolvedValue({ success: true, data: { day: null } }) }));
import { setLightDay } from "@/lib/api/plannerV2";
vi.mock("@/lib/api/goalAssistant", async (orig) => ({ ...(await orig<typeof import("@/lib/api/goalAssistant")>()), getGoalState: vi.fn() }));
import { getGoalState } from "@/lib/api/goalAssistant";

beforeEach(() => vi.clearAllMocks());

const task = (over: Partial<PlanTask> = {}): PlanTask => ({
  id: "11111111-1111-4111-8111-111111111111", planId: "p", kind: "revision", title: "Revise Limits", description: null, subjectId: 3, subject: "maths", chapterId: "c", chapterName: "Limits", topic: null,
  startMin: 600, endMin: 635, estimatedMinutes: 35, plannedUnits: 1, questionCount: null, status: "pending", origin: "sr", contentSource: null, contentSourceLabel: null, generatedBy: "deterministic",
  fixedSlot: false, weeklyGoalId: null, backlogItemId: null, secondsCompleted: 0, actualMinutes: null, linkedSessionLogId: null, linkedPracticeLogId: null, linkedRevisionLogId: null, linkedMockLogId: null, warning: null,
  why: "Due for revision · 2 days late", suggested: false, isProtected: false, locked: false, ...over,
});
const actions = { onStart: vi.fn(), onMarkDone: vi.fn(), onSkip: vi.fn(), onTomorrow: vi.fn(), onDelete: vi.fn() };

describe("task card: why, suggested, class work, lock", () => {
  it("every task says why it is there", () => {
    render(<StudyTaskCard task={task()} {...actions} />);
    expect(screen.getByTestId("task-why")).toHaveTextContent("Why: Due for revision · 2 days late");
  });
  it("a suggested extra is dimmed and labelled; class work and a locked task say so", () => {
    render(<StudyTaskCard task={task({ suggested: true, isProtected: true, locked: true })} {...actions} />);
    expect(screen.getByTestId("study-task")).toHaveAttribute("data-suggested", "true");
    expect(screen.getByTestId("chip-suggested")).toBeInTheDocument();
    expect(screen.getByTestId("chip-class-work")).toBeInTheDocument();
    expect(screen.getByTestId("chip-locked")).toBeInTheDocument();
  });
  it("the menu pins a task where it is", async () => {
    const onLock = vi.fn();
    render(<StudyTaskCard task={task()} {...actions} onLock={onLock} />);
    await userEvent.click(screen.getByTestId("task-menu"));
    await userEvent.click(screen.getByTestId("menu-lock"));
    expect(onLock).toHaveBeenCalled();
  });
});

const day = (over: Partial<PlanDay> = {}) => ({ lightDay: false, lightDayOffer: null, ...over }) as PlanDay;

describe("Light Day prompt", () => {
  it("asks, and only the student's yes switches it on", async () => {
    const onChanged = vi.fn();
    render(<LightDayPrompt day={day({ lightDayOffer: "low_checkin" })} date="2026-11-02" onChanged={onChanged} />);
    expect(screen.getByTestId("light-day-offer")).toHaveTextContent("Switch to a Light Day?");
    expect(setLightDay).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("light-day-accept"));
    await waitFor(() => expect(setLightDay).toHaveBeenCalledWith(true, "2026-11-02"));
    expect(onChanged).toHaveBeenCalled();
  });
  it("No hides it without changing the plan", async () => {
    render(<LightDayPrompt day={day({ lightDayOffer: "falling_hours" })} date="2026-11-02" onChanged={vi.fn()} />);
    await userEvent.click(screen.getByTestId("light-day-decline"));
    expect(screen.queryByTestId("light-day-offer")).toBeNull();
    expect(setLightDay).not.toHaveBeenCalled();
  });
  it("shows nothing without an offer, and a way back when it is on", async () => {
    const { rerender } = render(<LightDayPrompt day={day()} date="d" onChanged={vi.fn()} />);
    expect(screen.queryByTestId("light-day-offer")).toBeNull();
    rerender(<LightDayPrompt day={day({ lightDay: true })} date="d" onChanged={vi.fn()} />);
    await userEvent.click(screen.getByTestId("light-day-off"));
    await waitFor(() => expect(setLightDay).toHaveBeenCalledWith(false, "d"));
  });
});

describe("no-goals banner and load meter", () => {
  it("the Home banner shows while the week has no goals and not once it has", async () => {
    vi.mocked(getGoalState).mockResolvedValue({ success: true, data: { weekStart: "d", hasGoals: false, nextWeekStart: "e" } });
    const { unmount } = render(<NoGoalsBanner />);
    expect(await screen.findByTestId("no-goals-banner")).toHaveTextContent("Set your weekly goals for a smarter plan");
    unmount();
    vi.mocked(getGoalState).mockResolvedValue({ success: true, data: { weekStart: "d", hasGoals: true, nextWeekStart: "e" } });
    render(<NoGoalsBanner />);
    await waitFor(() => expect(getGoalState).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("no-goals-banner")).toBeNull();
  });
  it("the load meter is green to 85%, amber to 100%, red beyond", () => {
    expect(loadMeter(80, 100)).toBe("green");
    expect(loadMeter(95, 100)).toBe("amber");
    expect(loadMeter(120, 100)).toBe("red");
  });
});
