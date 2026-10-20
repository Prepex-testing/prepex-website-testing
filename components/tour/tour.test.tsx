// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/http";
import { TOUR_STEPS, placeBubble, findAnchor, visibility, BUBBLE_MAX_WIDTH, EDGE } from "@/lib/tour/tour";

vi.mock("@/lib/api/tour", () => ({ getTourState: vi.fn(), markTourSeen: vi.fn() }));
import { getTourState, markTourSeen } from "@/lib/api/tour";
import { DayOneTour, ANCHOR_WAIT_MS } from "@/components/tour/DayOneTour";

/** Puts a target on the page at a fixed place (jsdom has no layout, so its box is stubbed). */
function addAnchor(anchor: string, rect: { top: number; left: number; width: number; height: number }) {
  const el = document.createElement("button");
  el.setAttribute("data-tour", anchor);
  el.textContent = anchor;
  el.getBoundingClientRect = () => ({ ...rect, x: rect.left, y: rect.top, right: rect.left + rect.width, bottom: rect.top + rect.height, toJSON: () => ({}) });
  document.body.appendChild(el);
  return el;
}

const addAll = () => {
  addAnchor("plan", { top: 120, left: 20, width: 150, height: 24 });
  addAnchor("focus", { top: 740, left: 150, width: 80, height: 56 });
  addAnchor("log-mistake", { top: 560, left: 20, width: 340, height: 64 });
};

beforeEach(() => {
  vi.mocked(getTourState).mockReset();
  vi.mocked(markTourSeen).mockReset().mockResolvedValue({ success: true, data: { show: false } });
  Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 844, configurable: true });
  Element.prototype.scrollIntoView = vi.fn();
  document.body.innerHTML = "";
});
afterEach(() => vi.useRealTimers());

const show = () => vi.mocked(getTourState).mockResolvedValue({ success: true, data: { show: true } });

describe("the tour", () => {
  it("is not shown when the server says no (flag off or already seen), and nothing is marked", async () => {
    addAll();
    vi.mocked(getTourState).mockResolvedValue({ success: true, data: { show: false } });
    render(<DayOneTour />);
    await waitFor(() => expect(getTourState).toHaveBeenCalled());
    expect(screen.queryByTestId("tour")).toBeNull();
    expect(markTourSeen).not.toHaveBeenCalled();
  });

  it("when the server cannot be reached there is no tour (it is additive)", async () => {
    addAll();
    vi.mocked(getTourState).mockRejectedValue(new ApiError(500, "down"));
    render(<DayOneTour />);
    await waitFor(() => expect(getTourState).toHaveBeenCalled());
    expect(screen.queryByTestId("tour")).toBeNull();
  });

  it("shows the three tooltips in order, with the operator's English text, a counter, and 'Got it' on each; the last one ends it", async () => {
    addAll();
    show();
    render(<DayOneTour />);
    expect(await screen.findByTestId("tour-text")).toHaveTextContent("This is your Today's Plan — Prepex builds it from your weekly goals and timetable.");
    expect(screen.getByTestId("tour-counter")).toHaveTextContent("1 of 3");
    await userEvent.click(screen.getByTestId("tour-next"));
    await waitFor(() => expect(screen.getByTestId("tour-text")).toHaveTextContent("Tap Focus to start a timed study session — Prepex tracks everything."));
    expect(screen.getByTestId("tour-counter")).toHaveTextContent("2 of 3");
    await userEvent.click(screen.getByTestId("tour-next"));
    await waitFor(() => expect(screen.getByTestId("tour-text")).toHaveTextContent("Tap Log Mistake whenever you get something wrong — the AI uses these to coach you better."));
    expect(screen.getByTestId("tour-counter")).toHaveTextContent("3 of 3");
    await userEvent.click(screen.getByTestId("tour-next"));
    await waitFor(() => expect(screen.queryByTestId("tour")).toBeNull());
    expect(TOUR_STEPS.map((s) => s.anchor)).toEqual(["plan", "focus", "log-mistake"]);
  });

  it("tells the server ONCE, as soon as the first tooltip is on screen (not when it finishes)", async () => {
    addAll();
    show();
    render(<DayOneTour />);
    await screen.findByTestId("tour");
    await waitFor(() => expect(markTourSeen).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByTestId("tour-next"));
    await waitFor(() => expect(screen.getByTestId("tour-counter")).toHaveTextContent("2 of 3"));
    expect(markTourSeen).toHaveBeenCalledTimes(1);
  });

  it("Skip ends it at once, for good; so does Escape", async () => {
    addAll();
    show();
    const { unmount } = render(<DayOneTour />);
    await userEvent.click(await screen.findByTestId("tour-skip"));
    expect(screen.queryByTestId("tour")).toBeNull();
    unmount();

    show();
    render(<DayOneTour />);
    await screen.findByTestId("tour");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByTestId("tour")).toBeNull();
  });

  it("is a modal dialog (so the Onboarding Coach stands down) with the spotlight over the target and the bubble beside it", async () => {
    addAll();
    show();
    render(<DayOneTour />);
    const dialog = await screen.findByRole("dialog", { name: "Quick tour" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    const ring = screen.getByTestId("tour-ring");
    expect(ring).toHaveStyle({ top: "114px", left: "14px", width: "162px", height: "36px" }); // the target plus 6 px each side
    const bubble = screen.getByTestId("tour-bubble");
    expect(parseFloat(bubble.style.top)).toBeGreaterThan(144); // below the target
    expect(parseFloat(bubble.style.left)).toBeGreaterThanOrEqual(EDGE);
    expect(parseFloat(bubble.style.left) + parseFloat(bubble.style.width)).toBeLessThanOrEqual(390 - EDGE);
  });

  it("buttons are big enough to tap (44 px) and 'Got it' has focus", async () => {
    addAll();
    show();
    render(<DayOneTour />);
    const next = await screen.findByTestId("tour-next");
    expect(next.className).toContain("min-h-11");
    expect(screen.getByTestId("tour-skip").className).toContain("min-h-11");
    await waitFor(() => expect(document.activeElement).toBe(next));
  });

  it("a step whose target never appears is skipped after a wait, and the tour carries on", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    addAnchor("plan", { top: 120, left: 20, width: 150, height: 24 });
    addAnchor("log-mistake", { top: 560, left: 20, width: 340, height: 64 }); // no Focus target on this screen
    show();
    render(<DayOneTour />);
    await vi.waitFor(() => expect(screen.getByTestId("tour-counter")).toHaveTextContent("1 of 3"));
    await act(async () => void (await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByTestId("tour-next"))));
    await act(async () => void (await vi.advanceTimersByTimeAsync(ANCHOR_WAIT_MS + 1000)));
    await vi.waitFor(() => expect(screen.getByTestId("tour-counter")).toHaveTextContent("3 of 3"));
  });

  it("waits for a target that mounts late (the plan loads after the page)", async () => {
    show();
    render(<DayOneTour />);
    await waitFor(() => expect(getTourState).toHaveBeenCalled());
    expect(screen.queryByTestId("tour")).toBeNull();
    act(() => void addAnchor("plan", { top: 200, left: 20, width: 150, height: 24 }));
    expect(await screen.findByTestId("tour-text")).toBeInTheDocument();
  });
});

