// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FocusPlanBridge } from "@/components/planner/FocusPlanBridge";
import { ModeToggle } from "@/components/planner/ModeToggle";
import { PracticeChoiceSheet } from "@/components/planner/PracticeChoiceSheet";
import { QuickLogSheet } from "@/components/planner/QuickLogSheet";
import { EndOfDay } from "@/components/planner/EndOfDay";
import type { FocusResult } from "@/components/focus/useFocusSession";
import type { FocusHandoff } from "@/lib/planner/cta";
import type { PlanTask } from "@/lib/api/plannerV2";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/telemetry/planner", () => ({ trackPlanner: vi.fn() }));
// The real modal pulls in an SVG asset the test runner cannot load; a plain stand-in is enough to test the toggle.
vi.mock("@/components/ui/ConfirmModal", () => ({
  ConfirmModal: ({ open, title, description, confirmLabel, onConfirm, onClose }: { open: boolean; title: string; description: string; confirmLabel: string; onConfirm: () => void; onClose: () => void }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <p>{description}</p>
        <button onClick={onConfirm}>{confirmLabel}</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));
vi.mock("@/lib/api/plannerV2", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/plannerV2")>()),
  getPlanDay: vi.fn(),
  completePlanTask: vi.fn(),
  recordTaskProgress: vi.fn(),
  startPlanTask: vi.fn(),
  getPracticeOptions: vi.fn(),
  setPlannerMode: vi.fn(),
}));
import { completePlanTask, getPlanDay, getPracticeOptions, recordTaskProgress, setPlannerMode, startPlanTask } from "@/lib/api/plannerV2";
import { trackPlanner } from "@/lib/telemetry/planner";

const ID = "11111111-1111-4111-8111-111111111111";

const task = (over: Partial<PlanTask> = {}): PlanTask => ({
  id: ID, planId: "p", kind: "lecture", title: "Kinematics lecture", description: null, subjectId: 1, subject: "physics", chapterId: "c1", chapterName: "Kinematics", topic: null,
  startMin: 600, endMin: 660, estimatedMinutes: 60, plannedUnits: 1, questionCount: null, status: "in_progress", origin: null, contentSource: null, contentSourceLabel: null, generatedBy: "engine",
  fixedSlot: false, weeklyGoalId: null, backlogItemId: null, secondsCompleted: 0, actualMinutes: null, linkedSessionLogId: null, linkedPracticeLogId: null, linkedRevisionLogId: null, linkedMockLogId: null, warning: null,
  ...over,
});

const handoff = (over: Partial<FocusHandoff> = {}): FocusHandoff => ({ planTaskId: ID, mode: "session", subjectId: 1, chapterId: "c1", topic: "Kinematics", minutes: 60, notice: null, ...over });

const result = (over: Partial<FocusResult["focusSession"]> = {}): FocusResult =>
  ({ focusSession: { id: "fs1", wasCompleted: true, actualMinutes: 58, ...over }, studySession: null }) as unknown as FocusResult;

function dayWith(t: PlanTask) {
  vi.mocked(getPlanDay).mockResolvedValue({ success: true, data: { tasks: [t] } as never });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(completePlanTask).mockResolvedValue({ success: true, data: { task: task({ status: "done" }), alreadyDone: false } });
  vi.mocked(recordTaskProgress).mockResolvedValue({ success: true, data: task() });
  vi.mocked(startPlanTask).mockResolvedValue({ success: true, data: task() });
});

