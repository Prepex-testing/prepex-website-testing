// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BacklogHub, fixLabel } from "@/components/logs/BacklogHub";
import { BacklogIntake } from "@/components/logs/BacklogIntake";
import { WelcomeBack } from "@/components/home/WelcomeBack";
import type { BacklogHub as Hub, HubItem, Feasibility } from "@/lib/api/backlogHub";
import { estimateMinutes, hm } from "@/lib/api/backlogHub";

vi.mock("@/lib/api/backlogHub", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/backlogHub")>()),
  getFeasibility: vi.fn(),
  applyBacklogFix: vi.fn(),
  setBacklogLane: vi.fn(),
  setBacklogTarget: vi.fn(),
  intakeBacklog: vi.fn(),
  getWelcomeBack: vi.fn(),
  completeWelcomeBack: vi.fn(),
  dismissWelcomeBack: vi.fn(),
}));
vi.mock("@/components/study/useSubjects", () => ({
  useSubjects: () => ({ status: "ready", subjects: [{ subjectId: 1, subjectName: "Physics", chapters: [{ id: "c1", name: "Kinematics", sequenceOrder: 1 }, { id: "c2", name: "Laws of Motion", sequenceOrder: 2 }] }], lookup: {} }),
}));
vi.mock("@/lib/syllabus/chapterIndex", () => ({
  loadChapterIndex: vi.fn(async () => new Map([["c1", { id: "c1", name: "Kinematics", subjectId: 1, theory: "learning" }], ["c2", { id: "c2", name: "Laws of Motion", subjectId: 1, theory: "not_started" }]])),
}));
import { applyBacklogFix, completeWelcomeBack, dismissWelcomeBack, getFeasibility, getWelcomeBack, intakeBacklog, setBacklogLane, setBacklogTarget } from "@/lib/api/backlogHub";

