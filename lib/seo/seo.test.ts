import { afterEach, describe, expect, it, vi } from "vitest";

/** Launch step 3: public pages indexable on app.prepex.io only; testing never. */
describe("search engine rules", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("app.prepex.io: privacy/terms/contact indexable, the rest disallowed", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.prepex.io");
    const { publicPageRobots } = await import("@/lib/seo");
    const robots = (await import("@/app/robots")).default();
    expect(publicPageRobots()).toEqual({ index: true, follow: true });
    expect(robots.rules).toEqual([{ userAgent: "*", allow: ["/privacy", "/terms", "/contact"], disallow: ["/"] }]);
  });

  it("testing: nothing is indexed", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://testing.prepex.io");
    const { publicPageRobots } = await import("@/lib/seo");
    const robots = (await import("@/app/robots")).default();
    expect(publicPageRobots()).toEqual({ index: false, follow: false });
    expect(robots.rules).toEqual([{ userAgent: "*", disallow: ["/"] }]);
  });
});