describe("FocusPlanBridge — G1 Start Session", () => {
  it("a finished session completes the task and links the session", async () => {
    dayWith(task());
    render(<FocusPlanBridge handoff={handoff()} result={result()} />);
    await waitFor(() => expect(completePlanTask).toHaveBeenCalledWith(ID, { via: "focus", focusSessionId: "fs1" }));
    expect(await screen.findByTestId("bridge-message")).toHaveTextContent("Task marked done");
    expect(trackPlanner).toHaveBeenCalledWith("planner_task_complete", expect.objectContaining({ via: "focus" }));
    expect(screen.getByTestId("back-to-plan")).toHaveAttribute("href", "/planner");
  });

  it("ending early keeps the task in progress and banks the minutes", async () => {
    dayWith(task());
    render(<FocusPlanBridge handoff={handoff()} result={result({ wasCompleted: false, actualMinutes: 20 })} />);
    await waitFor(() => expect(recordTaskProgress).toHaveBeenCalledWith(ID, { focusSessionId: "fs1" }));
    expect(completePlanTask).not.toHaveBeenCalled();
    expect(await screen.findByTestId("bridge-message")).toHaveTextContent("stays in progress");
  });

  it("tells the student when the plan could not be updated", async () => {
    dayWith(task());
    const { ApiError } = await import("@/lib/api/http");
    vi.mocked(completePlanTask).mockRejectedValue(new ApiError(500, "The plan could not be saved."));
    render(<FocusPlanBridge handoff={handoff()} result={result()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("The plan could not be saved.");
  });
});

describe("FocusPlanBridge — G2 Start Revision", () => {
  it("asks how confident the student feels, then completes with that confidence", async () => {
    dayWith(task({ kind: "revision", title: "Revise Kinematics" }));
    render(<FocusPlanBridge handoff={handoff({ mode: "revision" })} result={result()} />);
    expect(await screen.findByTestId("quick-log")).toHaveTextContent("How did the revision go?");
    expect(completePlanTask).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("confidence-4"));
    await userEvent.click(screen.getByTestId("log-save"));
    await waitFor(() => expect(completePlanTask).toHaveBeenCalled());
    expect(vi.mocked(completePlanTask).mock.calls[0]![1]).toMatchObject({ via: "focus", focusSessionId: "fs1", confidence: 4, revision: { revisionType: "notes" } });
  });
});

describe("FocusPlanBridge — G3 own content", () => {
  it("asks for the 15-second practice log, pre-filled, and completes with it", async () => {
    dayWith(task({ kind: "practice", questionCount: 20, contentSource: "hcv" }));
    render(<FocusPlanBridge handoff={handoff({ mode: "practice" })} result={result()} />);
    const attempted = await screen.findByTestId("log-attempted");
    expect(attempted).toHaveValue("20");
    expect(screen.getByTestId("log-source")).toHaveValue("hcv");
    await userEvent.type(screen.getByTestId("log-correct"), "14");
    await userEvent.click(screen.getByTestId("log-save"));
    await waitFor(() => expect(completePlanTask).toHaveBeenCalled());
    expect(vi.mocked(completePlanTask).mock.calls[0]![1].practice).toMatchObject({ source: "hcv", questionsAttempted: 20, questionsCorrect: 14, questionsWrong: 6 });
  });
});

describe("QuickLogSheet — G6 manual completion", () => {
  const base = { open: true, busy: false, error: null, onClose: vi.fn() };
  it("lets the student skip the log and still mark the task done", async () => {
    const onSubmit = vi.fn();
    render(<QuickLogSheet {...base} task={task({ kind: "revision" })} origin="manual" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId("log-skip"));
    expect(onSubmit).toHaveBeenCalledWith({});
  });
  it("needs a confidence for a revision log", async () => {
    const onSubmit = vi.fn();
    render(<QuickLogSheet {...base} task={task({ kind: "revision" })} origin="manual" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId("log-save"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Pick how confident you feel");
  });
  it("works out wrong answers from attempted and correct", async () => {
    render(<QuickLogSheet {...base} task={task({ kind: "practice" })} origin="manual" onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByTestId("log-attempted"), "30");
    await userEvent.type(screen.getByTestId("log-correct"), "21");
    expect(screen.getByTestId("log-wrong")).toHaveTextContent("9 wrong");
  });
  it("rejects marks above the exam's maximum", async () => {
    const onSubmit = vi.fn();
    render(<QuickLogSheet {...base} task={task({ kind: "mock" })} origin="timer" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByTestId("log-marks"), "400");
    await userEvent.click(screen.getByTestId("log-save"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("cannot be more than 300");
  });
});

describe("PracticeChoiceSheet — G3", () => {
  it("defaults to Prepex questions when the bank has some, and opens the attempt screen with the task id", async () => {
    vi.mocked(getPracticeOptions).mockResolvedValue({ success: true, data: { available: 40, prepexQuestions: true } });
    render(<PracticeChoiceSheet task={task({ kind: "practice", questionCount: 15 })} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId("practice-bank-text")).toHaveTextContent("15 questions picked for Kinematics"));
    await userEvent.click(screen.getByTestId("practice-prepex"));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/practice?taskId=${ID}`));
    expect(startPlanTask).toHaveBeenCalledWith(ID);
  });

  it("falls back to the focus timer with the inline notice when the bank has nothing", async () => {
    vi.mocked(getPracticeOptions).mockResolvedValue({ success: true, data: { available: 0, prepexQuestions: false } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<PracticeChoiceSheet task={task({ kind: "practice" })} onClose={vi.fn()} />);
      await waitFor(() => expect(screen.getByTestId("practice-bank-text")).toHaveTextContent("No questions for this chapter yet"));
      await userEvent.click(screen.getByTestId("practice-prepex"));
      expect(await screen.findByTestId("practice-notice")).toHaveTextContent("No Prepex questions for this chapter yet — starting focus timer so you can practice from your own source");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      const url = String(push.mock.calls.at(-1)![0]);
      expect(url).toContain("/focus?");
      expect(url).toContain("mode=practice");
      expect(url).toContain("notice=no_questions");
    } finally {
      vi.useRealTimers();
    }
  });

  it("'Use my own content' goes straight to the timer tagged practice", async () => {
    vi.mocked(getPracticeOptions).mockResolvedValue({ success: true, data: { available: 40, prepexQuestions: true } });
    render(<PracticeChoiceSheet task={task({ kind: "practice" })} onClose={vi.fn()} />);
    await userEvent.click(screen.getByTestId("practice-own"));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(String(push.mock.calls[0]![0])).toContain("mode=practice");
    expect(String(push.mock.calls[0]![0])).not.toContain("notice=");
  });
});

describe("ModeToggle — Phase F", () => {
  it("asks before switching to manual and says what happens", async () => {
    vi.mocked(setPlannerMode).mockResolvedValue({ success: true, data: { mode: "manual" } });
    const onChanged = vi.fn();
    render(<ModeToggle mode="auto" onChanged={onChanged} />);
    expect(screen.getByTestId("mode-label")).toHaveTextContent("Auto");
    await userEvent.click(screen.getByRole("switch"));
    expect(await screen.findByText("Switching to manual will stop auto-generating future days. Your existing plan stays.")).toBeInTheDocument();
    expect(setPlannerMode).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Switch to manual" }));
    await waitFor(() => expect(setPlannerMode).toHaveBeenCalledWith("manual"));
    expect(trackPlanner).toHaveBeenCalledWith("planner_manual_toggle", { to: "manual" });
    expect(onChanged).toHaveBeenCalledWith("manual");
  });

  it("does nothing when the student backs out", async () => {
    render(<ModeToggle mode="manual" onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole("switch"));
    await screen.findByText("Switching to auto will generate tomorrow's plan tonight.");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(setPlannerMode).not.toHaveBeenCalled();
  });
});

describe("EndOfDay", () => {
  it("shows the percent and what rolls over", async () => {
    const onOpen = vi.fn();
    render(<EndOfDay percent={72} rolling={[task({ id: "x", title: "Optics practice", status: "pending" })]} onOpenTomorrow={onOpen} />);
    expect(screen.getByTestId("end-of-day")).toHaveTextContent("You hit 72% of today's plan. Here's what rolls over to tomorrow.");
    expect(screen.getByTestId("rolling-list")).toHaveTextContent("Optics practice");
    await userEvent.click(screen.getByTestId("open-tomorrow"));
    expect(onOpen).toHaveBeenCalled();
  });
  it("says nothing rolls over when it all got done", () => {
    render(<EndOfDay percent={100} rolling={[]} onOpenTomorrow={vi.fn()} />);
    expect(screen.getByTestId("end-of-day")).toHaveTextContent("Nothing rolls over.");
  });
});
