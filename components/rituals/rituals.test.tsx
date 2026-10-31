// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Heartbeat, HEARTBEAT_EVERY_MS } from "@/components/rewards/Heartbeat";
import { visibleBadges } from "@/components/rewards/ProfileRewards";
import { UndoBar } from "@/components/planner/TickFeedback";
import { CoverageChips } from "@/components/rituals/CoverageChips";
import { DayCloseFlow } from "@/components/rituals/DayCloseFlow";
import { QuickLogFab, isTypingTarget } from "@/components/rituals/QuickLogFab";
import { intensity } from "@/components/focus/SessionWrap";
import type { DayCloseReward, DayCloseState } from "@/lib/api/rituals";
import type { BadgeInfo, XpSummary } from "@/lib/api/xp";
import { canBacklog, defaultChoices, gapLine, movedLine, summaryLine, toDecisions } from "@/lib/rituals/dayClose";
import { goalLabel, historyLine } from "@/lib/rituals/review";
import { readLast, writeLast } from "@/lib/quicklog/last";
import { diffXp, emitReward, onReward, primeXp, refreshXp, resetRewardState, type RewardEvent } from "@/lib/rewards/events";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/home" }));
vi.mock("@/lib/api/xp", async (orig) => ({ ...(await orig<typeof import("@/lib/api/xp")>()), getXpSummary: vi.fn(), getRewards: vi.fn(), markBadgesSeen: vi.fn(), sendHeartbeat: vi.fn() }));
vi.mock("@/lib/api/rituals", async (orig) => ({ ...(await orig<typeof import("@/lib/api/rituals")>()), completeDayClose: vi.fn(), getPendingCoverage: vi.fn(), submitCoverage: vi.fn() }));
vi.mock("@/lib/api/studyLog", () => ({ createStudySession: vi.fn() }));
vi.mock("@/lib/api/plannerV2", async (orig) => ({ ...(await orig<typeof import("@/lib/api/plannerV2")>()), getPlanDay: vi.fn() }));
vi.mock("@/components/study/useSubjects", () => ({
  useSubjects: () => ({ status: "ready", lookup: {}, subjects: [{ subjectId: 1, subjectName: "Physics", chapters: [{ id: "c1", name: "Kinematics", sequenceOrder: 1 }] }] }),
}));
vi.mock("@/lib/syllabus/chapterIndex", () => ({
  loadChapterIndex: vi.fn(async () => new Map([["c1", { id: "c1", name: "Kinematics", subjectId: 1, theory: "learning" }], ["c2", { id: "c2", name: "Laws of Motion", subjectId: 1, theory: "not_started" }]])),
}));
import { completeDayClose, submitCoverage } from "@/lib/api/rituals";
import { getPlanDay } from "@/lib/api/plannerV2";
import { createStudySession } from "@/lib/api/studyLog";
import { getRewards, getXpSummary, markBadgesSeen, sendHeartbeat } from "@/lib/api/xp";

const xp = (over: Partial<XpSummary> = {}): XpSummary => ({ level: 1, title: "Aspirant", totalXp: 100, currentThreshold: 0, nextThreshold: 250, progressPct: 40, todayXp: 40, monthXp: 100, todayMinutes: 60, todayStudyMinutes: 60, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  resetRewardState();
  localStorage.clear();
});