describe("placeBubble", () => {
  const vp = { width: 390, height: 844 };

  it("puts the bubble below a target with room, above one near the bottom (the mobile nav), and keeps it inside the screen", () => {
    const top = placeBubble({ top: 100, left: 20, width: 150, height: 24 }, vp);
    expect(top.side).toBe("below");
    expect(top.bubble.top).toBeGreaterThan(124);
    const bottom = placeBubble({ top: 760, left: 150, width: 80, height: 56 }, vp);
    expect(bottom.side).toBe("above");
    expect(bottom.bubble.top + 190).toBeLessThanOrEqual(760);
    for (const t of [top, bottom]) {
      expect(t.bubble.left).toBeGreaterThanOrEqual(EDGE);
      expect(t.bubble.left + t.bubble.width).toBeLessThanOrEqual(vp.width - EDGE);
    }
  });

  it("the bubble is at most 320 wide, narrower on a small phone, and the caret stays on the bubble", () => {
    expect(placeBubble({ top: 100, left: 600, width: 100, height: 30 }, { width: 1280, height: 800 }).bubble.width).toBe(BUBBLE_MAX_WIDTH);
    expect(placeBubble({ top: 100, left: 10, width: 100, height: 30 }, { width: 320, height: 640 }).bubble.width).toBe(296);
    const far = placeBubble({ top: 100, left: 380, width: 10, height: 10 }, vp); // a target at the right edge
    expect(far.caretLeft).toBeLessThanOrEqual(far.bubble.width - 16);
    expect(far.caretLeft).toBeGreaterThanOrEqual(16);
  });
});

describe("finding the target", () => {
  it("takes the visible one when the page carries several (the sidebar and the bottom bar both have a Focus link)", () => {
    document.body.innerHTML = "";
    const hidden = addAnchor("focus", { top: 0, left: 0, width: 80, height: 40 });
    hidden.style.display = "none";
    const shown = addAnchor("focus", { top: 700, left: 100, width: 80, height: 56 });
    expect(findAnchor("focus")).toBe(shown);
    expect(visibility(hidden)).toBe(0);
    expect(visibility(shown)).toBe(1);
    expect(findAnchor("nope")).toBeNull();
  });
});
