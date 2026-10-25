// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoalCard } from "@/components/goals/GoalCard";
import { NewSuggestion } from "@/components/goals/NewSuggestion";
import { SuggestPanel } from "@/components/goals/SuggestPanel";
import { ApiError } from "@/lib/api/http";
import type { Goal } from "@/lib/api/goals";
import type { GoalSuggestion } from "@/lib/api/goalSuggestions";
import { hoursText, parseHours, problemOf } from "@/lib/goals/suggestion";

vi.mock("@/lib/api/goalSuggestions", () => ({
  createGoalSuggestion: vi.fn(),
  respondToGoalSuggestion: vi.fn(),
  listGoalSuggestions: vi.fn(),
}));
import { createGoalSuggestion, respondToGoalSuggestion } from "@/lib/api/goalSuggestions";

vi.mock("@/lib/api/onboarding", () => ({ getStudentChapters: vi.fn() }));
import { getStudentChapters } from "@/lib/api/onboarding";

const CH = "11111111-1111-4111-8111-111111111111";

const suggestion = (over: Partial<GoalSuggestion> = {}): GoalSuggestion => ({
  id: "s1",
  weekStartDate: "2026-10-19",
  chapterId: CH,
  chapterName: "Rotational Motion",
  suggestedHours: 4,
  suggestedSubTopics: ["Moment of inertia", "Torque", "Rolling motion"],
  suggestedPyqYear: 2019,
  why: "You are at 30% here and the same mistake repeats.",
  status: "generated",
  acceptedGoalId: null,
  createdAt: "2026-10-19T04:00:00.000Z",
  respondedAt: null,
  ...over,
});

const created = (s = suggestion()) => ({ success: true as const, data: { suggestion: s, limit: { used: 1, limit: 10, retryAfterSeconds: 0 } } });

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const panel = (extra: Partial<Parameters<typeof SuggestPanel>[0]> = {}) => {
  const onAdded = vi.fn();
  const onClose = vi.fn();
  render(<SuggestPanel chapterId={CH} chapterName="Rotational Motion" onAdded={onAdded} onClose={onClose} {...extra} />);
  return { onAdded, onClose };
};

beforeEach(() => {
  vi.mocked(getStudentChapters).mockReset();
  vi.mocked(getStudentChapters).mockRejectedValue(new Error("not needed"));
  vi.mocked(createGoalSuggestion).mockReset();
  vi.mocked(respondToGoalSuggestion).mockReset();
});

describe("helpers", () => {
  it("hoursText", () => {
    expect([1, 4, 2.5].map(hoursText)).toEqual(["1 hour", "4 hours", "2.5 hours"]);
  });

  it("parseHours: 1 to 15 in half hours, nothing else", () => {
    expect(parseHours("4")).toBe(4);
    expect(parseHours(" 2.5 ")).toBe(2.5);
    expect(parseHours("2.8")).toBe(3);
    expect(parseHours("0.5")).toBeNull();
    expect(parseHours("16")).toBeNull();
    expect(parseHours("")).toBeNull();
    expect(parseHours("abc")).toBeNull();
  });

  it("problemOf: 503 and a dropped connection are 'resting', 429 keeps the server's minutes, the rest keep their words", () => {
    expect(problemOf(new ApiError(503, "The AI coach is resting right now."))).toEqual({ kind: "resting", message: "AI is resting, back soon." });
    expect(problemOf(new TypeError("fetch failed")).kind).toBe("resting");
    expect(problemOf(new ApiError(429, "You've used all 10 AI requests for this hour. Try again in about 12 minute(s)."))).toEqual({
      kind: "limit",
      message: "You've used all 10 AI requests for this hour. Try again in about 12 minute(s).",
    });
    expect(problemOf(new ApiError(400, "Goals can only be set for the current week or a future week."))).toMatchObject({ kind: "other" });
  });
});