describe("reward events", () => {
  it("diffs two summaries: gained XP and a level change", () => {
    expect(diffXp(null, xp())).toEqual({ amount: 0, leveledUp: false });
    expect(diffXp(xp({ totalXp: 100 }), xp({ totalXp: 130 }))).toEqual({ amount: 30, leveledUp: false });
    expect(diffXp(xp({ totalXp: 240, level: 1 }), xp({ totalXp: 260, level: 2 }))).toEqual({ amount: 20, leveledUp: true });
  });

  it("refreshXp reports only what is new: an xp event, then level-up and new badges", async () => {
    const seen: RewardEvent[] = [];
    const off = onReward((e) => seen.push(e));
    primeXp(xp({ totalXp: 240, level: 1 }));
    vi.mocked(getXpSummary).mockResolvedValue(xp({ totalXp: 270, level: 2, title: "Aspirant" }));
    vi.mocked(getRewards).mockResolvedValue({ lifetime: { questions: 0, hours: 0, chaptersCompleted: 0 }, badges: [{ key: "streak_7", title: "7 Day Streak", description: "Study 7 days in a row.", hidden: false, earned: true, earnedAt: null, seen: false }], unseen: ["streak_7"], records: [], brokenRecords: [{ kind: "most_questions_day", value: 80, previous: 60 }] });
    vi.mocked(markBadgesSeen).mockResolvedValue({ marked: 1 });

    expect(await refreshXp()).toBe(30);
    off();
    expect(seen.map((e) => e.type)).toEqual(["xp", "level_up", "badges", "record"]);
    expect(markBadgesSeen).toHaveBeenCalledWith(["streak_7"]);
  });

  it("emits nothing the first time (nothing to compare with) and never throws when the API fails", async () => {
    const seen: RewardEvent[] = [];
    const off = onReward((e) => seen.push(e));
    vi.mocked(getXpSummary).mockResolvedValueOnce(xp());
    expect(await refreshXp()).toBe(0);
    vi.mocked(getXpSummary).mockRejectedValueOnce(new Error("offline"));
    expect(await refreshXp()).toBe(0);
    off();
    expect(seen).toEqual([]);
  });

  it("a broken listener does not stop the others", () => {
    const got = vi.fn();
    const a = onReward(() => {
      throw new Error("boom");
    });
    const b = onReward(got);
    emitReward({ type: "xp", amount: 5, total: 5 });
    a();
    b();
    expect(got).toHaveBeenCalledOnce();
  });
});

describe("heartbeat", () => {
  afterEach(() => vi.useRealTimers());

  it("reports visible time every 30 seconds and nothing while the tab is hidden", async () => {
    vi.useFakeTimers();
    vi.mocked(sendHeartbeat).mockResolvedValue({ activeSeconds: 30, countsToday: false, thresholdSeconds: 120 });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    render(<Heartbeat />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_EVERY_MS);
    });
    expect(sendHeartbeat).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendHeartbeat).mock.calls[0]![0]).toBe(30);

    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(HEARTBEAT_EVERY_MS * 3);
    });
    expect(sendHeartbeat).toHaveBeenCalledTimes(1);
  });
});

