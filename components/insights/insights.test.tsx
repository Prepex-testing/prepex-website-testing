// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DaySummary } from "@/lib/api/calendarView";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { MasterAnalytics } from "@/lib/api/masterAnalytics";
import type { MockTest } from "@/lib/api/mocks";
import type { ChapterRow } from "@/lib/api/syllabus";
import { StatTile } from "@/components/analytics/StatTile";
import { StrengthGrid } from "@/components/analytics/StrengthGrid";
import { HeatLegend, MonthHeatmap } from "@/components/calendar/MonthHeatmap";
import { DatesPickerModal } from "@/components/insights/DatesPickerModal";
import { InsightsTabs } from "@/components/insights/InsightsTabs";
import { MockForm } from "@/components/mocks/MockForm";
import { MockList } from "@/components/mocks/MockList";
import { WeakChapterPicker } from "@/components/mocks/WeakChapterPicker";
import { CountSteppers, TheorySwitch } from "@/components/syllabus/ChapterControls";
import { ChapterListRow } from "@/components/syllabus/ChapterListRow";

// Recharts needs layout the test DOM does not have; the charts are covered by the Playwright suite.
vi.mock("@/components/insights/LazyCharts", () => {
  const stub = (id: string) => {
    const Stub = () => <div data-testid={id} />;
    Stub.displayName = `Stub(${id})`;
    return Stub;
  };
  return { SeriesLine: stub("series-line"), SeriesBars: stub("series-bars") };
});

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

async function fillMarks(user: ReturnType<typeof userEvent.setup>, p: string, c: string, m: string) {
  await user.type(screen.getByTestId("mock-marks-physics"), p);
  await user.type(screen.getByTestId("mock-marks-chemistry"), c);
  await user.type(screen.getByTestId("mock-marks-maths"), m);
}

