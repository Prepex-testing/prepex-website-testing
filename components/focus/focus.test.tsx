// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { Goal } from "@/lib/api/goals";
import type { StopFocusResult, StreakInfo } from "@/lib/api/focus";
import { AwayNag } from "@/components/focus/AwayNag";
import { FocusRing } from "@/components/focus/FocusRing";
import { FocusSetup } from "@/components/focus/FocusSetup";
import { FocusSummaryModal } from "@/components/focus/FocusSummaryModal";
import { ModeTabs } from "@/components/focus/ModeTabs";
import { SessionDone, loggedLines } from "@/components/focus/SessionDone";
import { StreakChip } from "@/components/focus/StreakChip";
import { goalStripFor } from "@/lib/focus/goalStrip";
import type { ResolvedFocusIntent } from "@/lib/focus/intent";

const KIN = "11111111-1111-4111-8111-111111111111";
const LAWS = "22222222-2222-4222-8222-222222222222";

const SUBJECTS: SubjectChapters[] = [
  {
    subjectId: 1,
    subjectCode: "PHY",
    subjectName: "Physics",
    chapters: [
      { id: KIN, subjectId: 1, name: "Kinematics", sequenceOrder: 1, isActive: true },
      { id: LAWS, subjectId: 1, name: "Laws of Motion", sequenceOrder: 2, isActive: true },
    ],
  },
  { subjectId: 2, subjectCode: "CHEM", subjectName: "Chemistry", chapters: [] },
];

const STANDALONE: ResolvedFocusIntent = {
  originSource: "standalone",
  originId: null,
  subjectId: null,
  chapterId: null,
  topic: "",
  taskType: "self_study",
  targetMinutes: 25,
  mode: "pomodoro",
  notice: null,
};

const FROM_PLAN: ResolvedFocusIntent = {
  originSource: "planner",
  originId: "33333333-3333-4333-8333-333333333333",
  subjectId: 1,
  chapterId: KIN,
  topic: "Projectile motion",
  taskType: "lecture",
  targetMinutes: 75,
  mode: "countdown",
  notice: null,
};

beforeEach(() => localStorage.clear());

