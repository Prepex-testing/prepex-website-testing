// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { groupBySubject, RevisionHub } from "@/components/logs/RevisionHub";
import type { HealthTile, RevisionHub as Hub } from "@/lib/api/revisionLogs";

vi.mock("@/lib/api/revisionLogs", async (orig) => ({ ...(await orig<typeof import("@/lib/api/revisionLogs")>()), getRevisionHub: vi.fn() }));
vi.mock("@/lib/focus/startFocusSession", () => ({ startFocusSession: vi.fn() }));
import { getRevisionHub } from "@/lib/api/revisionLogs";
import { startFocusSession } from "@/lib/focus/startFocusSession";

const tile = (over: Partial<HealthTile>): HealthTile => ({
  chapterId: "c1", name: "Kinematics", subjectId: 1, subject: "Physics", status: "completed", freshness: "fresh", nextDueOn: "2026-11-10", lastRevisedOn: null,
  daysOverdue: 0, revisionStep: 1, weightage: 2, lastRecall: null, ...over,
});
const hub = (over: Partial<Hub> = {}): Hub => ({
  today: "2026-11-02", examDate: "2027-04-05", daysToExam: 154,
  tiles: [tile({ chapterId: "a", name: "Kinematics", freshness: "overdue", daysOverdue: 3, nextDueOn: "2026-10-30" }), tile({ chapterId: "b", name: "Mole Concept", subject: "Chemistry", subjectId: 2, freshness: "due", nextDueOn: "2026-11-02" }), tile({ chapterId: "c", name: "Atomic Structure", subject: "Chemistry", subjectId: 2, freshness: "fresh" })],
  todayDue: [{ chapterId: "a", name: "Kinematics", subject: "Physics", minutes: 35, dueOn: "2026-10-30", plan: "Recall formulas 10 min · 12 PYQs · re-solve 2 mistakes", overdueDays: 3 }],
  load7: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ date: `2026-11-0${2 + i}`.replace("2026-11-010", "2026-11-10"), due: i === 0 ? 1 : i % 3 })),
  overdueCount: 1, dueTodayCount: 2, coverage: { onTime: 2, total: 3, percent: 67 }, slotMinutesToday: 60, ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("Revision hub", () => {
  it("shows coverage, overdue, due today, the day's cards with what the task is, and the 7-day load", async () => {
    vi.mocked(getRevisionHub).mockResolvedValue({ success: true, data: hub() });
    render(<RevisionHub />);
    expect(await screen.findByTestId("rev-hub-coverage")).toHaveTextContent("67%");
    expect(screen.getByTestId("rev-hub-overdue")).toHaveTextContent("1");
    expect(screen.getByTestId("rev-hub-due")).toHaveTextContent("2");
    const card = screen.getByTestId("rev-hub-card");
    expect(card).toHaveTextContent("Kinematics");
    expect(card).toHaveTextContent("3 days late");
    expect(card).toHaveTextContent("Recall formulas 10 min · 12 PYQs · re-solve 2 mistakes");
    expect(screen.getAllByTestId("rev-hub-day")).toHaveLength(7);
    await userEvent.click(screen.getByTestId("rev-hub-start"));
    expect(startFocusSession).toHaveBeenCalledWith(expect.objectContaining({ originSource: "revision_tab", chapter: "a", taskType: "revision", targetMinutes: 35 }));
  });

  it("draws a tile for every completed chapter, coloured by freshness, grouped by subject, with no coral on the screen", async () => {
    vi.mocked(getRevisionHub).mockResolvedValue({ success: true, data: hub() });
    const { container } = render(<RevisionHub />);
    const tiles = await screen.findAllByTestId("rev-hub-tile");
    expect(tiles.map((t) => t.getAttribute("data-freshness"))).toEqual(["overdue", "due", "fresh"]);
    expect(within(screen.getByTestId("rev-hub-health")).getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Physics", "Chemistry"]);
    expect(container.innerHTML).not.toMatch(/bg-cta|bg-brand-coral|CoralButton|E8623F/);
  });

  it("says so when the timetable has no revision slot today", async () => {
    vi.mocked(getRevisionHub).mockResolvedValue({ success: true, data: hub({ slotMinutesToday: 0, todayDue: [] }) });
    render(<RevisionHub />);
    expect(await screen.findByTestId("rev-hub-no-slot")).toHaveTextContent("No revision slot today");
  });

  it("an empty student sees a calm empty state, not zeros", async () => {
    vi.mocked(getRevisionHub).mockResolvedValue({ success: true, data: hub({ tiles: [], todayDue: [], overdueCount: 0, dueTodayCount: 0, coverage: { onTime: 0, total: 0, percent: null } }) });
    render(<RevisionHub />);
    expect(await screen.findByTestId("rev-hub-today-empty")).toHaveTextContent("Chapters you finish show up here");
    expect(screen.getByTestId("rev-hub-coverage")).toHaveTextContent("-");
  });

  it("an error is a calm line", async () => {
    vi.mocked(getRevisionHub).mockRejectedValue(new Error("x"));
    render(<RevisionHub />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("couldn't load"));
  });

  it("groups tiles by subject in the order they arrive", () => {
    expect(groupBySubject([tile({ subject: "Physics" }), tile({ chapterId: "z", subject: "Maths" }), tile({ chapterId: "y", subject: "Physics" })]).map((g) => [g.subject, g.tiles.length])).toEqual([["Physics", 2], ["Maths", 1]]);
  });
});