describe("MockForm", () => {
  it("adds the subject marks into the total as you type", async () => {
    const user = userEvent.setup();
    render(<MockForm subjects={SUBJECTS} busy={false} error={null} onSubmit={vi.fn()} />);
    await fillMarks(user, "60", "70", "50");
    expect(screen.getByTestId("mock-total")).toHaveValue("180");
    expect(screen.getByTestId("mock-total-status")).toHaveTextContent("Added up from your subjects: 180.");
  });

  it("checks a typed total against the subjects, and the maximum, before sending", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MockForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await fillMarks(user, "60", "70", "50");
    await user.clear(screen.getByTestId("mock-total"));
    await user.type(screen.getByTestId("mock-total"), "185");
    expect(screen.getByTestId("mock-total-status")).toHaveTextContent("must equal the sum of the subjects (180)");
    await user.click(screen.getByTestId("mock-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent("must equal the sum");
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("mock-auto-total"));
    expect(screen.getByTestId("mock-total")).toHaveValue("180");
  });

  it("sends the subject marks, total, percentile and weak chapters; maximum follows the pattern", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MockForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    expect(screen.getByTestId("mock-max")).toHaveValue("300");
    await user.type(screen.getByTestId("mock-name"), "AITS 4");
    await fillMarks(user, "60", "70", "50");
    await user.type(screen.getByTestId("mock-percentile"), "96.5");
    await user.click(screen.getByTestId(`mock-weak-chapter-${KIN}`));
    await user.click(screen.getByTestId("mock-submit"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      testType: "full_mock",
      examPattern: "jee_main",
      testName: "AITS 4",
      totalMarks: 180,
      maxMarks: 300,
      physicsMarks: 60,
      chemistryMarks: 70,
      mathsMarks: 50,
      biologyMarks: null,
      percentile: 96.5,
      weakChapterIds: [KIN],
    });
  });

  it("switching to NEET swaps maths for biology and the default maximum", async () => {
    const user = userEvent.setup();
    render(<MockForm subjects={SUBJECTS} busy={false} error={null} onSubmit={vi.fn()} />);
    await user.selectOptions(screen.getByTestId("mock-pattern"), "neet");
    expect(screen.getByTestId("mock-max")).toHaveValue("720");
    expect(screen.queryByTestId("mock-marks-maths")).toBeNull();
    expect(screen.getByTestId("mock-marks-biology")).toBeInTheDocument();
  });

  it("rejects a total above the maximum, a bad percentile and a future date", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MockForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await user.type(screen.getByTestId("mock-total"), "301");
    await user.click(screen.getByTestId("mock-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent("more than the maximum");
    await user.clear(screen.getByTestId("mock-total"));
    await user.type(screen.getByTestId("mock-total"), "100");
    await user.type(screen.getByTestId("mock-percentile"), "101");
    await user.click(screen.getByTestId("mock-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent("Percentile must be between 0 and 100");
    await user.clear(screen.getByTestId("mock-percentile"));
    fireEvent.change(screen.getByTestId("mock-date"), { target: { value: "2999-01-01" } });
    await user.click(screen.getByTestId("mock-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent("future");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("allows negative marks (negative marking)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MockForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await user.type(screen.getByTestId("mock-total"), "-12");
    await user.click(screen.getByTestId("mock-submit"));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ totalMarks: -12 });
  });

  it("shows a server error", () => {
    render(<MockForm subjects={SUBJECTS} busy={false} error="Nope" onSubmit={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Nope");
  });
});

describe("WeakChapterPicker", () => {
  it("toggles chapters, shows chips and removes them", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<WeakChapterPicker subjects={SUBJECTS} selected={[]} onChange={onChange} />);
    await user.click(screen.getByTestId(`weak-chapter-${LAWS}`));
    expect(onChange).toHaveBeenLastCalledWith([LAWS]);
    rerender(<WeakChapterPicker subjects={SUBJECTS} selected={[LAWS, KIN]} onChange={onChange} />);
    expect(screen.getByTestId(`weak-chapter-${LAWS}`)).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByTestId(`weak-chip-${LAWS}`));
    expect(onChange).toHaveBeenLastCalledWith([KIN]);
  });

  it("searches chapters", async () => {
    const user = userEvent.setup();
    render(<WeakChapterPicker subjects={SUBJECTS} selected={[]} onChange={vi.fn()} />);
    await user.type(screen.getByTestId("weak-search"), "laws");
    expect(screen.queryByTestId(`weak-chapter-${KIN}`)).toBeNull();
    expect(screen.getByTestId(`weak-chapter-${LAWS}`)).toBeInTheDocument();
  });

  it("stops at thirty", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const many = Array.from({ length: 30 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    render(<WeakChapterPicker subjects={SUBJECTS} selected={many} onChange={onChange} />);
    await user.click(screen.getByTestId(`weak-chapter-${KIN}`));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/most you can pick/)).toBeInTheDocument();
  });
});

const mock = (over: Partial<MockTest> = {}): MockTest => ({
  id: "m1",
  testType: "full_mock",
  examPattern: "jee_main",
  testName: "AITS 4",
  dateTaken: "2026-10-05",
  totalMarks: 195,
  maxMarks: 300,
  scorePercent: 65,
  subjectMarks: { physics: 70, chemistry: 60, maths: 65, biology: null },
  timeMinutes: null,
  questionsCorrect: null,
  questionsWrong: null,
  questionsSkipped: null,
  weakChapters: [{ chapterId: KIN, name: "Kinematics" }],
  percentile: 96.5,
  projectedRank: 49000,
  candidatePool: 1400000,
  notes: null,
  createdAt: "2026-10-05T10:00:00Z",
  ...over,
});

