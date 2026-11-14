import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./headers";

const env = {
  NEXT_PUBLIC_AUTH_API_URL: "https://api-testing.prepex.io/auth/api/auth",
  NEXT_PUBLIC_CORE_API_URL: "https://api-testing.prepex.io/core/api",
  NEXT_PUBLIC_DASHBOARD_API_URL: "https://api-testing.prepex.io/dashboard/api",
  NEXT_PUBLIC_SENTRY_DSN: "https://abc@o123.ingest.de.sentry.io/456",
};

describe("website security headers (launch step 1, C4)", () => {
  it("connect-src is our own API origin and Sentry only, from env, never a hard-coded domain", () => {
    const csp = contentSecurityPolicy(env);
    expect(csp).toContain("connect-src 'self' https://api-testing.prepex.io https://o123.ingest.de.sentry.io;");
    const prod = contentSecurityPolicy({ ...env, NEXT_PUBLIC_CORE_API_URL: "https://api.prepex.io/core/api", NEXT_PUBLIC_AUTH_API_URL: undefined, NEXT_PUBLIC_DASHBOARD_API_URL: undefined, NEXT_PUBLIC_SENTRY_DSN: undefined });
    expect(prod).toContain("connect-src 'self' https://api.prepex.io;");
    expect(prod).not.toContain("testing");
  });

  it("cannot be framed, no plugins, no foreign forms, upgrades http in production only", () => {
    const csp = contentSecurityPolicy(env);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(contentSecurityPolicy(env, true)).not.toContain("upgrade-insecure-requests");
    expect(contentSecurityPolicy(env, true)).toContain("'unsafe-eval'");
    // a local production build talks to http://localhost APIs: upgrading would break every call
    expect(contentSecurityPolicy({ NEXT_PUBLIC_CORE_API_URL: "http://localhost:4102/api" })).not.toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("sends HSTS, nosniff, DENY, a referrer policy and a Permissions-Policy that allows only our microphone", () => {
    const h = Object.fromEntries(securityHeaders(env).map((x) => [x.key, x.value]));
    expect(h["Strict-Transport-Security"]).toMatch(/max-age=31536000/);
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Permissions-Policy"]).toMatch(/^microphone=\(self\), camera=\(\)/);
  });
});
