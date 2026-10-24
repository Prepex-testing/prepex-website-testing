// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuickAccessGrid, tileSubtitles } from "@/components/home/v2/QuickAccessGrid";
import { CheckInStrip, GreetingStrip } from "@/components/home/v2/HomeTopStrips";
import { FocusNextCard, WeeklyProgressStrip } from "@/components/home/v2/HomeInsightRows";
import { TodayPlanCard } from "@/components/home/v2/TodayPlanCard";
import type { usePlanDay } from "@/components/planner/usePlanDay";
import { MOODS } from "@/components/check-in/moods";
import type { PlanDay, PlanTask } from "@/lib/api/plannerV2";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/telemetry/planner", () => ({ trackPlanner: vi.fn() }));
vi.mock("@/lib/focus/startFocusSession", async (orig) => ({ ...(await orig<typeof import("@/lib/focus/startFocusSession")>()), startFocusSession: vi.fn() }));
import { startFocusSession } from "@/lib/focus/startFocusSession";
vi.mock("@/lib/api/mistakes", () => ({ getMistakeStats: vi.fn() }));
vi.mock("@/lib/api/weakness", () => ({ getTop5WeakTopics: vi.fn() }));
vi.mock("@/lib/api/goals", () => ({ getCurrentGoals: vi.fn() }));
vi.mock("@/lib/api/plannerV2", async (orig) => ({ ...(await orig<typeof import("@/lib/api/plannerV2")>()), startPlanTask: vi.fn().mockResolvedValue({}), getPracticeOptions: vi.fn() }));
import { getMistakeStats } from "@/lib/api/mistakes";
import { getTop5WeakTopics } from "@/lib/api/weakness";
import { getCurrentGoals } from "@/lib/api/goals";
import { startPlanTask } from "@/lib/api/plannerV2";

type Plan = ReturnType<typeof usePlanDay>;

const task = (id: string, over: Partial<PlanTask> = {}): PlanTask => ({
  id, planId: "p", kind: "lecture", title: `Task ${id}`, description: null, subjectId: 1, subject: "physics", chapterId: "c1", chapterName: "Kinematics", topic: null,
  startMin: 600, endMin: 660, estimatedMinutes: 60, plannedUnits: 1, questionCount: null, status: "pending", origin: null, contentSource: null, contentSourceLabel: null, generatedBy: "engine",
  fixedSlot: false, weeklyGoalId: null, backlogItemId: null, secondsCompleted: 0, actualMinutes: null, linkedSessionLogId: null, linkedPracticeLogId: null, linkedRevisionLogId: null, linkedMockLogId: null, warning: null,
  ...over,
});

const day = (tasks: PlanTask[], over: Partial<PlanDay> = {}): PlanDay => ({
  date: "2026-10-26", isToday: true, mode: "auto",
  plan: { id: "p", version: 1, generatedBy: "engine", engineVersion: 2, budgetMinutes: 300, warnings: [], polishNotes: [], generatedAt: "" },
  tasks, bands: [], studyBlocks: [], slotSource: "timetable",
  summary: { plannedMinutes: tasks.reduce((s, t) => s + t.estimatedMinutes, 0), doneMinutes: 30, plannedCount: tasks.length, doneCount: 0, percent: 10 },
  regenerate: { kind: "regenerate", used: 0, limit: 5, remaining: 5, resetsAt: "" },
  suggestions: null,
  ...over,
});

const plan = (over: Partial<Plan> = {}): Plan =>
  ({ status: "ready", day: day([]), error: null, building: false, refresh: vi.fn().mockResolvedValue(undefined), build: vi.fn().mockResolvedValue(null), ...over }) as unknown as Plan;

beforeEach(() => vi.clearAllMocks());

