// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { BacklogAnalytics, BacklogItem } from "@/lib/api/backlogItems";
import type { PracticeAnalytics, PracticeLog } from "@/lib/api/practiceLogs";
import type { RevisionAnalytics, RevisionLog } from "@/lib/api/revisionLogs";
import type { PlannerTask } from "@/lib/api/planner";
import { BacklogAnalyticsPanel, ClearanceRing } from "@/components/logs/BacklogAnalyticsPanel";
import { BacklogForm } from "@/components/logs/BacklogForm";
import { BacklogHistory, BacklogOpenList, clearLabel, daysToClear } from "@/components/logs/BacklogLists";
import { HubCard } from "@/components/logs/HubCard";
import { PlannerPickerModal } from "@/components/logs/PlannerPickerModal";
import { PracticeAnalyticsPanel } from "@/components/logs/PracticeAnalyticsPanel";
import { PracticeForm } from "@/components/logs/PracticeForm";
import { PracticeSessions } from "@/components/logs/PracticeLists";
import { RevisionAnalyticsPanel } from "@/components/logs/RevisionAnalyticsPanel";
import { RevisionForm } from "@/components/logs/RevisionForm";
import { RevisionHistory, RevisionToday } from "@/components/logs/RevisionLists";
import { SectionTabs } from "@/components/logs/SectionTabs";
import { Toast, useToast } from "@/components/ui/Toast";
import { makeSubjectLookup } from "@/lib/study/subjects";

