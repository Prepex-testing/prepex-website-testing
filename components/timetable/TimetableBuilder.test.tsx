// @vitest-environment jsdom
import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimetableBuilder } from "@/components/timetable/TimetableBuilder";
import { isUniformWeek, replicateDay, type GridBlock } from "@/lib/timetable/grid";
import { buildTemplate } from "@/lib/timetable/templates";

// jsdom has no layout engine and no matchMedia; the builder asks "is this a wide screen?".
function stubMatchMedia(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide && query.includes("min-width"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

let n = 0;
const block = (dayOfWeek: number, startMin: number, endMin: number, activityType: GridBlock["activityType"], extra: Partial<GridBlock> = {}): GridBlock => ({
  key: `t${n++}`,
  dayOfWeek,
  startMin,
  endMin,
  activityType,
  subjectId: null,
  label: null,
  ...extra,
});

/** A simple routine, the same on all seven days. */
const uniformRoutine = () =>
  replicateDay([block(0, 0, 360, "SLEEP"), block(0, 960, 1140, "SELF_STUDY"), block(0, 1380, 1440, "SLEEP")], 0);

function Harness(props: {
  initial: GridBlock[];
  uniform: boolean;
  onBlocks?: (b: GridBlock[]) => void;
  onUniform?: (u: boolean) => void;
  requirePlanningTime?: boolean;
  onSave?: (b: GridBlock[]) => void;
}) {
  const [uniform, setUniform] = useState(props.uniform);
  return (
    <TimetableBuilder
      initialBlocks={props.initial}
      subjects={[]}
      uniformWeek={uniform}
      onUniformWeekChange={(u) => {
        setUniform(u);
        props.onUniform?.(u);
      }}
      onBlocksChange={props.onBlocks}
      requirePlanningTime={props.requirePlanningTime}
      saveLabel="Next"
      onSave={props.onSave ?? (() => {})}
    />
  );
}

beforeEach(() => {
  stubMatchMedia(true);
  // jsdom has no scrolling either; the builder opens the grid at 6 AM.
  Element.prototype.scrollTo = () => {};
});

describe("the \"same every day\" switch", () => {
  it("starts on: one day editor, labelled for every day", () => {
    render(<Harness initial={uniformRoutine()} uniform />);
    const toggle = screen.getByTestId("uniform-toggle");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(toggle).toHaveTextContent("My routine is the same every day");
    expect(screen.getAllByTestId(/^day-col-/)).toHaveLength(1);
    expect(screen.getByText("Every day")).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Day of week" })).not.toBeInTheDocument();
  });

  it("is off with seven separate days when the routine changes day by day", () => {
    render(<Harness initial={uniformRoutine()} uniform={false} />);
    expect(screen.getByTestId("uniform-toggle")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByTestId("uniform-toggle")).toHaveTextContent("My routine changes day by day");
    expect(screen.getAllByTestId(/^day-col-/)).toHaveLength(7);
  });

  it("asks before expanding to seven days, and says nothing is lost", () => {
    const onUniform = vi.fn();
    render(<Harness initial={uniformRoutine()} uniform onUniform={onUniform} />);

    fireEvent.click(screen.getByTestId("uniform-toggle"));
    const modal = screen.getByTestId("uniform-modal");
    expect(within(modal).getByText(/Switching will expand to 7 editable days/)).toBeInTheDocument();
    expect(onUniform).not.toHaveBeenCalled(); // nothing changed yet

    fireEvent.click(within(modal).getByText("Cancel"));
    expect(screen.queryByTestId("uniform-modal")).not.toBeInTheDocument();
    expect(onUniform).not.toHaveBeenCalled();
    expect(screen.getAllByTestId(/^day-col-/)).toHaveLength(1);

    fireEvent.click(screen.getByTestId("uniform-toggle"));
    fireEvent.click(screen.getByTestId("uniform-confirm"));
    expect(onUniform).toHaveBeenCalledWith(false);
    expect(screen.getAllByTestId(/^day-col-/)).toHaveLength(7);
  });

  it("asks before copying one day to all seven, and warns when other days would be replaced", () => {
    const onUniform = vi.fn();
    const onBlocks = vi.fn();
    const week = [...uniformRoutine().filter((b) => b.dayOfWeek !== 6), block(6, 480, 780, "SELF_STUDY"), block(6, 0, 300, "SLEEP")];
    render(<Harness initial={week} uniform={false} onUniform={onUniform} onBlocks={onBlocks} />);

    fireEvent.click(screen.getByTestId("uniform-toggle"));
    const modal = screen.getByTestId("uniform-modal");
    expect(within(modal).getByText(/copy Monday's plan to all 7 days/)).toBeInTheDocument();
    expect(within(modal).getByText(/will be replaced/)).toBeInTheDocument();

    fireEvent.change(within(modal).getByLabelText("Copy the plan from"), { target: { value: "6" } });
    expect(within(modal).getByText(/copy Sunday's plan to all 7 days/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("uniform-confirm"));
    expect(onUniform).toHaveBeenCalledWith(true);
    const latest = onBlocks.mock.calls.at(-1)![0] as GridBlock[];
    expect(isUniformWeek(latest)).toBe(true);
    // Sunday's long morning session is now every day's, and Monday's old evening session is gone.
    expect(latest.filter((b) => b.dayOfWeek === 3 && b.activityType === "SELF_STUDY").map((b) => [b.startMin, b.endMin])).toEqual([[480, 780]]);
    expect(screen.getAllByTestId(/^day-col-/)).toHaveLength(1);
  });

  it("does not warn about replacing days when they are already identical", () => {
    render(<Harness initial={uniformRoutine()} uniform={false} />);
    fireEvent.click(screen.getByTestId("uniform-toggle"));
    expect(screen.queryByText(/will be replaced/)).not.toBeInTheDocument();
  });

  it("mirrors an edit to the one visible day onto all seven days", () => {
    const onBlocks = vi.fn();
    render(<Harness initial={uniformRoutine()} uniform onBlocks={onBlocks} />);

    const study = screen.getAllByTestId("tt-block").find((el) => el.getAttribute("data-activity") === "SELF_STUDY")!;
    fireEvent.keyDown(study, { key: "Delete" });

    const latest = onBlocks.mock.calls.at(-1)![0] as GridBlock[];
    expect(latest.some((b) => b.activityType === "SELF_STUDY")).toBe(false); // gone on every day, not just the visible one
    expect(latest.filter((b) => b.activityType === "SLEEP")).toHaveLength(14);
    expect(isUniformWeek(latest)).toBe(true);
  });

  it("moves a block on every day when it is nudged with the arrow keys", () => {
    const onBlocks = vi.fn();
    render(<Harness initial={uniformRoutine()} uniform onBlocks={onBlocks} />);
    const study = screen.getAllByTestId("tt-block").find((el) => el.getAttribute("data-activity") === "SELF_STUDY")!;
    fireEvent.keyDown(study, { key: "ArrowDown" });

    const latest = onBlocks.mock.calls.at(-1)![0] as GridBlock[];
    const starts = latest.filter((b) => b.activityType === "SELF_STUDY").map((b) => b.startMin);
    expect(starts).toHaveLength(7);
    expect(new Set(starts)).toEqual(new Set([975])); // 16:00 + 15 minutes, on all seven days
  });
});

describe("the starter template", () => {
  it("marks template blocks, explains the mark, and drops it once a block is edited", () => {
    const onBlocks = vi.fn();
    render(<Harness initial={buildTemplate("SELF_PREP")} uniform onBlocks={onBlocks} />);
    expect(screen.getByTestId("template-legend")).toBeInTheDocument();
    const marked = screen.getAllByTestId("tt-block");
    expect(marked.every((el) => el.getAttribute("data-from-template") === "true")).toBe(true);

    // The 20:30 revision block has free time after it, so it can be nudged.
    const revision = marked.find((el) => el.getAttribute("data-activity") === "REVISION")!;
    fireEvent.keyDown(revision, { key: "ArrowDown" });
    const after = screen.getAllByTestId("tt-block");
    expect(after.filter((el) => el.getAttribute("data-from-template") === "true").length).toBe(after.length - 1);
  });

  it("a week with no template shows no mark and no legend", () => {
    render(<Harness initial={uniformRoutine()} uniform />);
    expect(screen.queryByTestId("template-legend")).not.toBeInTheDocument();
  });

  it("opens day by day when a starter week differs between days, rather than flattening it", () => {
    const onUniform = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true); // replacing the student's own week asks first
    render(<Harness initial={uniformRoutine()} uniform onUniform={onUniform} />);
    fireEvent.click(screen.getByTestId("template-SCHOOL_COACHING"));
    expect(onUniform).toHaveBeenCalledWith(false);
    expect(screen.getAllByTestId(/^day-col-/)).toHaveLength(7);
    expect(screen.getByRole("status")).toHaveTextContent(/changes by day/);
  });

  it("keeps the single-day editor for a starter week that is the same every day", () => {
    const onUniform = vi.fn();
    render(<Harness initial={[]} uniform onUniform={onUniform} />);
    fireEvent.click(screen.getByTestId("template-SELF_PREP"));
    expect(onUniform).not.toHaveBeenCalled();
    expect(screen.getAllByTestId(/^day-col-/)).toHaveLength(1);
  });
});

describe("validation", () => {
  it("rejects a week with no Self-Study or Practice block, with a helpful message, and blocks Next", () => {
    const onSave = vi.fn();
    const sleepOnly = replicateDay([block(0, 0, 420, "SLEEP"), block(0, 600, 720, "REVISION")], 0);
    render(<Harness initial={sleepOnly} uniform requirePlanningTime onSave={onSave} />);

    expect(screen.getByTestId("planning-time-error")).toHaveTextContent(/at least one Self-Study or Practice block/);
    const next = screen.getByTestId("save-timetable");
    expect(next).toBeDisabled();
    fireEvent.click(next);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("lets a valid week through", () => {
    const onSave = vi.fn();
    render(<Harness initial={uniformRoutine()} uniform requirePlanningTime onSave={onSave} />);
    expect(screen.queryByTestId("planning-time-error")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("save-timetable"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect((onSave.mock.calls[0]![0] as GridBlock[]).length).toBe(21);
  });

  it("warns, without blocking, when sleep is under five hours", () => {
    const onSave = vi.fn();
    const lowSleep = replicateDay([block(0, 0, 240, "SLEEP"), block(0, 600, 900, "SELF_STUDY")], 0);
    render(<Harness initial={lowSleep} uniform requirePlanningTime onSave={onSave} />);
    expect(screen.getByTestId("sleep-warning")).toHaveTextContent(/under 5 hours of sleep/);
    expect(screen.getByTestId("save-timetable")).toBeEnabled();
    fireEvent.click(screen.getByTestId("save-timetable"));
    expect(onSave).toHaveBeenCalled();
  });

  it("does not warn when sleep is five hours or more", () => {
    render(<Harness initial={uniformRoutine()} uniform requirePlanningTime />);
    expect(screen.queryByTestId("sleep-warning")).not.toBeInTheDocument();
  });

  it("names the short days when each day is separate", () => {
    const week = [...uniformRoutine().filter((b) => !(b.dayOfWeek === 2 && b.activityType === "SLEEP")), block(2, 0, 120, "SLEEP")];
    render(<Harness initial={week} uniform={false} />);
    expect(screen.getByTestId("sleep-warning")).toHaveTextContent(/planned on Wed\./);
  });
});

describe("the timetable screen outside onboarding", () => {
  it("shows no switch and keeps seven columns when the parent does not ask for it", () => {
    render(<TimetableBuilder initialBlocks={uniformRoutine()} subjects={[]} onSave={() => {}} />);
    expect(screen.queryByTestId("uniform-toggle")).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/^day-col-/)).toHaveLength(7);
    expect(screen.queryByTestId("planning-time-error")).not.toBeInTheDocument();
  });
});