describe("MockList", () => {
  it("shows the score, subject marks, percentile and projected rank", () => {
    render(<MockList rows={[mock()]} hasMore={false} onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onPlanWeak={vi.fn()} onShare={vi.fn()} />);
    expect(screen.getByTestId("mock-score-m1")).toHaveTextContent("195/300");
    expect(screen.getByTestId("mock-score-m1")).toHaveTextContent("65%");
    expect(screen.getByTestId("mock-rank-m1")).toHaveTextContent("96.5 percentile · rank ~49,000");
    expect(screen.getByTestId("mock-row-m1")).toHaveTextContent("Physics 70 · Chemistry 60 · Maths 65");
    expect(screen.getByTestId("mock-row-m1")).toHaveTextContent("Weak: Kinematics");
  });

  it("only offers 'Plan weak chapters' when there are some, and wires the buttons", async () => {
    const user = userEvent.setup();
    const h = { onEdit: vi.fn(), onDelete: vi.fn(), onPlanWeak: vi.fn(), onShare: vi.fn() };
    const { rerender } = render(<MockList rows={[mock()]} hasMore={false} onLoadMore={vi.fn()} {...h} />);
    await user.click(screen.getByTestId("mock-plan-m1"));
    await user.click(screen.getByTestId("mock-share-m1"));
    await user.click(screen.getByTestId("mock-edit-m1"));
    await user.click(screen.getByTestId("mock-delete-m1"));
    expect(h.onPlanWeak).toHaveBeenCalledTimes(1);
    expect(h.onShare).toHaveBeenCalledTimes(1);
    expect(h.onEdit).toHaveBeenCalledTimes(1);
    expect(h.onDelete).toHaveBeenCalledTimes(1);
    rerender(<MockList rows={[mock({ weakChapters: [], percentile: null, projectedRank: null })]} hasMore={false} onLoadMore={vi.fn()} {...h} />);
    expect(screen.queryByTestId("mock-plan-m1")).toBeNull();
    expect(screen.queryByTestId("mock-rank-m1")).toBeNull();
  });

  it("has an empty state and a load-more button", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const { rerender } = render(<MockList rows={[]} hasMore={false} onLoadMore={onLoadMore} onEdit={vi.fn()} onDelete={vi.fn()} onPlanWeak={vi.fn()} onShare={vi.fn()} />);
    expect(screen.getByTestId("mocks-empty")).toBeInTheDocument();
    rerender(<MockList rows={[mock()]} hasMore onLoadMore={onLoadMore} onEdit={vi.fn()} onDelete={vi.fn()} onPlanWeak={vi.fn()} onShare={vi.fn()} />);
    await user.click(screen.getByTestId("mocks-load-more"));
    expect(onLoadMore).toHaveBeenCalled();
  });
});

const dayOf = (date: string, studied: number, over: Partial<DaySummary> = {}): DaySummary => ({ date, totalFocusedMinutes: 0, totalStudiedMinutes: studied, plannedMinutes: 0, moodScore: null, hasWeeklyDiagnosis: false, dayType: null, mocks: 0, ...over });

describe("MonthHeatmap", () => {
  const days = Array.from({ length: 31 }, (_, i) => dayOf(`2026-10-${String(i + 1).padStart(2, "0")}`, i === 4 ? 150 : 0, i === 10 ? { hasWeeklyDiagnosis: true } : i === 7 ? { mocks: 1 } : {}));

  it("shades days by time studied and marks today", () => {
    render(<MonthHeatmap year={2026} month={10} days={days} todayKey="2026-10-07" selected={null} onSelect={vi.fn()} />);
    expect(screen.getByTestId("cal-day-2026-10-05")).toHaveAttribute("data-level", "3");
    expect(screen.getByTestId("cal-day-2026-10-06")).toHaveAttribute("data-level", "0");
    expect(screen.getByTestId("cal-day-2026-10-07")).toHaveAttribute("data-today", "true");
    expect(screen.getByTestId("cal-day-2026-10-05")).toHaveAccessibleName(/5 October: 2h 30m studied/);
  });

  it("badges a Sunday with a weekly review and a day with a mock", () => {
    render(<MonthHeatmap year={2026} month={10} days={days} todayKey="2026-10-07" selected={null} onSelect={vi.fn()} />);
    expect(screen.getByTestId("cal-diagnosis-2026-10-11")).toBeInTheDocument();
    expect(screen.queryByTestId("cal-diagnosis-2026-10-04")).toBeNull();
    expect(screen.getByTestId("cal-mock-2026-10-08")).toBeInTheDocument();
  });

  it("reports taps and starts the grid on the right weekday", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MonthHeatmap year={2026} month={10} days={days} todayKey="2026-10-07" selected="2026-10-05" onSelect={onSelect} />);
    await user.click(screen.getByTestId("cal-day-2026-10-12"));
    expect(onSelect).toHaveBeenCalledWith("2026-10-12");
    expect(screen.getByTestId("cal-day-2026-10-05")).toHaveAttribute("aria-pressed", "true");
    // 1 Oct 2026 is a Thursday: three blanks first
    const firstRow = screen.getByTestId("month-heatmap").children[1]!;
    expect(firstRow.children).toHaveLength(7);
    expect(within(firstRow as HTMLElement).getAllByRole("button")).toHaveLength(4);
  });

  it("has a legend that includes the weekly-review badge", () => {
    render(<HeatLegend />);
    expect(screen.getByTestId("heat-legend")).toHaveTextContent("4 hours or more");
    expect(screen.getByTestId("heat-legend")).toHaveTextContent("Weekly review");
  });
});