describe("GreetingStrip", () => {
  it("greets by name with the date, the streak flame and the exam countdown", () => {
    render(<GreetingStrip greeting="Good Morning" firstName="Aarav" streakCount={6} dateText="Mon, 26 Oct" examCountdown="JEE Main in 80 days" actions={<span>actions</span>} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Good Morning, Aarav");
    expect(screen.getByTestId("home-date")).toHaveTextContent("Mon, 26 Oct");
    expect(screen.getByTestId("home-streak")).toHaveTextContent("6 days");
    expect(screen.getByTestId("home-exam-countdown")).toHaveTextContent("JEE Main in 80 days");
  });
  it("handles a missing streak", () => {
    render(<GreetingStrip greeting="Hello" firstName="there" streakCount={null} dateText="" examCountdown={null} actions={null} />);
    expect(screen.getByTestId("home-streak")).toHaveTextContent("Streak");
  });
});

describe("CheckInStrip", () => {
  it("is five emoji and one tap while today's check-in is not done", async () => {
    const onPick = vi.fn();
    render(<CheckInStrip mood={null} busy={false} onPick={onPick} onChange={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
    await userEvent.click(screen.getByTestId("mood-good"));
    expect(onPick).toHaveBeenCalledWith(MOODS.find((m) => m.id === "good"));
  });
  it("shrinks to today's mood with a Change link once done", async () => {
    const onChange = vi.fn();
    render(<CheckInStrip mood={MOODS[2]!} busy={false} onPick={vi.fn()} onChange={onChange} />);
    expect(screen.getByTestId("checkin-done")).toHaveTextContent("Steady");
    await userEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(onChange).toHaveBeenCalled();
  });
  it("blocks taps while the plan is being adjusted", () => {
    render(<CheckInStrip mood={null} busy onPick={vi.fn()} onChange={vi.fn()} />);
    for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
  });
});

describe("TodayPlanCard", () => {
  it("shows the next three tasks, each with a Start button, and a way to the full plan", async () => {
    const tasks = [task("a", { startMin: 540 }), task("b", { startMin: 600 }), task("c", { startMin: 660 }), task("d", { startMin: 720 }), task("e", { status: "done", startMin: 480 })];
    render(<TodayPlanCard plan={plan({ day: day(tasks) })} />);
    expect(screen.getAllByTestId("plan-task")).toHaveLength(3);
    expect(screen.getAllByTestId("task-cta")).toHaveLength(3);
    expect(screen.getByTestId("see-full-plan")).toHaveTextContent("See full plan (1 more)");
    expect(screen.getByTestId("see-full-plan")).toHaveAttribute("href", "/planner");
    expect(screen.getByTestId("today-plan-summary")).toHaveTextContent("planned • 30m done");
  });

  it("starting a lecture opens the focus timer from the plan task", async () => {
    render(<TodayPlanCard plan={plan({ day: day([task("a")]) })} />);
    await userEvent.click(screen.getByTestId("task-cta"));
    await waitFor(() => expect(startFocusSession).toHaveBeenCalled());
    expect(startFocusSession).toHaveBeenCalledWith({ originSource: "planner", originId: "a", subject: "physics", taskType: undefined, targetMinutes: 60 });
    expect(startPlanTask).toHaveBeenCalledWith("a");
  });

  it("starting a revision is a revision session", async () => {
    render(<TodayPlanCard plan={plan({ day: day([task("r", { kind: "revision" })]) })} />);
    await userEvent.click(screen.getByTestId("task-cta"));
    await waitFor(() => expect(startFocusSession).toHaveBeenCalled());
    expect(vi.mocked(startFocusSession).mock.calls[0]![0]).toMatchObject({ originSource: "planner", originId: "r", taskType: "revision" });
  });

  it("offers 'Build today's plan' when the day is empty, and builds it", async () => {
    const p = plan({ day: day([], { plan: null }) });
    render(<TodayPlanCard plan={p} />);
    expect(screen.getByTestId("today-plan-empty")).toHaveTextContent("No plan for today yet");
    await userEvent.click(screen.getByTestId("today-plan-build"));
    expect(p.build).toHaveBeenCalledWith("SCHEDULED");
  });

  it("says why a build failed without crashing", async () => {
    const p = plan({ day: day([], { plan: null }), build: vi.fn().mockResolvedValue("Couldn't build your plan — tap retry.") });
    render(<TodayPlanCard plan={p} />);
    await userEvent.click(screen.getByTestId("today-plan-build"));
    expect(await screen.findByTestId("today-plan-build-error")).toHaveTextContent("Couldn't build your plan — tap retry.");
  });

  it("in manual mode an empty day asks for a task, not a build", () => {
    render(<TodayPlanCard plan={plan({ day: day([], { mode: "manual", plan: null }) })} />);
    expect(screen.getByTestId("today-plan-add")).toHaveAttribute("href", "/planner");
    expect(screen.queryByTestId("today-plan-build")).toBeNull();
  });

  it("shows a skeleton while loading", () => {
    render(<TodayPlanCard plan={plan({ status: "loading", day: null })} />);
    expect(screen.getByTestId("today-plan-loading")).toBeInTheDocument();
  });

  it("a planner failure shows 'Couldn't build your plan — tap retry' and a working Retry", async () => {
    const p = plan({ status: "error", day: null, error: "boom" });
    render(<TodayPlanCard plan={p} />);
    expect(screen.getByTestId("today-plan-error")).toHaveTextContent("Couldn't build your plan — tap retry.");
    await userEvent.click(screen.getByTestId("today-plan-retry"));
    expect(p.refresh).toHaveBeenCalled();
  });

  it("congratulates when everything is done", () => {
    render(<TodayPlanCard plan={plan({ day: day([task("a", { status: "done" })]) })} />);
    expect(screen.getByTestId("today-plan-alldone")).toBeInTheDocument();
  });
});

describe("QuickAccessGrid", () => {
  it("has the six tiles, each opening its section", async () => {
    vi.mocked(getMistakeStats).mockResolvedValue({ success: true, data: { total: 20, active: 15, mastered: 5, masteredPercent: 25, dueNow: 3, dueNext7Days: 4, reviewedToday: 0, reviewStreak: 0, longestReviewStreak: 0, bySubject: [] } });
    render(<QuickAccessGrid day={day([task("r1", { kind: "revision" }), task("r2", { kind: "revision" }), task("p1", { kind: "practice" })])} />);
    const hrefs = Object.fromEntries(["focus", "practice", "revision", "mistakes", "mocks", "analytics"].map((k) => [k, screen.getByTestId(`tile-${k}`).getAttribute("href")]));
    expect(hrefs).toEqual({ focus: "/focus/start?origin=home_quick_tile", practice: "/practice/sessions", revision: "/home/revision", mistakes: "/home/mistake-notebook", mocks: "/home/mock-analysis", analytics: "/analytics" });
    await waitFor(() => expect(screen.getByTestId("tile-mistakes-subtitle")).toHaveTextContent("15 unresolved"));
    expect(screen.getByTestId("tile-revision-subtitle")).toHaveTextContent("2 due today");
    expect(screen.getByTestId("tile-practice-subtitle")).toHaveTextContent("1 on today's plan");
  });

  it("builds subtitles from live data and falls back when there is none", () => {
    expect(tileSubtitles(null, undefined)).toMatchObject({ focus: "Start a timer", revision: "Nothing due today", mistakes: "Review what went wrong", mocks: "Log and review" });
    expect(tileSubtitles(day([task("m", { kind: "mock", startMin: 14 * 60 })]), null).mocks).toBe("Mock at 2:00 PM");
    expect(tileSubtitles(null, { total: 0, active: 0, mastered: 0, masteredPercent: 0, dueNow: 0, dueNext7Days: 0, reviewedToday: 0, reviewStreak: 0, longestReviewStreak: 0, bySubject: [] }).mistakes).toBe("All clear");
  });
});

describe("WeeklyProgressStrip", () => {
  it("shows the week's completion and links to the goals", async () => {
    vi.mocked(getCurrentGoals).mockResolvedValue({ success: true, data: { weekStart: "", weekEnd: "", isCurrentWeek: true, daysLeft: 3, carryOverCandidates: [], summary: { total: 5, done: 2, percent: 40 }, goals: [{ status: "ACTIVE" }] as never } });
    render(<WeeklyProgressStrip />);
    expect(await screen.findByTestId("weekly-percent")).toHaveTextContent("40%");
    expect(screen.getByRole("link", { name: /View weekly goals/ })).toHaveAttribute("href", "/goals");
  });
  it("asks the student to set goals when there are none", async () => {
    vi.mocked(getCurrentGoals).mockResolvedValue({ success: true, data: { weekStart: "", weekEnd: "", isCurrentWeek: true, daysLeft: 3, carryOverCandidates: [], summary: { total: 0, done: 0, percent: 0 }, goals: [] } });
    render(<WeeklyProgressStrip />);
    expect(await screen.findByTestId("weekly-progress")).toHaveAttribute("data-state", "empty");
  });
});

describe("FocusNextCard", () => {
  it("names the weakest topic", async () => {
    vi.mocked(getTop5WeakTopics).mockResolvedValue({ topics: [{ chapterId: "c", practiceAccuracy: 42.4, chapter: { name: "Rotational Motion", subject: { name: "Physics", code: "PHY" } } }] as never });
    render(<FocusNextCard />);
    expect(await screen.findByTestId("focus-next-card")).toHaveTextContent("Rotational Motion");
    expect(screen.getByTestId("focus-next-card")).toHaveTextContent("42% accuracy");
  });
  it("hides itself when there is nothing to say", async () => {
    vi.mocked(getTop5WeakTopics).mockResolvedValue({ topics: [] });
    render(<FocusNextCard />);
    await waitFor(() => expect(screen.queryByTestId("focus-next-loading")).toBeNull());
    expect(screen.queryByTestId("focus-next-card")).toBeNull();
  });
});
