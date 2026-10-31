// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModeToggle } from "@/components/planner/ModeToggle";
import { PracticeChoiceSheet } from "@/components/planner/PracticeChoiceSheet";
import { QuickLogSheet } from "@/components/planner/QuickLogSheet";
import { EndOfDay } from "@/components/planner/EndOfDay";
import { NO_QUESTIONS_NOTICE, ownContentIntent } from "@/lib/focus/intent";
import type { PlanTask } from "@/lib/api/plannerV2";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/telemetry/planner", () => ({ trackPlanner: vi.fn() }));
vi.mock("@/lib/focus/startFocusSession", () => ({ startFocusSession: vi.fn() }));
import { startFocusSession } from "@/lib/focus/startFocusSession";
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
  completePlanTask: vi.fn(),
  startPlanTask: vi.fn(),
  getPracticeOptions: vi.fn(),
  setPlannerMode: vi.fn(),
}));
import { completePlanTask, getPracticeOptions, setPlannerMode, startPlanTask } from "@/lib/api/plannerV2";
import { trackPlanner } from "@/lib/telemetry/planner";

const ID = "11111111-1111-4111-8111-111111111111";

const task = (over: Partial<PlanTask> = {}): PlanTask => ({
  id: ID, planId: "p", kind: "lecture", title: "Kinematics lecture", description: null, subjectId: 1, subject: "physics", chapterId: "c1", chapterName: "Kinematics", topic: null,
  startMin: 600, endMin: 660, estimatedMinutes: 60, plannedUnits: 1, questionCount: null, status: "in_progress", origin: null, contentSource: null, contentSourceLabel: null, generatedBy: "engine",
  fixedSlot: false, weeklyGoalId: null, backlogItemId: null, secondsCompleted: 0, actualMinutes: null, linkedSessionLogId: null, linkedPracticeLogId: null, linkedRevisionLogId: null, linkedMockLogId: null, warning: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(completePlanTask).mockResolvedValue({ success: true, data: { task: task({ status: "done" }), alreadyDone: false } });
  vi.mocked(startPlanTask).mockResolvedValue({ success: true, data: task() });
});

describe("QuickLogSheet — G6 manual completion", () => {
  const base = { open: true, busy: false, error: null, onClose: vi.fn() };
  it("lets the student skip the log and still mark the task done", async () => {
    const onSubmit = vi.fn();
    render(<QuickLogSheet {...base} task={task({ kind: "revision" })} origin="manual" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId("log-skip"));
    expect(onSubmit).toHaveBeenCalledWith({});
  });
  it("a revision tick is three buttons: one tap on Easy / OK / Hard logs it with that recall", async () => {
    const onSubmit = vi.fn();
    render(<QuickLogSheet {...base} task={task({ kind: "revision" })} origin="manual" onSubmit={onSubmit} />);
    expect(screen.queryByTestId("log-save")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("recall-hard"));
    expect(onSubmit).toHaveBeenCalledWith({ actualMinutes: 60, log: true, recall: "hard", revision: { revisionType: "notes" } });
  });
  it("a practice tick starts from the task's target and one tap confirms it", async () => {
    const onSubmit = vi.fn();
    render(<QuickLogSheet {...base} task={task({ kind: "practice", questionCount: 20 })} origin="manual" onSubmit={onSubmit} />);
    expect(screen.getByTestId("log-attempted")).toHaveValue("20");
    expect(screen.getByTestId("log-correct")).toHaveValue("20");
    await userEvent.click(screen.getByTestId("log-correct-dec"));
    await userEvent.click(screen.getByTestId("log-correct-dec"));
    expect(screen.getByTestId("log-wrong")).toHaveTextContent("2 wrong");
    await userEvent.click(screen.getByTestId("log-save"));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ log: true, practice: expect.objectContaining({ questionsAttempted: 20, questionsCorrect: 18, questionsWrong: 2 }) }));
  });
  it("lowering attempted keeps correct from going above it", async () => {
    render(<QuickLogSheet {...base} task={task({ kind: "practice", questionCount: 5 })} origin="manual" onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByTestId("log-attempted-dec"));
    expect(screen.getByTestId("log-attempted")).toHaveValue("4");
    expect(screen.getByTestId("log-correct")).toHaveValue("4");
  });
  it("after a timer the older fields are unchanged: confidence 1-5 for a revision", async () => {
    const onSubmit = vi.fn();
    render(<QuickLogSheet {...base} task={task({ kind: "revision" })} origin="timer" onSubmit={onSubmit} />);
    await userEvent.click(screen.getByTestId("log-save"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Pick how confident you feel");
  });
  it("works out wrong answers from attempted and correct after a timer", async () => {
    render(<QuickLogSheet {...base} task={task({ kind: "practice" })} origin="timer" onSubmit={vi.fn()} />);
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
      expect(await screen.findByTestId("practice-notice")).toHaveTextContent(NO_QUESTIONS_NOTICE);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(startFocusSession).toHaveBeenCalledWith(ownContentIntent(ID, 60, true));
    } finally {
      vi.useRealTimers();
    }
  });

  it("'Use my own content' goes straight to the timer as own-content practice", async () => {
    vi.mocked(getPracticeOptions).mockResolvedValue({ success: true, data: { available: 40, prepexQuestions: true } });
    render(<PracticeChoiceSheet task={task({ kind: "practice" })} onClose={vi.fn()} />);
    await userEvent.click(screen.getByTestId("practice-own"));
    await waitFor(() => expect(startFocusSession).toHaveBeenCalled());
    const intent = vi.mocked(startFocusSession).mock.calls[0]![0];
    expect(intent).toMatchObject({ originSource: "practice_own_content_fallback", originId: ID, taskType: "practice" });
    expect(intent.notice).toBeUndefined();
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
