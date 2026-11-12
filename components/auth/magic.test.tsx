// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/http";

const push = vi.fn();
let search = "token=abc123";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), useSearchParams: () => new URLSearchParams(search) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("motion/react", () => ({ motion: { div: ({ children, ...rest }: { children: React.ReactNode }) => <div {...(rest as object)}>{children}</div> } }));
vi.mock("@/lib/api/auth", async (orig) => ({ ...(await orig<typeof import("@/lib/api/auth")>()), magicSignin: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ saveSession: vi.fn() }));
vi.mock("@/lib/auth/onboardingGate", () => ({ resolveAuthedLanding: vi.fn().mockResolvedValue("/onboarding/step-1") }));
vi.mock("@/lib/insights/targetRank", () => ({ syncTargetRankAfterLogin: vi.fn().mockResolvedValue(undefined) }));

import MagicSigninPage from "@/app/(auth)/magic/page";
import { magicSignin } from "@/lib/api/auth";
import { saveSession } from "@/lib/auth/session";

const result = { user: { id: "u1", email: "a@b.com", fullName: "Aarav", role: "user", authProvider: "email", avatarUrl: null, isEmailVerified: true, isVerified: true }, tokens: { accessToken: "acc", refreshToken: "ref" }, restored: false };

beforeEach(() => {
  push.mockReset();
  vi.mocked(magicSignin).mockReset();
  vi.mocked(saveSession).mockReset();
  search = "token=abc123";
});

describe("/magic", () => {
  it("opening the link does NOT sign in (a mail scanner must not use the one-time token up)", () => {
    render(<MagicSigninPage />);
    expect(screen.getByTestId("magic-open")).toBeInTheDocument();
    expect(magicSignin).not.toHaveBeenCalled();
  });

  it("the tap signs in with the link's token, saves the session and goes where the student belongs", async () => {
    vi.mocked(magicSignin).mockResolvedValue({ success: true, data: result });
    render(<MagicSigninPage />);
    await userEvent.click(screen.getByTestId("magic-open"));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding/step-1"));
    expect(magicSignin).toHaveBeenCalledWith("abc123");
    expect(saveSession).toHaveBeenCalledWith(result.tokens, result.user);
  });

  it("an expired or used link says so, keeps the student on the page and points to the password login", async () => {
    vi.mocked(magicSignin).mockRejectedValue(new ApiError(400, "This sign-in link has expired."));
    render(<MagicSigninPage />);
    await userEvent.click(screen.getByTestId("magic-open"));
    expect(await screen.findByTestId("magic-error")).toHaveTextContent("This sign-in link has expired.");
    expect(push).not.toHaveBeenCalled();
    expect(saveSession).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /Log in with your email and password/ })).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("magic-open")).toBeEnabled(); // may try again
  });

  it("a link without a token has no button, only a way back", () => {
    search = "";
    render(<MagicSigninPage />);
    expect(screen.queryByTestId("magic-open")).toBeNull();
    expect(screen.getByTestId("magic-missing")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Log in/ })).toBeInTheDocument();
  });
});
