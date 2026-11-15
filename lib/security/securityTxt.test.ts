/**
 * Launch step 1 (C11): /.well-known/security.txt (RFC 9116) must name a real contact and must not have expired, or
 * researchers have nowhere to report. security@prepex.io is the owner's chosen address (mailbox created at the
 * prepex.io production move).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const text = readFileSync("public/.well-known/security.txt", "utf8");

describe("security.txt", () => {
  it("names the security contact, not a placeholder", () => {
    expect(text).toMatch(/^Contact: mailto:security@prepex\.io$/m);
    expect(text).not.toMatch(/REPLACE|\.invalid/i);
  });

  it("has an Expires date in the future", () => {
    const m = text.match(/^Expires: (.+)$/m);
    expect(m).not.toBeNull();
    expect(new Date(m![1]).getTime()).toBeGreaterThan(Date.now());
  });
});
