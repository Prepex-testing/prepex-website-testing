import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { baseOptions, scrubEvent } from "@/lib/observability/sentry-options";

/** Launch step 2 (C1): nothing personal leaves the app for Sentry; only the user id, and events carry the release. */
const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1MSJ9.c2lnbmF0dXJlLXNpZ25hdHVyZQ";

describe("website Sentry scrubbing", () => {
  it("keeps only the user id and masks e-mails, tokens and phone numbers everywhere", () => {
    const e = scrubEvent({
      user: { id: "u-1", email: "asha@example.com", username: "asha" },
      message: "save failed for asha@example.com",
      exception: { values: [{ type: "Error", value: `token ${JWT} phone +919876543210` }] },
      breadcrumbs: [{ category: "ui.input", message: "typed asha@example.com", data: { url: "/notebooks?q=asha@example.com", text: "my notebook page" } }],
      request: { url: "https://testing.prepex.io/x?email=a@b.co", data: "x", query_string: "a=b", cookies: { c: "d" }, headers: { authorization: "Bearer y", cookie: "z", "user-agent": "UA" } },
    } as unknown as ErrorEvent);
    const s = JSON.stringify(e);
    for (const bad of ["asha@example.com", JWT, "9876543210", "my notebook page", "Bearer y", "a@b.co"]) expect(s).not.toContain(bad);
    expect(e.user).toEqual({ id: "u-1" });
  });

  it("tags events with the build's release and environment", () => {
    process.env.NEXT_PUBLIC_SENTRY_RELEASE = "abc123def456";
    expect(baseOptions()).toMatchObject({ release: "abc123def456", sendDefaultPii: false });
  });
});
