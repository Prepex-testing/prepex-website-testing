// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DailyInsightCard, readLater } from "@/components/home/DailyInsightCard";
import { ApiError } from "@/lib/api/http";
import type { DailyOverview, Insight } from "@/lib/api/insights";

const api = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/api/insights", () => ({ getDailyInsight: api.get, updateDailyInsight: api.update }));

const INSIGHT: Insight = {
  id: "11111111-1111-4111-8111-111111111111",
  date: "2026-10-07",
  insight: "You studied 90 minutes of Kinematics today, but only 9 of 24 practice questions were right.",
  nudge: "Tomorrow open with 20 minutes redoing the three graph mistakes.",
  feedback: null,
  createdAt: "2026-10-07T17:00:00.000Z",
};
const withInsight: DailyOverview = { insight: INSIGHT, resting: false };

beforeEach(() => {
  api.get.mockReset();
  api.update.mockReset();
  window.localStorage.clear();
});

describe("DailyInsightCard", () => {
  it("shows the observation and the nudge", () => {
    render(<DailyInsightCard initial={withInsight} />);
    expect(screen.getByTestId("insight-observation")).toHaveTextContent("90 minutes of Kinematics");
    expect(screen.getByTestId("insight-nudge")).toHaveTextContent("Tomorrow open with 20 minutes");
  });

  it("loads from the API when nothing is passed in", async () => {
    api.get.mockResolvedValue({ success: true, data: withInsight });
    render(<DailyInsightCard />);
    expect(await screen.findByTestId("insight-card")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it("thumbs up sends the feedback and the card gives way to a thank-you", async () => {
    api.update.mockResolvedValue({ success: true, data: { insight: { ...INSIGHT, feedback: "up" } } });
    render(<DailyInsightCard initial={withInsight} />);
    await userEvent.setup().click(screen.getByTestId("insight-up"));
    expect(api.update).toHaveBeenCalledWith(INSIGHT.id, { feedback: "up" });
    expect(await screen.findByTestId("insight-thanks")).toHaveTextContent("glad it helped");
    expect(screen.queryByTestId("insight-card")).not.toBeInTheDocument();
  });

  it("thumbs down sends 'down'", async () => {
    api.update.mockResolvedValue({ success: true, data: { insight: { ...INSIGHT, feedback: "down" } } });
    render(<DailyInsightCard initial={withInsight} />);
    await userEvent.setup().click(screen.getByTestId("insight-down"));
    expect(api.update).toHaveBeenCalledWith(INSIGHT.id, { feedback: "down" });
    expect(await screen.findByTestId("insight-thanks")).toBeInTheDocument();
  });

  it("'Got it' marks it dismissed (and so read)", async () => {
    api.update.mockResolvedValue({ success: true, data: { insight: INSIGHT } });
    render(<DailyInsightCard initial={withInsight} />);
    await userEvent.setup().click(screen.getByTestId("insight-read"));
    expect(api.update).toHaveBeenCalledWith(INSIGHT.id, { dismissed: true });
    expect(await screen.findByTestId("insight-thanks")).toBeInTheDocument();
  });

  it("a failed save keeps the card and says so", async () => {
    api.update.mockRejectedValue(new ApiError(500, "Server said no."));
    render(<DailyInsightCard initial={withInsight} />);
    await userEvent.setup().click(screen.getByTestId("insight-up"));
    expect(await screen.findByTestId("insight-error")).toHaveTextContent("Server said no.");
    expect(screen.getByTestId("insight-card")).toBeInTheDocument();
    expect(screen.getByTestId("insight-up")).toBeEnabled();
  });

  it("× hides it for now, remembers that on this device, and it does not call the API (so it resurfaces until read)", async () => {
    render(<DailyInsightCard initial={withInsight} />);
    await userEvent.setup().click(screen.getByTestId("insight-later"));
    expect(screen.queryByTestId("insight-card")).not.toBeInTheDocument();
    expect(api.update).not.toHaveBeenCalled();
    expect(readLater(window.localStorage)).toMatchObject({ id: INSIGHT.id });
  });

  it("a snoozed insight stays hidden on the next visit the same day, but a new one shows", async () => {
    window.localStorage.setItem("prepex_insight_later", JSON.stringify({ id: INSIGHT.id, day: new Date().toLocaleDateString("en-CA") }));
    api.get.mockResolvedValue({ success: true, data: withInsight });
    const { unmount } = render(<DailyInsightCard />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId("insight-card")).not.toBeInTheDocument();
    unmount();

    api.get.mockResolvedValue({ success: true, data: { insight: { ...INSIGHT, id: "22222222-2222-4222-8222-222222222222" }, resting: false } });
    render(<DailyInsightCard />);
    expect(await screen.findByTestId("insight-card")).toBeInTheDocument();
  });

  it("yesterday's snooze does not hide today's visit", async () => {
    window.localStorage.setItem("prepex_insight_later", JSON.stringify({ id: INSIGHT.id, day: "2000-01-01" }));
    api.get.mockResolvedValue({ success: true, data: withInsight });
    render(<DailyInsightCard />);
    expect(await screen.findByTestId("insight-card")).toBeInTheDocument();
  });

  it("says 'AI resting, back soon.' when there is no insight because the Brain was unreachable", () => {
    render(<DailyInsightCard initial={{ insight: null, resting: true }} />);
    expect(screen.getByTestId("insight-resting")).toHaveTextContent("AI resting, back soon.");
  });

  it("renders nothing when there is nothing to show, and nothing when the load fails", async () => {
    const { container, unmount } = render(<DailyInsightCard initial={{ insight: null, resting: false }} />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    api.get.mockRejectedValue(new ApiError(500, "boom"));
    const second = render(<DailyInsightCard />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(second.container).toBeEmptyDOMElement();
  });

  it("works when storage is blocked", () => {
    expect(readLater(null)).toBeNull();
    expect(readLater({ getItem: () => { throw new Error("blocked"); } })).toBeNull();
    expect(readLater({ getItem: () => "{not json" })).toBeNull();
  });
});
