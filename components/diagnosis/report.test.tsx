// @vitest-environment jsdom
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiagnoseNowCard } from "@/components/diagnosis/DiagnoseNowCard";
import { ReportView } from "@/components/diagnosis/ReportView";
import { ApiError } from "@/lib/api/http";
import type { DiagnosisReport } from "@/lib/api/diagnosisReports";
import { POLL_EVERY_MS, GIVE_UP_AFTER_MS, useReportLive } from "@/lib/diagnosis/useReportLive";

vi.mock("@/lib/api/diagnosisReports", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/diagnosisReports")>()),
  getDiagnosisReport: vi.fn(),
  streamDiagnosisReport: vi.fn(),
}));
import { getDiagnosisReport, streamDiagnosisReport } from "@/lib/api/diagnosisReports";

const report = (over: Partial<DiagnosisReport> = {}): DiagnosisReport => ({
  id: "r1",
  status: "complete",
  periodDays: 30,
  reportText: null,
  resting: false,
  lastError: null,
  triggeredAt: "2026-10-19T10:00:00.000Z",
  completedAt: "2026-10-19T10:01:10.000Z",
  ...over,
});

const FULL = `## STRENGTHS
- You studied on 22 of 30 days.
- Laws of Motion is at 85%.

## BLEEDING CHAPTERS
- Rotational Motion: 30% over 40 questions.

## REVISION DEBT
Eleven mistakes are past their review date.

## MOCK TRAJECTORY
Two mocks: 52% then 58%.

## 30-DAY ACTION PLAN
Stay on one front at a time.

Week 1: 6 hours on Rotational Motion, torque first.
Week 2: Kinematics graph problems, about 4.5 hours.
Week 3: Mixed practice.
Week 4: Two mocks and a review.`

const CHAPTERS = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Rotational Motion" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Kinematics" },
];

const view = (r: DiagnosisReport, extra: Partial<Parameters<typeof ReportView>[0]> = {}) =>
  render(<ReportView report={r} chapters={CHAPTERS} tooLong={false} starting={false} startError={null} onTryAgain={vi.fn()} {...extra} />);

describe("ReportView", () => {
  it("before the first heading: 'Reading your last 30 days…' and no report", () => {
    view(report({ status: "streaming", reportText: null, completedAt: null }));
    expect(screen.getByTestId("report-skeleton")).toHaveTextContent("Reading your last 30 days…");
    expect(screen.queryByTestId("report-card")).toBeNull();
  });

  it("while it streams: the sections so far, a 'Writing your report…' label and a caret; no Save to goals yet", () => {
    view(report({ status: "streaming", completedAt: null, reportText: "## STRENGTHS\n- You studied on 22 of 30 days.\n\n## BLEEDING CHAPTERS\n- Rotational" }));
    expect(screen.getByTestId("report-label")).toHaveTextContent("Writing your report…");
    expect(screen.getAllByTestId("report-section").map((s) => within(s).getByRole("heading").textContent)).toEqual(["Strengths", "Bleeding chapters"]);
    expect(screen.getByTestId("report-caret")).toBeInTheDocument();
    expect(screen.getByTestId("report-card")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByTestId("plan-items")).toBeNull();
  });

  it("finished: five sections, bullets as a list, the date in IST, no caret", () => {
    view(report({ reportText: FULL }));
    expect(screen.getByTestId("report-label")).toHaveTextContent("Your last 30 days · 19 Oct, 3:31 pm IST");
    expect(screen.getAllByTestId("report-section").map((s) => within(s).getByRole("heading", { level: 2 }).textContent)).toEqual([
      "Strengths",
      "Bleeding chapters",
      "Revision debt",
      "Mock trajectory",
      "30-day action plan",
    ]);
    expect(screen.getAllByRole("listitem").some((li) => li.textContent === "Laws of Motion is at 85%.")).toBe(true);
    expect(screen.queryByTestId("report-caret")).toBeNull();
    expect(screen.getByTestId("report-card")).toHaveAttribute("aria-busy", "false");
  });

  it("the action plan: one card per week, each with Save to goals for that week, the chapter it names and its minutes", () => {
    view(report({ reportText: FULL }));
    expect(screen.getByTestId("plan-items").querySelectorAll("li")).toHaveLength(4);
    const w1 = screen.getByTestId("save-goal-0");
    expect(w1).toHaveAttribute("href", "/goals?week=current&type=HOURS&unit=MINUTES&target=360&chapter=11111111-1111-4111-8111-111111111111");
    expect(w1).toHaveTextContent("Save to goals · Rotational Motion");
    expect(screen.getByTestId("save-goal-1")).toHaveAttribute("href", "/goals?week=next&type=HOURS&unit=MINUTES&target=270&chapter=22222222-2222-4222-8222-222222222222");
    expect(screen.getByTestId("save-goal-2")).toHaveAttribute("href", "/goals?week=plus2&type=HOURS&unit=MINUTES&target=180");
    expect(screen.getByTestId("save-goal-3")).toHaveAttribute("href", "/goals?week=plus3&type=HOURS&unit=MINUTES&target=180");
    expect(screen.getByTestId("plan-item-0")).toHaveTextContent("6 hours on Rotational Motion, torque first.");
    expect(screen.getByTestId("plan-item-0")).not.toHaveTextContent("Week 1: 6");
    expect(screen.getByTestId("plan-items").closest("section")).toHaveTextContent("Stay on one front at a time.");
  });

  it("failed: 'AI resting, please try again in a few minutes.' with Try again; nothing half-written is shown", async () => {
    const onTryAgain = vi.fn();
    view(report({ status: "failed", resting: true, reportText: "## STRENGTHS\n- half" , completedAt: null }), { onTryAgain });
    expect(screen.getByTestId("report-resting")).toHaveTextContent("AI resting, please try again in a few minutes.");
    expect(screen.queryByTestId("report-card")).toBeNull();
    await userEvent.click(screen.getByTestId("report-retry"));
    expect(onTryAgain).toHaveBeenCalledTimes(1);
  });

  it("failed + the limit message from the server when Try again is refused; the button is off while starting", () => {
    const { rerender } = view(report({ status: "failed", resting: true, completedAt: null }), { startError: "You've used all 3 diagnoses for today. They reset at midnight IST." });
    expect(screen.getByTestId("report-start-error")).toHaveTextContent("reset at midnight IST");
    rerender(<ReportView report={report({ status: "failed", resting: true, completedAt: null })} chapters={[]} tooLong={false} starting startError={null} onTryAgain={vi.fn()} />);
    expect(screen.getByTestId("report-retry")).toBeDisabled();
  });

  it("when it takes too long the skeleton says so", () => {
    view(report({ status: "streaming", reportText: null, completedAt: null }), { tooLong: true });
    expect(screen.getByTestId("report-too-long")).toBeInTheDocument();
  });
});

