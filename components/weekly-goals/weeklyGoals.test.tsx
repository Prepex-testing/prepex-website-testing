// @vitest-environment jsdom
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddGoalPanel } from "@/components/weekly-goals/AddGoalPanel";
import { GoalCard } from "@/components/weekly-goals/GoalCard";
import { SubjectSection } from "@/components/weekly-goals/SubjectSection";
import { WeeklyCapacityHeader } from "@/components/weekly-goals/WeeklyCapacityHeader";
import { CoralButton } from "@/components/ui/CoralButton";
import { GhostButton } from "@/components/ui/GhostButton";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { Goal } from "@/lib/api/goals";
import type { GoalDefaults } from "@/lib/api/plannerV2";
import { goalInstruction, groupGoals } from "@/lib/goals/display";

vi.mock("@/lib/api/backlogItems", () => ({ listBacklogItems: vi.fn() }));
import { listBacklogItems } from "@/lib/api/backlogItems";

vi.mock("@/lib/focus/startFocusSession", () => ({ startFocusSession: vi.fn() }));
import { startFocusSession } from "@/lib/focus/startFocusSession";

const CH = "11111111-1111-4111-8111-111111111111";
const CH2 = "22222222-2222-4222-8222-222222222222";
const subjects: SubjectChapters[] = [
  { subjectId: 1, subjectCode: "PHY", subjectName: "Physics", chapters: [{ id: CH, subjectId: 1, name: "Kinematics", sequenceOrder: 1, isActive: true }] },
  { subjectId: 2, subjectCode: "CHE", subjectName: "Chemistry", chapters: [{ id: CH2, subjectId: 2, name: "Mole Concept", sequenceOrder: 1, isActive: true }] },
  { subjectId: 3, subjectCode: "MAT", subjectName: "Maths", chapters: [] },
];

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: "g1", weekStart: "2026-10-19", subjectId: 1, chapterId: CH, topic: null, type: "LECTURES", target: 5, unit: "COUNT", status: "ACTIVE", source: "STUDENT",
  progressSelfReport: 2, carriedFromGoalId: null, progress: { current: 2, target: 5, unit: "COUNT", percent: 40, complete: false },
  minutesPerUnit: 60, totalMinutes: 300, practiceSource: null, revisionType: null, targetAccuracy: null, mockType: null, examPattern: null,
  fixedDate: null, fixedStartTime: null, fixedEndTime: null, backlogItemId: null, ...over,
});

const defaults = (lecture = 60, source: "default" | "history" = "default"): GoalDefaults => ({
  lectureMinutes: { value: lecture, source, samples: source === "history" ? 6 : 0 },
  practiceSessionMinutes: { value: 60, source: "default", samples: 0 },
  revisionMinutes: { value: 30, source: "default", samples: 0 },
  minutesPerQuestion: { value: 2.5, source: "default", samples: 0 },
  selfStudyChunkMinutes: 45,
});

beforeEach(() => vi.clearAllMocks());

const coralCount = (root: ParentNode) => [...root.querySelectorAll("button, a")].filter((el) => /(^|\s)bg-brand-coral(\s|$)/.test(el.className)).length;

describe("WeeklyCapacityHeader", () => {
  const base = { weekRange: "19 – 25 Oct", daysLeftLabel: "4 days left", weekWord: "this week", done: 1, total: 4, percent: 25, onJumpToIncomplete: vi.fn(), action: <button type="button">Suggest</button> };

  it("says how many hours the week holds, the daily share, and how much of it is allocated", () => {
    render(<WeeklyCapacityHeader {...base} availableMinutes={1260} allocatedMinutes={630} />);
    expect(screen.getByTestId("hours-available")).toHaveTextContent("You have 21 hours available this week");
    expect(screen.getByTestId("hours-per-day")).toHaveTextContent("~3h per day");
    expect(screen.getByTestId("capacity-label")).toHaveTextContent("10h 30m of 21h allocated · 50% full");
    expect(screen.getByTestId("capacity-fill")).toHaveStyle({ width: "50%" });
    expect(screen.getByTestId("week-summary")).toHaveTextContent("1/4 done · 25%");
    expect(screen.getByTestId("week-summary").className).not.toContain("border-saffron");
  });

  it("never paints the bar coral or green, and turns amber with a plain message when over-committed", () => {
    const { container } = render(<WeeklyCapacityHeader {...base} availableMinutes={600} allocatedMinutes={750} />);
    expect(screen.getByTestId("capacity-label")).toHaveTextContent("Over-committed by 2h 30m. Reduce or redistribute.");
    expect(screen.getByTestId("capacity-fill")).toHaveStyle({ width: "100%" });
    expect(screen.getByTestId("capacity-fill").className).toContain("D97706");
    expect(container.innerHTML).not.toMatch(/bg-cta|bg-brand-coral|success/);
  });

  it("gives the completion pill a saffron border when every goal is done, and jumps to the first open goal when pressed", async () => {
    const onJump = vi.fn();
    const { rerender } = render(<WeeklyCapacityHeader {...base} availableMinutes={600} allocatedMinutes={300} onJumpToIncomplete={onJump} />);
    await userEvent.click(screen.getByTestId("week-summary"));
    expect(onJump).toHaveBeenCalledTimes(1);
    rerender(<WeeklyCapacityHeader {...base} done={4} percent={100} availableMinutes={600} allocatedMinutes={300} onJumpToIncomplete={onJump} />);
    expect(screen.getByTestId("week-summary").className).toContain("border-saffron");
  });

  it("leaves out the hours rows until the week's hours are known", () => {
    render(<WeeklyCapacityHeader {...base} availableMinutes={null} allocatedMinutes={300} />);
    expect(screen.queryByTestId("capacity")).toBeNull();
    expect(screen.getByTestId("week-summary")).toBeInTheDocument();
  });
});