describe("FocusSetup", () => {
  it("a standalone timer opens empty: nothing to start until a subject is chosen", () => {
    render(<FocusSetup subjects={SUBJECTS} initial={STANDALONE} busy={false} error={null} onStart={vi.fn()} />);
    const start = screen.getByTestId("start-focus");
    expect(start).toBeDisabled();
    expect(start).toHaveAccessibleName(/choose a subject/i);
    expect(screen.getByTestId("standalone-hint")).toHaveTextContent(/from scratch/i);
    expect(screen.getByTestId("focus-subject")).toHaveValue("");
  });

  it("the big Start button is a real 88px circle", () => {
    render(<FocusSetup subjects={SUBJECTS} initial={FROM_PLAN} busy={false} error={null} onStart={vi.fn()} />);
    expect(screen.getByTestId("start-focus").className).toContain("size-[88px]");
    expect(screen.getByTestId("start-focus").className).toContain("rounded-full");
  });

  it("opens pre-filled from the task and starts with its origin, so the result can be routed back", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<FocusSetup subjects={SUBJECTS} initial={FROM_PLAN} busy={false} error={null} onStart={onStart} />);

    expect(screen.getByTestId("focus-subject")).toHaveValue("1");
    expect(screen.getByTestId("focus-chapter")).toHaveValue(KIN);
    expect(screen.getByLabelText(/topic/i)).toHaveValue("Projectile motion");
    expect(screen.getByTestId("type-lecture")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("mode-countdown")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("custom-minutes")).toHaveValue(75);

    await user.click(screen.getByTestId("start-focus"));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0]![0]).toEqual({
      subjectId: 1,
      chapterId: KIN,
      topic: "Projectile motion",
      plannedMinutes: 75,
      deepFocusMode: false,
      originSource: "planner",
      originId: FROM_PLAN.originId,
      taskType: "lecture",
      mode: "countdown",
      pomodoro: null,
    });
  });

  it("every pre-filled field can be changed before pressing Start", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<FocusSetup subjects={SUBJECTS} initial={FROM_PLAN} busy={false} error={null} onStart={onStart} />);

    await user.selectOptions(screen.getByTestId("focus-chapter"), LAWS);
    await user.clear(screen.getByLabelText(/topic/i));
    await user.type(screen.getByLabelText(/topic/i), "  Friction  ");
    await user.click(screen.getByTestId("type-practice"));
    await user.click(screen.getByTestId("preset-45"));
    await user.click(screen.getByTestId("deep-focus"));
    await user.click(screen.getByTestId("start-focus"));

    expect(onStart.mock.calls[0]![0]).toMatchObject({ chapterId: LAWS, topic: "Friction", taskType: "practice", plannedMinutes: 45, deepFocusMode: true, originSource: "planner" });
  });

  it("changing the subject clears the chapter", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<FocusSetup subjects={SUBJECTS} initial={FROM_PLAN} busy={false} error={null} onStart={onStart} />);
    await user.selectOptions(screen.getByTestId("focus-subject"), "2");
    expect(screen.getByTestId("focus-chapter")).toHaveValue("");
    await user.click(screen.getByTestId("start-focus"));
    expect(onStart.mock.calls[0]![0]).toMatchObject({ subjectId: 2, chapterId: null });
  });

  it("Pomodoro defaults to 25 / 5 and can be set to any study / break / rounds", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<FocusSetup subjects={SUBJECTS} initial={{ ...STANDALONE, subjectId: 1 }} busy={false} error={null} onStart={onStart} />);

    expect(screen.getByTestId("pomodoro-study")).toHaveValue(25);
    expect(screen.getByTestId("pomodoro-break")).toHaveValue(5);
    expect(screen.getByTestId("pomodoro-cycles")).toHaveValue(1); // a 25-minute target is one round

    fireNumber(screen.getByTestId("pomodoro-study"), "50");
    fireNumber(screen.getByTestId("pomodoro-break"), "10");
    fireNumber(screen.getByTestId("pomodoro-cycles"), "3");
    expect(screen.getByTestId("pomodoro-total")).toHaveTextContent("3 × 50 min of study, with 10-minute breaks. 150 min of focus in total.");
    await user.click(screen.getByTestId("start-focus"));
    expect(onStart.mock.calls[0]![0]).toMatchObject({ mode: "pomodoro", plannedMinutes: 150, pomodoro: { studyMinutes: 50, breakMinutes: 10, cycles: 3 } });
  });

  it("picking a length re-fits the Pomodoro rounds", async () => {
    const user = userEvent.setup();
    render(<FocusSetup subjects={SUBJECTS} initial={{ ...STANDALONE, subjectId: 1 }} busy={false} error={null} onStart={vi.fn()} />);
    await user.click(screen.getByTestId("preset-90"));
    expect(screen.getByTestId("pomodoro-cycles")).toHaveValue(4);
    expect(screen.getByTestId("pomodoro-total")).toHaveTextContent("100 min of focus in total");
  });

  it("Stopwatch has no length to choose and Countdown has no rhythm", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<FocusSetup subjects={SUBJECTS} initial={{ ...STANDALONE, subjectId: 1 }} busy={false} error={null} onStart={onStart} />);

    await user.click(screen.getByTestId("mode-stopwatch"));
    expect(screen.queryByTestId("preset-25")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pomodoro-settings")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("start-focus"));
    expect(onStart.mock.calls[0]![0]).toMatchObject({ mode: "stopwatch", plannedMinutes: 240, pomodoro: null });

    await user.click(screen.getByTestId("mode-countdown"));
    expect(screen.queryByTestId("pomodoro-settings")).not.toBeInTheDocument();
    expect(screen.getByTestId("preset-25")).toBeInTheDocument();
  });

  it("clamps a silly custom length when sent", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<FocusSetup subjects={SUBJECTS} initial={{ ...FROM_PLAN }} busy={false} error={null} onStart={onStart} />);
    const custom = screen.getByTestId("custom-minutes");
    await user.clear(custom);
    await user.type(custom, "9999");
    await user.click(screen.getByTestId("start-focus"));
    expect(onStart.mock.calls[0]![0].plannedMinutes).toBe(480);
  });

  it("hands over the chosen sound and block list with the Start press", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<FocusSetup subjects={SUBJECTS} initial={FROM_PLAN} busy={false} error={null} onStart={onStart} />);
    await user.selectOptions(screen.getByTestId("focus-sound"), "rain");
    await user.click(screen.getByTestId("block-discord"));
    await user.click(screen.getByTestId("start-focus"));
    expect(onStart.mock.calls[0]![1]).toEqual({ sound: "rain", blockedApps: ["instagram", "youtube", "whatsapp"] });
  });

  it("shows the notice a CTA attached, and locks the form while busy", () => {
    render(<FocusSetup subjects={SUBJECTS} initial={{ ...FROM_PLAN, notice: "No Prepex questions for this chapter yet" }} busy error="You already have an active focus session." onStart={vi.fn()} />);
    expect(screen.getByTestId("focus-notice")).toHaveTextContent(/no prepex questions/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/already have an active/);
    expect(screen.getByTestId("start-focus")).toBeDisabled();
    expect(screen.getByTestId("focus-subject")).toBeDisabled();
    expect(screen.getByTestId("mode-pomodoro")).toBeDisabled();
  });
});

