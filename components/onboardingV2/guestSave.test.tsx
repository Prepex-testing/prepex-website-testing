// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/http";

vi.mock("@/lib/api/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/auth")>()),
  getAuthFlags: vi.fn(async () => ({ success: true, data: { onboardingV2: true, guestMode: true, googleSignIn: true } })),
  requestEmailCode: vi.fn(async () => ({ success: true, data: { cooldownSeconds: 45, expiresInSeconds: 600 } })),
  saveGuestWithEmailCode: vi.fn(),
  verifyEmailCode: vi.fn(),
  googleSaveUrl: vi.fn(async () => "https://auth.test/api/auth/google?intent=abc"),
}));
vi.mock("@/lib/auth/session", async (orig) => ({ ...(await orig<typeof import("@/lib/auth/session")>()), saveSession: vi.fn(), getStoredUser: vi.fn() }));
vi.mock("@/lib/api/xp", () => ({ getXpSummary: vi.fn(), onXpSummary: vi.fn(() => () => undefined), sendHeartbeat: vi.fn() }));
vi.mock("@/lib/api/rituals", () => ({ getDayClose: vi.fn() }));

import { saveGuestWithEmailCode, verifyEmailCode } from "@/lib/api/auth";
import { getDayClose } from "@/lib/api/rituals";
import { getXpSummary } from "@/lib/api/xp";
import { getStoredUser, saveSession } from "@/lib/auth/session";
import { GuestSaveCard } from "@/components/onboardingV2/GuestSaveCard";
import { SaveAccountSheet } from "@/components/onboardingV2/SaveAccountSheet";
import { duePrompt, markGuestSaved, markPromptShown, saveGuest, GUEST_DEFAULTS } from "@/lib/onboardingV2/guest";

const guest = { id: "g1", email: "guest-1@guest.prepex.invalid", fullName: "Guest", role: "STUDENT", authProvider: "guest", avatarUrl: null, isEmailVerified: false, isVerified: true };
const saved = { ...guest, email: "asha@x.in", fullName: "Asha", authProvider: "email", isEmailVerified: true };

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("when Pexo asks a guest to save (D3)", () => {
  const never = () => false;
  it("day 3 first, then a closed day, then a first study session; each once", () => {
    expect(duePrompt({ daysSinceStart: 2, dayClosed: true, studied: true }, never)).toBe("day3");
    expect(duePrompt({ daysSinceStart: 0, dayClosed: true, studied: true }, never)).toBe("dayclose");
    expect(duePrompt({ daysSinceStart: 0, dayClosed: false, studied: true }, never)).toBe("first_session");
    expect(duePrompt({ daysSinceStart: 0, dayClosed: false, studied: false }, never)).toBeNull();
    expect(duePrompt({ daysSinceStart: 0, dayClosed: false, studied: true }, (p) => p === "first_session")).toBeNull();
  });

  it("the Home card shows the first-session line after studying, and opens the save sheet", async () => {
    vi.mocked(getStoredUser).mockReturnValue(guest);
    vi.mocked(getXpSummary).mockResolvedValue({ todayStudyMinutes: 25, totalXp: 40 } as never);
    vi.mocked(getDayClose).mockResolvedValue({ status: "not_yet" } as never);
    saveGuest("g1", { answers: GUEST_DEFAULTS, asked: [], startedAt: new Date().toISOString() });
    render(<GuestSaveCard />);
    await waitFor(() => expect(screen.getByTestId("guest-save").getAttribute("data-prompt")).toBe("first_session"));
    expect(screen.getByRole("status").textContent).toBe("Nice first session. Save your climb so it's never lost?");
    fireEvent.click(screen.getByTestId("guest-save-open"));
    expect(screen.getByTestId("save-sheet")).toBeTruthy();
  });

  it("a prompt already shown is not shown again", async () => {
    vi.mocked(getStoredUser).mockReturnValue(guest);
    vi.mocked(getXpSummary).mockResolvedValue({ todayStudyMinutes: 25, totalXp: 40 } as never);
    vi.mocked(getDayClose).mockResolvedValue({ status: "not_yet" } as never);
    markPromptShown("g1", "first_session");
    render(<GuestSaveCard />);
    await waitFor(() => expect(getXpSummary).toHaveBeenCalled());
    expect(screen.queryByTestId("guest-save")).toBeNull();
  });

  it("right after saving, Pexo says guest.saved once", () => {
    vi.mocked(getStoredUser).mockReturnValue(saved);
    markGuestSaved("g1");
    render(<GuestSaveCard />);
    expect(screen.getByTestId("guest-saved").textContent).toBe("Saved. Your climb is safe now.");
    cleanup();
    render(<GuestSaveCard />);
    expect(screen.queryByTestId("guest-saved")).toBeNull();
  });
});

describe("the save sheet (D3)", () => {
  async function toCode() {
    fireEvent.click(screen.getByTestId("save-email"));
    fireEvent.change(screen.getByTestId("save-name"), { target: { value: "Asha" } });
    fireEvent.change(screen.getByTestId("save-address"), { target: { value: "Asha@X.in" } });
    fireEvent.submit(screen.getByTestId("save-email-form"));
    await waitFor(() => screen.getByTestId("save-code"));
  }

  it("saves the same account with an e-mail code", async () => {
    vi.mocked(saveGuestWithEmailCode).mockResolvedValue({ success: true, data: { user: saved, tokens: { accessToken: "a", refreshToken: "r" }, restored: false, isNewUser: false, saved: true } });
    const onSaved = vi.fn();
    render(<SaveAccountSheet onClose={() => undefined} onSaved={onSaved} />);
    await toCode();
    fireEvent.change(screen.getByTestId("save-code"), { target: { value: "123456" } });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(saveGuestWithEmailCode).toHaveBeenCalledWith({ email: "asha@x.in", code: "123456", fullName: "Asha" });
    expect(saveSession).toHaveBeenCalledWith({ accessToken: "a", refreshToken: "r" }, saved);
  });

  it("an address that already has an account offers to sign in to it instead (no merge)", async () => {
    const taken = new ApiError(409, "This e-mail already has a Prepex account.");
    taken.code = "email_taken";
    vi.mocked(saveGuestWithEmailCode).mockRejectedValue(taken);
    vi.mocked(verifyEmailCode).mockResolvedValue({ success: true, data: { user: saved, tokens: { accessToken: "a2", refreshToken: "r2" }, restored: false, isNewUser: false } });
    const assign = vi.fn();
    Object.defineProperty(window, "location", { value: { ...window.location, assign }, writable: true });
    render(<SaveAccountSheet onClose={() => undefined} onSaved={() => undefined} />);
    await toCode();
    fireEvent.change(screen.getByTestId("save-code"), { target: { value: "654321" } });
    await waitFor(() => screen.getByTestId("save-taken"));
    fireEvent.click(screen.getByTestId("save-sign-in-instead"));
    await waitFor(() => expect(verifyEmailCode).toHaveBeenCalledWith({ email: "asha@x.in", code: "654321" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/home"));
  });
});