const chapter = (over: Partial<ChapterRow> = {}, progress: Partial<ChapterRow["progress"]> = {}): ChapterRow => ({
  chapterId: KIN,
  name: "Kinematics",
  subjectId: 1,
  class: 11,
  ncertChapterNumber: 2,
  estimatedHours: 14,
  weightage: 0.03,
  typicalDifficulty: "MEDIUM",
  topicCount: 5,
  progress: { theoryStatus: "learning", theoryManual: false, hours: 6, accuracy: 82.4, questionsAttempted: 40, strengthLabel: "strong", counts: { lecture: 4, dpp: 3, hcv: 1, module: 0, pyqMains: 2, pyqAdvanced: 0, revision: 1 }, lastStudiedAt: null, ...progress },
  ...over,
});

describe("syllabus chapter row and controls", () => {
  it("shows strength, hours, accuracy, theory status and links to the chapter", () => {
    render(<ul><ChapterListRow chapter={chapter()} /></ul>);
    const row = screen.getByTestId(`chapter-row-${KIN}`);
    expect(row).toHaveAttribute("href", `/syllabus/${KIN}`);
    expect(row).toHaveAttribute("data-strength", "strong");
    expect(row).toHaveTextContent("Strong");
    expect(row).toHaveTextContent("6h · 82%");
    expect(row).toHaveTextContent("Class 11 · NCERT 2 · 6h of ~14h");
    expect(row).toHaveTextContent("Learning");
  });

  it("an untouched chapter is unrated and not started", () => {
    render(<ul><ChapterListRow chapter={chapter({}, { theoryStatus: "not_started", hours: 0, accuracy: null, strengthLabel: null, questionsAttempted: 0 })} /></ul>);
    const row = screen.getByTestId(`chapter-row-${KIN}`);
    expect(row).toHaveAttribute("data-strength", "unrated");
    expect(row).toHaveTextContent("Not started");
    expect(row).not.toHaveTextContent("%");
  });

  it("the theory switch reports a change and ignores a tap on the current value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TheorySwitch value="learning" busy={false} onChange={onChange} />);
    await user.click(screen.getByTestId("theory-learning"));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("theory-studied"));
    expect(onChange).toHaveBeenCalledWith("studied");
    expect(screen.getByTestId("theory-learning")).toHaveAttribute("aria-checked", "true");
  });

  it("count steppers step by one, never below zero", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CountSteppers counts={{ lecture: 4, dpp: 0, hcv: 1, module: 0, pyqMains: 2, pyqAdvanced: 0, revision: 1 }} busy={false} onChange={onChange} />);
    await user.click(screen.getByTestId("count-lecture-inc"));
    expect(onChange).toHaveBeenLastCalledWith("lecture", 5);
    await user.click(screen.getByTestId("count-pyq_mains-dec"));
    expect(onChange).toHaveBeenLastCalledWith("pyq_mains", 1);
    expect(screen.getByTestId("count-dpp-dec")).toBeDisabled();
    expect(screen.getByTestId("count-pyq_mains-value")).toHaveTextContent("2");
  });
});

