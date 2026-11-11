// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/home", useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/api/xp", () => ({ onXpSummary: vi.fn(() => () => undefined), getXpSummary: vi.fn(async () => ({})), sendHeartbeat: vi.fn(), RECORD_LABELS: { most_hours_day: { label: "Most hours in a day", unit: "h" } } }));
vi.mock("@/lib/api/pexo", async (orig) => ({ ...(await orig<typeof import("@/lib/api/pexo")>()), getPexoFind: vi.fn(), savePexoFind: vi.fn(), listPexoFinds: vi.fn() }));
const http = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("@/lib/api/authRequest", () => ({ authenticatedRequest: (...a: unknown[]) => http.fn(...a) }));

import { CareNoCompare } from "@/components/pexo/CareNoCompare";
import { endTrigger, FocusDesk, FocusEndPexo } from "@/components/pexo/FocusPexo";
import { GpsPexo, gpsTrigger } from "@/components/pexo/GpsPexo";
import { MyFinds } from "@/components/pexo/MyFinds";
import { PexoLayer } from "@/components/pexo/PexoLayer";
import { pledgeFromGoals } from "@/components/pexo/SundayPexo";
import { getPexoFind, listPexoFinds, savePexoFind, type PexoState } from "@/lib/api/pexo";
import { completePlanTask, undoPlanTask } from "@/lib/api/plannerV2";
import { reviewEntry } from "@/lib/api/notebooks";
import { reactBacklogView, reactCountdown, reactMockLogged, reactStreak, taskDoneTrigger } from "@/lib/pexo/reactions";
import { PEXO_LIBRARY, primePexo, resetPexo, takePexoBatch } from "@/lib/pexo/store";

const TODAY = "2026-11-12";
const on = (over: Partial<PexoState> = {}): PexoState => ({ enabled: true, cohort: "existing", libraryVersion: 1, language: "en", bubbles: "normal", notifications: true, accessories: [], shown: {}, firstVisits: ["planner", "goals", "logs", "analytics", "leaderboard"], marks: {}, today: TODAY, daysSinceSignup: 30, home: null, quests: null, nudge: null, care: { active: false, reason: null, distress: false }, ...over });
const text = (id: string) => PEXO_LIBRARY.lines.find((l) => l.id === id)!.en;
const transient = () => screen.queryByTestId("pexo-transient");

beforeEach(() => {
  resetPexo();
  document.documentElement.setAttribute("data-motion", "reduce");
  http.fn.mockReset();
  vi.mocked(getPexoFind).mockReset();
  vi.mocked(savePexoFind).mockReset();
});
afterEach(cleanup);

describe("which reaction fits (pure)", () => {
  it("planner ticks: a rating, practice accuracy bands, a lecture, plain done", () => {
    expect(taskDoneTrigger({ recall: "hard" })).toEqual({ trigger: "task.rating.hard", context: {} });
    expect(taskDoneTrigger({ practice: { questionsAttempted: 20, questionsCorrect: 16 } })).toEqual({ trigger: "task.done.practice.high", context: { correct: 16, attempted: 20 } });
    expect(taskDoneTrigger({ practice: { questionsAttempted: 20, questionsCorrect: 12 } }).trigger).toBe("task.done.practice.mid");
    expect(taskDoneTrigger({ practice: { questionsAttempted: 20, questionsCorrect: 9 } }).trigger).toBe("task.done.practice.low");
    expect(taskDoneTrigger({ kind: "lecture" }).trigger).toBe("task.done.lecture");
    expect(taskDoneTrigger({ kind: "self_study" }).trigger).toBe("task.done");
  });

  it("session end lines by length; Rank GPS lines by movement; the pledge from the picked goals", () => {
    expect(endTrigger(10)).toBe("focus.end.short");
    expect(endTrigger(25)).toBe("focus.end.long");
    expect(endTrigger(90)).toBe("focus.end.long");
    expect(endTrigger(91)).toBe("focus.end.great");
    expect(gpsTrigger({ state: "ready", change: 2.4 })).toEqual({ trigger: "gps.up", context: { delta: 2.4 } });
    expect(gpsTrigger({ state: "ready", change: -1.25 })).toEqual({ trigger: "gps.down", context: { delta: 1.3 } });
    expect(gpsTrigger({ state: "ready", change: 0, topMove: "Optics" })).toEqual({ trigger: ["gps.move", "gps.ready"], context: { move: "Optics" } });
    expect(gpsTrigger({ state: "locked", change: null, daysLeft: 2 })).toEqual({ trigger: "gps.locked_progress", context: { n: 2 } });
    expect(gpsTrigger({ state: "waiting", change: null })).toBeNull();
    expect(pledgeFromGoals([{ type: "HOURS", unit: "HOURS", target: 10 }, { type: "HOURS", unit: "MINUTES", target: 150 }, { type: "QUESTIONS", unit: "COUNT", target: 120 }, { type: "REVISIONS", unit: "COUNT", target: 3 }])).toEqual({ hours: 13, questions: 120 });
  });
});

