import { describe, expect, it } from "vitest";
import { readOAuthHandoff } from "./oauthHandoff";

describe("readOAuthHandoff (launch step 1, C2: tokens travel in the fragment)", () => {
  it("reads the tokens and flags from the fragment", () => {
    expect(readOAuthHandoff("#access_token=a&refresh_token=r&restored=1&saved=1&guest_conflict=1", "")).toEqual({
      accessToken: "a",
      refreshToken: "r",
      restored: true,
      saved: true,
      guestConflict: true,
    });
  });

  it("still reads the query string from an older auth-service", () => {
    expect(readOAuthHandoff("", "?access_token=a&refresh_token=r")).toMatchObject({ accessToken: "a", refreshToken: "r", restored: false });
  });

  it("prefers the fragment when both are present", () => {
    expect(readOAuthHandoff("#access_token=frag&refresh_token=f", "?access_token=query&refresh_token=q").accessToken).toBe("frag");
  });

  it("nothing handed over is two nulls", () => {
    expect(readOAuthHandoff("", "")).toMatchObject({ accessToken: null, refreshToken: null });
  });
});