describe("SuggestPanel", () => {
  it("shows a skeleton while the Brain thinks, then the suggestion", async () => {
    const d = deferred<ReturnType<typeof created>>();
    vi.mocked(createGoalSuggestion).mockReturnValue(d.promise as never);
    panel();
    expect(screen.getByTestId("suggest-skeleton")).toHaveTextContent("Working out a goal for Rotational Motion");
    expect(screen.queryByTestId("suggest-card")).toBeNull();
    await act(async () => d.resolve(created()));
    expect(await screen.findByTestId("suggest-card")).toBeInTheDocument();
    expect(screen.queryByTestId("suggest-skeleton")).toBeNull();
    expect(screen.getByTestId("suggest-hours")).toHaveTextContent("4 hours this week");
    expect(screen.getByTestId("suggest-subtopics").querySelectorAll("li")).toHaveLength(3);
    expect(screen.getByTestId("suggest-pyq")).toHaveTextContent("JEE PYQ 2019");
    expect(screen.getByTestId("suggest-why")).toHaveTextContent("the same mistake repeats");
  });

  it("asks the Brain ONCE even when React runs the effect twice (each request spends one of the student's ten an hour)", async () => {
    vi.mocked(createGoalSuggestion).mockResolvedValue(created());
    render(
      <StrictMode>
        <SuggestPanel chapterId={CH} chapterName="Rotational Motion" onAdded={vi.fn()} onClose={vi.fn()} />
      </StrictMode>,
    );
    expect(await screen.findByTestId("suggest-card")).toBeInTheDocument();
    expect(createGoalSuggestion).toHaveBeenCalledTimes(1);
  });

  it("asks for the chapter, the week and the target rank it was given", async () => {
    vi.mocked(createGoalSuggestion).mockResolvedValue(created());
    panel({ weekStartDate: "2026-10-26", targetRank: 700 });
    await screen.findByTestId("suggest-card");
    expect(createGoalSuggestion).toHaveBeenCalledTimes(1);
    expect(createGoalSuggestion).toHaveBeenCalledWith({ chapterId: CH, weekStartDate: "2026-10-26", targetRank: 700 });
  });

  it("leaves out the PYQ line when there is no year", async () => {
    vi.mocked(createGoalSuggestion).mockResolvedValue(created(suggestion({ suggestedPyqYear: null })));
    panel();
    await screen.findByTestId("suggest-card");
    expect(screen.queryByTestId("suggest-pyq")).toBeNull();
  });

  it("Accept adds the goal as suggested, tells the page, and closes", async () => {
    vi.mocked(createGoalSuggestion).mockResolvedValue(created());
    vi.mocked(respondToGoalSuggestion).mockResolvedValue({ success: true, data: { suggestion: suggestion({ status: "accepted" }), goal: null } });
    const { onAdded, onClose } = panel();
    await userEvent.click(await screen.findByTestId("suggest-accept"));
    await waitFor(() => expect(onAdded).toHaveBeenCalledWith("Added: 4 hours on Rotational Motion this week."));
    expect(respondToGoalSuggestion).toHaveBeenCalledWith("s1", { status: "accepted" });
    expect(onClose).toHaveBeenCalled();
  });

  it("Modify: the hours box starts at the suggestion, refuses 0 and 16, and saves the student's own number", async () => {
    vi.mocked(createGoalSuggestion).mockResolvedValue(created());
    vi.mocked(respondToGoalSuggestion).mockResolvedValue({ success: true, data: { suggestion: suggestion({ status: "modified" }), goal: null } });
    const { onAdded } = panel();
    await userEvent.click(await screen.findByTestId("suggest-modify"));
    const input = screen.getByTestId("suggest-hours-input") as HTMLInputElement;
    expect(input.value).toBe("4");
    await userEvent.clear(input);
    await userEvent.type(input, "16");
    expect(screen.getByTestId("suggest-save-modified")).toBeDisabled();
    expect(screen.getByTestId("suggest-hours-error")).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, "6.5");
    expect(screen.getByTestId("suggest-save-modified")).toBeEnabled();
    await userEvent.click(screen.getByTestId("suggest-save-modified"));
    await waitFor(() => expect(onAdded).toHaveBeenCalledWith("Added: 6.5 hours on Rotational Motion this week."));
    expect(respondToGoalSuggestion).toHaveBeenCalledWith("s1", { status: "modified", modifiedPayload: { hours: 6.5 } });
  });

  it("Cancel in the Modify box goes back to Accept / Modify / Dismiss", async () => {
    vi.mocked(createGoalSuggestion).mockResolvedValue(created());
    panel();
    await userEvent.click(await screen.findByTestId("suggest-modify"));
    await userEvent.click(screen.getByTestId("suggest-cancel-modify"));
    expect(screen.getByTestId("suggest-accept")).toBeInTheDocument();
    expect(screen.queryByTestId("suggest-hours-input")).toBeNull();
  });

  it("Dismiss closes at once (the request finishes on its own) and adds nothing", async () => {
    vi.mocked(createGoalSuggestion).mockResolvedValue(created());
    const slow = deferred<never>();
    vi.mocked(respondToGoalSuggestion).mockReturnValue(slow.promise as never);
    const { onAdded, onClose } = panel();
    await userEvent.click(await screen.findByTestId("suggest-dismiss"));
    expect(respondToGoalSuggestion).toHaveBeenCalledWith("s1", { status: "dismissed" });
    expect(onClose).toHaveBeenCalled();
    expect(onAdded).not.toHaveBeenCalled();
  });

  it("when the goal already exists the server's 409 is shown on the card, which stays open", async () => {
    vi.mocked(createGoalSuggestion).mockResolvedValue(created());
    vi.mocked(respondToGoalSuggestion).mockRejectedValue(new ApiError(409, "You already have that goal this week."));
    const { onAdded, onClose } = panel();
    await userEvent.click(await screen.findByTestId("suggest-accept"));
    expect(await screen.findByTestId("suggest-respond-error")).toHaveTextContent("You already have that goal this week.");
    expect(screen.getByTestId("suggest-card")).toBeInTheDocument();
    expect(onAdded).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("AI resting (503): says so, offers Try again, and Try again asks the Brain once more", async () => {
    vi.mocked(createGoalSuggestion).mockRejectedValueOnce(new ApiError(503, "The AI coach is resting right now.")).mockResolvedValueOnce(created());
    panel();
    const err = await screen.findByTestId("suggest-error");
    expect(err).toHaveTextContent("AI is resting, back soon.");
    expect(err).toHaveAttribute("data-kind", "resting");
    await userEvent.click(screen.getByTestId("suggest-retry"));
    expect(await screen.findByTestId("suggest-card")).toBeInTheDocument();
    expect(createGoalSuggestion).toHaveBeenCalledTimes(2);
  });

  it("rate limit (429): the server's minutes are shown and there is no Try again button", async () => {
    vi.mocked(createGoalSuggestion).mockRejectedValue(new ApiError(429, "You've used all 10 AI requests for this hour. Try again in about 23 minute(s)."));
    const { onClose } = panel();
    const err = await screen.findByTestId("suggest-error");
    expect(err).toHaveTextContent("Try again in about 23 minute(s).");
    expect(err).toHaveAttribute("data-kind", "limit");
    expect(screen.queryByTestId("suggest-retry")).toBeNull();
    await userEvent.click(screen.getByTestId("suggest-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("a chapter the syllabus does not know cannot be accepted or modified, only dismissed", async () => {
    vi.mocked(createGoalSuggestion).mockResolvedValue(created(suggestion({ chapterId: null })));
    panel();
    await screen.findByTestId("suggest-card");
    expect(screen.getByTestId("suggest-accept")).toBeDisabled();
    expect(screen.getByTestId("suggest-modify")).toBeDisabled();
    expect(screen.getByTestId("suggest-dismiss")).toBeEnabled();
    expect(screen.getByTestId("suggest-no-chapter")).toBeInTheDocument();
  });
});

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: "g1",
  weekStart: "2026-10-19",
  subjectId: 1,
  chapterId: CH,
  topic: null,
  type: "QUESTIONS",
  target: 50,
  unit: "COUNT",
  status: "ACTIVE",
  source: "STUDENT",
  progressSelfReport: 0,
  carriedFromGoalId: null,
  minutesPerUnit: null,
  totalMinutes: null,
  practiceSource: null,
  revisionType: null,
  targetAccuracy: null,
  mockType: null,
  examPattern: null,
  fixedDate: null,
  fixedStartTime: null,
  fixedEndTime: null,
  backlogItemId: null,
  progress: { current: 10, target: 50, unit: "COUNT", percent: 20, complete: false },
  ...over,
});

describe("GoalCard", () => {
  const base = { scope: "Physics · Rotational Motion", busy: false, onWatched: vi.fn(), onToggleDone: vi.fn(), onDelete: vi.fn() };

  it("has a Suggest button only when the page offers one, and the slot shows under the goal", async () => {
    const onSuggest = vi.fn();
    const { rerender } = render(<GoalCard goal={goal()} {...base} />);
    expect(screen.queryByTestId("goal-suggest")).toBeNull();
    rerender(<GoalCard goal={goal()} {...base} onSuggest={onSuggest} suggestSlot={<p data-testid="slot">panel</p>} />);
    await userEvent.click(screen.getByTestId("goal-suggest"));
    expect(onSuggest).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("slot")).toBeInTheDocument();
  });
});

