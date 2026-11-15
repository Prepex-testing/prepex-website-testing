import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

/** Launch step 2 (C2): the website's health check reports itself and whether the core API is ready. */
afterEach(() => vi.unstubAllGlobals());

describe("GET /api/health", () => {
  it("is ok when the core API is ready", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, service: "website", status: "ok", checks: { app: "ok", api: "ok" } });
  });

  it("is 503 when the core API is failing or unreachable, without saying why", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
    expect((await GET()).status).toBe(503);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED 127.0.0.1:4200"); }));
    const res = await GET();
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toMatch(/ECONNREFUSED|127\.0\.0\.1/);
  });
});
