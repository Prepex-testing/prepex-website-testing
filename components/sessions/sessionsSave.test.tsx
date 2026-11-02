// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SessionsPage from "@/app/(app)/sessions/page";
import { createStudySession, listStudySessions } from "@/lib/api/studyLog";

vi.mock("@/components/study/StudyShell", () => ({ StudyShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/study/useSubjects", () => ({ useSubjects: () => ({ subjects: [], loading: false, error: null }) }));
vi.mock("@/components/sessions/WeekChart", () => ({ default: () => null }));
vi.mock("@/components/sessions/StudyLogList", () => ({ StudyLogList: () => null }));
vi.mock("@/components/sessions/QuickLogForm", () => ({
  QuickLogForm: ({ onSubmit, error }: { onSubmit: (i: unknown) => void; error: string | null }) => (
    <div>
      <button onClick={() => onSubmit({ subjectId: 1, durationMinutes: 30 })}>Save</button>
      {error && <p role="alert">{error}</p>}
    </div>
  ),
}));
vi.mock("@/lib/api/studyLog", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/studyLog")>()),
  createStudySession: vi.fn().mockResolvedValue({ success: true, data: {} }),
  listStudySessions: vi.fn(),
  getStudySummary: vi.fn().mockResolvedValue({ success: true, data: { period: "week", from: "", to: "", totalMinutes: 0, sessionCount: 0, bySubject: [], byDay: [] } }),
  updateStudySession: vi.fn(),
  deleteStudySession: vi.fn(),
}));

/** QA pass: the save worked but the list reload after it failed; that must not read as "Couldn't save" (a retry would log the session twice). */
describe("Sessions: saving a log", () => {
  it("does not report a failed save when only the reload after the save fails", async () => {
    vi.mocked(listStudySessions)
      .mockResolvedValueOnce({ success: true, data: { items: [], nextCursor: null } } as never)
      .mockRejectedValue(new Error("busy"));
    render(<SessionsPage />);
    const save = await screen.findByText("Save");
    await act(async () => save.click());
    await waitFor(() => expect(createStudySession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listStudySessions).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Couldn't save that. Please try again.")).toBeNull();
  });
});
