// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiError, REQUEST_TIMEOUT_MS } from "@/lib/api/http";

/**
 * Owner report: with the timer on, switching to the coaching tab and coming back left Pause / Resume / End disabled
 * until the page was reloaded. Two causes, each covered here:
 *  1. The request time limit stopped once the response headers arrived, so a response body that stalled (common when the
 *     browser freezes a background tab) kept the request, and the buttons' "busy" lock, waiting forever.
 *  2. Nothing ever released that lock when the student came back to the tab.
 */

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("apiRequest time limit", () => {
  it("also covers reading the body: a stalled body ends as a 408 instead of hanging", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const signal = (init as RequestInit).signal!;
      // headers arrive, the body never does (until the request is aborted)
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          }),
      } as unknown as Response;
    });
    const p = apiRequest("https://api.test/x", { method: "POST" });
    const settled = p.then(
      () => "resolved",
      (e: unknown) => (e instanceof ApiError ? `api ${e.status}` : "other"),
    );
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 10);
    expect(await settled).toBe("api 408");
  });
});

vi.mock("@/lib/api/focus", () => ({
  getActiveFocusSession: vi.fn(),
  createFocusSession: vi.fn(),
  pauseFocusSession: vi.fn(),
  resumeFocusSession: vi.fn(),
  stopFocusSession: vi.fn(),
  recordFocusInterruption: vi.fn(async () => undefined),
}));
vi.mock("@/lib/focus/telemetry", () => ({ trackFocusEvent: vi.fn() }));

import { getActiveFocusSession, pauseFocusSession } from "@/lib/api/focus";
import { BUSY_RELEASE_MS, useFocusSession } from "@/components/focus/useFocusSession";

const running = { id: "s1", status: "ACTIVE", elapsedSeconds: 60, plannedMinutes: 45, interruptionCount: 0, mode: "countdown", taskType: "practice", originSource: "standalone", deepFocusMode: false } as never;
const paused = { ...(running as object), status: "PAUSED" } as never;

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("the focus buttons never stay locked after a tab switch", () => {
  it("coming back to the tab releases a lock left by a request that never finished, and re-reads the session", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(getActiveFocusSession).mockResolvedValueOnce({ success: true, data: { session: running } } as never);
    // the pause request is lost while the tab is in the background: it never settles
    vi.mocked(pauseFocusSession).mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useFocusSession());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.phase).toBe("running");

    act(() => void result.current.pause());
    expect(result.current.busy).toBe(true);

    setHidden(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(BUSY_RELEASE_MS + 1000);
    });
    // the server says it is paused (the request did land)
    vi.mocked(getActiveFocusSession).mockResolvedValueOnce({ success: true, data: { session: paused } } as never);
    await act(async () => {
      setHidden(false);
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.busy).toBe(false);
    expect(result.current.session?.status).toBe("PAUSED");
    setHidden(false);
  });

  it("a quick request in flight is not cut short by coming back", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(getActiveFocusSession).mockResolvedValue({ success: true, data: { session: running } } as never);
    vi.mocked(pauseFocusSession).mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useFocusSession());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    act(() => void result.current.pause());
    setHidden(true);
    await act(async () => {
      setHidden(false);
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.busy).toBe(true);
    setHidden(false);
  });
});