function fireNumber(el: HTMLElement, value: string) {
  const input = el as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("FocusSummaryModal", () => {
  const base = { open: true, plannedMinutes: 25, interruptions: 2, busy: false, error: null, onKeepGoing: vi.fn(), onSave: vi.fn() };

  it("shows planned vs focused vs distractions", () => {
    render(<FocusSummaryModal {...base} elapsedSeconds={23 * 60} />);
    expect(screen.getByTestId("summary-planned")).toHaveTextContent("25m");
    expect(screen.getByTestId("summary-actual")).toHaveTextContent("23m");
    expect(screen.getByRole("dialog")).toHaveTextContent("2");
  });

  it("defaults 'a win' to yes when most of the plan was focused, and saves that", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<FocusSummaryModal {...base} onSave={onSave} elapsedSeconds={24 * 60} />);
    expect(screen.getByTestId("win-yes")).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByTestId("save-session"));
    expect(onSave).toHaveBeenCalledWith({ wasCompleted: true, moodRating: null });
  });

  it("a session over 6 hours asks keep all or trim; keeping all is the default and sends no trim", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<FocusSummaryModal {...base} onSave={onSave} elapsedSeconds={8 * 3600} />);
    expect(screen.getByTestId("away-for-a-while")).toHaveTextContent("You were away for a while");
    expect(screen.getByTestId("keep-all")).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByTestId("save-session"));
    expect(onSave.mock.calls[0]![0]).not.toHaveProperty("trimToMinutes");
  });

  it("trimming sends the minutes the student says they really studied", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<FocusSummaryModal {...base} onSave={onSave} elapsedSeconds={8 * 3600} />);
    await user.click(screen.getByTestId("trim"));
    await user.type(screen.getByTestId("trim-minutes"), "90");
    await user.click(screen.getByTestId("save-session"));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ trimToMinutes: 90 }));
  });

  it("a normal session never shows the prompt", () => {
    render(<FocusSummaryModal {...base} elapsedSeconds={2 * 3600} />);
    expect(screen.queryByTestId("away-for-a-while")).not.toBeInTheDocument();
  });

  it("defaults to no for a short session, and the student can overrule it", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<FocusSummaryModal {...base} onSave={onSave} elapsedSeconds={5 * 60} />);
    expect(screen.getByTestId("win-no")).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByTestId("win-yes"));
    await user.click(screen.getByTestId("save-session"));
    expect(onSave).toHaveBeenCalledWith({ wasCompleted: true, moodRating: null });
  });

  it("asks how the session was (1–5) and sends the answer; tapping it again takes it back", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<FocusSummaryModal {...base} onSave={onSave} elapsedSeconds={24 * 60} />);
    expect(screen.getAllByRole("radio", { name: /rough|meh|okay|good|great/i })).toHaveLength(5);
    await user.click(screen.getByTestId("mood-4"));
    await user.click(screen.getByTestId("save-session"));
    expect(onSave).toHaveBeenLastCalledWith({ wasCompleted: true, moodRating: 4 });
    await user.click(screen.getByTestId("mood-4"));
    await user.click(screen.getByTestId("save-session"));
    expect(onSave).toHaveBeenLastCalledWith({ wasCompleted: true, moodRating: null });
  });

  it("only a revision session asks how well it is remembered", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const { rerender } = render(<FocusSummaryModal {...base} taskType="lecture" onSave={onSave} elapsedSeconds={24 * 60} />);
    expect(screen.queryByTestId("revision-confidence")).not.toBeInTheDocument();
    expect(screen.queryByTestId("practice-sheet")).not.toBeInTheDocument();

    rerender(<FocusSummaryModal {...base} taskType="revision" onSave={onSave} elapsedSeconds={24 * 60} />);
    await user.click(screen.getByTestId("conf-5"));
    await user.click(screen.getByTestId("save-session"));
    expect(onSave).toHaveBeenLastCalledWith({ wasCompleted: true, moodRating: null, confidenceRating: 5 });
  });

  it("a practice session logs the sheet: skipped is worked out, wrong answers go with it", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<FocusSummaryModal {...base} taskType="practice" originSource="practice_own_content_fallback" onSave={onSave} elapsedSeconds={24 * 60} />);

    expect(screen.getByTestId("sheet-source")).toHaveValue("own_notebook"); // own-content practice defaults to the student's own source
    await user.type(screen.getByTestId("sheet-attempted"), "10");
    await user.type(screen.getByTestId("sheet-correct"), "6");
    await user.type(screen.getByTestId("sheet-wrong"), "3");
    await user.selectOptions(screen.getByTestId("sheet-source"), "hcv");
    await user.type(screen.getByTestId("sheet-wrong-notes"), "Q3 sign error{enter}  {enter}Q7 formula");
    await user.click(screen.getByTestId("save-session"));

    expect(onSave).toHaveBeenCalledWith({
      wasCompleted: true,
      moodRating: null,
      practice: { source: "hcv", questionsAttempted: 10, questionsCorrect: 6, questionsWrong: 3, questionsSkipped: 1, wrongQuestions: ["Q3 sign error", "Q7 formula"] },
    });
    expect(localStorage.getItem("prepex.focus.lastPracticeSource")).toBe("hcv");
  });

  it("an empty sheet sends nothing; an impossible one cannot be saved", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<FocusSummaryModal {...base} taskType="practice" onSave={onSave} elapsedSeconds={24 * 60} />);
    await user.click(screen.getByTestId("save-session"));
    expect(onSave).toHaveBeenLastCalledWith({ wasCompleted: true, moodRating: null });

    await user.type(screen.getByTestId("sheet-attempted"), "5");
    await user.type(screen.getByTestId("sheet-correct"), "4");
    await user.type(screen.getByTestId("sheet-wrong"), "3");
    expect(screen.getByTestId("sheet-problem")).toHaveTextContent(/can't add up to more than/i);
    expect(screen.getByTestId("save-session")).toBeDisabled();
  });

  it("says when no chapter was chosen, so the practice cannot be filed", async () => {
    const user = userEvent.setup();
    render(<FocusSummaryModal {...base} taskType="practice" hasChapter={false} elapsedSeconds={24 * 60} />);
    expect(screen.queryByTestId("sheet-no-chapter")).not.toBeInTheDocument();
    await user.type(screen.getByTestId("sheet-attempted"), "5");
    expect(screen.getByTestId("sheet-no-chapter")).toBeInTheDocument();
  });

  it("'Keep going' closes the summary without saving; saving is locked while busy", async () => {
    const user = userEvent.setup();
    const onKeepGoing = vi.fn();
    const onSave = vi.fn();
    const { rerender } = render(<FocusSummaryModal {...base} onKeepGoing={onKeepGoing} onSave={onSave} elapsedSeconds={600} />);
    await user.click(screen.getByRole("button", { name: /keep going/i }));
    expect(onKeepGoing).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();

    rerender(<FocusSummaryModal {...base} busy error="Couldn't save the session." onKeepGoing={onKeepGoing} onSave={onSave} elapsedSeconds={600} />);
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent(/couldn't save/i);
    expect(screen.getByTestId("save-session")).toBeDisabled();
  });
});

