// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CountUp } from "@/components/study/CountUp";
import { StudyShell } from "@/components/study/StudyShell";

// The real header pulls in an SVG asset the test runner cannot load; a heading stand-in is enough here.
vi.mock("@/components/profile/ProfileSubpageHeader", () => ({ ProfileSubpageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }), usePathname: () => "/logs" }));
vi.mock("@/lib/api/revision", () => ({ getRevisionOverview: vi.fn() }));
vi.mock("@/lib/api/revisionLogs", () => ({ getRevisionAnalytics: vi.fn() }));
vi.mock("@/lib/api/backlogItems", () => ({ getBacklogAnalytics: vi.fn(), listBacklogItems: vi.fn() }));
vi.mock("@/lib/api/practiceLogs", () => ({ getPracticeAnalytics: vi.fn() }));
vi.mock("@/lib/api/mocks", () => ({ getMockAnalytics: vi.fn() }));
vi.mock("@/lib/api/studyLog", () => ({ getStudySummary: vi.fn() }));
vi.mock("@/lib/api/streak", () => ({ getStreakInfo: vi.fn() }));

import { getBacklogAnalytics, listBacklogItems } from "@/lib/api/backlogItems";
import { getMockAnalytics } from "@/lib/api/mocks";
import { getPracticeAnalytics } from "@/lib/api/practiceLogs";
import { getRevisionOverview } from "@/lib/api/revision";
import { getRevisionAnalytics } from "@/lib/api/revisionLogs";
import { getStreakInfo } from "@/lib/api/streak";
import { getStudySummary } from "@/lib/api/studyLog";
import LogsHubPage from "@/app/(app)/logs/page";

const ok = <T,>(data: T) => Promise.resolve({ success: true as const, data });

beforeEach(() => {
  vi.clearAllMocks();
  // The planner has 3 revision tasks today, while the student has logged no revision at all today.
  vi.mocked(getRevisionOverview).mockReturnValue(ok({ todaysRevisionTasks: { count: 3, tasks: [] }, upcomingRevisions: { count: 1, chapters: [{ nextRevisionAt: "2020-01-01T00:00:00Z" }] }, masteredChapters: { count: 0, chapters: [] } }) as never);
  vi.mocked(getRevisionAnalytics).mockReturnValue(ok({ totals: { revisions: 2 }, stale: [{ chapterName: "Optics", daysAgo: 12 }] }) as never);
  vi.mocked(getBacklogAnalytics).mockReturnValue(ok({ totals: { open: 2, scheduled: 0 }, redFlags: [] }) as never);
  vi.mocked(listBacklogItems).mockReturnValue(ok({ items: [{ id: "b", topic: "Vectors", deadline: "2999-01-01", isOverdue: false, chapterId: null }], nextCursor: null }) as never);
  vi.mocked(getPracticeAnalytics).mockReturnValue(ok({ totals: { accuracy: 70, attempted: 30 }, byDay: [{ accuracy: 60 }, { accuracy: 80 }], weakness: [{ chapterName: "Kinematics", accuracy: 50, attempted: 10 }] }) as never);
  vi.mocked(getMockAnalytics).mockReturnValue(ok({ totals: { mocks: 2 }, score: { latestPercent: 61 }, trend: [{ date: "2026-09-01", scorePercent: 55, percentile: 80 }, { date: "2026-09-08", scorePercent: 61, percentile: 85 }], weakChapters: [{ chapterId: "a", mocks: 2, lastDate: "2026-09-08" }], weakChapterNames: { a: "Electrostatics" } }) as never);
  vi.mocked(getStudySummary).mockReturnValue(ok({ totalMinutes: 390, sessionCount: 5, byDay: [], bySubject: [], period: "week", from: "", to: "" }) as never);
  vi.mocked(getStreakInfo).mockResolvedValue({ currentStreak: 4 } as never);
});

describe("Logs hub", () => {
  it("shows the planner's due-today count, not the number of revisions logged today", async () => {
    render(<LogsHubPage />);
    await waitFor(() => expect(screen.getByTestId("hub-revision-value")).toHaveTextContent("3"));
    expect(screen.getByTestId("hub-revision")).toHaveTextContent("revisions due today");
  });

  it("renders all four cards as whole-card links, with the richer desktop details", async () => {
    render(<LogsHubPage />);
    await waitFor(() => expect(screen.getByTestId("hub-mocks-value")).toHaveTextContent("2"));
    for (const [id, href] of [["hub-revision", "/logs/revision"], ["hub-backlog", "/logs/backlog"], ["hub-practice", "/logs/practice"], ["hub-mocks", "/logs/mocks"]] as const) {
      expect(screen.getByTestId(id).closest("a")).toHaveAttribute("href", href);
    }
    expect(screen.getByTestId("hub-revision")).toHaveTextContent("Optics");
    expect(screen.getByTestId("hub-revision")).toHaveTextContent("Overdue");
    expect(screen.getByTestId("hub-backlog")).toHaveTextContent("Vectors");
    expect(screen.getByTestId("hub-practice")).toHaveTextContent("Kinematics");
    expect(screen.getByTestId("hub-mocks")).toHaveTextContent("Electrostatics");
    expect(screen.getByTestId("hub-mocks")).toHaveTextContent("85 percentile");
  });

  it("shows the summary strip with only the figures that exist", async () => {
    vi.mocked(getStreakInfo).mockRejectedValue(new Error("down"));
    render(<LogsHubPage />);
    const strip = await screen.findByTestId("hub-strip");
    expect(strip).toHaveTextContent("Hours this week");
    expect(screen.getByTestId("hub-strip-hours")).toHaveTextContent("6.5h");
    expect(screen.getByTestId("hub-strip-sessions")).toHaveTextContent("5");
    expect(screen.getByTestId("hub-strip-questions")).toHaveTextContent("30");
    expect(strip).not.toHaveTextContent("Current streak");
  });

  it("one title for the four tabs, and the intro no longer promises three cards", async () => {
    render(<LogsHubPage />);
    expect(await screen.findByRole("heading", { name: "Study", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Your planner reads all four/)).toBeInTheDocument();
    expect(screen.queryByText(/reads all three/)).not.toBeInTheDocument();
  });

  it("a card whose request failed shows a dash, and the others still render", async () => {
    vi.mocked(getMockAnalytics).mockRejectedValue(new Error("down"));
    render(<LogsHubPage />);
    await waitFor(() => expect(screen.getByTestId("hub-revision-value")).toHaveTextContent("3"));
    expect(screen.getByTestId("hub-mocks-value")).toHaveTextContent("—");
  });
});

describe("StudyShell", () => {
  it("is titled Study on every tab", () => {
    render(
      <StudyShell current="/notebooks">
        <p>content</p>
      </StudyShell>,
    );
    expect(screen.getByRole("heading", { name: "Study", level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId("study-tabs")).toBeInTheDocument();
  });
});

describe("CountUp", () => {
  it("shows the final value straight away when reduced motion is requested", () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
    render(<CountUp value={42} testId="n" />);
    expect(screen.getByTestId("n")).toHaveTextContent("42");
  });
});
