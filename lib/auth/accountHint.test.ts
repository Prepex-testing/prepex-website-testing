// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { clearAccountHint, hasAccountHint, setAccountHint } from "@/lib/auth/accountHint";
import { clearSession, saveSession } from "@/lib/auth/session";

/** Launch step 3: the px_has_account hint for the prepex.io landing page. */
describe("px_has_account", () => {
  afterEach(() => clearAccountHint());

  it("is set by every sign-in or sign-up (saveSession)", () => {
    expect(hasAccountHint()).toBe(false);
    saveSession({ accessToken: "a", refreshToken: "r" }, { id: "u", email: "s@example.com", fullName: "S" } as never);
    expect(hasAccountHint()).toBe(true);
  });

  it("survives logout, and only an account deletion clears it", () => {
    setAccountHint();
    clearSession();
    expect(hasAccountHint()).toBe(true);
    clearAccountHint();
    expect(hasAccountHint()).toBe(false);
  });

  it("holds nothing but 1 (no id, no e-mail)", () => {
    setAccountHint();
    expect(document.cookie).toMatch(/(^|; )px_has_account=1(;|$)/);
    expect(document.cookie).not.toMatch(/s@example\.com|u\b/);
  });
});