describe("reactions show in the one transient bubble", () => {
  it("a planner tick says its line; an undo says its own; nothing when Pexo is off", async () => {
    primePexo(on());
    render(<PexoLayer />);
    http.fn.mockResolvedValueOnce({ success: true, data: { task: { kind: "practice", chapterName: "Optics" }, alreadyDone: false } });
    await act(async () => void (await completePlanTask("t1", { practice: { source: "x", questionsAttempted: 20, questionsCorrect: 17, questionsWrong: 3 } })));
    expect(transient()).toHaveAttribute("data-line", "task.done.practice.high#1");
    expect(screen.getByTestId("pexo-text")).toHaveTextContent("17 out of 20. That's sharp.");
    http.fn.mockResolvedValueOnce({ success: true, data: { task: {}, undone: true } });
    await act(async () => void (await undoPlanTask("t1")));
    expect(transient()).toHaveAttribute("data-line", "task.undo#1");
    // an already-done tick says nothing new
    http.fn.mockResolvedValueOnce({ success: true, data: { task: { kind: "lecture" }, alreadyDone: true } });
    await act(async () => void (await completePlanTask("t1", {})));
    expect(transient()).toHaveAttribute("data-line", "task.undo#1");
    cleanup();
    resetPexo();
    primePexo(on({ enabled: false }));
    render(<PexoLayer />);
    http.fn.mockResolvedValueOnce({ success: true, data: { task: { kind: "lecture" }, alreadyDone: false } });
    await act(async () => void (await completePlanTask("t1", {})));
    expect(transient()).toBeNull();
  });

  it("Quiet mode lets celebrations through and keeps ordinary reactions quiet", async () => {
    primePexo(on({ bubbles: "quiet" }));
    render(<PexoLayer />);
    http.fn.mockResolvedValueOnce({ success: true, data: { task: { kind: "lecture" }, alreadyDone: false } });
    await act(async () => void (await completePlanTask("t1", {})));
    expect(transient()).toBeNull();
    http.fn.mockResolvedValueOnce({ success: true, data: { status: "mastered", masteredAt: "2026-11-12T00:00:00Z" } });
    await act(async () => void (await reviewEntry("e1", "correct")));
    expect(transient()).toHaveAttribute("data-line", "mistake.mastered#1");
  });

  it("mock up/down by the real delta; streak and countdown milestones once each", () => {
    primePexo(on());
    render(<PexoLayer />);
    act(() => reactMockLogged({ totalMarks: 168, previousMarks: 150 }));
    expect(screen.getByTestId("pexo-text")).toHaveTextContent("Up 18 marks from your last mock.");
    act(() => reactMockLogged({ totalMarks: 140, previousMarks: 150 }));
    expect(transient()).toHaveAttribute("data-line", "log.mock.down#1");
    act(() => reactStreak(7));
    expect(transient()).toHaveAttribute("data-line", "streak.7#1");
    act(() => reactStreak(14));
    expect(screen.getByTestId("pexo-text")).toHaveTextContent("14 days in a row.");
    act(() => reactCountdown(50));
    expect(transient()).toHaveAttribute("data-line", "countdown.50#1");
    act(() => reactCountdown(49));
    act(() => reactCountdown(50));
    expect(transient()).toHaveAttribute("data-line", "countdown.50#1");
    expect(takePexoBatch()!.marks).toEqual(expect.arrayContaining(["streak.7", "streak.14", "countdown.50"]));
  });

  it("a big backlog gets one calm line a day; an impossible date gets the honest one", () => {
    primePexo(on());
    render(<PexoLayer />);
    act(() => reactBacklogView(20 * 60, false, null));
    expect(transient()).toHaveAttribute("data-line", "backlog.big_calm#1");
    act(() => reactBacklogView(5 * 60, false, false));
    expect(transient()).toHaveAttribute("data-line", "backlog.infeasible#1");
  });
});

