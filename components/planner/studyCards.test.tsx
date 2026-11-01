// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanExplanation } from "@/components/planner/PlanExplanation";
import { PlanHeaderActions } from "@/components/planner/PlanHeaderActions";
import { SlotBand } from "@/components/planner/SlotBand";
import { StudyTaskCard } from "@/components/planner/StudyTaskCard";
import { TimelineRail, buildTimeline } from "@/components/planner/TimelineRail";
import { WeeklyProgressStrip } from "@/components/planner/WeeklyProgressStrip";
import { suggestionSections } from "@/components/planner/PlanSuggestions";
import type { usePlanDay } from "@/components/planner/usePlanDay";
import type { Band, PlanDay, PlanTask } from "@/lib/api/plannerV2";
import { energyOf, explainPlan, taskInstruction } from "@/lib/planner/taskText";

vi.mock("@/lib/telemetry/planner", () => ({ trackPlanner: vi.fn() }));
vi.mock("@/lib/api/goals", () => ({ getCurrentGoals: vi.fn() }));
vi.mock("@/components/planner/AddTaskSheet", () => ({ AddTaskSheet: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Add a task" /> : null) }));
// The real modal pulls in an SVG asset the test runner cannot load; a plain stand-in is enough here.
vi.mock("@/components/ui/ConfirmModal", () => ({
  ConfirmModal: ({ open, title, confirmLabel, onConfirm }: { open: boolean; title: string; confirmLabel: string; onConfirm: () => void }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <button onClick={onConfirm}>{confirmLabel}</button>
      </div>
    ) : null,
}));
import { getCurrentGoals } from "@/lib/api/goals";

const ID = "11111111-1111-4111-8111-111111111111";

const task = (over: Partial<PlanTask> = {}): PlanTask => ({
  id: ID, planId: "p", kind: "lecture", title: "Watch lecture — Kinematics", description: null, subjectId: 1, subject: "physics", chapterId: "c1", chapterName: "Kinematics", topic: "Vectors and dimensions",
  startMin: 9 * 60, endMin: 10 * 60 + 30, estimatedMinutes: 90, plannedUnits: 2, questionCount: null, status: "pending", origin: "goal", contentSource: null, contentSourceLabel: null, generatedBy: "engine",
  fixedSlot: false, weeklyGoalId: null, backlogItemId: null, secondsCompleted: 0, actualMinutes: null, linkedSessionLogId: null, linkedPracticeLogId: null, linkedRevisionLogId: null, linkedMockLogId: null, warning: null, why: null, suggested: false, isProtected: false, locked: false, ...over,
});

const noop = vi.fn();
const actions = { onStart: noop, onMarkDone: noop, onSkip: noop, onTomorrow: noop, onDelete: noop };

beforeEach(() => vi.clearAllMocks());

describe("StudyTaskCard", () => {
  it("a lecture task shows every field: chips, chapter, exactly what to do, duration, part of day, time range, resource and an outlined Start", () => {
    render(<StudyTaskCard task={task()} {...actions} />);
    expect(screen.getByTestId("chip-subject")).toHaveTextContent("Physics");
    expect(screen.getByTestId("chip-type")).toHaveTextContent("New Learning");
    expect(screen.getByTestId("chip-status")).toHaveTextContent("Pending");
    expect(screen.getByTestId("task-chapter")).toHaveTextContent("Kinematics");
    expect(screen.getByTestId("task-instruction")).toHaveTextContent("Watch 2 lectures, about 45 min each · Vectors and dimensions");
    expect(screen.getByTestId("meta-duration")).toHaveTextContent("1h 30m");
    expect(screen.getByTestId("meta-energy")).toHaveTextContent("Morning");
    expect(screen.getByTestId("meta-range")).toHaveTextContent("9:00 AM – 10:30 AM");
    expect(screen.getByTestId("meta-resource")).toHaveAttribute("href", expect.stringContaining("Kinematics"));
    const cta = screen.getByTestId("task-cta");
    expect(cta).toHaveTextContent("Start Session");
    expect(cta.className).toContain("bg-transparent");
    expect(cta.className).not.toMatch(/bg-cta|E8623F/);
    expect(screen.getByTestId("task-check")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("task-menu")).toBeInTheDocument();
  });

  it("a practice task says how many questions, from where, on what", () => {
    render(<StudyTaskCard task={task({ kind: "practice", subject: "chemistry", chapterName: "Mole Concept", topic: "Stoichiometry", questionCount: 25, contentSourceLabel: "DC Pandey", plannedUnits: 1 })} {...actions} />);
    expect(screen.getByTestId("chip-type")).toHaveTextContent("Practice");
    expect(screen.getByTestId("task-instruction")).toHaveTextContent("Solve 25 questions · DC Pandey · Stoichiometry");
    expect(screen.getByTestId("task-cta")).toHaveTextContent("Start Practice");
  });

  it("a revision task says the type and the slot; a mock says its kind and length", () => {
    const { rerender } = render(<StudyTaskCard task={task({ kind: "revision", chapterName: "Limits", topic: null, contentSourceLabel: "Short notes", plannedUnits: 1, estimatedMinutes: 30 })} {...actions} />);
    expect(screen.getByTestId("task-instruction")).toHaveTextContent("Short notes revision · 30-min slot");
    expect(screen.getByTestId("task-cta")).toHaveTextContent("Start Revision");
    // a revision task links to that chapter's due mistakes in the notebook; other kinds do not
    expect(screen.getByTestId("meta-mistakes")).toHaveAttribute("href", "/notebooks/review?chapter=c1");
    rerender(<StudyTaskCard task={task({ kind: "mock", subject: null, chapterName: null, chapterId: null, title: "Full mock (JEE Main)", estimatedMinutes: 180, topic: null, plannedUnits: 1 })} {...actions} />);
    expect(screen.getByTestId("task-chapter")).toHaveTextContent("Full mock (JEE Main)");
    expect(screen.getByTestId("task-instruction")).toHaveTextContent("Full mock (JEE Main) · 3h");
    expect(screen.getByTestId("task-cta")).toHaveTextContent("Start Mock");
    expect(screen.queryByTestId("meta-resource")).toBeNull();
    expect(screen.queryByTestId("meta-mistakes")).toBeNull();
  });

  it("a task in progress resumes, with a saffron outline and still no fill", () => {
    render(<StudyTaskCard task={task({ status: "in_progress" })} {...actions} />);
    const cta = screen.getByTestId("task-cta");
    expect(cta).toHaveTextContent("Resume Session");
    expect(cta.className).toContain("text-warning");
    expect(cta.className).toContain("border-warning/60");
    expect(cta.className).not.toMatch(/bg-cta/);
    expect(screen.getByTestId("chip-status")).toHaveTextContent("In progress");
  });

  it("every open status keeps an outlined button", () => {
    for (const status of ["pending", "in_progress"] as const) {
      const { unmount } = render(<StudyTaskCard task={task({ status })} {...actions} />);
      expect(screen.getByTestId("task-cta").className).not.toMatch(/bg-cta|bg-\[#E8623F\]/);
      unmount();
    }
  });

  it("a finished task has no button or menu and its tick is checked", () => {
    render(<StudyTaskCard task={task({ status: "done", actualMinutes: 80 })} {...actions} />);
    expect(screen.queryByTestId("task-cta")).toBeNull();
    expect(screen.queryByTestId("task-menu")).toBeNull();
    expect(screen.getByTestId("task-check")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Done in 1h 20m")).toBeInTheDocument();
  });

  it("the buttons call back: Start, tick, and the menu's Mark done / Skip / Reschedule / Delete", async () => {
    const onStart = vi.fn(), onMarkDone = vi.fn(), onSkip = vi.fn(), onTomorrow = vi.fn(), onDelete = vi.fn();
    render(<StudyTaskCard task={task()} onStart={onStart} onMarkDone={onMarkDone} onSkip={onSkip} onTomorrow={onTomorrow} onDelete={onDelete} />);
    await userEvent.click(screen.getByTestId("task-cta"));
    expect(onStart).toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("task-check"));
    expect(onMarkDone).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByTestId("task-menu"));
    expect(screen.getAllByRole("menuitem").map((m) => m.textContent)).toEqual(["Mark done", "Skip", "Reschedule to tomorrow", "Delete"]);
    await userEvent.click(screen.getByTestId("menu-skip"));
    expect(onSkip).toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("task-menu"));
    await userEvent.click(screen.getByTestId("menu-tomorrow"));
    expect(onTomorrow).toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("task-menu"));
    await userEvent.click(screen.getByTestId("menu-delete"));
    expect(onDelete).toHaveBeenCalled();
  });

  it("a mock keeps its slot, so there is no reschedule", async () => {
    render(<StudyTaskCard task={task({ kind: "mock", fixedSlot: true })} {...actions} />);
    await userEvent.click(screen.getByTestId("task-menu"));
    expect(screen.queryByTestId("menu-tomorrow")).toBeNull();
  });
});

describe("SlotBand", () => {
  const band: Band = { chip: "meal", startMin: 13 * 60, endMin: 13 * 60 + 45 };

  it("is a thin dim band with the slot's name, length and time, and nothing to press but the band", () => {
    render(<SlotBand band={band} />);
    const el = screen.getByTestId("slot-band");
    expect(el).toHaveTextContent("Meal · 45m · 1:00 PM – 1:45 PM");
    expect(within(el).getByRole("button").className).toMatch(/h-11/);
    expect(within(el).getByRole("button").className).toMatch(/bg-black\/\[0\.03\]/);
    expect(within(el).queryByRole("checkbox")).toBeNull();
    expect(within(el).queryByTestId("task-cta")).toBeNull();
    expect(within(el).queryByTestId("task-menu")).toBeNull();
    expect(within(el).queryByText(/^Start/)).toBeNull();
  });

  it("opens a small note with the details and a way to the timetable", async () => {
    render(<SlotBand band={band} />);
    await userEvent.click(screen.getByRole("button"));
    const pop = screen.getByTestId("slot-popover");
    expect(pop).toHaveTextContent("1:00 PM – 1:45 PM");
    expect(within(pop).getByRole("link")).toHaveAttribute("href", "/timetable");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("slot-popover")).toBeNull();
  });
});

describe("TimelineRail", () => {
  const bands: Band[] = [
    { chip: "sleep", startMin: 0, endMin: 6 * 60 },
    { chip: "meal", startMin: 8 * 60, endMin: 8 * 60 + 30 },
    { chip: "school", startMin: 9 * 60, endMin: 14 * 60 },
    { chip: "meal", startMin: 14 * 60, endMin: 14 * 60 + 30 },
    { chip: "exercise", startMin: 18 * 60, endMin: 19 * 60 },
    { chip: "sleep", startMin: 23 * 60, endMin: 24 * 60 },
  ];
  const tasks = [task({ id: "a", startMin: 10 * 60, endMin: 11 * 60 }), task({ id: "b", startMin: 15 * 60, endMin: 16 * 60 })];

  it("'all' is the whole waking day and never shows sleep", () => {
    const { rows } = buildTimeline(tasks, bands, null, "all");
    expect(rows.filter((r) => r.type === "band").map((r) => (r.type === "band" ? r.band.chip : ""))).toEqual(["meal", "school", "meal", "exercise"]);
  });

  it("'between' keeps only what falls between the first and last study task", () => {
    const { rows } = buildTimeline(tasks, bands, null, "between");
    // the school block starts before the first task, so only the 14:00 meal falls between 10:00 and 16:00
    expect(rows.filter((r) => r.type === "band").map((r) => (r.type === "band" ? r.band.chip : ""))).toEqual(["meal"]);
    const wide = buildTimeline([task({ id: "a", startMin: 7 * 60, endMin: 8 * 60 }), task({ id: "b", startMin: 20 * 60, endMin: 21 * 60 })], bands, null, "between");
    expect(wide.rows.filter((r) => r.type === "band")).toHaveLength(4);
  });

  it("'none' is the study tasks alone, ordered by time, with a Now line in its place", () => {
    const { rows } = buildTimeline([tasks[1]!, tasks[0]!], bands, 12 * 60, "none");
    expect(rows.map((r) => (r.type === "task" ? r.task.id : r.type))).toEqual(["a", "now", "b"]);
  });

  it("a task with no slot goes last under 'Any time'", () => {
    const { rows, floating } = buildTimeline([...tasks, task({ id: "f", startMin: null, endMin: null })], bands, null, "none");
    expect(rows).toHaveLength(2);
    expect(floating.map((t) => t.id)).toEqual(["f"]);
  });

  it("renders the Now marker, time labels, dim bands and the cards it is given", () => {
    render(<TimelineRail tasks={tasks} bands={bands} bandMode="all" nowMin={12 * 60 + 15} renderTask={(t) => <div data-testid="card">{t.id}</div>} />);
    expect(screen.getByTestId("now-marker")).toHaveTextContent("Now");
    expect(screen.getAllByTestId("card")).toHaveLength(2);
    expect(screen.getAllByTestId("slot-band")).toHaveLength(4);
    expect(screen.getByText("10:00 AM")).toBeInTheDocument();
  });
});

describe("taskText", () => {
  it("names the part of the day", () => {
    expect([8 * 60, 13 * 60, 18 * 60, 22 * 60].map(energyOf)).toEqual(["Morning", "Afternoon", "Evening", "Night"]);
    expect(energyOf(null)).toBeNull();
  });

  it("a single lecture and a self-study block read plainly", () => {
    expect(taskInstruction(task({ plannedUnits: 1, estimatedMinutes: 60, topic: null }))).toBe("Watch the lecture, about 1h");
    expect(taskInstruction(task({ kind: "self_study", topic: null, estimatedMinutes: 45 }))).toBe("Study and make notes for 45m");
    expect(taskInstruction(task({ kind: "backlog", topic: "Optics" }))).toBe("Clear this backlog item · Optics");
  });

  it("explains the plan from what it holds, never with a blank", () => {
    const day = { plan: null, tasks: [task({ origin: "rollover" }), task({ id: "x", origin: "sr", kind: "revision" }), task({ id: "y", origin: "sr", kind: "revision" })] } as Pick<PlanDay, "tasks" | "plan">;
    expect(explainPlan(day, { weakChapter: "Kinematics" })).toBe("Clearing 1 carry-over from yesterday and 2 spaced revisions due today. Kinematics gets a block: your practice accuracy there is below average.");
    expect(explainPlan(day, { energyLabel: "Drained" })).toMatch(/lighter because you checked in with low energy/);
    expect(explainPlan({ plan: null, tasks: [task()] })).toBe("Built from your weekly goals and your free hours today. Subjects are spread to match your timetable and your best study hours.");
    expect(explainPlan({ plan: null, tasks: [] })).toMatch(/Nothing is planned yet/);
  });
});

describe("PlanExplanation", () => {
  it("shows a bold first line and the text, clamped to two lines", () => {
    render(<PlanExplanation text="Clearing 1 carry-over. Subjects follow your timetable." />);
    expect(screen.getByTestId("plan-explanation")).toHaveTextContent("Plan for today");
    expect(screen.getByTestId("plan-explanation-text").className).toContain("sm:line-clamp-2");
    expect(screen.getByTestId("plan-explanation").querySelector("svg")).not.toBeNull();
  });
  it("is a skeleton while loading, never a blank card", () => {
    render(<PlanExplanation text={null} loading />);
    expect(screen.getByTestId("plan-explanation-loading")).toBeInTheDocument();
  });
});

describe("WeeklyProgressStrip", () => {
  it("shows the week's bar, the count and the way to the full week", async () => {
    vi.mocked(getCurrentGoals).mockResolvedValue({ success: true, data: { weekStart: "", weekEnd: "", isCurrentWeek: true, daysLeft: 3, carryOverCandidates: [], summary: { total: 5, done: 2, percent: 40 }, goals: [{ status: "ACTIVE" }] as never } });
    render(<WeeklyProgressStrip />);
    expect(await screen.findByTestId("weekly-summary")).toHaveTextContent("2 of 5 goals done · 40% complete");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByTestId("view-full-week")).toHaveAttribute("href", "/goals");
  });
  it("asks for goals when there are none", async () => {
    vi.mocked(getCurrentGoals).mockResolvedValue({ success: true, data: { weekStart: "", weekEnd: "", isCurrentWeek: true, daysLeft: 3, carryOverCandidates: [], summary: { total: 0, done: 0, percent: 0 }, goals: [] } });
    render(<WeeklyProgressStrip />);
    expect(await screen.findByTestId("weekly-progress")).toHaveAttribute("data-state", "empty");
  });
});