describe("dashboard pieces", () => {
  it("a tile with a link is a link, without one it is not", () => {
    const { rerender } = render(<StatTile testId="t" label="Today" value="1h" caption="studied" href="/analytics/drill/hours?period=week" />);
    expect(screen.getByTestId("t")).toHaveAttribute("href", "/analytics/drill/hours?period=week");
    expect(screen.getByTestId("t-value")).toHaveTextContent("1h");
    rerender(<StatTile testId="t" label="Streak" value="3 days" />);
    expect(screen.getByTestId("t")).not.toHaveAttribute("href");
  });

  it("the strength grid has one square per chapter, linked, with matching legend counts", () => {
    const grid: MasterAnalytics["chapterStrengthGrid"] = {
      chapters: [
        { chapterId: KIN, name: "Kinematics", subjectId: 1, label: "strong", hours: 6, accuracy: 82 },
        { chapterId: LAWS, name: "Laws of Motion", subjectId: 1, label: "weak", hours: 2, accuracy: 40 },
        { chapterId: "c3", name: "Mole", subjectId: 2, label: "unrated", hours: 0, accuracy: null },
      ],
      counts: { strong: 1, medium: 0, weak: 1, unrated: 1 },
    };
    render(<StrengthGrid grid={grid} subjectName={(id) => (id === 1 ? "Physics" : "Chemistry")} />);
    expect(screen.getByTestId(`grid-cell-${KIN}`)).toHaveAttribute("href", `/syllabus/${KIN}`);
    expect(screen.getByTestId(`grid-cell-${LAWS}`)).toHaveAttribute("data-strength", "weak");
    expect(screen.getByTestId(`grid-cell-${KIN}`)).toHaveAccessibleName("Kinematics: Strong, 82% accuracy");
    expect(screen.getByTestId("strength-count-weak")).toHaveTextContent("1");
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByText("Physics")).toBeInTheDocument();
    expect(screen.getByText("Chemistry")).toBeInTheDocument();
  });

  it("the insights switcher marks the current screen", () => {
    render(<InsightsTabs current="/calendar" />);
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/analytics", "/calendar", "/syllabus", "/stats"]);
  });
});

describe("DatesPickerModal", () => {
  it("needs at least one day, then sends the days, slot and minutes", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DatesPickerModal open onClose={vi.fn()} title="Schedule study" busy={false} error={null} onConfirm={onConfirm} />);
    await user.click(screen.getByTestId("dates-confirm"));
    expect(screen.getByTestId("dates-error")).toHaveTextContent("Pick at least one day.");
    expect(onConfirm).not.toHaveBeenCalled();

    const days = screen.getByTestId("dates-days").querySelectorAll("button");
    await user.click(days[1]!);
    await user.click(days[3]!);
    await user.click(screen.getByTestId("dates-slot-MORNING"));
    await user.click(screen.getByTestId("dates-minutes-90"));
    await user.click(screen.getByTestId("dates-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const picked = onConfirm.mock.calls[0]![0];
    expect(picked.dates).toHaveLength(2);
    expect(picked.dates[0] < picked.dates[1]).toBe(true);
    expect(picked).toMatchObject({ timeSlot: "MORNING", estimatedMinutes: 90 });
  });

  it("unticks a day and offers fourteen to choose from", async () => {
    const user = userEvent.setup();
    render(<DatesPickerModal open onClose={vi.fn()} title="Schedule study" busy={false} error={null} onConfirm={vi.fn()} />);
    const days = screen.getByTestId("dates-days").querySelectorAll("button");
    expect(days).toHaveLength(14);
    await user.click(days[0]!);
    expect(days[0]).toHaveAttribute("aria-checked", "true");
    await user.click(days[0]!);
    expect(days[0]).toHaveAttribute("aria-checked", "false");
  });

  it("shows a server error", () => {
    render(<DatesPickerModal open onClose={vi.fn()} title="Schedule study" busy={false} error="Pick a day within the next 28 days." onConfirm={vi.fn()} />);
    expect(screen.getByTestId("dates-error")).toHaveTextContent("within the next 28 days");
  });
});
