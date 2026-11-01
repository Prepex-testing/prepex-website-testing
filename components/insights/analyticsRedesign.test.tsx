// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarSidePanel, monthTotals } from "@/components/insights/panels/CalendarSidePanel";
import { weakestChapter } from "@/components/insights/panels/DashboardSidePanel";
import { WeekSidePanel } from "@/components/insights/panels/WeekSidePanel";
import { ChapterListRow } from "@/components/syllabus/ChapterListRow";
import type { MonthView } from "@/lib/api/calendarView";
import type { ChapterRow, SyllabusOverview } from "@/lib/api/syllabus";
import { attentionChapters } from "@/lib/insights/attention";

vi.mock("@/components/profile/ProfileSubpageHeader", () => ({ ProfileSubpageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/lib/focus/startFocusSession", () => ({ startFocusSession: vi.fn() }));
vi.mock("@/lib/api/syllabus", async (orig) => ({ ...(await orig<typeof import("@/lib/api/syllabus")>()), getSyllabus: vi.fn() }));
vi.mock("@/lib/api/masterAnalytics", () => ({ getMasterAnalytics: vi.fn() }));
vi.mock("@/lib/api/mocks", () => ({ getMockAnalytics: vi.fn() }));
import { getSyllabus } from "@/lib/api/syllabus";
import { getMasterAnalytics } from "@/lib/api/masterAnalytics";
import SyllabusPage from "@/app/(app)/syllabus/page";

const root = path.resolve(import.meta.dirname, "..", "..");
const coralCount = (el: ParentNode) => [...el.querySelectorAll("button, a")].filter((b) => /(^|\s)(bg-cta|bg-brand-coral)(\s|$)/.test(b.className)).length;
const NOW = new Date("2026-10-26T10:00:00.000Z");

const chapter = (id: string, name: string, over: Partial<ChapterRow["progress"]> = {}): ChapterRow => ({
  chapterId: id, name, subjectId: 1, class: 11, ncertChapterNumber: 1, estimatedHours: 8, weightage: 0.05, typicalDifficulty: "MEDIUM", topicCount: 4,
  progress: { theoryStatus: "studied", theoryManual: false, hours: 5, accuracy: 70, questionsAttempted: 40, strengthLabel: "medium", counts: { lecture: 0, dpp: 0, hcv: 0, module: 0, pyqMains: 0, pyqAdvanced: 0, revision: 0 }, lastStudiedAt: "2026-10-24T00:00:00.000Z", ...over },
});
const tally = { chapters: 4, studied: 2, learning: 1, notStarted: 1, hours: 12, strong: 0, medium: 2, weak: 2, unrated: 0 };
const subjects: SyllabusOverview["subjects"] = [
  {
    subjectId: 1, code: "PHY", name: "Physics", summary: tally,
    chapters: [
      chapter("a", "Kinematics", { strengthLabel: "weak", accuracy: 41 }),
      chapter("b", "Laws of Motion", { strengthLabel: "weak", accuracy: 55 }),
      chapter("c", "Work and Energy", { lastStudiedAt: "2026-09-20T00:00:00.000Z" }),
      chapter("d", "Rotation", { theoryStatus: "not_started", strengthLabel: null, accuracy: null, lastStudiedAt: null }),
    ],
  },
];

beforeEach(() => vi.clearAllMocks());

describe("what needs attention", () => {
  it("lists the weakest chapters by accuracy, then the stale ones, three of each", () => {
    const { weak, stale } = attentionChapters(subjects, NOW);
    expect(weak.map((w) => [w.chapter.name, w.reason])).toEqual([["Kinematics", "41% accuracy"], ["Laws of Motion", "55% accuracy"]]);
    expect(stale.map((s) => [s.chapter.name, s.reason])).toEqual([["Work and Energy", "36 days since you studied it"]]);
  });

  it("picks the weakest chapter in the dashboard's strength grid", () => {
    const grid = { counts: { strong: 0, medium: 0, weak: 2, unrated: 0 }, chapters: [
      { chapterId: "x", name: "Optics", subjectId: 1, label: "weak" as const, hours: 2, accuracy: 48 },
      { chapterId: "y", name: "Waves", subjectId: 1, label: "weak" as const, hours: 1, accuracy: 30 },
      { chapterId: "z", name: "Heat", subjectId: 1, label: "strong" as const, hours: 9, accuracy: 90 },
    ] };
    expect(weakestChapter(grid as never)?.name).toBe("Waves");
    expect(weakestChapter({ ...grid, chapters: [grid.chapters[2]!] } as never)).toBeNull();
  });
});

describe("side panels", () => {
  it("Calendar: legend, totals and the hint", () => {
    const month = {
      year: 2026, month: 10,
      days: [
        { date: "2026-10-01", totalFocusedMinutes: 60, totalStudiedMinutes: 90, plannedMinutes: 120, moodScore: 4, hasWeeklyDiagnosis: true, dayType: null, mocks: 1 },
        { date: "2026-10-02", totalFocusedMinutes: 0, totalStudiedMinutes: 0, plannedMinutes: 0, moodScore: null, hasWeeklyDiagnosis: false, dayType: null, mocks: 0 },
      ],
      totals: { focusedMinutes: 60, studiedMinutes: 90, plannedMinutes: 120, activeDays: 1 },
    } as MonthView;
    expect(monthTotals(month)).toEqual({ studied: 90, planned: 120, activeDays: 1, mocks: 1, reviews: 1 });
    render(<CalendarSidePanel month={month} />);
    expect(screen.getByTestId("heat-legend")).toBeInTheDocument();
    expect(screen.getByTestId("cal-month-totals")).toHaveTextContent("Active days");
    expect(screen.getByTestId("cal-hint")).toHaveTextContent("Click a cell to open that day.");
    expect(coralCount(document.body)).toBe(0);
  });

  it("This week: the top 3 fixes each link to a goal, and nothing is coral", async () => {
    vi.mocked(getMasterAnalytics).mockResolvedValue({ success: true, data: { bySubject: [{ subjectId: 1, name: "Physics", minutes: 300, share: 100 }], streaks: { current: 4 } } } as never);
    const fixes = ["a", "b", "c", "d"].map((x) => ({ title: `Fix ${x}`, chapterId: null, chapterName: null, minutes: 60 }));
    const { container } = render(<WeekSidePanel fixes={fixes} />);
    expect(screen.getAllByTestId("week-fix")).toHaveLength(3);
    expect(screen.getAllByTestId("week-fix-goal")[0]).toHaveAttribute("href", expect.stringContaining("/goals?week=next&type=HOURS&unit=MINUTES&target=60"));
    expect(await screen.findByText("4 days")).toBeInTheDocument();
    expect(screen.getByTestId("week-hours")).toHaveTextContent("Physics");
    expect(coralCount(container)).toBe(0);
  });
});

describe("Syllabus", () => {
  it("each chapter's Study button is ghost", async () => {
    const { container } = render(<ul><ChapterListRow chapter={subjects[0]!.chapters[0]!} /></ul>);
    expect(screen.getByTestId("study-chapter-a").className).toContain("border-border-strong");
    expect(coralCount(container)).toBe(0);
  });

  it("the page has no filled coral button and lists every chapter with its attention and progress panels", async () => {
    vi.mocked(getSyllabus).mockResolvedValue({ success: true, data: { subjects, totals: tally } });
    const { container } = render(<SyllabusPage />);
    await screen.findAllByTestId(/^study-chapter-/);
    expect(coralCount(container)).toBe(0);
    expect(screen.getAllByTestId(/^study-chapter-/)).toHaveLength(4);
    expect(screen.getByTestId("syl-attention")).toBeInTheDocument();
    expect(screen.getByTestId("syl-progress")).toBeInTheDocument();
  });
});

describe("the four tabs use the scaffold; Details is untouched", () => {
  const page = (rel: string) => readFileSync(path.join(root, "app/(app)", rel, "page.tsx"), "utf8");

  it("Dashboard, This week, Calendar and Syllabus render inside LogScreenScaffold with the Insights tab strip and a side panel", () => {
    for (const [rel, current, panel] of [
      ["analytics", "/analytics", "DashboardSidePanel"],
      ["analytics/week", "/analytics/week", "WeekSidePanel"],
      ["calendar", "/calendar", "CalendarSidePanel"],
      ["syllabus", "/syllabus", "SyllabusSidePanel"],
    ] as const) {
      const src = page(rel);
      expect(src, rel).toContain("<LogScreenScaffold");
      expect(src, rel).toContain(`tabBar={<InsightsTabs current="${current}" />}`);
      expect(src, rel).toContain(`<${panel}`);
    }
  });

  it("the Details page does not use the scaffold", () => {
    const src = page("stats");
    expect(src).not.toContain("LogScreenScaffold");
    expect(src).toContain('<InsightsTabs current="/stats" />');
  });

  it("no filled coral on the analytics pages outside the diagnosis card and the week run button", () => {
    const files = ["app/(app)/analytics/page.tsx", "app/(app)/analytics/week/page.tsx", "app/(app)/calendar/page.tsx", "components/insights/panels/DashboardSidePanel.tsx", "components/insights/panels/WeekSidePanel.tsx", "components/insights/panels/CalendarSidePanel.tsx", "components/insights/panels/SyllabusSidePanel.tsx", "components/syllabus/ChapterListRow.tsx"];
    for (const f of files) expect(readFileSync(path.join(root, f), "utf8"), f).not.toMatch(/bg-cta|bg-brand-coral|CoralButton/);
    expect(readFileSync(path.join(root, "app/(app)/syllabus/page.tsx"), "utf8")).not.toMatch(/<CoralButton/);
  });
});

