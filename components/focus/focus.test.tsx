// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SubjectChapters } from "@/lib/api/dashboard";
import { FocusRing } from "@/components/focus/FocusRing";
import { FocusSetup } from "@/components/focus/FocusSetup";
import { FocusSummaryModal } from "@/components/focus/FocusSummaryModal";

const SUBJECTS: SubjectChapters[] = [
  {
    subjectId: 1,
    subjectCode: "PHY",
    subjectName: "Physics",
    chapters: [
      { id: "11111111-1111-4111-8111-111111111111", subjectId: 1, name: "Kinematics", sequenceOrder: 1, isActive: true },
      { id: "22222222-2222-4222-8222-222222222222", subjectId: 1, name: "Laws of Motion", sequenceOrder: 2, isActive: true },
    ],
  },
  { subjectId: 2, subjectCode: "CHEM", subjectName: "Chemistry", chapters: [] },
];

describe("FocusSetup", () => {
  it("cannot start until a subject is chosen", () => {
    render(<FocusSetup subjects={SUBJECTS} busy={false} error={null} onStart={vi.fn()} />);
    const start = screen.getByTestId("start-focus");
    expect(start).toBeDisabled();
    expect(start).toHaveTextContent(/choose a subject/i);
  });

  it("starts with the chosen subject, chapter, topic, length and Deep Focus", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<FocusSetup subjects={SUBJECTS} busy={false} error={null} onStart={onStart} />);

    await user.selectOptions(screen.getByTestId("focus-subject"), "1");
    await user.selectOptions(screen.getByTestId("focus-chapter"), "11111111-1111-4111-8111-111111111111");
    await user.type(screen.getByLabelText(/topic/i), "  Vectors  ");
    await user.click(screen.getByTestId("preset-45"));
    await user.click(screen.getByTestId("deep-focus"));
    await user.click(screen.getByTestId("start-focus"));

    expect(onStart).toHaveBeenCalledWith({
      subjectId: 1,
      chapterId: "11111111-1111-4111-8111-111111111111",
      topic: "Vectors",
      plannedMinutes: 45,
      deepFocusMode: true,
    });
  });

  it("defaults to 25 minutes without Deep Focus, and changing the subject clears the chapter", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<FocusSetup subjects={SUBJECTS} busy={false} error={null} onStart={onStart} />);

    await user.selectOptions(screen.getByTestId("focus-subject"), "1");
    await user.selectOptions(screen.getByTestId("focus-chapter"), "22222222-2222-4222-8222-222222222222");
    await user.selectOptions(screen.getByTestId("focus-subject"), "2");
    expect(screen.getByTestId("focus-chapter")).toHaveValue("");

    await user.click(screen.getByTestId("start-focus"));
    expect(onStart).toHaveBeenCalledWith({ subjectId: 2, chapterId: null, topic: null, plannedMinutes: 25, deepFocusMode: false });
  });

  it("clamps a silly custom length when sent", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<FocusSetup subjects={SUBJECTS} busy={false} error={null} onStart={onStart} />);
    await user.selectOptions(screen.getByTestId("focus-subject"), "1");
    const custom = screen.getByTestId("custom-minutes");
    await user.clear(custom);
    await user.type(custom, "9999");
    await user.click(screen.getByTestId("start-focus"));
    expect(onStart.mock.calls[0]![0].plannedMinutes).toBe(480);
  });

  it("shows an error and locks the form while busy", () => {
    render(<FocusSetup subjects={SUBJECTS} busy error="You already have an active focus session." onStart={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/already have an active/);
    expect(screen.getByTestId("start-focus")).toBeDisabled();
    expect(screen.getByTestId("focus-subject")).toBeDisabled();
  });
});

describe("FocusSummaryModal", () => {
  const base = { open: true, plannedMinutes: 25, interruptions: 2, busy: false, error: null, onKeepGoing: vi.fn(), onSave: vi.fn() };

  it("shows planned vs focused vs distractions", () => {
    render(<FocusSummaryModal {...base} elapsedSeconds={23 * 60} />);
    expect(screen.getByTestId("summary-planned")).toHaveTextContent("25m");
    expect(screen.getByTestId("summary-actual")).toHaveTextContent("23m");
    expect(screen.getByRole("dialog")).toHaveTextContent("2");
  });

  it("defaults 'a win' to yes when most of the plan was focused, and saves that", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<FocusSummaryModal {...base} onSave={onSave} elapsedSeconds={24 * 60} />);
    expect(screen.getByTestId("win-yes")).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByTestId("save-session"));
    expect(onSave).toHaveBeenCalledWith(true);
  });

  it("defaults to no for a short session, and the student can overrule it", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<FocusSummaryModal {...base} onSave={onSave} elapsedSeconds={5 * 60} />);
    expect(screen.getByTestId("win-no")).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByTestId("win-yes"));
    await user.click(screen.getByTestId("save-session"));
    expect(onSave).toHaveBeenCalledWith(true);
  });

  it("'Keep going' closes the summary without saving; saving is locked while busy", async () => {
    const user = userEvent.setup();
    const onKeepGoing = vi.fn();
    const onSave = vi.fn();
    const { rerender } = render(<FocusSummaryModal {...base} onKeepGoing={onKeepGoing} onSave={onSave} elapsedSeconds={600} />);
    await user.click(screen.getByRole("button", { name: /keep going/i }));
    expect(onKeepGoing).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();

    rerender(<FocusSummaryModal {...base} busy error="Couldn't save the session." onKeepGoing={onKeepGoing} onSave={onSave} elapsedSeconds={600} />);
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent(/couldn't save/i);
    expect(screen.getByTestId("save-session")).toBeDisabled();
  });
});

describe("FocusRing", () => {
  it("exposes the clock to assistive technology and shows the caption", () => {
    render(<FocusRing progress={0.4} label="14:59" caption="of 25m" ariaLabel="Physics focus timer. 14:59 left." />);
    expect(screen.getByRole("timer", { name: /14:59 left/ })).toBeInTheDocument();
    expect(screen.getByTestId("focus-clock")).toHaveTextContent("14:59");
    expect(screen.getByText("of 25m")).toBeInTheDocument();
  });
});