describe("AddGoalPanel", () => {
  const props = { subjects, existing: [] as Goal[], saving: false, error: null, weekStart: "2026-10-26", onCancel: vi.fn() };

  it("is a compact card, never wider than 640px", () => {
    render(<AddGoalPanel {...props} onSave={vi.fn()} />);
    expect(screen.getByTestId("goal-composer").className).toContain("max-w-[640px]");
  });

  it("saves the form as it stands with Save goal, writing minutesPerUnit from the student's own median", async () => {
    const onSave = vi.fn();
    render(<AddGoalPanel {...props} defaults={defaults(75, "history")} onSave={onSave} />);
    await userEvent.click(screen.getByTestId("goal-type-LECTURES"));
    expect(screen.getByTestId("goal-minutes")).toHaveValue(75);
    expect(screen.getByTestId("goal-minutes-help")).toHaveTextContent("Based on your last week of focus sessions.");
    await userEvent.click(screen.getByTestId("save-goals"));
    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ type: "LECTURES", unit: "COUNT", target: 5, minutesPerUnit: 75 })]);
  });

  it("starts from 60, 60 and 30 minutes and lets the student change them", async () => {
    const onSave = vi.fn();
    render(<AddGoalPanel {...props} onSave={onSave} />);
    expect(screen.getByTestId("goal-minutes")).toHaveValue(60);
    await userEvent.click(screen.getByTestId("goal-type-LECTURES"));
    expect(screen.getByTestId("goal-minutes")).toHaveValue(60);
    await userEvent.click(screen.getByTestId("goal-type-REVISIONS"));
    expect(screen.getByTestId("goal-minutes")).toHaveValue(30);
    expect(screen.getByText("Minutes per revision:")).toBeInTheDocument();
    await userEvent.clear(screen.getByTestId("goal-minutes"));
    await userEvent.type(screen.getByTestId("goal-minutes"), "45");
    await userEvent.click(screen.getByTestId("save-goals"));
    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ type: "REVISIONS", minutesPerUnit: 45 })]);
  });

  it("Add another queues the goal and keeps the form open; Save then writes the queue plus the form", async () => {
    const onSave = vi.fn();
    render(<AddGoalPanel {...props} onSave={onSave} />);
    await userEvent.click(screen.getByTestId("goal-type-LECTURES"));
    await userEvent.click(screen.getByTestId("add-goal"));
    expect(screen.getByTestId("goal-drafts")).toHaveTextContent("Watch 5 lectures");
    expect(screen.getByTestId("goal-drafts")).toHaveTextContent("about 5h");
    await userEvent.selectOptions(screen.getByTestId("goal-subject"), "1");
    await userEvent.click(screen.getByTestId("save-goals"));
    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ type: "LECTURES", subjectId: null }), expect.objectContaining({ type: "LECTURES", subjectId: 1 })]);
  });

  it("does not save the same goal twice when the form is left as it was after Add another", async () => {
    const onSave = vi.fn();
    render(<AddGoalPanel {...props} onSave={onSave} />);
    await userEvent.click(screen.getByTestId("add-goal"));
    await userEvent.click(screen.getByTestId("save-goals"));
    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ type: "QUESTIONS" })]);
    expect(onSave.mock.calls[0]![0]).toHaveLength(1);
  });

  it("Cancel closes it", async () => {
    const onCancel = vi.fn();
    render(<AddGoalPanel {...props} onCancel={onCancel} onSave={vi.fn()} />);
    await userEvent.click(screen.getByTestId("cancel-goal"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("refuses a goal the student already has", async () => {
    render(<AddGoalPanel {...props} existing={[goal({ type: "QUESTIONS", unit: "COUNT", subjectId: null, chapterId: null })]} onSave={vi.fn()} />);
    await userEvent.click(screen.getByTestId("save-goals"));
    expect(screen.getByRole("alert")).toHaveTextContent("You already have that goal this week.");
  });

  it("a mock can take a fixed day and time, and is then one test", async () => {
    const onSave = vi.fn();
    render(<AddGoalPanel {...props} onSave={onSave} />);
    await userEvent.click(screen.getByTestId("goal-type-MOCKS"));
    expect(screen.queryByTestId("goal-minutes")).toBeNull();
    await userEvent.selectOptions(screen.getByTestId("goal-mock-day"), "2026-10-31");
    expect(screen.getByText("This mock gets a fixed slot. The planner never moves it or makes it shorter.")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("save-goals"));
    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ type: "MOCKS", target: 1, fixedDate: "2026-10-31", fixedStartTime: "14:00", mockType: "full_mock", examPattern: "jee_main" })]);
  });

  it("backlog goals are ticked from the student's own list and carry their minutes", async () => {
    vi.mocked(listBacklogItems).mockResolvedValue({
      success: true,
      data: { nextCursor: null, items: [{ id: "b1", subjectId: 1, chapterId: CH, topic: null, source: "manual", estimatedMinutes: 50, deadline: null, priority: 2, status: "open", clearedAt: null, scheduledFor: null, scheduledWindow: null, notes: null, ageDays: 9, isOverdue: false, progressPercent: 0, createdAt: "" }] },
    });
    const onSave = vi.fn();
    render(<AddGoalPanel {...props} onSave={onSave} />);
    await userEvent.click(screen.getByTestId("goal-type-BACKLOG"));
    await userEvent.click(await screen.findByTestId("goal-backlog-item"));
    await userEvent.click(screen.getByTestId("save-goals"));
    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ type: "BACKLOG", target: 1, backlogItemId: "b1", minutesPerUnit: 50, chapterId: CH })]);
  });

  it("offers the five original types and Backlog", () => {
    render(<AddGoalPanel {...props} onSave={vi.fn()} />);
    const ids = screen.getAllByRole("radio").map((r) => r.getAttribute("data-testid")).filter((id): id is string => !!id?.startsWith("goal-type-"));
    expect(ids).toEqual(["goal-type-LECTURES", "goal-type-QUESTIONS", "goal-type-REVISIONS", "goal-type-MOCKS", "goal-type-HOURS", "goal-type-BACKLOG"]);
  });

  it("has exactly one coral button, Save goal, and every other button is ghost", () => {
    const { container } = render(<AddGoalPanel {...props} onSave={vi.fn()} />);
    expect(coralCount(container)).toBe(1);
    expect(screen.getByTestId("save-goals").className).toContain("bg-brand-coral");
  });
});