describe("the focus timer (C1, C2)", () => {
  it("Pexo at the desk with a book and lamp, the start line, and the break line on a break", () => {
    primePexo(on());
    const { rerender } = render(<FocusDesk sessionId="s1" onBreak={false} subject="Physics" />);
    expect(screen.getByTestId("focus-desk").querySelector("[data-prop='book']")).not.toBeNull();
    expect(screen.getByTestId("focus-desk").querySelector("[data-prop='lamp']")).not.toBeNull();
    expect(screen.getByTestId("focus-desk-line").getAttribute("data-line")).toMatch(/^focus\.start#/);
    rerender(<FocusDesk sessionId="s1" onBreak subject="Physics" />);
    expect(screen.getByTestId("focus-desk-line").getAttribute("data-line")).toMatch(/^focus\.break#/);
  });

  it("the end line and, after 15+ minutes, a find with save and open", async () => {
    primePexo(on());
    vi.mocked(getPexoFind).mockResolvedValue({ id: 7, type: "trick", subject: "Physics", chapter: "Laws of Motion", chapterId: "c1", text: "Draw the free-body diagram first.", saved: false });
    vi.mocked(savePexoFind).mockResolvedValue({ saved: true });
    render(<FocusEndPexo sessionId="s1" minutes={40} chapterId="c1" subjectId={1} />);
    expect(screen.getByTestId("focus-end-line").getAttribute("data-line")).toMatch(/^focus\.end\.long#[134]$/);
    expect(await screen.findByTestId("pexo-find-text")).toHaveTextContent("Draw the free-body diagram first.");
    expect(getPexoFind).toHaveBeenCalledWith({ minutes: 40, chapterId: "c1", subjectId: 1 });
    expect(screen.getByTestId("pexo-find-open")).toHaveAttribute("href", "/home/resource-library/chapter?subject=Physics&chapter=Laws+of+Motion");
    fireEvent.click(screen.getByTestId("pexo-find-save"));
    await waitFor(() => expect(screen.getByTestId("pexo-find-save")).toHaveTextContent("Saved to My finds"));
  });

  it("no find under 15 minutes", () => {
    primePexo(on());
    render(<FocusEndPexo sessionId="s2" minutes={10} chapterId={null} subjectId={1} />);
    expect(screen.getByTestId("focus-end-line").getAttribute("data-line")).toMatch(/^focus\.end\.short#/);
    expect(getPexoFind).not.toHaveBeenCalled();
  });
});

describe("Rank GPS and care", () => {
  it("the report gets Pexo's movement line", () => {
    primePexo(on());
    render(<GpsPexo input={{ state: "ready", change: 2.4 }} />);
    expect(screen.getByTestId("gps-pexo")).toHaveTextContent("Readiness up 2.4. Here's why.");
  });

  it("care mode: the no-compare line on the leaderboard, only then", () => {
    primePexo(on({ care: { active: true, reason: "low_mood", distress: false } }));
    const { unmount } = render(<CareNoCompare />);
    expect(screen.getByTestId("care-no-compare")).toHaveTextContent(text("care.no_compare#1"));
    unmount();
    resetPexo();
    primePexo(on());
    render(<CareNoCompare />);
    expect(screen.queryByTestId("care-no-compare")).toBeNull();
  });
});

describe("My finds", () => {
  it("loads only when opened and lists saved finds with a library link", async () => {
    vi.mocked(listPexoFinds).mockResolvedValue([{ id: 3, type: "common_mistake", subject: "Chemistry", chapter: "Mole Concept", chapterId: "m1", text: "Check the limiting reagent first.", saved: true }]);
    render(<MyFinds />);
    expect(listPexoFinds).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("my-finds-toggle"));
    expect(await screen.findByTestId("my-finds-list")).toHaveTextContent("Common mistake · Mole Concept");
    expect(screen.getByText("Open in the library")).toHaveAttribute("href", "/home/resource-library/chapter?subject=Chemistry&chapter=Mole+Concept");
  });
});
