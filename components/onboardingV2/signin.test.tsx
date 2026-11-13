// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }), usePathname: () => "/start", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/api/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/auth")>()),
  getAuthFlags: vi.fn(),
  requestEmailCode: vi.fn(),
  verifyEmailCode: vi.fn(),
  getGoogleAuthUrl: () => "https://auth.example/google",
}));
vi.mock("@/lib/auth/onboardingGate", () => ({ resolveAuthedLanding: vi.fn(async () => "/onboarding/preparing-for") }));
vi.mock("@/lib/auth/session", async (orig) => ({ ...(await orig<typeof import("@/lib/auth/session")>()), saveSession: vi.fn() }));

import { ApiError, getAuthFlags, requestEmailCode, verifyEmailCode } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth/session";
import { SignInScreen } from "@/components/onboardingV2/SignInScreen";
import { cachedFlags, loadFlags } from "@/lib/onboardingV2/flags";

const flags = (onboardingV2: boolean, guestMode: boolean) => vi.mocked(getAuthFlags).mockResolvedValue({ success: true, data: { onboardingV2, guestMode } });
const user = { id: "u1", email: "a@b.co", fullName: "Student", role: "STUDENT", authProvider: "email", avatarUrl: null, isEmailVerified: true, isVerified: true };

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("flags", () => {
  it("are off when the server cannot be reached and nothing is remembered", async () => {
    vi.mocked(getAuthFlags).mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(loadFlags()).resolves.toEqual({ onboardingV2: false, guestMode: false });
  });

  it("guest mode is never on without onboarding v2, and the answer is remembered", async () => {
    flags(false, true);
    await expect(loadFlags()).resolves.toEqual({ onboardingV2: false, guestMode: false });
    flags(true, true);
    await loadFlags();
    expect(cachedFlags()).toEqual({ onboardingV2: true, guestMode: true });
  });
});

describe("the v2 sign-in screen", () => {
  it("Pexo waves with onb.signin; Google, email and the password link are there; no guest button when guest mode is off", async () => {
    flags(true, false);
    render(<SignInScreen />);
    expect(screen.getByTestId("onb-pexo").getAttribute("data-line")).toBe("onb.signin#1");
    expect(screen.getByTestId("onb-pexo-text").textContent).toBe("Hi, I'm Pexo. Let's get you set up in about a minute.");
    expect(screen.getByTestId("signin-google").textContent).toContain("Continue with Google");
    expect(screen.getByTestId("signin-email").textContent).toContain("Continue with email");
    expect(screen.getByTestId("signin-password").getAttribute("href")).toBe("/login?password=1");
    await waitFor(() => expect(getAuthFlags).toHaveBeenCalled());
    expect(screen.queryByTestId("signin-guest")).toBeNull();
  });

  it("shows Try Prepex first with the guest note only when guest mode is on", async () => {
    flags(true, true);
    render(<SignInScreen />);
    await waitFor(() => expect(screen.getByTestId("signin-guest")).toBeTruthy());
    expect(screen.getByTestId("signin-guest-note").textContent).toBe("Just looking? Try Prepex first. You can save your progress any time.");
  });

  it("email -> code -> signed in, without a password", async () => {
    flags(true, false);
    vi.mocked(requestEmailCode).mockResolvedValue({ success: true, data: { cooldownSeconds: 45, expiresInSeconds: 600 } });
    vi.mocked(verifyEmailCode).mockResolvedValue({ success: true, data: { user, tokens: { accessToken: "a", refreshToken: "r" }, restored: false, isNewUser: true } });
    render(<SignInScreen />);
    fireEvent.click(screen.getByTestId("signin-email"));
    fireEvent.change(screen.getByPlaceholderText("Rohan@example.com"), { target: { value: " New@Student.in " } });
    fireEvent.submit(screen.getByTestId("signin-email-form"));
    await waitFor(() => expect(screen.getByTestId("signin-code-form")).toBeTruthy());
    expect(requestEmailCode).toHaveBeenCalledWith("New@Student.in");
    expect(screen.getByTestId("signin-resend-wait").textContent).toBe("resend in 45s");
    // typing the sixth digit submits by itself
    fireEvent.change(screen.getByTestId("signin-code"), { target: { value: "12 34 56" } });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding/preparing-for"));
    expect(verifyEmailCode).toHaveBeenCalledWith({ email: "new@student.in", code: "123456" });
    expect(saveSession).toHaveBeenCalledWith({ accessToken: "a", refreshToken: "r" }, user);
  });

  it("a wrong code shows the server's message and stays on the code step", async () => {
    flags(true, false);
    vi.mocked(requestEmailCode).mockResolvedValue({ success: true, data: { cooldownSeconds: 45, expiresInSeconds: 600 } });
    vi.mocked(verifyEmailCode).mockRejectedValue(new ApiError(400, "That code isn't right. 4 tries left."));
    render(<SignInScreen />);
    fireEvent.click(screen.getByTestId("signin-email"));
    fireEvent.change(screen.getByPlaceholderText("Rohan@example.com"), { target: { value: "a@b.co" } });
    fireEvent.submit(screen.getByTestId("signin-email-form"));
    await waitFor(() => screen.getByTestId("signin-code"));
    fireEvent.change(screen.getByTestId("signin-code"), { target: { value: "000000" } });
    await waitFor(() => expect(screen.getByTestId("signin-code-error").textContent).toBe("That code isn't right. 4 tries left."));
    expect(push).not.toHaveBeenCalled();
  });

  it("a failed send says so and lets them try again", async () => {
    flags(true, false);
    vi.mocked(requestEmailCode).mockRejectedValueOnce(new ApiError(502, "We couldn't send the code. Please try again."));
    render(<SignInScreen />);
    fireEvent.click(screen.getByTestId("signin-email"));
    fireEvent.change(screen.getByPlaceholderText("Rohan@example.com"), { target: { value: "a@b.co" } });
    fireEvent.submit(screen.getByTestId("signin-email-form"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("We couldn't send the code. Please try again."));
    expect(screen.getByTestId("signin-send-code")).toBeTruthy();
  });

  it("resend waits out the cooldown, then sends a new code", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    flags(true, false);
    vi.mocked(requestEmailCode).mockResolvedValue({ success: true, data: { cooldownSeconds: 45, expiresInSeconds: 600 } });
    render(<SignInScreen />);
    fireEvent.click(screen.getByTestId("signin-email"));
    fireEvent.change(screen.getByPlaceholderText("Rohan@example.com"), { target: { value: "a@b.co" } });
    await act(async () => {
      fireEvent.submit(screen.getByTestId("signin-email-form"));
    });
    await waitFor(() => screen.getByTestId("signin-resend-wait"));
    for (let i = 0; i < 46; i++) {
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
    }
    fireEvent.click(screen.getByTestId("signin-resend"));
    await waitFor(() => expect(requestEmailCode).toHaveBeenCalledTimes(2));
    vi.useRealTimers();
  });
});