describe("GoalCard", () => {
  const base = { title: "Kinematics", busy: false, onWatched: vi.fn(), onToggleDone: vi.fn(), onDelete: vi.fn(), onEdit: vi.fn() };

  it("shows the type, the chapter, what to do and how far along, with one ghost Start now", async () => {
    const { container } = render(<ul><GoalCard goal={goal()} {...base} /></ul>);
    expect(screen.getByTestId("goal-type-chip")).toHaveTextContent("Lectures");
    expect(screen.getByRole("heading", { name: "Kinematics" })).toBeInTheDocument();
    expect(screen.getByTestId("goal-instruction")).toHaveTextContent("Watch 5 lectures · ~60m each");
    expect(screen.getByTestId("goal-progress-text")).toHaveTextContent("2 of 5 watched · 40%");
    expect(screen.getByTestId("goal-progress-text")).toBeInTheDocument();
    const start = screen.getByTestId("goal-start-now");
    expect(start.className).toContain("border-border-strong");
    await userEvent.click(start);
    expect(startFocusSession).toHaveBeenCalledWith(expect.objectContaining({ originId: "g1", taskType: "lecture" }));
    // no secondary buttons on the card face: the menu and the remove cross, and Start now
    expect(within(container).getAllByRole("button").map((b) => b.getAttribute("data-testid"))).toEqual(["goal-remove", "goal-menu", "goal-start-now"]);
    expect(coralCount(container)).toBe(0);
  });

  it("keeps the bar neutral until the goal is complete, then saffron", () => {
    const { rerender } = render(<ul><GoalCard goal={goal()} {...base} /></ul>);
    expect(screen.getByRole("progressbar").firstElementChild!.className).not.toMatch(/saffron|bg-cta|coral/);
    rerender(<ul><GoalCard goal={goal({ status: "DONE" })} {...base} /></ul>);
    expect(screen.getByRole("progressbar").firstElementChild!.className).toContain("saffron");
    expect(screen.queryByTestId("goal-start-now")).toBeNull();
  });

  it("the menu logs a lecture, marks done, resets, and edits the target and minutes", async () => {
    const onWatched = vi.fn();
    const onToggleDone = vi.fn();
    const onEdit = vi.fn();
    render(<ul><GoalCard goal={goal()} {...base} onWatched={onWatched} onToggleDone={onToggleDone} onEdit={onEdit} /></ul>);
    await userEvent.click(screen.getByTestId("goal-menu"));
    await userEvent.click(screen.getByTestId("lecture-plus"));
    expect(onWatched).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByTestId("goal-menu"));
    await userEvent.click(screen.getByTestId("goal-toggle-done"));
    expect(onToggleDone).toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("goal-menu"));
    await userEvent.click(screen.getByTestId("goal-reset"));
    expect(onWatched).toHaveBeenLastCalledWith(0);
    await userEvent.click(screen.getByTestId("goal-menu"));
    await userEvent.click(screen.getByTestId("goal-edit"));
    await userEvent.clear(screen.getByTestId("goal-edit-target"));
    await userEvent.type(screen.getByTestId("goal-edit-target"), "8");
    await userEvent.clear(screen.getByTestId("goal-edit-minutes"));
    await userEvent.type(screen.getByTestId("goal-edit-minutes"), "45");
    await userEvent.click(screen.getByTestId("goal-edit-save"));
    expect(onEdit).toHaveBeenCalledWith({ target: 8, minutesPerUnit: 45 });
  });

  it("asks before it removes a goal", async () => {
    const onDelete = vi.fn();
    render(<ul><GoalCard goal={goal()} {...base} onDelete={onDelete} /></ul>);
    await userEvent.click(screen.getByTestId("goal-remove"));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("goal-remove-confirm"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("says what each kind of goal asks for", () => {
    expect(goalInstruction(goal({ type: "QUESTIONS", target: 60, minutesPerUnit: 45 }))).toBe("60 questions · 45m per session");
    expect(goalInstruction(goal({ type: "REVISIONS", target: 3, minutesPerUnit: 30 }))).toBe("3 revision slots · ~30m each");
    expect(goalInstruction(goal({ type: "MOCKS", target: 2, minutesPerUnit: 180 }))).toBe("2 mocks · ~180m each");
    expect(goalInstruction(goal({ type: "HOURS", target: 20, unit: "HOURS", minutesPerUnit: null }))).toBe("20h focused study");
    expect(goalInstruction(goal({ type: "HOURS", target: 390, unit: "MINUTES", minutesPerUnit: null }))).toBe("6h 30m focused study");
    expect(goalInstruction(goal({ type: "BACKLOG", target: 4, minutesPerUnit: 45 }))).toBe("Clear 4 backlog items");
  });
});

describe("groupGoals and SubjectSection", () => {
  const withBiology: SubjectChapters[] = [...subjects, { subjectId: 4, subjectCode: "BIO", subjectName: "Biology", chapters: [] }];

  it("orders Physics, Chemistry, Maths, Biology, then goals with no subject, then mocks", () => {
    const sections = groupGoals(
      [goal({ id: "m", type: "MOCKS", subjectId: null, chapterId: null }), goal({ id: "h", type: "HOURS", subjectId: null, chapterId: null }), goal({ id: "c", subjectId: 2 }), goal({ id: "p" })],
      [withBiology[3]!, withBiology[2]!, withBiology[1]!, withBiology[0]!],
    );
    expect(sections.map((s) => s.label)).toEqual(["Physics", "Chemistry", "Maths", "Biology", "Any subject", "Mocks"]);
    expect(sections.find((s) => s.label === "Physics")!.goals.map((g) => g.id)).toEqual(["p"]);
    expect(sections.find((s) => s.label === "Mocks")!.goals.map((g) => g.id)).toEqual(["m"]);
  });

  it("has no Biology section for a student who does not study it, and no empty Mocks section", () => {
    const sections = groupGoals([goal()], subjects);
    expect(sections.map((s) => s.label)).toEqual(["Physics", "Chemistry", "Maths"]);
  });

  it("gives Physics blue, Chemistry teal, Maths amber and Biology magenta", () => {
    const colors = Object.fromEntries(groupGoals([], withBiology).map((s) => [s.label, s.color]));
    expect(colors).toEqual({ Physics: "#3B82F6", Chemistry: "#14B8A6", Maths: "#F59E0B", Biology: "#D946EF" });
  });

  const handlers = { titleOf: (g: Goal) => g.chapterId ?? "x", busyId: null, onWatched: vi.fn(), onToggleDone: vi.fn(), onDelete: vi.fn(), onEdit: vi.fn(), onSuggest: () => undefined, onAddFor: vi.fn() };

  it("lays the goals out in a two-column grid with equal-height rows and a done/total count", () => {
    const section = groupGoals([goal({ id: "a" }), goal({ id: "b", status: "DONE" })], subjects)[0]!;
    render(<SubjectSection section={section} {...handlers} />);
    expect(screen.getByRole("heading", { name: "Physics" })).toBeInTheDocument();
    expect(screen.getByTestId("section-count")).toHaveTextContent("1/2 goals");
    expect(screen.getByTestId("goal-list").className).toMatch(/lg:grid-cols-2/);
    expect(screen.getByTestId("goal-list").className).toContain("auto-rows-fr");
    expect(screen.getAllByTestId("goal-card")).toHaveLength(2);
  });

  it("shows an add tile for a subject with no goals, which opens the panel for that subject", async () => {
    const onAddFor = vi.fn();
    const section = groupGoals([], subjects)[1]!;
    render(<SubjectSection section={section} {...handlers} onAddFor={onAddFor} />);
    expect(screen.queryByTestId("goal-card")).toBeNull();
    await userEvent.click(screen.getByTestId("section-add"));
    expect(screen.getByTestId("section-add")).toHaveTextContent("Add a goal for Chemistry");
    expect(onAddFor).toHaveBeenCalledWith(2);
  });
});

describe("one coral button per screen state, no emoji", () => {
  const root = path.resolve(import.meta.dirname, "..", "..");

  it("CoralButton is coral and GhostButton is not", () => {
    const { container } = render(
      <>
        <CoralButton>Save</CoralButton>
        <GhostButton>Cancel</GhostButton>
      </>,
    );
    expect(coralCount(container)).toBe(1);
  });

  it("no goals component outside the page, the panel's Save and the add button uses a filled coral class", () => {
    const allowed = new Set(["components/ui/CoralButton.tsx", "app/(app)/goals/page.tsx", "components/weekly-goals/AddGoalPanel.tsx"]);
    const dirs = ["components/weekly-goals", "components/goals", "app/(app)/goals", "components/ui/GhostButton.tsx", "components/ui/CoralButton.tsx"];
    const files = dirs.flatMap((d) => {
      const full = path.join(root, d);
      return d.endsWith(".tsx") ? [d] : readdirSync(full).filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx")).map((f) => `${d}/${f}`);
    });
    const offenders = files.filter((f) => !allowed.has(f)).filter((f) => /bg-cta|bg-brand-coral|CoralButton|E8623F/.test(readFileSync(path.join(root, f), "utf8")));
    expect(offenders).toEqual([]);
  });

  it("the goals page renders CoralButton exactly once per state (add button; the panel swaps it for Save)", () => {
    const page = readFileSync(path.join(root, "app/(app)/goals/page.tsx"), "utf8");
    expect(page.match(/<CoralButton/g)).toHaveLength(1);
    expect(page).toMatch(/panelOpen \?[\s\S]*<AddGoalPanel[\s\S]*:[\s\S]*<CoralButton/);
    const panel = readFileSync(path.join(root, "components/weekly-goals/AddGoalPanel.tsx"), "utf8");
    expect(panel.match(/<CoralButton/g)).toHaveLength(1);
  });

  it("ships no emoji in the weekly goals screen", () => {
    const EMOJI = /\p{Extended_Pictographic}/u;
    const dirs = ["components/weekly-goals", "components/goals", "app/(app)/goals", "lib/goals"];
    for (const d of dirs) {
      for (const f of readdirSync(path.join(root, d)).filter((n) => /\.tsx?$/.test(n))) {
        const hit = readFileSync(path.join(root, d, f), "utf8").split("\n").findIndex((line) => EMOJI.test(line));
        expect(hit, `${d}/${f} line ${hit + 1} has an emoji`).toBe(-1);
      }
    }
  });
});