describe("Day Close", () => {
  const state: DayCloseState = {
    date: "2026-10-08",
    status: "ready",
    triggerMinute: 1335,
    triggerReason: "after_last_block",
    summary: { minutes: 190, tasksDone: 4, tasksTotal: 6, questions: 42, revisions: 1 },
    unfinished: [
      { id: "t1", title: "Kinematics lecture", subjectId: 1, chapterId: "c1", taskType: "NEW_LEARNING" },
      { id: "t2", title: "Custom reading", subjectId: null, chapterId: null, taskType: "CUSTOM" },
    ],
    coverage: [],
  };
  const reward: DayCloseReward = { alreadyClosed: false, xpEarned: 85, xp: xp({ todayStudyMinutes: 190 }), streak: { current: 12, countsToday: true }, rankToday: { xp: 85, rank: 8, total: 40, gapToNext: 38 }, rankMonth: { xp: 600, rank: 3, total: 40, gapToNext: 12 }, moved: { tomorrow: 1, backlog: 0, dropped: 1, failed: [] } };

  it("pure helpers: default choice, backlog needs a chapter, wording", () => {
    expect(defaultChoices(state.unfinished)).toEqual({ t1: "tomorrow", t2: "tomorrow" });
    expect(canBacklog(state.unfinished[0]!)).toBe(true);
    expect(canBacklog(state.unfinished[1]!)).toBe(false);
    expect(toDecisions({ t1: "backlog" })).toEqual([{ taskId: "t1", action: "backlog" }]);
    expect(summaryLine(state.summary)).toBe("3h 10m · 4 of 6 tasks · 42 questions · 1 revision");
    expect(gapLine(reward.rankToday)).toBe("38 XP behind #7");
    expect(gapLine({ xp: 0, rank: null, total: 3, gapToNext: null })).toBeNull();
    expect(gapLine({ xp: 9, rank: 1, total: 3, gapToNext: null })).toBe("You are first");
    expect(movedLine(reward.moved)).toBe("1 to tomorrow, 1 dropped");
  });

  it("sends the choices, the mood and the win, and then shows XP, streak and where the student stands", async () => {
    vi.mocked(completeDayClose).mockResolvedValue(reward);
    vi.mocked(getXpSummary).mockResolvedValue(xp());
    const onDone = vi.fn();
    render(<DayCloseFlow state={state} open onClose={vi.fn()} onDone={onDone} />);

    expect(screen.getByTestId("day-summary")).toHaveTextContent("3h 10m");
    // a task with no chapter cannot go to the backlog
    const backlogButtons = screen.getAllByTestId("choice-backlog");
    expect(backlogButtons[0]).toBeEnabled();
    expect(backlogButtons[1]).toBeDisabled();

    await userEvent.click(backlogButtons[0]!);
    await userEvent.click(screen.getAllByTestId("choice-drop")[1]!);
    await userEvent.click(screen.getByTestId("mood-4"));
    await userEvent.type(screen.getByTestId("day-win"), "Finished kinematics");
    await userEvent.click(screen.getByTestId("day-close-submit"));

    expect(completeDayClose).toHaveBeenCalledWith({ decisions: [{ taskId: "t1", action: "backlog" }, { taskId: "t2", action: "drop" }], mood: 4, win: "Finished kinematics" });
    await waitFor(() => expect(screen.getByTestId("day-close-reward")).toBeInTheDocument());
    expect(screen.getByTestId("rank-today")).toHaveTextContent("#8");
    expect(screen.getByText("38 XP behind #7")).toBeInTheDocument();
    expect(screen.getByTestId("rank-month")).toHaveTextContent("#3");
    expect(screen.getByTestId("reward-streak")).toHaveTextContent("12 day streak");
    expect(screen.getByTestId("reward-moved")).toHaveTextContent("1 to tomorrow, 1 dropped");
  });

  it("shows the server's message when closing fails and keeps the sheet open", async () => {
    vi.mocked(completeDayClose).mockRejectedValue(new Error("x"));
    render(<DayCloseFlow state={state} open onClose={vi.fn()} onDone={vi.fn()} />);
    await userEvent.click(screen.getByTestId("day-close-submit"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't close your day");
    expect(screen.getByTestId("day-close-flow")).toBeInTheDocument();
  });
});

describe("what did class cover?", () => {
  it("one tap on a chapter chip picks it, with the optional lecture number", async () => {
    const onPick = vi.fn();
    render(<CoverageChips title="What did Allen cover?" chapterIds={["c1", "c2", "missing"]} onPick={onPick} onSkip={vi.fn()} />);
    const chips = await screen.findAllByTestId("coverage-chip");
    expect(chips.map((c) => c.textContent)).toEqual(["Kinematics", "Laws of Motion"]);
    await userEvent.type(screen.getByTestId("coverage-lecture"), "7");
    await userEvent.click(chips[1]!);
    expect(onPick).toHaveBeenCalledWith({ chapterId: "c2", lectureNumber: 7 });
  });

  it("no lecture number means null", async () => {
    const onPick = vi.fn();
    render(<CoverageChips title="x" chapterIds={["c1"]} onPick={onPick} />);
    await userEvent.click((await screen.findAllByTestId("coverage-chip"))[0]!);
    expect(onPick).toHaveBeenCalledWith({ chapterId: "c1", lectureNumber: null });
  });
});

describe("Quick Log", () => {
  beforeEach(() => {
    vi.mocked(getPlanDay).mockResolvedValue({ success: true, data: { tasks: [] } } as never);
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: q.includes("min-width"), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as never;
  });

  it("the L key opens it on a desktop, but not while typing", async () => {
    render(
      <div>
        <input aria-label="notes" />
        <QuickLogFab />
      </div>,
    );
    await userEvent.type(screen.getByLabelText("notes"), "l");
    expect(screen.queryByTestId("quick-log-hub")).not.toBeInTheDocument();
    await userEvent.click(document.body);
    await userEvent.keyboard("l");
    expect(await screen.findByTestId("quick-log-hub")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^quick-(studied|questions|revised|mock|mistake|class)$/)).toHaveLength(6);
  });

  it("Studied is three taps: open, a minute preset, save; and the subject is remembered for next time", async () => {
    writeLast({ subjectId: 1, chapterId: "c1" });
    vi.mocked(createStudySession).mockResolvedValue({ success: true, data: {} } as never);
    vi.mocked(getXpSummary).mockResolvedValue(xp());
    render(<QuickLogFab />);
    await userEvent.click(screen.getByTestId("quick-log-fab"));
    await userEvent.click(await screen.findByTestId("quick-studied"));
    await userEvent.click(screen.getByTestId("minutes-45"));
    await userEvent.click(screen.getByTestId("quick-save"));
    await waitFor(() => expect(createStudySession).toHaveBeenCalledWith({ subjectId: 1, chapterId: "c1", durationMinutes: 45 }));
    expect(readLast()).toEqual({ subjectId: 1, chapterId: "c1" });
  });

  it("Mistake opens the existing mistake form with the subject and chapter filled", async () => {
    writeLast({ subjectId: 1, chapterId: "c1" });
    render(<QuickLogFab />);
    await userEvent.click(screen.getByTestId("quick-log-fab"));
    await userEvent.click(await screen.findByTestId("quick-mistake"));
    expect(push).toHaveBeenCalledWith("/mistakes?new=1&subject=1&chapter=c1");
  });

  it("Coaching class files the chapter against a once-a-day-per-subject key", async () => {
    writeLast({ subjectId: 1, chapterId: null });
    vi.mocked(submitCoverage).mockResolvedValue({ saved: true, chapterMoved: true });
    vi.mocked(getXpSummary).mockResolvedValue(xp());
    render(<QuickLogFab />);
    await userEvent.click(screen.getByTestId("quick-log-fab"));
    await userEvent.click(await screen.findByTestId("quick-class"));
    await userEvent.click((await screen.findAllByTestId("quick-class-chip"))[0]!);
    await waitFor(() => expect(submitCoverage).toHaveBeenCalled());
    expect(vi.mocked(submitCoverage).mock.calls[0]![0]).toMatchObject({ chapterId: "c1", blockKey: expect.stringMatching(/^manual:\d{4}-\d{2}-\d{2}:1$/) });
  });

  it("knows what counts as typing", () => {
    expect(isTypingTarget(document.createElement("input"))).toBe(true);
    expect(isTypingTarget(document.createElement("select"))).toBe(true);
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe("undo bar", () => {
  afterEach(() => vi.useRealTimers());

  it("counts down 5 seconds, offers Undo, and expires on its own", async () => {
    vi.useFakeTimers();
    const onUndo = vi.fn();
    const onExpire = vi.fn();
    render(<UndoBar title="Revise Mole Concept" onUndo={onUndo} onExpire={onExpire} />);
    expect(screen.getByTestId("undo-button")).toHaveTextContent("Undo (5)");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(onExpire).toHaveBeenCalled();
  });

  it("calls onUndo when tapped, with no confirmation step", async () => {
    const onUndo = vi.fn();
    render(<UndoBar title="x" onUndo={onUndo} onExpire={vi.fn()} />);
    await userEvent.click(screen.getByTestId("undo-button"));
    expect(onUndo).toHaveBeenCalledOnce();
  });
});

describe("review and rewards wording", () => {
  it("goal labels and history lines", () => {
    expect(goalLabel({ type: "QUESTIONS", target: 120, unit: "COUNT", origin: "last_week" })).toBe("Solve 120 questions");
    expect(goalLabel({ type: "BACKLOG", target: 1, unit: "COUNT", topic: "Friction", origin: "backlog" })).toBe("Clear a backlog item: Friction");
    const row = { id: "1", weekStart: "2026-10-05", completedAt: null, goalsAccepted: 3, recap: { hours: 21.5, questions: 310 } };
    expect(historyLine({ ...row, source: "sunday_review" })).toBe("21.5h · 310 questions · 3 goals set");
    expect(historyLine({ ...row, source: "win_journal", recap: { heroTitle: "A strong week", tasksCompleted: 18 } })).toBe("A strong week · 18 tasks");
  });

  it("hidden badges stay hidden until earned, and chapter badges are summarised", () => {
    const b = (key: string, over: Partial<BadgeInfo> = {}): BadgeInfo => ({ key, title: key, description: "d", hidden: false, earned: false, earnedAt: null, seen: true, ...over });
    const out = visibleBadges([b("deep_diver", { hidden: true }), b("comeback", { hidden: true, earned: true, title: "Comeback" }), b("streak_7", { earned: true }), b("chapter_mastered:a", { earned: true }), b("chapter_mastered:b", { earned: true })]);
    expect(out.find((x) => x.key === "deep_diver")).toMatchObject({ title: "Hidden badge", earned: false });
    expect(out.find((x) => x.key === "comeback")).toMatchObject({ title: "Comeback", earned: true });
    expect(out.find((x) => x.key === "chapter_mastered")?.title).toBe("Chapter Mastered x2");
  });

  it("today's tile intensity steps with the minutes studied", () => {
    expect([0, 20, 90, 200, 400].map(intensity)).toEqual([0, 1, 2, 3, 4]);
  });
});
