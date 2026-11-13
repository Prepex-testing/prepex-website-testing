// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/profile", () => ({ updateProfile: vi.fn(async () => ({ success: true, data: {} })) }));
vi.mock("@/lib/api/timetable", () => ({ createTimetable: vi.fn(async () => ({ success: true, data: {} })) }));
vi.mock("@/lib/auth/session", async (orig) => ({ ...(await orig<typeof import("@/lib/auth/session")>()), getStoredUser: vi.fn() }));

import { updateProfile } from "@/lib/api/profile";
import { createTimetable } from "@/lib/api/timetable";
import { getStoredUser } from "@/lib/auth/session";
import { GuestAskCard } from "@/components/onboardingV2/GuestAskCard";
import { GUEST_DEFAULTS, isGuestUser, loadGuest, nextAsk, saveGuest } from "@/lib/onboardingV2/guest";
import { buildPayload } from "@/lib/onboardingV2/canvas";

const guest = { id: "g1", email: "guest-1@guest.prepex.invalid", fullName: "Guest", role: "STUDENT", authProvider: "guest", avatarUrl: null, isEmailVerified: false, isVerified: true };

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("guest defaults (D1)", () => {
  it("are JEE Main + Advanced, Class 12, no school, self-study, 6 h in the evening and night, no chapters", () => {
    expect(GUEST_DEFAULTS).toMatchObject({ goal: "JEE_BOTH", level: "CLASS_12", school: "NONE", coaching: "SELF", hours: 6, windows: ["EVENING", "NIGHT"], chapters: [] });
    const p = buildPayload({ ...GUEST_DEFAULTS, examDates: [{ kind: "JEE_MAIN", label: "JEE Main", date: "2027-01-20", days: 68, isDefault: true }] }, "exam-1");
    expect(p).toMatchObject({ currentLevel: "CLASS_12", coachingType: "SELF_PREP", examDateIsDefault: true, completedChapterIds: [] });
    expect(p.timetable.blocks.some((b) => b.activityType === "REVISION")).toBe(true);
  });

  it("recognises a guest account", () => {
    expect(isGuestUser(guest)).toBe(true);
    expect(isGuestUser({ ...guest, authProvider: "email", email: "a@b.co" })).toBe(false);
  });
});

describe("ask cards (D2)", () => {
  it("asks class, exam date, school (only for Class 11/12), hours, then chapters", () => {
    let s = { answers: GUEST_DEFAULTS, asked: [] as ReturnType<typeof nextAsk>[] } as never as Parameters<typeof nextAsk>[0];
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = nextAsk(s);
      if (!a) break;
      seen.push(a);
      s = { ...s, asked: [...s.asked, a] };
    }
    expect(seen).toEqual(["class", "exam_date", "school", "hours", "chapters"]);
    expect(nextAsk({ answers: { ...GUEST_DEFAULTS, level: "DROPPER" }, asked: ["class", "exam_date"] })).toBe("hours");
  });

  it("shows nothing to a saved account", () => {
    vi.mocked(getStoredUser).mockReturnValue({ ...guest, authProvider: "email", email: "a@b.co" });
    render(<GuestAskCard />);
    expect(screen.queryByTestId("guest-ask")).toBeNull();
  });

  it("one card a session; an answer goes through the normal profile service", async () => {
    vi.mocked(getStoredUser).mockReturnValue(guest);
    render(<GuestAskCard />);
    expect(screen.getByTestId("guest-ask").getAttribute("data-ask")).toBe("class");
    expect(screen.getByRole("status").textContent).toBe("Quick one: which class are you in?");
    fireEvent.click(screen.getByText("Class 11"));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ currentLevel: "CLASS_11" }));
    await waitFor(() => expect(screen.queryByTestId("guest-ask")).toBeNull());
    expect(loadGuest("g1")).toMatchObject({ answers: { level: "CLASS_11" }, asked: ["class"] });
    cleanup();
    render(<GuestAskCard />);
    expect(screen.queryByTestId("guest-ask")).toBeNull();
  });

  it("hours rebuild the week with the canvas's generator", async () => {
    vi.mocked(getStoredUser).mockReturnValue(guest);
    saveGuest("g1", { answers: GUEST_DEFAULTS, asked: ["class", "exam_date", "school"] });
    render(<GuestAskCard />);
    fireEvent.click(screen.getByText("4 hours"));
    await waitFor(() => expect(createTimetable).toHaveBeenCalled());
    const blocks = vi.mocked(createTimetable).mock.calls[0]![0].blocks;
    expect(blocks.some((b) => b.activityType === "REVISION")).toBe(true);
  });
});
