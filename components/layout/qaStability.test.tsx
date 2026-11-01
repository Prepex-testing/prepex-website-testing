// @vitest-environment jsdom
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** QA pass regressions: the gates that held a blank screen, the bell that re-fetched on every tab, the timer buttons. */
let pathname = "/home";
const push = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push, replace: push }) }));
vi.mock("@/lib/api/checkin", () => ({ getCheckInStatus: vi.fn() }));
vi.mock("@/lib/api/notifications", async (orig) => ({ ...(await orig<typeof import("@/lib/api/notifications")>()), getNotifications: vi.fn() }));
vi.mock("@/lib/api/focus", async (orig) => ({ ...(await orig<typeof import("@/lib/api/focus")>()), getActiveFocusSession: vi.fn(), pauseFocusSession: vi.fn(), resumeFocusSession: vi.fn() }));
vi.mock("@/lib/focus/telemetry", () => ({ trackFocusEvent: vi.fn() }));
// the real icons are SVG files the test runner cannot load
vi.mock("@/assets/icons", () => ({ BellIcon: () => <svg /> }));

import { useCheckInGate } from "@/components/check-in/CheckInGate";
import { useFocusSession } from "@/components/focus/useFocusSession";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getCheckInStatus } from "@/lib/api/checkin";
import { getActiveFocusSession, pauseFocusSession, type FocusSession } from "@/lib/api/focus";
import { ApiError } from "@/lib/api/http";
import { getNotifications } from "@/lib/api/notifications";
import { isOnboardingKnownComplete, markOnboardingComplete } from "@/lib/auth/onboardingGate";

const signIn = (id = "u1") => {
  localStorage.setItem("prepex_access_token", "t");
  localStorage.setItem("prepex_user", JSON.stringify({ id, fullName: "A", email: "a@example.com" }));
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  pathname = "/home";
});

describe("gates remember what the server already told them", () => {
  it("onboarding: once the server said 'done', a fresh open does not wait for it again", () => {
    signIn();
    markOnboardingComplete();
    vi.resetModules();
    return import("@/lib/auth/onboardingGate").then((fresh) => expect(fresh.isOnboardingKnownComplete()).toBe(true));
  });

  it("onboarding memory belongs to one student", () => {
    signIn("u1");
    markOnboardingComplete();
    signIn("u2");
    return import("@/lib/auth/onboardingGate").then(async () => {
      vi.resetModules();
      const fresh = await import("@/lib/auth/onboardingGate");
      expect(fresh.isOnboardingKnownComplete()).toBe(false);
      expect(isOnboardingKnownComplete()).toBe(true); // the module that learned it in this tab still knows
    });
  });

  it("check-in: a student already seen checked in today gets the page at once, and the check still runs", async () => {
    signIn();
    vi.mocked(getCheckInStatus).mockResolvedValue({ data: { exists: true, checkin: {} } } as never);
    const first = renderHook(() => useCheckInGate(true));
    expect(first.result.current).toBe(false); // the first open of the day waits
    await waitFor(() => expect(first.result.current).toBe(true));
    first.unmount();
    const before = vi.mocked(getCheckInStatus).mock.calls.length;

    const second = renderHook(() => useCheckInGate(true));
    expect(second.result.current).toBe(true); // painted at once
    await waitFor(() => expect(vi.mocked(getCheckInStatus).mock.calls.length).toBeGreaterThan(before)); // and still verified
  });
});

describe("notification bell", () => {
  it("fetches once when mounted, not again on every tab switch", async () => {
    signIn();
    vi.mocked(getNotifications).mockResolvedValue({ data: { notifications: [], unreadCount: 0 } } as never);
    const view = render(<NotificationBell />);
    await waitFor(() => expect(getNotifications).toHaveBeenCalledTimes(1));
    for (const p of ["/planner", "/logs", "/analytics"]) {
      pathname = p;
      view.rerender(<NotificationBell />);
    }
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(getNotifications).toHaveBeenCalledTimes(1);
  });
});

describe("focus timer buttons", () => {
  const running = (over: Partial<FocusSession> = {}): FocusSession => ({ id: "s1", subjectId: 1, chapterId: null, topic: null, plannedMinutes: 50, startedAt: new Date(Date.now() - 40 * 60_000).toISOString(), pausedAt: null, pausedSeconds: 0, endedAt: null, actualMinutes: null, wasCompleted: false, interruptionCount: 0, deepFocusMode: false, notes: null, originSource: "standalone", originId: null, taskType: "SELF_STUDY", mode: "free", pomodoro: null, moodRating: null, confidenceRating: null, status: "ACTIVE", elapsedSeconds: 40 * 60, ...over }) as FocusSession;

  it("Pause freezes the clock at once, and a refused pause puts the running clock back with a message, buttons free", async () => {
    vi.mocked(getActiveFocusSession).mockResolvedValue({ data: { session: running() } } as never);
    let reject: (e: unknown) => void = () => undefined;
    vi.mocked(pauseFocusSession).mockImplementation(() => new Promise((_res, rej) => (reject = rej)));
    const { result } = renderHook(() => useFocusSession());
    await waitFor(() => expect(result.current.phase).toBe("running"));

    act(() => void result.current.pause());
    expect(result.current.session?.status).toBe("PAUSED"); // before the server answers
    await act(async () => reject(new ApiError(429, "Too many requests, please try again later.")));
    expect(result.current.session?.status).toBe("ACTIVE");
    expect(result.current.error).toMatch(/too many requests/i);
    expect(result.current.busy).toBe(false);
  });
});