describe("PlanHeaderActions", () => {
  type Plan = ReturnType<typeof usePlanDay>;
  const day = (over: Partial<PlanDay> = {}): PlanDay => ({
    date: "2026-10-25", isToday: true, mode: "auto", plan: { id: "p", version: 1, generatedBy: "engine", engineVersion: 2, budgetMinutes: 300, warnings: [], generatedAt: "" },
    tasks: [], bands: [], studyBlocks: [], slotSource: "timetable", summary: { plannedMinutes: 0, doneMinutes: 0, plannedCount: 0, doneCount: 0, percent: 0 },
    regenerate: { kind: "regenerate", used: 0, limit: 5, remaining: 5, resetsAt: "" }, lightDay: false, lightDayOffer: null, phase: { id: "build", label: "Build" }, daysToExam: 200, capacity: { slotMinutes: 420, factor: 0.85, plannedMinutes: 300 }, suggestions: null, ...over,
  });
  const plan = (d: PlanDay | null, over: Partial<Plan> = {}): Plan => ({ status: "ready", day: d, error: null, building: false, refresh: vi.fn().mockResolvedValue(undefined), build: vi.fn().mockResolvedValue(null), ...over }) as unknown as Plan;

  it("shows Regenerate and Add task inline, with the daily counter", () => {
    render(<PlanHeaderActions plan={plan(day())} notify={vi.fn()} />);
    expect(screen.getByTestId("regenerate")).toHaveTextContent("Replan");
    expect(screen.getByTestId("add-task")).toHaveTextContent("Add task");
    expect(screen.getByTestId("regen-counter")).toHaveTextContent("5 left today");
    for (const id of ["regenerate", "add-task"]) expect(screen.getByTestId(id).className).not.toMatch(/bg-cta/);
  });

  it("asks before it rebuilds, then rebuilds", async () => {
    const p = plan(day());
    render(<PlanHeaderActions plan={p} notify={vi.fn()} />);
    await userEvent.click(screen.getByTestId("regenerate"));
    expect(p.build).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    await waitFor(() => expect(p.build).toHaveBeenCalledWith("REGENERATE"));
  });

  it("is off when the day's rebuilds are used up, and hidden in manual mode", () => {
    const { rerender } = render(<PlanHeaderActions plan={plan(day({ regenerate: { kind: "regenerate", used: 5, limit: 5, remaining: 0, resetsAt: "" } }))} notify={vi.fn()} />);
    expect(screen.getByTestId("regenerate")).toBeDisabled();
    rerender(<PlanHeaderActions plan={plan(day({ mode: "manual" }))} notify={vi.fn()} />);
    expect(screen.queryByTestId("regenerate")).toBeNull();
    expect(screen.getByTestId("add-task")).toBeInTheDocument();
  });

  it("opens the add-task sheet", async () => {
    render(<PlanHeaderActions plan={plan(day())} notify={vi.fn()} />);
    await userEvent.click(screen.getByTestId("add-task"));
    expect(screen.getByRole("dialog", { name: "Add a task" })).toBeInTheDocument();
  });
});