describe("FocusRing", () => {
  it("exposes the clock to assistive technology and shows the caption", () => {
    render(<FocusRing progress={0.4} label="14:59" caption="of 25m" ariaLabel="Physics focus timer. 14:59 left." />);
    expect(screen.getByRole("timer", { name: /14:59 left/ })).toBeInTheDocument();
    expect(screen.getByTestId("focus-clock")).toHaveTextContent("14:59");
    expect(screen.getByText("of 25m")).toBeInTheDocument();
  });
});

describe("ModeTabs", () => {
  it("is a three-way segmented control", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModeTabs value="pomodoro" onChange={onChange} />);
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["Pomodoro", "Stopwatch", "Countdown"]);
    expect(screen.getByTestId("mode-pomodoro")).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByTestId("mode-countdown"));
    expect(onChange).toHaveBeenCalledWith("countdown");
  });
});

const STREAK: StreakInfo = { current: 5, longest: 9, shieldAvailable: true, todayCounts: false, minutesToCount: 12, todayMinutes: 18 };

describe("StreakChip", () => {
  it("shows the streak and the shield", () => {
    render(<StreakChip streak={STREAK} />);
    expect(screen.getByTestId("streak-days")).toHaveTextContent("5 days");
    expect(screen.getByTestId("streak-shield")).toHaveTextContent("Shield ready");
  });

  it("a spent shield and a day that already counts", () => {
    render(<StreakChip streak={{ ...STREAK, current: 1, shieldAvailable: false, todayCounts: true, minutesToCount: 0 }} />);
    expect(screen.getByTestId("streak-days")).toHaveTextContent("1 day");
    expect(screen.getByTestId("streak-shield")).toHaveTextContent("Shield used");
    expect(screen.getByLabelText("Today counts")).toBeInTheDocument();
  });

  it("renders nothing before the numbers arrive", () => {
    const { container } = render(<StreakChip streak={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("goalStripFor (weekly goal countdown)", () => {
  const goal = (over: Partial<Goal> = {}): Goal => ({
    id: "g1",
    weekStart: "2026-10-05",
    subjectId: 1,
    chapterId: null,
    topic: null,
    type: "HOURS",
    target: 10,
    unit: "HOURS",
    status: "ACTIVE",
    source: "STUDENT",
    progressSelfReport: 0,
    carriedFromGoalId: null,
    progress: { current: 3, target: 10, unit: "HOURS", percent: 30, complete: false },
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
    ...over,
  });

  it("counts down the hours still to go on the subject", () => {
    expect(goalStripFor([goal()], 1, null, "Physics")).toEqual({ goalId: "g1", leftMinutes: 420, text: "7h left this week on Physics" });
  });

  it("prefers a goal on the chapter, then the subject, then a goal for everything", () => {
    const chapter = goal({ id: "c", chapterId: KIN, target: 4, progress: { current: 1.5, target: 4, unit: "HOURS", percent: 38, complete: false } });
    const all = goal({ id: "all", subjectId: null });
    expect(goalStripFor([goal(), chapter], 1, KIN, "Physics")?.goalId).toBe("c");
    expect(goalStripFor([chapter, goal()], 1, LAWS, "Physics")?.goalId).toBe("g1");
    expect(goalStripFor([all], 2, null, "Chemistry")).toMatchObject({ goalId: "all", text: "7h left this week on your study goal" });
  });

  it("minutes goals, and nothing when there is nothing to count down", () => {
    const mins = goal({ unit: "MINUTES", target: 300, progress: { current: 90, target: 300, unit: "MINUTES", percent: 30, complete: false } });
    expect(goalStripFor([mins], 1, null, "Physics")?.text).toBe("3h 30m left this week on Physics");
    expect(goalStripFor([goal({ status: "DONE" })], 1, null, "Physics")).toBeNull();
    expect(goalStripFor([goal({ type: "QUESTIONS" })], 1, null, "Physics")).toBeNull();
    expect(goalStripFor([goal()], null, null, null)).toBeNull();
    expect(goalStripFor([goal({ progress: { current: 10, target: 10, unit: "HOURS", percent: 100, complete: true } })], 1, null, "Physics")).toBeNull();
  });
});

describe("AwayNag (the web stand-in for app blocking)", () => {
  it("says how long the student was away and which apps are on the list", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<AwayNag awayMs={72_000} blocked={["instagram", "youtube"]} onBack={onBack} />);
    expect(screen.getByRole("alertdialog")).toHaveTextContent("You were away for 1m 12s.");
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Instagram, YouTube are on your block list");
    await user.click(screen.getByTestId("away-back"));
    expect(onBack).toHaveBeenCalled();
  });
});

function result(over: Partial<StopFocusResult["completion"]> = {}, taskType: StopFocusResult["focusSession"]["taskType"] = "self_study", wasCompleted = true): StopFocusResult {
  return {
    focusSession: {
      id: "s1",
      subjectId: 1,
      chapterId: KIN,
      topic: null,
      plannedMinutes: 60,
      startedAt: "2026-10-07T06:00:00.000Z",
      pausedAt: null,
      pausedSeconds: 0,
      endedAt: "2026-10-07T07:00:00.000Z",
      actualMinutes: 60,
      wasCompleted,
      interruptionCount: 0,
      deepFocusMode: false,
      notes: null,
      originSource: "planner",
      originId: "t1",
      taskType,
      mode: "countdown",
      pomodoro: null,
      moodRating: null,
      confidenceRating: null,
      status: "ENDED",
      elapsedSeconds: 3600,
    },
    studySession: { id: "x", subjectId: 1, chapterId: KIN, topic: null, durationMinutes: 60, loggedAt: "2026-10-07T06:00:00.000Z", notes: null, source: "focus_mode", focusSessionId: "s1", createdAt: "2026-10-07T07:00:00.000Z" },
    completion: {
      logsWritten: ["study_session"],
      practiceLogId: null,
      revisionLogId: null,
      mockReviewLogId: null,
      mistakesCreated: 0,
      mistakesSkipped: 0,
      origin: { source: "planner", id: "t1", updated: null, status: null, progressPercent: null },
      revision: null,
      chapter: null,
      notes: [],
      ...over,
    },
    extras: { goalHits: [], needsCheckIn: false, streak: STREAK },
  };
}

describe("what the done screen says was saved", () => {
  it("planner task, practice log and mistakes", () => {
    const lines = loggedLines(
      result({ origin: { source: "planner", id: "t1", updated: "plan_task", status: "COMPLETED", progressPercent: null }, practiceLogId: "p1", mistakesCreated: 3 }, "practice"),
    );
    expect(lines).toEqual(["Marked your planner task as done.", "Saved your practice log.", "3 questions were added to your notebooks."]);
    expect(loggedLines(result({ mistakesCreated: 1 }))).toEqual(["1 question was added to your notebooks."]);
  });

  it("revision: the next date in plain words", () => {
    const base = { quality: 5, lapsed: false, intervalDays: 16, easeFactor: 2.6, nextReviewAt: "2026-10-23T00:00:00.000Z" };
    expect(loggedLines(result({ revision: base }, "revision"))).toContain("Your next revision of this chapter is in 16 days.");
    expect(loggedLines(result({ revision: { ...base, intervalDays: 1 } }, "revision"))).toContain("Your next revision of this chapter is in 1 day.");
    expect(loggedLines(result({ revision: { ...base, lapsed: true, intervalDays: 1 } }, "revision"))).toContain("Your next revision of this chapter is tomorrow.");
  });

  it("backlog, goals, mock review, lecture minutes and the notes the server added", () => {
    expect(loggedLines(result({ origin: { source: "backlog_tab", id: "b", updated: "backlog_item", status: "open", progressPercent: 50 } }))).toContain("That backlog item is 50% done.");
    expect(loggedLines(result({ origin: { source: "backlog_tab", id: "b", updated: "backlog_item", status: "cleared", progressPercent: 100 } }))).toContain("Cleared that backlog item.");
    expect(loggedLines(result({ origin: { source: "weekly_goals", id: "g", updated: "weekly_goal", status: "ACTIVE", progressPercent: null } }))).toContain("Counted towards your weekly goal.");
    expect(loggedLines(result({ mockReviewLogId: "m" }, "mock_review"))).toContain("Saved your mock review time.");
    expect(
      loggedLines(result({ chapter: { id: KIN, lectureMinutes: 180, studyMinutes: 0, theoryStatus: "studied" }, notes: ["Pick a chapter next time."] }, "lecture")),
    ).toEqual(["Lecture time on this chapter: 3h.", "This chapter's theory is marked as done.", "Pick a chapter next time."]);
  });
});

describe("SessionDone", () => {
  const handlers = { onAnother: vi.fn(), onShare: vi.fn(), onCheckIn: vi.fn() };
  const props = { subjectName: "Physics", chapterName: "Kinematics", originSource: "planner" as const, shareMessage: null, sharing: false, saving: false, ...handlers };

  it("shows the minutes, what was saved, the streak and the next steps", async () => {
    const user = userEvent.setup();
    render(<SessionDone {...props} result={result({ origin: { source: "planner", id: "t1", updated: "plan_task", status: "COMPLETED", progressPercent: null } })} />);
    expect(screen.getByTestId("focus-done-text")).toHaveTextContent("1h added to your study log.");
    expect(screen.getByTestId("logged-list")).toHaveTextContent("Marked your planner task as done.");
    expect(screen.getByTestId("streak-days")).toHaveTextContent("5 days");
    expect(screen.getByTestId("streak-note")).toHaveTextContent("12 more minutes of focus and today counts towards your streak.");
    await user.click(screen.getByTestId("focus-again"));
    expect(handlers.onAnother).toHaveBeenCalled();
    await user.click(screen.getByTestId("share-session"));
    expect(handlers.onShare).toHaveBeenCalled();
    expect(screen.getByTestId("focus-back")).toHaveAttribute("href", "/home");
  });

  it("celebrates a goal hit and offers the check-in once", async () => {
    const user = userEvent.setup();
    const r = result();
    r.extras = { ...r.extras, goalHits: [{ id: "g", type: "HOURS", target: 5, unit: "HOURS", topic: null }], needsCheckIn: true };
    render(<SessionDone {...props} result={r} />);
    expect(screen.getByTestId("goal-hit")).toHaveTextContent("Goal hit!");
    await user.click(screen.getByRole("button", { name: /check in now/i }));
    expect(handlers.onCheckIn).toHaveBeenCalled();
  });

  it("while the save is being retried it says so and keeps the answers on the device", () => {
    render(<SessionDone {...props} result={null} saving />);
    expect(screen.getByTestId("focus-saving")).toHaveTextContent("Saving your session");
    expect(screen.getByTestId("focus-saving")).toHaveTextContent("Session not fully saved. Retrying");
    expect(screen.queryByTestId("focus-again")).not.toBeInTheDocument();
  });

  it("a session under a minute says nothing was added", () => {
    const r = result();
    r.studySession = null;
    render(<SessionDone {...props} result={r} />);
    expect(screen.getByTestId("focus-done-text")).toHaveTextContent("under a minute");
    expect(screen.getByTestId("share-session")).toBeDisabled();
  });
});