describe("DiagnoseNowCard", () => {
  const limit = (remaining: number) => ({ used: 3 - remaining, limit: 3, remaining, resetsAt: "2026-10-19T18:30:00.000Z" });

  it("Diagnose me now, with how many are left today and a link to the past ones", async () => {
    const onStart = vi.fn();
    render(<DiagnoseNowCard limit={limit(2)} starting={false} error={null} onStart={onStart} />);
    expect(screen.getByTestId("diagnose-remaining")).toHaveTextContent("2 diagnoses left today, resets at midnight IST");
    expect(screen.getByTestId("past-diagnoses")).toHaveAttribute("href", "/diagnosis");
    await userEvent.click(screen.getByTestId("diagnose-now"));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("none left: the button is off and the reset time is stated", () => {
    render(<DiagnoseNowCard limit={limit(0)} starting={false} error={null} onStart={vi.fn()} />);
    expect(screen.getByTestId("diagnose-now")).toBeDisabled();
    expect(screen.getByTestId("diagnose-remaining")).toHaveTextContent("reset at midnight IST");
  });

  it("while starting, and when the count could not be loaded, the button still works unless starting; the server's error is shown", () => {
    const { rerender } = render(<DiagnoseNowCard limit={null} starting={false} error="You've used all 3 diagnoses for today. They reset at midnight IST." onStart={vi.fn()} />);
    expect(screen.getByTestId("diagnose-now")).toBeEnabled();
    expect(screen.queryByTestId("diagnose-remaining")).toBeNull();
    expect(screen.getByTestId("diagnose-error")).toHaveTextContent("midnight IST");
    rerender(<DiagnoseNowCard limit={null} starting error={null} onStart={vi.fn()} showPast={false} />);
    expect(screen.getByTestId("diagnose-now")).toBeDisabled();
    expect(screen.queryByTestId("past-diagnoses")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// following a report live
// ---------------------------------------------------------------------------

function Probe({ id }: { id: string }) {
  const { report: r, loadError, tooLong } = useReportLive(id);
  return (
    <div>
      <p data-testid="status">{r?.status ?? "none"}</p>
      <p data-testid="text">{r?.reportText ?? ""}</p>
      <p data-testid="error">{loadError ?? ""}</p>
      <p data-testid="long">{String(tooLong)}</p>
    </div>
  );
}

describe("useReportLive", () => {
  beforeEach(() => {
    vi.mocked(getDiagnosisReport).mockReset();
    vi.mocked(streamDiagnosisReport).mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("a finished report is just loaded: no stream is opened", async () => {
    vi.mocked(getDiagnosisReport).mockResolvedValue({ success: true, data: { report: report({ reportText: FULL }) } });
    render(<Probe id="r1" />);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("complete"));
    expect(streamDiagnosisReport).not.toHaveBeenCalled();
  });

  it("follows a report being written: the text grows as events arrive, then it is complete", async () => {
    vi.mocked(getDiagnosisReport).mockResolvedValue({ success: true, data: { report: report({ status: "streaming", completedAt: null }) } });
    let handlers!: Parameters<typeof streamDiagnosisReport>[1];
    let finish!: (v: boolean) => void;
    vi.mocked(streamDiagnosisReport).mockImplementation((_id, h) => {
      handlers = h;
      return new Promise<boolean>((resolve) => (finish = resolve));
    });
    render(<Probe id="r1" />);
    await waitFor(() => expect(streamDiagnosisReport).toHaveBeenCalled());
    expect(screen.getByTestId("status")).toHaveTextContent("streaming");
    expect(screen.getByTestId("text")).toBeEmptyDOMElement();

    act(() => handlers.onText("## STRENGTHS\n- You"));
    expect(screen.getByTestId("text")).toHaveTextContent("## STRENGTHS - You");
    act(() => handlers.onText("## STRENGTHS\n- You studied."));
    expect(screen.getByTestId("text").textContent).toContain("You studied.");
    act(() => {
      handlers.onDone(report({ reportText: FULL }));
      finish(true);
    });
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("complete"));
    expect(screen.getByTestId("text").textContent).toContain("Week 4");
  });

  it("a failed report arrives as failed", async () => {
    vi.mocked(getDiagnosisReport).mockResolvedValue({ success: true, data: { report: report({ status: "streaming", completedAt: null }) } });
    vi.mocked(streamDiagnosisReport).mockImplementation(async (_id, h) => {
      h.onFailed(report({ status: "failed", resting: true, completedAt: null }));
      return true;
    });
    render(<Probe id="r1" />);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("failed"));
  });

  it("when the live connection cannot be opened it polls every two seconds until the report is finished", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const streaming = report({ status: "streaming", completedAt: null });
    vi.mocked(getDiagnosisReport)
      .mockResolvedValueOnce({ success: true, data: { report: streaming } }) // the first load
      .mockResolvedValueOnce({ success: true, data: { report: { ...streaming, reportText: "## STRENGTHS\n- one" } } })
      .mockResolvedValue({ success: true, data: { report: report({ reportText: FULL }) } });
    vi.mocked(streamDiagnosisReport).mockRejectedValue(new ApiError(502, "no stream"));
    render(<Probe id="r1" />);
    await waitFor(() => expect(screen.getByTestId("text").textContent).toContain("one"));
    await vi.advanceTimersByTimeAsync(POLL_EVERY_MS + 50);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("complete"));
    expect(vi.mocked(getDiagnosisReport).mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("a stream that ends without done or failed falls back to polling", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(getDiagnosisReport)
      .mockResolvedValueOnce({ success: true, data: { report: report({ status: "streaming", completedAt: null }) } })
      .mockResolvedValue({ success: true, data: { report: report({ reportText: FULL }) } });
    vi.mocked(streamDiagnosisReport).mockResolvedValue(false);
    render(<Probe id="r1" />);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("complete"));
  });

  it("a report that is not found says so; one that stays unfinished for too long is flagged", async () => {
    vi.mocked(getDiagnosisReport).mockRejectedValue(new ApiError(404, "Report not found."));
    const first = render(<Probe id="nope" />);
    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("We couldn't find that diagnosis."));
    first.unmount();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(getDiagnosisReport).mockReset();
    vi.mocked(getDiagnosisReport).mockResolvedValue({ success: true, data: { report: report({ status: "streaming", completedAt: null }) } });
    vi.mocked(streamDiagnosisReport).mockImplementation(() => new Promise<boolean>(() => undefined));
    render(<Probe id="slow" />);
    await vi.advanceTimersByTimeAsync(GIVE_UP_AFTER_MS + 100);
    expect(screen.getByTestId("long")).toHaveTextContent("true");
  });

  it("leaving the page stops everything (the stream is aborted)", async () => {
    vi.mocked(getDiagnosisReport).mockResolvedValue({ success: true, data: { report: report({ status: "streaming", completedAt: null }) } });
    let signal!: AbortSignal;
    vi.mocked(streamDiagnosisReport).mockImplementation((_id, _h, s) => {
      signal = s;
      return new Promise<boolean>(() => undefined);
    });
    const { unmount } = render(<Probe id="r1" />);
    await waitFor(() => expect(streamDiagnosisReport).toHaveBeenCalled());
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
