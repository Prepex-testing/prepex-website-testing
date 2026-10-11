// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WeeklyDiagnosisCard } from "@/components/diagnosis/WeeklyDiagnosisCard";
import type { WeeklyDiagnosis, WeeklyOverview } from "@/lib/api/diagnosis";

const CH = "11111111-1111-4111-8111-111111111111";

const ready = (over: Partial<WeeklyDiagnosis> = {}): WeeklyDiagnosis => ({
  id: "d1",
  weekStart: "2026-10-05",
  status: "ready",
  diagnosis: "## WHAT IS WORKING\nKinematics: 82% on 40 questions.\n\n## WHAT IS LEAKING\nRotational Motion at 38%.\n\n## TOP 3 FIXES\n1. Rotational Motion, 90 minutes.",
  fixes: [
    { title: "Torque problems, 90 min", chapterId: CH, chapterName: "Rotational Motion", minutes: 90 },
    { title: "A 45-minute floor on slow days", chapterId: null, chapterName: null, minutes: 45 },
    { title: "Sleep before 11", chapterId: null, chapterName: null, minutes: null },
  ],
  trigger: "cron",
  attempts: 1,
  lastError: null,
  resting: false,
  completedAt: "2026-10-11T14:40:00.000Z",
  createdAt: "2026-10-11T14:30:00.000Z",
  ...over,
});

const overview = (over: Partial<WeeklyOverview> = {}): WeeklyOverview => ({
  current: null,
  latest: null,
  brainConfigured: true,
  limits: { diagnosis: { used: 0, limit: 3, retryAfterSeconds: 0 }, answer: { used: 0, limit: 10, retryAfterSeconds: 0 } },
  ...over,
});

const card = (o: WeeklyOverview, extra: Partial<Parameters<typeof WeeklyDiagnosisCard>[0]> = {}) =>
  render(<WeeklyDiagnosisCard overview={o} starting={false} runError={null} gaveUp={false} onRun={vi.fn()} {...extra} />);

describe("WeeklyDiagnosisCard", () => {
  it("shows the three sections and three action chips that carry the goal to next week", () => {
    card(overview({ current: ready(), latest: ready() }));
    expect(screen.getByTestId("weekly-report-label")).toHaveTextContent("Week of 5 – 11 Oct");
    expect(screen.getAllByTestId("weekly-section").map((s) => within(s).getByRole("heading").textContent)).toEqual(["What is working", "What is leaking", "Top 3 fixes"]);
    const chips = [0, 1, 2].map((i) => screen.getByTestId(`fix-chip-${i}`));
    expect(chips[0]).toHaveAttribute("href", `/goals?week=next&type=HOURS&unit=MINUTES&target=90&chapter=${CH}`);
    expect(chips[1]).toHaveAttribute("href", "/goals?week=next&type=HOURS&unit=MINUTES&target=45");
    expect(chips[2]).toHaveAttribute("href", "/goals?week=next&type=HOURS&unit=MINUTES&target=60"); // no minutes → an hour
    expect(chips[0]).toHaveTextContent("Torque problems, 90 min");
    expect(chips[0]).toHaveTextContent("Rotational Motion");
  });

  it("an older finished diagnosis is labelled as the latest finished one", () => {
    card(overview({ current: null, latest: ready({ weekStart: "2026-09-28" }) }));
    expect(screen.getByTestId("weekly-report-label")).toHaveTextContent("Week of 28 Sep – 4 Oct (latest finished)");
  });

  it("empty state offers Run now", async () => {
    const onRun = vi.fn();
    card(overview(), { onRun });
    expect(screen.getByTestId("weekly-empty")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByTestId("weekly-run"));
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("weekly-run")).toHaveTextContent("Run now");
  });

  it("while a run is under way it says it is reading the week and blocks a second press", () => {
    card(overview({ current: { ...ready(), status: "running", diagnosis: null, fixes: [] } }));
    expect(screen.getByTestId("weekly-running")).toHaveTextContent("Reading your week…");
    expect(screen.getByTestId("weekly-run")).toBeDisabled();
    expect(screen.queryByTestId("weekly-report")).not.toBeInTheDocument();
  });

  it("just after pressing Run now (request in flight) it already shows the working state", () => {
    card(overview(), { starting: true });
    expect(screen.getByTestId("weekly-running")).toBeInTheDocument();
    expect(screen.getByTestId("weekly-run")).toBeDisabled();
  });

  it("a failed run says AI is resting and keeps the last good report visible", () => {
    card(overview({ current: { ...ready(), status: "failed", diagnosis: null, fixes: [], lastError: "timeout", resting: true, attempts: 1 }, latest: ready({ weekStart: "2026-09-28" }) }));
    expect(screen.getByTestId("weekly-failed")).toHaveTextContent("AI is resting");
    expect(screen.getByTestId("weekly-report")).toBeInTheDocument();
    expect(screen.getByTestId("weekly-run")).toBeEnabled();
  });

  it("a week with nothing in it explains why instead of blaming the AI", () => {
    card(overview({ current: { ...ready(), status: "failed", diagnosis: null, fixes: [], lastError: "no_activity", resting: false, attempts: 3 } }));
    expect(screen.getByTestId("weekly-failed")).toHaveTextContent("nothing from the last 7 days");
    expect(screen.getByTestId("weekly-failed")).not.toHaveTextContent("resting");
  });

  it("with no Brain configured it says AI is resting and cannot be run", () => {
    card(overview({ brainConfigured: false }));
    expect(screen.getByTestId("weekly-resting")).toHaveTextContent("AI is resting, back soon.");
    expect(screen.getByTestId("weekly-run")).toBeDisabled();
    expect(screen.queryByTestId("weekly-empty")).not.toBeInTheDocument();
  });

  it("when the day's runs are used up the button is disabled and says when it frees up", () => {
    card(overview({ limits: { diagnosis: { used: 3, limit: 3, retryAfterSeconds: 7200 }, answer: { used: 3, limit: 10, retryAfterSeconds: 0 } } }));
    expect(screen.getByTestId("weekly-run")).toBeDisabled();
    expect(screen.getByTestId("weekly-limit")).toHaveTextContent("about 2 hours");
  });

  it("shows the server's reason when Run now was refused", () => {
    card(overview(), { runError: "There is nothing from the last 7 days to analyse yet." });
    expect(screen.getByTestId("weekly-run-error")).toHaveTextContent("nothing from the last 7 days");
  });

  it("tells the student when we stopped waiting for a slow run", () => {
    card(overview({ current: ready({ status: "failed", diagnosis: null, fixes: [] }) }), { gaveUp: true });
    expect(screen.getByTestId("weekly-gave-up")).toHaveTextContent("taking longer than usual");
  });
});