// Recharts needs layout the test DOM does not have; the charts are covered by the Playwright suite.
vi.mock("@/components/logs/LazyCharts", () => {
  const stub = (id: string) => {
    const Stub = () => <div data-testid={id} />;
    Stub.displayName = `Stub(${id})`;
    return Stub;
  };
  return {
    AccuracyBars: stub("accuracy-bars"),
    BacklogTimeline: stub("backlog-timeline"),
    WeeklyAccuracyLine: stub("weekly-accuracy"),
    SpeedLine: stub("speed-line"),
    SourceDonut: stub("source-donut"),
  };
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
const lookup = makeSubjectLookup(SUBJECTS);

async function pickChapter(user: ReturnType<typeof userEvent.setup>, prefix: string) {
  await user.selectOptions(screen.getByTestId(`${prefix}-subject`), "1");
  await user.selectOptions(screen.getByTestId(`${prefix}-chapter`), KIN);
}

describe("RevisionForm", () => {
  it("needs a subject, then a chapter, and says so", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RevisionForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await user.click(screen.getByTestId("rev-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a subject.");
    await user.selectOptions(screen.getByTestId("rev-subject"), "1");
    await user.click(screen.getByTestId("rev-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a chapter.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends the chosen method, minutes, questions and notes — and omits `loggedAt` (now)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RevisionForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await pickChapter(user, "rev");
    await user.click(screen.getByTestId("rev-type-formula_sheet"));
    await user.click(screen.getByTestId("rev-preset-45"));
    await user.click(screen.getByTestId("rev-with-questions"));
    await user.type(screen.getByTestId("rev-solved"), "20");
    await user.type(screen.getByTestId("rev-correct"), "15");
    expect(screen.getByTestId("rev-live-accuracy")).toHaveTextContent("75% accuracy");
    await user.type(screen.getByTestId("rev-errors"), "  forgot units ");
    await user.click(screen.getByTestId("rev-submit"));

    const sent = onSubmit.mock.calls[0]![0];
    expect(sent).toEqual({
      subjectId: 1,
      chapterId: KIN,
      topic: null,
      revisionType: "formula_sheet",
      durationMinutes: 45,
      questionsSolved: 20,
      questionsCorrect: 15,
      errors: "forgot units",
    });
    expect("loggedAt" in sent).toBe(false);
  });

  it("without the questions box it sends no question counts at all", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RevisionForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await pickChapter(user, "rev");
    await user.click(screen.getByTestId("rev-submit"));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ revisionType: "notes", durationMinutes: 30, questionsSolved: null, questionsCorrect: null, errors: null });
  });

  it("rejects correct > solved, and clears the message as soon as the number is fixed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RevisionForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await pickChapter(user, "rev");
    await user.click(screen.getByTestId("rev-with-questions"));
    await user.type(screen.getByTestId("rev-solved"), "10");
    await user.type(screen.getByTestId("rev-correct"), "11");
    await user.click(screen.getByTestId("rev-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent(/can't be more than the questions you solved/);
    await user.clear(screen.getByTestId("rev-correct"));
    await user.type(screen.getByTestId("rev-correct"), "9");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects fractional or out-of-range minutes", async () => {
    const user = userEvent.setup();
    render(<RevisionForm subjects={SUBJECTS} busy={false} error={null} onSubmit={vi.fn()} />);
    await pickChapter(user, "rev");
    for (const bad of ["0", "721", "2.5"]) {
      await user.clear(screen.getByTestId("rev-minutes"));
      await user.type(screen.getByTestId("rev-minutes"), bad);
      await user.click(screen.getByTestId("rev-submit"));
      expect(screen.getByRole("alert"), bad).toHaveTextContent(/whole number from 1 to 720/);
    }
  });
});

describe("PracticeForm", () => {
  const filled = async (user: ReturnType<typeof userEvent.setup>, c = "7", w = "2", s = "1") => {
    await pickChapter(user, "prac");
    await user.clear(screen.getByTestId("prac-correct"));
    await user.type(screen.getByTestId("prac-correct"), c);
    await user.clear(screen.getByTestId("prac-wrong"));
    await user.type(screen.getByTestId("prac-wrong"), w);
    await user.clear(screen.getByTestId("prac-skipped"));
    await user.type(screen.getByTestId("prac-skipped"), s);
  };

  it("fills `attempted` from correct + wrong + skipped and shows the sum and accuracy", async () => {
    const user = userEvent.setup();
    render(<PracticeForm subjects={SUBJECTS} busy={false} error={null} onSubmit={vi.fn()} />);
    await filled(user);
    expect(screen.getByTestId("prac-attempted")).toHaveValue(10);
    expect(screen.getByTestId("prac-sum-status")).toHaveTextContent("Adds up: 7 + 2 + 1 = 10 · 70% accuracy");
  });

  it("a typed `attempted` that does not add up is explained and blocks the submit; one tap puts it right", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PracticeForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await filled(user);
    await user.clear(screen.getByTestId("prac-attempted"));
    await user.type(screen.getByTestId("prac-attempted"), "12");
    expect(screen.getByTestId("prac-sum-status")).toHaveTextContent("7 + 2 + 1 = 10, but you attempted 12");
    await user.click(screen.getByTestId("prac-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent("2 questions are not counted");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("prac-auto-attempted"));
    expect(screen.getByTestId("prac-attempted")).toHaveValue(10);
    expect(screen.queryByRole("alert")).toBeNull();
    await user.click(screen.getByTestId("prac-submit"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("flags more outcomes than attempts (attempted 10, correct 11)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PracticeForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await filled(user, "11", "0", "0");
    await user.clear(screen.getByTestId("prac-attempted"));
    await user.type(screen.getByTestId("prac-attempted"), "10");
    expect(screen.getByTestId("prac-sum-status")).toHaveTextContent("is 1 more than the 10 you attempted");
    await user.click(screen.getByTestId("prac-submit"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends the log with the source, difficulty and minutes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PracticeForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await filled(user);
    await user.selectOptions(screen.getByTestId("prac-source"), "pyq_mains");
    await user.click(screen.getByTestId("prac-difficulty-hard"));
    await user.type(screen.getByTestId("prac-minutes"), "25");
    await user.click(screen.getByTestId("prac-submit"));
    const sent = onSubmit.mock.calls[0]![0];
    expect(sent).toMatchObject({
      subjectId: 1,
      chapterId: KIN,
      source: "pyq_mains",
      sourceDetail: null,
      questionsAttempted: 10,
      questionsCorrect: 7,
      questionsWrong: 2,
      questionsSkipped: 1,
      durationMinutes: 25,
      difficulty: "hard",
    });
    expect("loggedAt" in sent).toBe(false);
  });

  it("\"Other\" asks where the questions came from", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PracticeForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await filled(user);
    await user.selectOptions(screen.getByTestId("prac-source"), "other");
    await user.click(screen.getByTestId("prac-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent(/where the questions came from/i);
    await user.type(screen.getByTestId("prac-source-detail"), " Tutor sheet ");
    await user.click(screen.getByTestId("prac-submit"));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ source: "other", sourceDetail: "Tutor sheet" });
  });

  it("the +/- buttons step a count and never go below zero", async () => {
    const user = userEvent.setup();
    render(<PracticeForm subjects={SUBJECTS} busy={false} error={null} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "One more correct" }));
    await user.click(screen.getByRole("button", { name: "One more correct" }));
    expect(screen.getByTestId("prac-correct")).toHaveValue(2);
    await user.click(screen.getByRole("button", { name: "One fewer wrong" }));
    expect(screen.getByTestId("prac-wrong")).toHaveValue(0);
  });
});

describe("BacklogForm", () => {
  it("needs subject and chapter; sends priority, estimate and deadline", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<BacklogForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await user.click(screen.getByTestId("bl-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a subject.");
    await pickChapter(user, "bl");
    await user.click(screen.getByTestId("bl-preset-45"));
    await user.click(screen.getByTestId("bl-priority-1"));
    fireEvent.change(screen.getByTestId("bl-deadline"), { target: { value: "2099-01-05" } });
    await user.type(screen.getByTestId("bl-topic"), " Projectile ");
    await user.click(screen.getByTestId("bl-submit"));
    expect(onSubmit).toHaveBeenCalledWith({ subjectId: 1, chapterId: KIN, topic: "Projectile", estimatedMinutes: 45, deadline: "2099-01-05", priority: 1, notes: null });
  });

  it("defaults to normal priority, no estimate and no deadline; refuses a past deadline and silly minutes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<BacklogForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await pickChapter(user, "bl");
    await user.click(screen.getByTestId("bl-submit"));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ priority: 3, estimatedMinutes: null, deadline: null });

    fireEvent.change(screen.getByTestId("bl-deadline"), { target: { value: "2020-01-01" } });
    await user.click(screen.getByTestId("bl-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent("The deadline can't be in the past.");
    fireEvent.change(screen.getByTestId("bl-deadline"), { target: { value: "" } });
    await user.type(screen.getByTestId("bl-minutes"), "999");
    await user.click(screen.getByTestId("bl-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent(/from 1 to 480/);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("PlannerPickerModal", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 10, 18, 0) })); // Sat 10 Oct, 18:00 → Evening
  afterEach(() => vi.useRealTimers());

  it("starts on today + the current part of the day, and confirms exactly that", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<PlannerPickerModal open onClose={vi.fn()} title="Add to planner" subject="Revise Kinematics" busy={false} error={null} onConfirm={onConfirm} />);
    expect(screen.getByRole("dialog", { name: "Add to planner" })).toBeInTheDocument();
    expect(screen.getByText("Revise Kinematics")).toBeInTheDocument();
    expect(screen.getByTestId("picker-day-2026-10-10")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("picker-slot-EVENING")).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByTestId("picker-confirm"));
    expect(onConfirm).toHaveBeenCalledWith({ date: "2026-10-10", timeSlot: "EVENING" });
  });

  it("lets the student pick another day, slot and length", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<PlannerPickerModal open onClose={vi.fn()} title="Add" defaultMinutes={30} busy={false} error={null} onConfirm={onConfirm} />);
    await user.click(screen.getByTestId("picker-day-2026-10-12"));
    await user.click(screen.getByTestId("picker-slot-MORNING"));
    await user.click(screen.getByTestId("picker-minutes-60"));
    await user.click(screen.getByTestId("picker-confirm"));
    expect(onConfirm).toHaveBeenCalledWith({ date: "2026-10-12", timeSlot: "MORNING", estimatedMinutes: 60 });
  });

  it("offers the task's own length when it is not one of the presets", () => {
    render(<PlannerPickerModal open onClose={vi.fn()} title="Add" defaultMinutes={35} busy={false} error={null} onConfirm={vi.fn()} />);
    expect(screen.getByTestId("picker-minutes-35")).toHaveAttribute("aria-pressed", "true");
  });

  it("another day within 28 days can be typed in; a quick-pick day is not repeated in the field", () => {
    render(<PlannerPickerModal open onClose={vi.fn()} title="Add" busy={false} error={null} onConfirm={vi.fn()} />);
    const input = screen.getByTestId("picker-date") as HTMLInputElement;
    expect(input.min).toBe("2026-10-10");
    expect(input.max).toBe("2026-11-07");
    expect(input.value).toBe("");
  });

  it("shows best-fit slots from the timetable; tapping one selects its day and window", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const loadSuggestions = vi.fn().mockResolvedValue([{ date: "2026-10-11", start: "07:00", end: "07:45", slotMinutes: 60, window: "MORNING", subjectMatch: true }]);
    render(<PlannerPickerModal open onClose={vi.fn()} title="Schedule" loadSuggestions={loadSuggestions} busy={false} error={null} onConfirm={onConfirm} />);
    const chip = await screen.findByRole("button", { name: /Tomorrow · 07:00–07:45/ });
    expect(within(screen.getByTestId("picker-suggestions")).getByText(/your block/)).toBeInTheDocument();
    await user.click(chip);
    await user.click(screen.getByTestId("picker-confirm"));
    expect(onConfirm).toHaveBeenCalledWith({ date: "2026-10-11", timeSlot: "MORNING" });
  });

  it("shows an error, and locks the buttons while busy", () => {
    const { rerender } = render(<PlannerPickerModal open onClose={vi.fn()} title="Add" busy={false} error="Pick today or a later date." onConfirm={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Pick today or a later date.");
    rerender(<PlannerPickerModal open onClose={vi.fn()} title="Add" busy error={null} onConfirm={vi.fn()} />);
    expect(screen.getByTestId("picker-confirm")).toBeDisabled();
    expect(screen.getByTestId("picker-confirm")).toHaveTextContent("Adding…");
  });

  it("renders nothing when closed", () => {
    render(<PlannerPickerModal open={false} onClose={vi.fn()} title="Add" busy={false} error={null} onConfirm={vi.fn()} />);
    expect(screen.queryByTestId("planner-picker")).toBeNull();
  });
});

describe("Toast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows one message, replaces it with the next, and goes away by itself", () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.show("Saved.", 1000));
    expect(result.current.message).toBe("Saved.");
    act(() => vi.advanceTimersByTime(600));
    act(() => result.current.show("Added to your plan.", 1000));
    act(() => vi.advanceTimersByTime(600)); // the first timer must not have cleared the second message
    expect(result.current.message).toBe("Added to your plan.");
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.message).toBeNull();
  });

  it("is announced politely and can be dismissed", () => {
    const state = { message: "Cleared. Nice work.", show: vi.fn(), dismiss: vi.fn() };
    render(<Toast state={state} />);
    expect(screen.getByRole("status")).toHaveTextContent("Cleared. Nice work.");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(state.dismiss).toHaveBeenCalled();
  });
});