const item = (over: Partial<HubItem>): HubItem => ({
  id: "i1", subjectId: 1, chapterId: "c1", name: "Rotational Motion", subject: "Physics", lane: "must", laneReason: "High weightage: full lectures and DPP.", laneManual: false,
  parts: { lectures: 4, dpps: 1, questions: 0, tests: 0 }, minutes: 300, fullMinutes: 300, progressPercent: 0, deadline: null, isPrerequisite: false, weightage: 3, addedOn: "2026-11-01", ...over,
});
const feas = (over: Partial<Feasibility> = {}): Feasibility => ({ requiredMinutes: 1200, availableMinutes: 600, meter: "red", feasible: false, fixes: [{ kind: "smart_path", itemIds: ["i1"], hoursSaved: 3.1, feasibleAfter: true }, { kind: "move_date", date: "2026-11-20" }], ...over });
const hub = (over: Partial<Hub> = {}): Hub => ({
  today: "2026-11-02", daysToExam: 154, pace: { source: "default", questionMin: 3, lectureMin: 60, dppMin: 75, testMin: 60 }, totalMinutes: 540, parkedMinutes: 120,
  lanes: { must: { count: 1, minutes: 300 }, smart: { count: 1, minutes: 240 }, later: { count: 1, minutes: 120 } },
  items: [item({}), item({ id: "i2", name: "Optics", lane: "smart", minutes: 240, fullMinutes: 600, laneReason: "Medium weightage: one lecture, short notes and PYQs, about 38% of the full time." }), item({ id: "i3", name: "Waves", lane: "later", minutes: 120, fullMinutes: 120, laneReason: "Low weightage and the exam is under 90 days away, so this waits until your high-value work is done." })],
  target: { date: null, feasibility: null }, projectedClearDate: null,
  burndown: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ date: `2026-09-${10 + i}`, minutes: 900 - i * 50 })),
  weekly: [{ weekStart: "2026-10-12", added: 1, cleared: 0, addedMinutes: 120, clearedMinutes: 0 }, { weekStart: "2026-10-19", added: 0, cleared: 1, addedMinutes: 0, clearedMinutes: 60 }, { weekStart: "2026-10-26", added: 2, cleared: 1, addedMinutes: 200, clearedMinutes: 90 }, { weekStart: "2026-11-02", added: 2, cleared: 0, addedMinutes: 240, clearedMinutes: 0 }],
  grewThisWeek: true, todayQuotaMinutes: 90, ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("Backlog hub", () => {
  it("shows the total, the lanes with their reasons, today's quota and the honest note when the list grew", () => {
    render(<BacklogHub hub={hub()} onChanged={vi.fn()} />);
    expect(screen.getByTestId("hub-total-hours")).toHaveTextContent("9h");
    expect(screen.getByTestId("hub-total")).toHaveTextContent("2h parked for later");
    expect(screen.getByTestId("hub-quota")).toHaveTextContent("1h 30m");
    expect(screen.getByTestId("lane-head-must")).toHaveTextContent("Must recover (1)");
    expect(screen.getByTestId("lane-head-smart")).toHaveTextContent("Smart path (1)");
    expect(screen.getByTestId("lane-reason")).toHaveTextContent("High weightage");
    expect(screen.getByTestId("burndown")).toBeInTheDocument();
    expect(screen.getAllByTestId("hub-week")).toHaveLength(4);
    expect(screen.getByTestId("grew-note")).toHaveTextContent("The list grew this week");
    expect(screen.getByTestId("grew-note").textContent).not.toMatch(/overdue|behind|debt|guilt/i);
  });

  it("an empty backlog is calm, with no meter and no chart", () => {
    render(<BacklogHub hub={hub({ items: [], totalMinutes: 0, parkedMinutes: 0, lanes: { must: { count: 0, minutes: 0 }, smart: { count: 0, minutes: 0 }, later: { count: 0, minutes: 0 } }, weekly: [], grewThisWeek: false, todayQuotaMinutes: 0 })} onChanged={vi.fn()} />);
    expect(screen.getByTestId("hub-total")).toHaveTextContent("Nothing on your backlog.");
    expect(screen.queryByTestId("hub-target")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hub-burndown")).not.toBeInTheDocument();
  });

  it("opens a lane to show its items and lets the student move one to another lane or back to automatic", async () => {
    vi.mocked(setBacklogLane).mockResolvedValue({ lane: "smart", reason: "You chose this lane." });
    const onChanged = vi.fn();
    render(<BacklogHub hub={hub({ items: [item({ laneManual: true })] })} onChanged={onChanged} />);
    await userEvent.click(within(screen.getByTestId("hub-item")).getByTestId("lane-smart"));
    expect(setBacklogLane).toHaveBeenCalledWith("i1", "smart");
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    await userEvent.click(screen.getByTestId("lane-auto"));
    expect(setBacklogLane).toHaveBeenLastCalledWith("i1", null);
  });

  it("has no projected clear date until a target date exists", () => {
    render(<BacklogHub hub={hub()} onChanged={vi.fn()} />);
    expect(screen.queryByTestId("projected")).not.toBeInTheDocument();
    expect(screen.getByText(/With no date, your plan paces the backlog/)).toBeInTheDocument();
  });

  it("a target date shows the feasibility meter with one-tap fixes, and a fix is applied", async () => {
    vi.mocked(getFeasibility).mockResolvedValue(feas());
    vi.mocked(applyBacklogFix).mockResolvedValue({});
    const onChanged = vi.fn();
    render(<BacklogHub hub={hub({ target: { date: null, feasibility: null } })} onChanged={onChanged} />);
    await userEvent.type(screen.getByTestId("target-input"), "2026-11-10");
    expect(await screen.findByTestId("feasibility-text")).toHaveTextContent("Not enough time: 20h of work, 10h of free self-study time before then.");
    expect(screen.getByTestId("fix-smart_path")).toHaveTextContent("Switch 1 chapter to Smart Path (saves 3.1h)");
    expect(screen.getByTestId("fix-move_date")).toHaveTextContent("Move the date to 20 Nov");
    await userEvent.click(screen.getByTestId("fix-smart_path"));
    expect(applyBacklogFix).toHaveBeenCalledWith(expect.objectContaining({ kind: "smart_path" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("shows the projected clear date only when a target exists, and a target can be removed", async () => {
    vi.mocked(setBacklogTarget).mockResolvedValue({ date: null });
    render(<BacklogHub hub={hub({ target: { date: "2026-11-10", feasibility: feas({ requiredMinutes: 300, availableMinutes: 600, meter: "green", feasible: true, fixes: [] }) }, projectedClearDate: "2026-11-06" })} onChanged={vi.fn()} />);
    expect(screen.getByTestId("projected")).toHaveTextContent("clears by 6 Nov");
    expect(screen.getByTestId("feasibility-text")).toHaveTextContent("Comfortable");
    await userEvent.click(screen.getByTestId("target-clear"));
    expect(setBacklogTarget).toHaveBeenCalledWith(null);
  });

  it("words the fixes in plain language and formats hours", () => {
    expect(fixLabel({ kind: "park", itemIds: ["a", "b"], hoursFreed: 2.5, feasibleAfter: true })).toBe("Park 2 low-weightage items for later (frees 2.5h)");
    expect(hm(200)).toBe("3h 20m");
    expect(hm(45)).toBe("45m");
    expect(hm(120)).toBe("2h");
    expect(estimateMinutes({ lectures: 4, dpps: 2, questions: 30, tests: 1 }, { source: "default", questionMin: 3, lectureMin: 60, dppMin: 75, testMin: 60 })).toBe(540);
  });
});

describe("Backlog fast intake", () => {
  const subjects = [{ subjectId: 1, subjectName: "Physics", chapters: [{ id: "c1", name: "Kinematics", sequenceOrder: 1 }] }] as never;
  const pace = { source: "default" as const, questionMin: 3, lectureMin: 60, dppMin: 75, testMin: 60 };

  it("works out the hours as the numbers are typed, then adds the chapter and says which lane and why", async () => {
    vi.mocked(intakeBacklog).mockResolvedValue({ itemId: "n", lane: "smart", reason: "Medium weightage: one lecture, short notes and PYQs, about 38% of the full time.", fullMinutes: 540, laneMinutes: 205, pace, merged: false });
    const onAdded = vi.fn();
    render(<BacklogIntake subjects={subjects} pace={pace} onAdded={onAdded} />);
    expect(screen.getByTestId("intake-estimate")).toHaveTextContent("Say what is left");
    await userEvent.selectOptions(screen.getByLabelText(/Subject/i), "1");
    await userEvent.selectOptions(screen.getByLabelText(/Chapter/i), "c1");
    await userEvent.type(screen.getByTestId("intake-lectures"), "4");
    expect(screen.getByTestId("intake-estimate")).toHaveTextContent("About 4h at typical pace");
    await userEvent.click(screen.getByTestId("intake-submit"));
    expect(intakeBacklog).toHaveBeenCalledWith({ subjectId: 1, chapterId: "c1", lectures: 4, dpps: 0, questions: 0, tests: 0 });
    expect(await screen.findByTestId("intake-done")).toHaveTextContent("3h 25m in Smart path. Medium weightage");
    expect(onAdded).toHaveBeenCalled();
  });

  it("needs a chapter and at least one number", async () => {
    render(<BacklogIntake subjects={subjects} pace={pace} onAdded={vi.fn()} />);
    await userEvent.click(screen.getByTestId("intake-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent("Pick the subject and chapter first.");
    expect(intakeBacklog).not.toHaveBeenCalled();
  });
});

describe("Welcome Back", () => {
  it("is not shown when the student has not been away", async () => {
    vi.mocked(getWelcomeBack).mockResolvedValue({ show: false, inactiveDays: 0, lastActiveOn: null, chapterIds: [] });
    const { container } = render(<WelcomeBack />);
    await waitFor(() => expect(getWelcomeBack).toHaveBeenCalled());
    expect(container.querySelector("[data-testid=welcome-back]")).toBeNull();
  });

  it("one calm screen: the current chapters as chips, an optional backlog, one coral button, no guilt or debt", async () => {
    vi.mocked(getWelcomeBack).mockResolvedValue({ show: true, inactiveDays: 4, lastActiveOn: "2026-10-28", chapterIds: ["c1", "c2"] });
    vi.mocked(completeWelcomeBack).mockResolvedValue({ chaptersUpdated: 1, backlogAdded: 1, planned: true });
    const onDone = vi.fn();
    render(<WelcomeBack onDone={onDone} />);
    const sheet = await screen.findByTestId("welcome-back");
    expect(sheet).toHaveTextContent("Welcome back.");
    expect(sheet).toHaveTextContent("What did you cover while away?");
    expect(sheet.textContent).not.toMatch(/missed|behind|days away|overdue|debt|sorry/i);
    const chips = await screen.findAllByTestId("welcome-chip");
    expect(chips.map((c) => c.textContent)).toEqual(["Kinematics", "Laws of Motion"]);
    expect(sheet.innerHTML.match(/bg-brand-coral/g)?.length).toBe(1);

    await userEvent.click(chips[0]!);
    expect(chips[0]).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByTestId("welcome-backlog-open"));
    await userEvent.selectOptions(screen.getByTestId("welcome-subject"), "1");
    await userEvent.selectOptions(screen.getByTestId("welcome-chapter"), "c2");
    await userEvent.type(screen.getByTestId("welcome-lectures"), "2");
    await userEvent.click(screen.getByTestId("welcome-backlog-add"));
    expect(screen.getByTestId("welcome-backlog-item")).toHaveTextContent("Laws of Motion: 2 lectures");

    await userEvent.click(screen.getByTestId("welcome-build"));
    expect(completeWelcomeBack).toHaveBeenCalledWith({ chapterIds: ["c1"], backlog: [{ subjectId: 1, chapterId: "c2", lectures: 2, dpps: 0, questions: 0, tests: 0 }] });
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(screen.queryByTestId("welcome-back")).not.toBeInTheDocument();
  });

  it("Not now hides it for the day", async () => {
    vi.mocked(getWelcomeBack).mockResolvedValue({ show: true, inactiveDays: 3, lastActiveOn: "2026-10-29", chapterIds: [] });
    vi.mocked(dismissWelcomeBack).mockResolvedValue({ dismissed: true });
    render(<WelcomeBack />);
    expect(await screen.findByTestId("welcome-no-chapters")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("welcome-later"));
    expect(dismissWelcomeBack).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId("welcome-back")).not.toBeInTheDocument());
  });
});
