// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/http";
import { plannerTaskIntent } from "@/components/home/focusIntent";
import { NO_QUESTIONS_NOTICE, ownContentIntent } from "@/lib/focus/intent";

const getTaskQuestions = vi.fn();
vi.mock("@/lib/api/practice", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/practice")>()),
  getTaskQuestions: (...args: unknown[]) => getTaskQuestions(...args),
}));

import { TodaysPracticeModal } from "@/components/practice/TodaysPracticeModal";

const TASK = "11111111-1111-4111-8111-111111111111";

beforeEach(() => getTaskQuestions.mockReset());

describe("practice own-content and no-questions paths", () => {
  it("with questions ready: Start Practice is unchanged, and 'Use my own content' opens the timer for this task", async () => {
    getTaskQuestions.mockResolvedValue({
      data: { taskId: TASK, taskTitle: "Kinematics", sessionId: "s", sessionType: "TASK", status: "NOT_STARTED", totalQuestions: 10, attemptedQuestions: 0, elapsedSeconds: 0, maxElapsedSeconds: null, questions: [] },
    });
    const user = userEvent.setup();
    const onStart = vi.fn();
    const onUseOwnContent = vi.fn();
    render(<TodaysPracticeModal open onClose={vi.fn()} onStart={onStart} onUseOwnContent={onUseOwnContent} taskId={TASK} estimatedMinutes={45} />);

    await user.click(await screen.findByRole("button", { name: /start practice/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTestId("practice-own-content"));
    expect(onUseOwnContent).toHaveBeenCalledWith({ noQuestions: false });
    expect(screen.queryByTestId("practice-no-questions-timer")).not.toBeInTheDocument();
  });
});

describe("the intents those buttons and the planner cards dispatch", () => {
  it("own content: a practice session for the plan task, the notice only when there were no questions", () => {
    expect(ownContentIntent(TASK, 45, false)).toEqual({ originSource: "practice_own_content_fallback", originId: TASK, taskType: "practice", targetMinutes: 45, notice: undefined });
    expect(ownContentIntent(TASK, 45, true).notice).toBe(NO_QUESTIONS_NOTICE);
    expect(NO_QUESTIONS_NOTICE).toBe("No Prepex questions for this chapter yet — starting focus timer so you can practice from your own source");
    expect(ownContentIntent(null, null, false)).toMatchObject({ originId: undefined, targetMinutes: undefined });
  });

  it("planner cards: the id and what the button decides (revision), nothing guessed for new learning", () => {
    expect(plannerTaskIntent({ id: TASK, type: "revision", estimatedMinutes: 30, subjectName: "Physics" })).toEqual({
      originSource: "planner",
      originId: TASK,
      subject: "Physics",
      taskType: "revision",
      targetMinutes: 30,
    });
    expect(plannerTaskIntent({ id: TASK, type: "new-learning", estimatedMinutes: 0 })).toEqual({
      originSource: "planner",
      originId: TASK,
      subject: undefined,
      taskType: undefined,
      targetMinutes: undefined,
    });
  });
});