describe("SectionTabs", () => {
  const tabs = [
    { id: "a", label: "Today" },
    { id: "b", label: "Log" },
    { id: "c", label: "History" },
  ] as const;

  it("marks the current tab and changes on click and on arrow keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SectionTabs name="demo" tabs={[...tabs]} current="a" onChange={onChange} />);
    expect(screen.getByRole("tab", { name: "Today" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Log" })).toHaveAttribute("aria-selected", "false");
    await user.click(screen.getByRole("tab", { name: "History" }));
    expect(onChange).toHaveBeenLastCalledWith("c");
    screen.getByRole("tab", { name: "Today" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("b");
    screen.getByRole("tab", { name: "Today" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("c"); // wraps from the first tab to the last
  });
});

describe("revision screens", () => {
  const analytics = (over: Partial<RevisionAnalytics> = {}): RevisionAnalytics => ({
    period: "week",
    range: null,
    totals: { revisions: 3, minutes: 95, questionsSolved: 30, questionsCorrect: 17, accuracy: 56.7 },
    perSubject: [{ subjectId: 1, subjectName: "Physics", revisions: 3, minutes: 95 }],
    heatmap: [
      { chapterId: "c-never", chapterName: "Work and Energy", subjectId: 1, subjectName: "Physics", lastRevisedAt: null, daysAgo: null, revisionCount: 0, status: "never" },
      { chapterId: "c-stale", chapterName: "Laws of Motion", subjectId: 1, subjectName: "Physics", lastRevisedAt: "2026-09-01T00:00:00Z", daysAgo: 36, revisionCount: 1, status: "stale" },
      { chapterId: "c-fresh", chapterName: "Kinematics", subjectId: 1, subjectName: "Physics", lastRevisedAt: "2026-10-09T00:00:00Z", daysAgo: 1, revisionCount: 2, status: "fresh" },
    ],
    stale: [
      { chapterId: "c-never", chapterName: "Work and Energy", subjectId: 1, subjectName: "Physics", lastRevisedAt: null, daysAgo: null, revisionCount: 0, status: "never", practiceAccuracy: null },
      { chapterId: "c-stale", chapterName: "Laws of Motion", subjectId: 1, subjectName: "Physics", lastRevisedAt: "2026-09-01T00:00:00Z", daysAgo: 36, revisionCount: 1, status: "stale", practiceAccuracy: 40 },
    ],
    accuracyComparison: [{ subjectId: 1, subjectName: "Physics", revision: 56.7, practice: 70, mock: null }],
    staleAfterDays: 14,
    ...over,
  });

  it("analytics: totals, a status-labelled heatmap tile per chapter, the comparison chart", () => {
    render(<RevisionAnalyticsPanel analytics={analytics()} period="week" onPeriod={vi.fn()} error={null} onPlanChapter={vi.fn()} />);
    expect(screen.getByTestId("rev-total-count")).toHaveTextContent("3");
    expect(screen.getByTestId("rev-total-minutes")).toHaveTextContent("1h 35m");
    expect(screen.getByTestId("rev-total-accuracy")).toHaveTextContent("56.7%");
    expect(screen.getByTestId("heat-c-never")).toHaveAttribute("data-status", "never");
    expect(screen.getByTestId("heat-c-never")).toHaveTextContent("Never revised · never");
    expect(screen.getByTestId("heat-c-stale")).toHaveTextContent("Stale · 36d ago");
    expect(screen.getByTestId("heat-c-fresh")).toHaveTextContent("Fresh · yesterday");
    expect(screen.getByTestId("accuracy-bars")).toBeInTheDocument();
  });

  it("analytics: the stale list has an Add to planner button per chapter", async () => {
    const user = userEvent.setup();
    const onPlanChapter = vi.fn();
    render(<RevisionAnalyticsPanel analytics={analytics()} period="week" onPeriod={vi.fn()} error={null} onPlanChapter={onPlanChapter} />);
    const row = screen.getByTestId("stale-c-stale");
    expect(row).toHaveTextContent("last revised 36d ago");
    expect(row).toHaveTextContent("practice 40%");
    expect(screen.getByTestId("stale-c-never")).toHaveTextContent("never revised");
    await user.click(screen.getByTestId("stale-plan-c-stale"));
    expect(onPlanChapter).toHaveBeenCalledWith(expect.objectContaining({ chapterId: "c-stale", practiceAccuracy: 40 }));
  });

  it("analytics: period toggle, empty states and errors", async () => {
    const user = userEvent.setup();
    const onPeriod = vi.fn();
    render(
      <RevisionAnalyticsPanel
        analytics={analytics({ heatmap: [], stale: [], perSubject: [], accuracyComparison: [], totals: { revisions: 0, minutes: 0, questionsSolved: 0, questionsCorrect: 0, accuracy: null } })}
        period="week"
        onPeriod={onPeriod}
        error="We couldn't load your analytics."
        onPlanChapter={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't load");
    expect(screen.getByTestId("rev-total-accuracy")).toHaveTextContent("—");
    expect(screen.getByText(/Log a revision and your chapters show up here/)).toBeInTheDocument();
    expect(screen.getByText("Nothing is stale. Nice.")).toBeInTheDocument();
    await user.click(screen.getByTestId("period-month"));
    expect(onPeriod).toHaveBeenCalledWith("month");
  });

  it("analytics: a long chapter list is trimmed to start with, and can be expanded", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 30 }, (_, i) => ({ chapterId: `c${i}`, chapterName: `Chapter ${i}`, subjectId: 1, subjectName: "Physics", lastRevisedAt: null, daysAgo: i, revisionCount: 1, status: "ok" as const }));
    render(<RevisionAnalyticsPanel analytics={analytics({ heatmap: many, stale: [] })} period="all" onPeriod={vi.fn()} error={null} onPlanChapter={vi.fn()} />);
    expect(screen.getAllByTestId(/^heat-c/)).toHaveLength(24);
    await user.click(screen.getByTestId("heatmap-toggle"));
    expect(screen.getAllByTestId(/^heat-c/)).toHaveLength(30);
  });

  const task = (over: Partial<PlannerTask>): PlannerTask =>
    ({ id: "t1", taskType: "REVISION", title: "Physics · Kinematics", description: null, estimatedMinutes: 40, secondsCompleted: 0, scheduledStart: "", scheduledEnd: "", suggestedWindow: "EVENING", status: "PENDING", questionCount: null, subject: null, chapter: null, ...over }) as PlannerTask;

  it("Today: an empty day says so; a planned revision can be tapped to log it", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RevisionToday tasks={[]} loading={false} error={null} onLog={vi.fn()} />);
    expect(screen.getByTestId("revision-today-empty")).toHaveTextContent("No revision planned for today");
    const onLog = vi.fn();
    rerender(<RevisionToday tasks={[task({}), task({ id: "t2", title: "Chemistry · Mole", status: "COMPLETED", suggestedWindow: null })]} loading={false} error={null} onLog={onLog} />);
    expect(screen.getByTestId("today-task-t1")).toHaveTextContent("40m · Evening");
    expect(screen.getByTestId("today-task-t2")).toHaveTextContent("done in the planner");
    await user.click(within(screen.getByTestId("today-task-t1")).getByRole("button"));
    expect(onLog).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
  });

  const log = (over: Partial<RevisionLog> = {}): RevisionLog => ({
    id: "r1",
    subjectId: 1,
    chapterId: KIN,
    topic: null,
    revisionType: "short_notes",
    durationMinutes: 45,
    questionsSolved: 20,
    questionsCorrect: 15,
    accuracy: 75,
    errors: "forgot the sign convention",
    revisionNumber: 2,
    loggedAt: new Date(2026, 9, 10, 12, 0).toISOString(),
    createdAt: new Date(2026, 9, 10, 12, 0).toISOString(),
    ...over,
  });

  it("History: a row shows chapter, method, time, accuracy and what went wrong; its buttons call back", async () => {
    const user = userEvent.setup();
    const [onEdit, onDelete, onPlan] = [vi.fn(), vi.fn(), vi.fn()];
    render(<RevisionHistory rows={[log(), log({ id: "r2", accuracy: null, errors: null, questionsSolved: null, questionsCorrect: null })]} lookup={lookup} hasMore onLoadMore={vi.fn()} onEdit={onEdit} onDelete={onDelete} onPlan={onPlan} />);
    const row = screen.getByTestId("revision-row-r1");
    expect(row).toHaveTextContent("Kinematics");
    expect(row).toHaveTextContent("Physics · Short notes · 45m · revision #2");
    expect(row).toHaveTextContent("75%");
    expect(row).toHaveTextContent("forgot the sign convention");
    expect(within(screen.getByTestId("revision-row-r2")).queryByLabelText(/Accuracy/)).toBeNull();
    await user.click(screen.getByTestId("revision-plan-r1"));
    await user.click(screen.getByTestId("revision-edit-r1"));
    await user.click(screen.getByTestId("revision-delete-r1"));
    expect([onPlan, onEdit, onDelete].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
    expect(screen.getByTestId("revision-load-more")).toBeInTheDocument();
  });

  it("History: empty", () => {
    render(<RevisionHistory rows={[]} lookup={lookup} hasMore={false} onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onPlan={vi.fn()} />);
    expect(screen.getByTestId("revision-history-empty")).toBeInTheDocument();
  });
});

describe("backlog screens", () => {
  const item = (over: Partial<BacklogItem> = {}): BacklogItem => ({
    id: "b1",
    subjectId: 1,
    chapterId: KIN,
    topic: "Projectile motion",
    source: "manual",
    estimatedMinutes: 45,
    deadline: null,
    priority: 1,
    status: "open",
    clearedAt: null,
    scheduledFor: null,
    scheduledWindow: null,
    notes: null,
    ageDays: 2,
    isOverdue: false,
    createdAt: "2026-10-08T00:00:00.000Z",
    ...over,
  });
  const handlers = () => ({ onClear: vi.fn(), onSchedule: vi.fn(), onUnschedule: vi.fn(), onEdit: vi.fn(), onDrop: vi.fn(), onLoadMore: vi.fn() });

  it("open list: chapter, subject, priority, estimate — and the four actions call back with the item", async () => {
    const user = userEvent.setup();
    const h = handlers();
    render(<BacklogOpenList items={[item()]} lookup={lookup} hasMore={false} busyId={null} {...h} />);
    const card = screen.getByTestId("backlog-item-b1");
    expect(card).toHaveTextContent("Kinematics");
    expect(card).toHaveTextContent("Physics · Projectile motion");
    expect(screen.getByTestId("priority-b1")).toHaveTextContent("Urgent");
    expect(card).toHaveTextContent("45m");
    await user.click(screen.getByTestId("clear-b1"));
    await user.click(screen.getByTestId("schedule-b1"));
    await user.click(screen.getByTestId("edit-b1"));
    await user.click(screen.getByTestId("drop-b1"));
    for (const f of [h.onClear, h.onSchedule, h.onEdit, h.onDrop]) expect(f).toHaveBeenCalledWith(expect.objectContaining({ id: "b1" }));
  });

  it("open list: an overdue deadline, an auto-added source and a scheduled slot are visible", async () => {
    const user = userEvent.setup();
    const h = handlers();
    render(
      <BacklogOpenList
        items={[item({ id: "o", deadline: "2026-10-01", isOverdue: true, source: "auto_weekly_goal" }), item({ id: "s", status: "scheduled", scheduledFor: "2026-10-12", scheduledWindow: "EVENING" })]}
        lookup={lookup}
        hasMore
        busyId="o"
        {...h}
      />,
    );
    expect(screen.getByTestId("backlog-item-o")).toHaveTextContent(/Overdue/);
    expect(screen.getByTestId("backlog-item-o")).toHaveTextContent("Missed weekly goal");
    expect(screen.getByTestId("clear-o")).toBeDisabled(); // busy
    expect(screen.getByTestId("scheduled-s")).toHaveTextContent(/Scheduled · .* · Evening/);
    expect(screen.queryByTestId("schedule-s")).toBeNull();
    await user.click(screen.getByTestId("unschedule-s"));
    expect(h.onUnschedule).toHaveBeenCalledWith(expect.objectContaining({ id: "s" }));
    await user.click(screen.getByTestId("backlog-load-more"));
    expect(h.onLoadMore).toHaveBeenCalled();
  });

  it("open list: an empty backlog explains itself", () => {
    render(<BacklogOpenList items={[]} lookup={lookup} hasMore={false} busyId={null} {...handlers()} />);
    expect(screen.getByTestId("backlog-empty")).toHaveTextContent("Nothing on your backlog");
  });

  it("history: time to clear, dropped items, and Reopen", async () => {
    const user = userEvent.setup();
    const onReopen = vi.fn();
    const cleared = item({ id: "c", status: "cleared", createdAt: "2026-10-01T00:00:00.000Z", clearedAt: "2026-10-05T00:00:00.000Z" });
    expect(daysToClear(cleared)).toBe(4);
    expect(daysToClear(item())).toBeNull();
    expect([null, 0, 1, 4].map(clearLabel)).toEqual(["", "Cleared the same day", "Cleared in 1 day", "Cleared in 4 days"]);
    render(<BacklogHistory items={[cleared, item({ id: "d", status: "dropped" })]} lookup={lookup} hasMore={false} busyId={null} onLoadMore={vi.fn()} onReopen={onReopen} />);
    expect(screen.getByTestId("history-item-c")).toHaveTextContent("Cleared in 4 days");
    expect(screen.getByTestId("history-item-d")).toHaveTextContent("Dropped");
    await user.click(screen.getByTestId("reopen-d"));
    expect(onReopen).toHaveBeenCalledWith(expect.objectContaining({ id: "d" }));
  });

  it("the clearance ring prints its number and describes itself", () => {
    const { rerender } = render(<ClearanceRing percent={62.5} />);
    expect(screen.getByTestId("clearance-rate")).toHaveTextContent("62.5%");
    expect(screen.getByRole("img")).toHaveAccessibleName("62.5% of your backlog cleared");
    rerender(<ClearanceRing percent={null} />);
    expect(screen.getByTestId("clearance-rate")).toHaveTextContent("—");
    expect(screen.getByRole("img")).toHaveAccessibleName("No backlog items yet");
  });

  it("analytics: counts, average days, the weekly timeline, stuck items and recurring chapters", () => {
    const a: BacklogAnalytics = {
      totals: { total: 5, open: 2, scheduled: 1, cleared: 2, dropped: 0 },
      clearanceRate: 40,
      avgDaysToClear: 4.5,
      frequentChapters: [{ subjectId: 1, chapterId: KIN, chapterName: "Kinematics", subjectName: "Physics", count: 3 }],
      timeline: [{ weekStart: "2026-10-05", added: 2, cleared: 1 }],
      redFlags: [{ id: "x", subjectId: 1, subjectName: "Physics", chapterId: LAWS, chapterName: "Laws of Motion", topic: null, status: "open", priority: 3, ageDays: 45 }],
      redFlagAfterDays: 30,
    };
    render(<BacklogAnalyticsPanel analytics={a} error={null} />);
    expect(screen.getByTestId("clearance-rate")).toHaveTextContent("40%");
    expect(screen.getByTestId("backlog-open-count")).toHaveTextContent("3");
    expect(screen.getByTestId("backlog-cleared-count")).toHaveTextContent("2");
    expect(screen.getByTestId("backlog-avg-days")).toHaveTextContent("4.5");
    expect(screen.getByTestId("backlog-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("backlog-red-flags")).toHaveTextContent("Laws of Motion");
    expect(screen.getByTestId("backlog-red-flags")).toHaveTextContent("45 days");
    expect(screen.getByText("3×")).toBeInTheDocument();
  });

  it("analytics: a student with no items sees dashes, not NaN", () => {
    const a: BacklogAnalytics = { totals: { total: 0, open: 0, scheduled: 0, cleared: 0, dropped: 0 }, clearanceRate: null, avgDaysToClear: null, frequentChapters: [], timeline: [], redFlags: [], redFlagAfterDays: 30 };
    render(<BacklogAnalyticsPanel analytics={a} error={null} />);
    expect(screen.getByTestId("clearance-rate")).toHaveTextContent("—");
    expect(screen.getByTestId("backlog-avg-days")).toHaveTextContent("—");
    expect(screen.queryByTestId("backlog-timeline")).toBeNull();
    expect(screen.getByText("Nothing is stuck.")).toBeInTheDocument();
  });
});

describe("practice screens", () => {
  const practice = (over: Partial<PracticeLog> = {}): PracticeLog => ({
    id: "p1",
    subjectId: 1,
    chapterId: KIN,
    topic: null,
    source: "hcv",
    sourceDetail: null,
    questionsAttempted: 10,
    questionsCorrect: 7,
    questionsWrong: 2,
    questionsSkipped: 1,
    accuracy: 70,
    durationMinutes: 25,
    difficulty: "medium",
    loggedAt: new Date(2026, 9, 10, 12, 0).toISOString(),
    notes: null,
    createdAt: new Date(2026, 9, 10, 12, 0).toISOString(),
    ...over,
  });

  it("sessions: score, accuracy, source and a follow-up button; \"Other\" shows what the student typed", async () => {
    const user = userEvent.setup();
    const [onEdit, onDelete, onPlan] = [vi.fn(), vi.fn(), vi.fn()];
    render(<PracticeSessions rows={[practice(), practice({ id: "p2", source: "other", sourceDetail: "Tutor sheet", questionsCorrect: 3, questionsAttempted: 10, accuracy: 30 })]} lookup={lookup} hasMore={false} onLoadMore={vi.fn()} onEdit={onEdit} onDelete={onDelete} onPlan={onPlan} />);
    const row = screen.getByTestId("practice-row-p1");
    expect(row).toHaveTextContent("Kinematics");
    expect(row).toHaveTextContent("HC Verma");
    expect(row).toHaveTextContent("25m");
    expect(screen.getByTestId("practice-score-p1")).toHaveTextContent("7/10");
    expect(screen.getByTestId("practice-score-p1")).toHaveTextContent("70%");
    expect(screen.getByTestId("practice-row-p2")).toHaveTextContent("Tutor sheet");
    await user.click(screen.getByTestId("practice-plan-p1"));
    await user.click(screen.getByTestId("practice-edit-p1"));
    await user.click(screen.getByTestId("practice-delete-p1"));
    expect([onPlan, onEdit, onDelete].map((f) => f.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it("sessions: empty", () => {
    render(<PracticeSessions rows={[]} lookup={lookup} hasMore={false} onLoadMore={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onPlan={vi.fn()} />);
    expect(screen.getByTestId("practice-empty")).toBeInTheDocument();
  });

  const analytics = (over: Partial<PracticeAnalytics> = {}): PracticeAnalytics => {
    const ch = (id: string, name: string, accuracy: number, attempted: number, band: "red" | "yellow" | "green", lowSample = false) => ({ chapterId: id, chapterName: name, subjectId: 1, subjectName: "Physics", attempted, correct: Math.round((accuracy / 100) * attempted), accuracy, band, lowSample });
    const weakness = [ch("a", "Kinematics", 30, 20, "red"), ch("b", "Laws of Motion", 60, 20, "yellow"), ch("c", "Work and Energy", 90, 4, "green", true)];
    return {
      period: "week",
      range: null,
      scope: { subjectId: null, chapterId: null },
      totals: { sessions: 3, attempted: 44, correct: 26, wrong: 15, skipped: 3, accuracy: 59.1, minutes: 70, activeDays: 2 },
      byChapter: weakness,
      byTopic: [{ chapterId: "a", topic: "Projectile", attempted: 12, correct: 3, accuracy: 25 }],
      byDay: [
        { date: "2026-10-05", attempted: 20, correct: 6, accuracy: 30 },
        { date: "2026-10-06", attempted: 0, correct: 0, accuracy: null },
      ],
      byWeek: [{ weekStart: "2026-10-05", attempted: 44, correct: 26, accuracy: 59.1 }],
      bySource: [{ source: "hcv", attempted: 30, correct: 15, accuracy: 50, share: 68.2 }, { source: "ncert", attempted: 14, correct: 11, accuracy: 78.6, share: 31.8 }],
      speed: [{ difficulty: "medium", questions: 30, minutes: 60, questionsPerMinute: 0.5 }],
      speedTrend: [{ weekStart: "2026-10-05", questions: 30, minutes: 60, questionsPerMinute: 0.5 }],
      weakness,
      ...over,
    };
  };

  it("analytics: the weakness heatmap colours chapters red / yellow / green and flags thin samples", () => {
    render(<PracticeAnalyticsPanel analytics={analytics()} period="week" onPeriod={vi.fn()} subjects={SUBJECTS} subjectId={null} onSubject={vi.fn()} error={null} />);
    expect(screen.getByTestId("prac-total-questions")).toHaveTextContent("44");
    expect(screen.getByTestId("prac-total-accuracy")).toHaveTextContent("59.1%");
    expect(screen.getByTestId("weak-a")).toHaveAttribute("data-band", "red");
    expect(screen.getByTestId("weak-a")).toHaveTextContent("30% · Weak");
    expect(screen.getByTestId("weak-b")).toHaveAttribute("data-band", "yellow");
    expect(screen.getByTestId("weak-c")).toHaveAttribute("data-band", "green");
    expect(screen.getByTestId("weak-c")).toHaveTextContent("only a few questions so far");
    const order = screen.getAllByTestId(/^weak-/).map((el) => el.getAttribute("data-testid"));
    expect(order).toEqual(["weak-a", "weak-b", "weak-c"]); // weakest first
  });

  it("analytics: charts, speed by difficulty, source split and topics are all there", () => {
    render(<PracticeAnalyticsPanel analytics={analytics()} period="week" onPeriod={vi.fn()} subjects={SUBJECTS} subjectId={null} onSubject={vi.fn()} error={null} />);
    expect(screen.getByTestId("weekly-accuracy")).toBeInTheDocument();
    expect(screen.getByTestId("speed-line")).toBeInTheDocument();
    expect(screen.getByTestId("source-donut")).toBeInTheDocument();
    expect(screen.getByTestId("speed-medium")).toHaveTextContent("0.5/min");
    expect(screen.getByTestId("source-section")).toHaveTextContent("HC Verma");
    expect(screen.getByTestId("source-section")).toHaveTextContent("68.2% · 50%");
    expect(screen.getByTestId("day-strip")).toBeInTheDocument();
    expect(screen.getByText("Projectile")).toBeInTheDocument();
  });

  it("analytics: no speed data prompts for minutes; \"all time\" hides the day strip; the subject filter calls back", async () => {
    const user = userEvent.setup();
    const onSubject = vi.fn();
    render(<PracticeAnalyticsPanel analytics={analytics({ speed: [], speedTrend: [] })} period="all" onPeriod={vi.fn()} subjects={SUBJECTS} subjectId={null} onSubject={onSubject} error={null} />);
    expect(screen.getByTestId("speed-section")).toHaveTextContent("Add the minutes to your practice logs");
    expect(screen.queryByTestId("day-strip")).toBeNull();
    await user.selectOptions(screen.getByTestId("practice-analytics-subject"), "1");
    expect(onSubject).toHaveBeenCalledWith(1);
  });

  it("analytics: an empty period says so", () => {
    render(<PracticeAnalyticsPanel analytics={analytics({ totals: { sessions: 0, attempted: 0, correct: 0, wrong: 0, skipped: 0, accuracy: null, minutes: 0, activeDays: 0 }, weakness: [] })} period="week" onPeriod={vi.fn()} subjects={SUBJECTS} subjectId={null} onSubject={vi.fn()} error={null} />);
    expect(screen.getByTestId("practice-analytics-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("weakness-heatmap")).toBeNull();
  });
});

describe("HubCard", () => {
  it("links to its screen and shows the key stat; loading shows a placeholder, a failed stat a dash", () => {
    const { rerender } = render(<HubCard href="/logs/revision" title="Revision" blurb="b" stat={{ value: "3", caption: "revisions today" }} loading={false} testId="hub-r" />);
    expect(screen.getByTestId("hub-r")).toHaveAttribute("href", "/logs/revision");
    expect(screen.getByTestId("hub-r-value")).toHaveTextContent("3");
    expect(screen.getByText("revisions today")).toBeInTheDocument();
    rerender(<HubCard href="/logs/revision" title="Revision" blurb="b" stat={null} loading={false} testId="hub-r" />);
    expect(screen.getByTestId("hub-r-value")).toHaveTextContent("—");
    rerender(<HubCard href="/logs/revision" title="Revision" blurb="b" stat={null} loading testId="hub-r" />);
    expect(screen.queryByTestId("hub-r-value")).toBeNull();
  });
});

describe("SubjectsError", () => {
  it("explains the empty pickers and offers a reload", async () => {
    const { SubjectsError } = await import("@/components/study/SubjectsError");
    render(<SubjectsError />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load your subjects and chapters/);
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });
});