describe("suggestionSections", () => {
  const base = { date: "d", isToday: true, plan: null, bands: [], studyBlocks: [], slotSource: "timetable" as const, summary: { plannedMinutes: 0, doneMinutes: 0, plannedCount: 0, doneCount: 0, percent: 0 }, regenerate: { kind: "r", used: 0, limit: 5, remaining: 5, resetsAt: "" }, lightDay: false, lightDayOffer: null, phase: { id: "build", label: "Build" }, daysToExam: 200, capacity: { slotMinutes: 420, factor: 0.85, plannedMinutes: 300 } };

  it("in manual mode offers one-tap adds", async () => {
    const onAdd = vi.fn();
    const sections = suggestionSections({ ...base, mode: "manual", tasks: [], suggestions: { revisions: [{ queueId: "q", chapterId: "c", chapterName: "Limits", subject: "maths", subjectId: 3, minutes: 30, dueOn: "" }], backlog: [] } }, onAdd);
    expect(sections.map((s) => s.title)).toEqual(["Suggested revisions due today", "Backlog items"]);
    render(<div>{sections[0]!.body}</div>);
    await userEvent.click(screen.getByTestId("add-suggested-revision"));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ kind: "revision", subjectId: 3, chapterId: "c", origin: "sr" }));
  });

  it("in auto mode shows where the plan already holds them", () => {
    const sections = suggestionSections({ ...base, mode: "auto", suggestions: null, tasks: [task({ origin: "sr", kind: "revision", chapterName: "Limits" })] }, vi.fn());
    render(<div>{sections[0]!.body}</div>);
    expect(screen.getByText("Revise Limits")).toBeInTheDocument();
    expect(screen.queryByTestId("add-suggested-revision")).toBeNull();
  });
});
