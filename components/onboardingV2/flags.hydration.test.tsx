// @vitest-environment jsdom
/**
 * Launch step 1 (B): /start threw React hydration error #418 for every returning visitor. The server renders with no
 * remembered flags; the client read them from localStorage in its FIRST render and drew a different tree.
 */
import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/auth", () => ({ getAuthFlags: () => new Promise(() => {}) }));
const { useAuthFlags } = await import("@/lib/onboardingV2/flags");

function Probe() {
  const { flags } = useAuthFlags();
  return flags.onboardingV2 ? <p>new front door</p> : null;
}

afterEach(() => window.localStorage.clear());

describe("useAuthFlags hydrates without a mismatch", () => {
  it("a returning visitor (flags remembered on the device) gets no hydration error, then sees the remembered flags", async () => {
    const html = renderToString(<Probe />);
    window.localStorage.setItem("prepex:auth-flags", JSON.stringify({ onboardingV2: true, guestMode: true, googleSignIn: true }));
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const errors: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, <Probe />, { onRecoverableError: (e) => void errors.push(e) });
    });
    expect(errors).toEqual([]);
    expect(container.textContent).toBe("new front door");
  });
});