describe("NewSuggestion", () => {
  const subjects = [
    { subjectId: 1, subjectName: "Physics", chapters: [{ id: CH, name: "Rotational Motion" }] },
    { subjectId: 2, subjectName: "Chemistry", chapters: [{ id: "22222222-2222-4222-8222-222222222222", name: "Mole Concept" }] },
  ] as never;

  it("opens, needs a chapter, then asks for that chapter", async () => {
    vi.mocked(createGoalSuggestion).mockResolvedValue(created());
    render(<NewSuggestion subjects={subjects} onAdded={vi.fn()} />);
    await userEvent.click(screen.getByTestId("suggest-new"));
    expect(screen.getByTestId("suggest-go")).toBeDisabled();
    await userEvent.selectOptions(screen.getByTestId("suggest-chapter"), CH);
    await userEvent.click(screen.getByTestId("suggest-go"));
    expect(await screen.findByTestId("suggest-card")).toBeInTheDocument();
    expect(createGoalSuggestion).toHaveBeenCalledWith({ chapterId: CH });
  });

  it("once opened it offers every class's chapters, not only the student's own class", async () => {
    const other = { subjectId: 1, subjectName: "Physics", chapters: [{ id: CH, name: "Rotational Motion" }, { id: "33333333-3333-4333-8333-333333333333", name: "Alternating Current" }] };
    vi.mocked(getStudentChapters).mockResolvedValue({ success: true, data: [other] } as never);
    render(<NewSuggestion subjects={subjects} onAdded={vi.fn()} />);
    await userEvent.click(screen.getByTestId("suggest-new"));
    await waitFor(() => expect(screen.getByRole("option", { name: "Alternating Current" })).toBeInTheDocument());
    expect(getStudentChapters).toHaveBeenCalledWith({ allClasses: true });
  });

  it("keeps the student's own class list if the all-classes list cannot be loaded", async () => {
    render(<NewSuggestion subjects={subjects} onAdded={vi.fn()} />);
    await userEvent.click(screen.getByTestId("suggest-new"));
    expect(screen.getByRole("option", { name: "Mole Concept" })).toBeInTheDocument();
  });

  it("changing the chapter clears the old suggestion", async () => {
    vi.mocked(createGoalSuggestion).mockResolvedValue(created());
    render(<NewSuggestion subjects={subjects} onAdded={vi.fn()} />);
    await userEvent.click(screen.getByTestId("suggest-new"));
    await userEvent.selectOptions(screen.getByTestId("suggest-chapter"), CH);
    await userEvent.click(screen.getByTestId("suggest-go"));
    await screen.findByTestId("suggest-card");
    await userEvent.selectOptions(screen.getByTestId("suggest-chapter"), "22222222-2222-4222-8222-222222222222");
    expect(screen.queryByTestId("suggest-card")).toBeNull();
  });
});
