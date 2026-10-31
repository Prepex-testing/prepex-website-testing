// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimetableBuilder } from "@/components/timetable/TimetableBuilder";
import { emptyDays, replicateDay, type GridBlock } from "@/lib/timetable/grid";
import { warningAction } from "@/lib/planner/warningActions";
import type { PlanDay } from "@/lib/api/plannerV2";

let n = 0;
const block = (dayOfWeek: number, startMin: number, endMin: number, activityType: GridBlock["activityType"]): GridBlock => ({
  key: `e${n++}`,
  dayOfWeek,
  startMin,
  endMin,
  activityType,
  subjectId: null,
  label: null,
});

describe("warningAction: inline fixes on planner warnings", () => {
  it("links the 'no revision slot' warning to the timetable with 'Add one'", () => {
    const w = { code: "sr_overflow", message: "You have no revision slot today, so 2 due revisions wait for a day that has one." };
    expect(warningAction(w)).toEqual({ href: "/timetable?from=planner", label: "Add one" });
  });

  it("links an empty day to the timetable with 'Set up'", () => {
    expect(warningAction({ code: "no_study_time", message: "This day has no study slots." })).toEqual({ href: "/timetable?from=planner", label: "Set up" });
  });

  it("gives no link to a revision overflow when a slot exists, or to other warnings", () => {
    expect(warningAction({ code: "sr_overflow", message: "3 more revisions are due than today's revision slot holds." })).toBeNull();
    expect(warningAction({ code: "over_budget", message: "Too much for one day." })).toBeNull();
  });
});

describe("emptyDays", () => {
  const week = replicateDay([block(0, 0, 360, "SLEEP"), block(0, 960, 1140, "SELF_STUDY")], 0);

  it("is empty for a full week and for a timetable with nothing in it yet", () => {
    expect(emptyDays(week)).toEqual([]);
    expect(emptyDays([])).toEqual([]);
  });

  it("lists the weekdays that have no blocks at all", () => {
    expect(emptyDays(week.filter((b) => b.dayOfWeek !== 3 && b.dayOfWeek !== 6))).toEqual([3, 6]);
  });
});

describe("the editor warns about a day with no blocks", () => {
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({ matches: query.includes("min-width"), media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
    Element.prototype.scrollTo = () => {};
  });
  const week = replicateDay([block(0, 0, 360, "SLEEP"), block(0, 960, 1140, "SELF_STUDY"), block(0, 1380, 1440, "SLEEP")], 0);

  it("names the empty days", () => {
    render(<TimetableBuilder initialBlocks={week.filter((b) => b.dayOfWeek !== 3)} subjects={[]} saveLabel="Save" onSave={() => {}} />);
    expect(screen.getByTestId("empty-day-warning")).toHaveTextContent("Nothing will be planned on Thursday");
  });

  it("shows nothing when every day has blocks", () => {
    render(<TimetableBuilder initialBlocks={week} subjects={[]} saveLabel="Save" onSave={() => {}} />);
    expect(screen.queryByTestId("empty-day-warning")).not.toBeInTheDocument();
  });
});

// ---- the planner screen and the profile list link to the editor ----------------------------------------------------

const day = (warnings: { code: string; message: string }[]): PlanDay => ({
  date: "2026-10-07",
  isToday: true,
  mode: "auto",
  plan: { id: "p", version: 1, generatedBy: "deterministic", engineVersion: 2, budgetMinutes: 120, warnings, polishNotes: [], generatedAt: "2026-10-07T00:00:00Z" },
  tasks: [],
  bands: [],
  studyBlocks: [],
  slotSource: "timetable",
  summary: { plannedMinutes: 0, doneMinutes: 0, plannedCount: 0, doneCount: 0, percent: 0 },
  regenerate: { kind: "regenerate", used: 0, limit: 5, remaining: 5, resetsAt: "2026-10-08T00:00:00Z" },
  suggestions: null,
});

let current: PlanDay = day([]);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/planner/usePlanDay", () => ({ usePlanDay: () => ({ status: "ready", day: current, error: null, refresh: vi.fn(), build: vi.fn(), building: false }) }));
vi.mock("@/components/planner/useTaskActions", () => ({ useTaskActions: () => ({ overlays: null, start: vi.fn(), markDone: vi.fn(), skip: vi.fn(), tomorrow: vi.fn(), askDelete: vi.fn() }) }));
vi.mock("@/components/planner/PlanHeaderActions", () => ({ PlanHeaderActions: () => null }));
vi.mock("@/components/planner/ModeToggle", () => ({ ModeToggle: () => null }));
vi.mock("@/components/planner/PlanSidePanel", () => ({ PlanSidePanel: () => null, useIsDesktop: () => true }));
vi.mock("@/components/planner/PlanExplanation", () => ({ PlanExplanation: () => null, usePlanExplanation: () => ({ text: null, loading: false }) }));
vi.mock("@/components/planner/TimelineRail", () => ({ TimelineRail: () => null }));
vi.mock("@/components/planner/EndOfDay", () => ({ EndOfDay: () => null, isEndOfDay: () => false }));
vi.mock("@/lib/telemetry/planner", () => ({ trackPlanner: vi.fn() }));

describe("the planner screen", () => {
  it("has an Edit timetable button in the header, next to the date", async () => {
    current = day([]);
    const { default: PlannerPage } = await import("@/app/(app)/planner/page");
    render(<PlannerPage />);
    const link = await screen.findByTestId("edit-timetable");
    expect(link).toHaveAttribute("href", "/timetable?from=planner");
    expect(link.parentElement).toContainElement(screen.getByTestId("day-summary"));
  });

  it("puts a fix link on the revision-slot warning and the empty-day warning", async () => {
    current = day([
      { code: "sr_overflow", message: "You have no revision slot today, so 2 due revisions wait for a day that has one." },
      { code: "no_study_time", message: "Today has no study time in your timetable." },
      { code: "over_budget", message: "Trimmed to fit." },
    ]);
    const { default: PlannerPage } = await import("@/app/(app)/planner/page");
    render(<PlannerPage />);
    expect(await screen.findByTestId("warning-fix-sr_overflow")).toHaveTextContent("Add one");
    expect(screen.getByTestId("warning-fix-no_study_time")).toHaveTextContent("Set up");
    expect(screen.queryByTestId("warning-fix-over_budget")).not.toBeInTheDocument();
  });
});
