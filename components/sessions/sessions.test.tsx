// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SubjectChapters } from "@/lib/api/dashboard";
import type { StudyLogRow } from "@/lib/api/focus";
import { QuickLogForm } from "@/components/sessions/QuickLogForm";
import { StudyLogList } from "@/components/sessions/StudyLogList";
import { makeSubjectLookup } from "@/lib/study/subjects";

const SUBJECTS: SubjectChapters[] = [
  { subjectId: 1, subjectCode: "PHY", subjectName: "Physics", chapters: [{ id: "11111111-1111-4111-8111-111111111111", subjectId: 1, name: "Kinematics", sequenceOrder: 1, isActive: true }] },
  { subjectId: 2, subjectCode: "CHEM", subjectName: "Chemistry", chapters: [] },
];
const lookup = makeSubjectLookup(SUBJECTS);

describe("QuickLogForm", () => {
  it("won't submit without a subject, and rejects bad minutes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<QuickLogForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);

    await user.click(screen.getByTestId("log-submit"));
    expect(screen.getByRole("alert")).toHaveTextContent(/choose a subject/i);

    await user.selectOptions(screen.getByTestId("log-subject"), "1");
    const minutes = screen.getByTestId("log-minutes");
    for (const bad of ["0", "721", "2.5"]) {
      await user.clear(minutes);
      await user.type(minutes, bad);
      await user.click(screen.getByTestId("log-submit"));
      expect(screen.getByRole("alert"), bad).toHaveTextContent(/whole number from 1 to 720/);
    }
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("logs 'now' by default (no loggedAt) with the chosen subject, chapter, minutes and notes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<QuickLogForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByTestId("log-subject"), "1");
    await user.selectOptions(screen.getByTestId("log-chapter"), "11111111-1111-4111-8111-111111111111");
    await user.click(screen.getByTestId("log-preset-45"));
    await user.type(screen.getByLabelText(/notes/i), " solved 20 problems ");
    await user.click(screen.getByTestId("log-submit"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const sent = onSubmit.mock.calls[0]![0];
    expect(sent).toEqual({
      subjectId: 1,
      chapterId: "11111111-1111-4111-8111-111111111111",
      topic: null,
      durationMinutes: 45,
      notes: "solved 20 problems",
    });
    expect("loggedAt" in sent).toBe(false);
  });

  it("sends loggedAt once the student changes 'when'", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<QuickLogForm subjects={SUBJECTS} busy={false} error={null} onSubmit={onSubmit} />);
    await user.selectOptions(screen.getByTestId("log-subject"), "2");
    const when = screen.getByLabelText(/when/i);
    await user.clear(when);
    await user.type(when, "2026-10-01T08:30");
    await user.click(screen.getByTestId("log-submit"));
    expect(new Date(onSubmit.mock.calls[0]![0].loggedAt).getTime()).toBe(new Date(2026, 9, 1, 8, 30).getTime());
  });

  it("editing: prefills and always sends the time; Cancel is offered", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    const loggedAt = new Date(2026, 9, 5, 18, 0).toISOString();
    render(
      <QuickLogForm subjects={SUBJECTS} busy={false} error={null} idPrefix="edit" submitLabel="Save changes" alwaysSendWhen onSubmit={onSubmit} onCancel={onCancel}
        initial={{ subjectId: 1, chapterId: null, topic: "Optics", minutes: 50, loggedAt, notes: "" }} />,
    );
    expect(screen.getByTestId("edit-minutes")).toHaveValue(50);
    expect(screen.getByDisplayValue("Optics")).toBeInTheDocument();
    await user.click(screen.getByTestId("edit-submit"));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ subjectId: 1, topic: "Optics", durationMinutes: 50, loggedAt });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows the server's error and locks while saving", () => {
    render(<QuickLogForm subjects={SUBJECTS} busy error="You cannot log study time in the future." onSubmit={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/future/);
    expect(screen.getByTestId("log-submit")).toBeDisabled();
  });
});

describe("StudyLogList", () => {
  const row = (over: Partial<StudyLogRow>): StudyLogRow => ({
    id: Math.random().toString(36).slice(2),
    subjectId: 1,
    chapterId: null,
    topic: null,
    durationMinutes: 30,
    loggedAt: new Date(2026, 9, 7, 10, 0).toISOString(),
    notes: null,
    source: "manual",
    focusSessionId: null,
    createdAt: new Date().toISOString(),
    ...over,
  });
  const now = new Date(2026, 9, 7, 20, 0);

  it("says so when there is nothing yet", () => {
    render(<StudyLogList rows={[]} lookup={lookup} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByTestId("log-empty")).toBeInTheDocument();
  });

  it("groups by day with a daily total, Today / Yesterday headings", () => {
    const rows = [
      row({ durationMinutes: 30 }),
      row({ durationMinutes: 45, loggedAt: new Date(2026, 9, 7, 8, 0).toISOString() }),
      row({ durationMinutes: 60, loggedAt: new Date(2026, 9, 6, 19, 0).toISOString(), subjectId: 2 }),
    ];
    render(<StudyLogList rows={rows} lookup={lookup} now={now} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const sections = screen.getAllByRole("region");
    expect(sections).toHaveLength(2);
    expect(within(sections[0]!).getByRole("heading")).toHaveTextContent("Today");
    expect(sections[0]).toHaveTextContent("1h 15m");
    expect(within(sections[1]!).getByRole("heading")).toHaveTextContent("Yesterday");
    expect(sections[1]).toHaveTextContent("Chemistry");
  });

  it("only manual entries can be edited or deleted; Focus Mode entries are read-only", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const manual = row({});
    const focus = row({ source: "focus_mode", focusSessionId: "f1" });
    render(<StudyLogList rows={[manual, focus]} lookup={lookup} now={now} onEdit={onEdit} onDelete={onDelete} />);

    const rows = screen.getAllByTestId("log-row");
    expect(within(rows[1]!).queryByRole("button")).not.toBeInTheDocument();
    expect(rows[1]).toHaveTextContent("Focus Mode");

    await user.click(within(rows[0]!).getByRole("button", { name: /edit/i }));
    await user.click(within(rows[0]!).getByRole("button", { name: /delete/i }));
    expect(onEdit).toHaveBeenCalledWith(manual);
    expect(onDelete).toHaveBeenCalledWith(manual);
  });
});
