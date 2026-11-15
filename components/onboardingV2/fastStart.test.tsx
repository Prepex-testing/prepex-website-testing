// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Owner report: opening Prepex (and coming back to it after a long time away) took 10-15 s. The splash waited a fixed
 * 2 s and then for the server's flags; the API lives on a second address whose name lookup took ~11 s on the owner's
 * mobile network. The splash now moves on at once for a returning visitor, and waits only briefly for a new one.
 */
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: replace }) }));
vi.mock("@/lib/api/auth", async (orig) => ({ ...(await orig<typeof import("@/lib/api/auth")>()), getAuthFlags: vi.fn(() => new Promise(() => undefined)) }));

import SplashPage from "@/app/(auth)/splash/page";

beforeEach(() => {
  window.localStorage.clear();
  replace.mockReset();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("the splash never makes a student wait", () => {
  it("a returning visitor goes on immediately, even when the server is slow to answer", () => {
    window.localStorage.setItem("prepex:auth-flags", JSON.stringify({ onboardingV2: true, guestMode: true }));
    render(<SplashPage />);
    expect(replace).toHaveBeenCalledWith("/start");
  });

  it("a first visit waits at most 1.5 s for the server, then takes the new sign-in", () => {
    render(<SplashPage />);
    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    expect(replace).toHaveBeenCalledWith("/start");
    expect(replace).toHaveBeenCalledTimes(1);
  });
});

describe("Google sign-in keeps its own address", () => {
  it("uses the OAuth address when set, so the sign-in cookie lands where Google returns", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_AUTH_API_URL", "https://site.test/_api/auth");
    vi.stubEnv("NEXT_PUBLIC_AUTH_OAUTH_URL", "https://api.site.test/auth");
    const { getGoogleAuthUrl } = await vi.importActual<typeof import("@/lib/api/auth")>("@/lib/api/auth");
    expect(getGoogleAuthUrl()).toBe("https://api.site.test/auth/api/auth/google");
    vi.stubEnv("NEXT_PUBLIC_AUTH_OAUTH_URL", "");
    vi.resetModules();
    const again = await vi.importActual<typeof import("@/lib/api/auth")>("@/lib/api/auth");
    expect(again.getGoogleAuthUrl()).toBe("https://site.test/_api/auth/api/auth/google");
    vi.unstubAllEnvs();
  });
});
